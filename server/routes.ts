import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { upload, getFilePath } from "./services/fileUpload";
import fs from "fs";
import path from "path";
import {
  categorizeContent,
  formatContent,
  analyzeImage,
  processContentWithFiles,
} from "./services/ai";
import { aiManager } from "../services/aiManager";
import { processInput } from "./services/inputPipeline";
import {
  textExtractionService,
  TextExtractionService,
} from "./services/textExtraction";
import session from "express-session";
import multer from "multer";
import type { Request, Response, NextFunction } from "express";

// File upload error handler
const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Maximum file size is 50MB per file.",
        error: "FILE_TOO_LARGE",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "Too many files. Maximum 10 files allowed.",
        error: "TOO_MANY_FILES",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unexpected file field.",
        error: "UNEXPECTED_FILE",
      });
    }
    return res.status(400).json({
      message: `Upload error: ${error.message}`,
      error: error.code,
    });
  }

  if (error.message && error.message.includes("File type")) {
    return res.status(400).json({
      message: error.message,
      error: "UNSUPPORTED_FILE_TYPE",
    });
  }

  next(error);
};

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const requireCR = (req: any, res: any, next: any) => {
  if (!req.session.userId || req.session.userRole !== "cr") {
    return res.status(403).json({ message: "CR access required" });
  }
  next();
};

// All route and middleware definitions go here
export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware setup (must be before all routes)
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecretkey",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    })
  );
  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "Username and password required" });
      }
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }
      // Check password (assume plain text for demo, use hashing in production)
      if (user.password !== password) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }
      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          class: user.class,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          class: user.class,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Updates routes
  app.get("/api/updates", requireAuth, async (req, res) => {
    try {
      const { category, limit, offset } = req.query;

      const updates = await storage.getUpdates({
        category: category as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      // Mark view status for current user
      for (const update of updates) {
        update.hasViewed = await storage.hasUserViewed(
          req.session.userId!,
          update.id
        );
      }

      res.json(updates);
    } catch (error) {
      console.error("Get updates error:", error);
      res.status(500).json({ message: "Failed to get updates" });
    }
  });

  app.get("/api/updates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const update = await storage.getUpdate(id);

      if (!update) {
        return res.status(404).json({ message: "Update not found" });
      }

      // Increment view count and mark as viewed
      await storage.incrementViewCount(id);
      await storage.markAsViewed(req.session.userId!, id);

      update.hasViewed = true;
      res.json(update);
    } catch (error) {
      console.error("Get update error:", error);
      res.status(500).json({ message: "Failed to get update" });
    }
  });

  // Delete update endpoint
  app.delete(
    "/api/updates/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const userId = req.session.userId!;

        // Get the update to check ownership
        const update = await storage.getUpdate(id);
        if (!update) {
          return res.status(404).json({ message: "Update not found" });
        }

        // Check if user is the author or has CR role
        const userRole = req.session.userRole;
        if (update.author.id !== userId && userRole !== "cr") {
          return res
            .status(403)
            .json({ message: "Not authorized to delete this update" });
        }

        // Delete the update
        const deleted = await storage.deleteUpdate(id);
        if (!deleted) {
          return res.status(500).json({ message: "Failed to delete update" });
        }

        res.json({ message: "Update deleted successfully" });
      } catch (error) {
        console.error("Delete update error:", error);
        res.status(500).json({ message: "Failed to delete update" });
      }
    }
  );

  app.post(
    "/api/updates",
    requireCR,
    upload.array("files", 10), // Increased from 5 to 10 files
    handleUploadError,
    async (req: Request, res: Response) => {
      try {
        console.log("[updates] Received create request");
        const {
          content,
          originalContent,
          category,
          priority,
          isUrgent,
          dueDate,
        } = req.body;
        const files = req.files as Express.Multer.File[];

        let aiInput = originalContent || content || "";
        let inputType: "text" | "image" | "pdf" | "docx" = "text";

        // If no text content but files exist, try to extract text from files
        if (!aiInput.trim() && files && files.length > 0) {
          const firstFile = files[0];
          const fileExt = firstFile.originalname.toLowerCase().split(".").pop();

          if (fileExt === "pdf") {
            aiInput = firstFile.path;
            inputType = "pdf";
          } else if (fileExt === "docx" || fileExt === "doc") {
            aiInput = firstFile.path;
            inputType = "docx";
          } else if (
            ["jpg", "jpeg", "png", "gif", "bmp"].includes(fileExt || "")
          ) {
            // For images, read file and convert to base64
            try {
              const fs = require("fs");
              const imageBuffer = fs.readFileSync(firstFile.path);
              aiInput = imageBuffer.toString("base64");
              inputType = "image";
            } catch (error) {
              console.error("Error reading image file:", error);
              aiInput = `Image file uploaded: ${firstFile.originalname}`;
              inputType = "text";
            }
          } else {
            // For other file types, create a basic update with filename as content
            aiInput = `File uploaded: ${firstFile.originalname}`;
            inputType = "text";
          }
        }

        // If still no content, provide a default
        if (!aiInput.trim()) {
          aiInput = "New update with attached files";
        }

        // Timeout wrapper for AI pipeline
        const aiPromise = processInput(aiInput, inputType);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("AI pipeline timeout (30s)")),
            30000
          )
        );
        let processed;
        try {
          processed = (await Promise.race([
            aiPromise,
            timeoutPromise,
          ])) as import("./services/inputPipeline").ProcessedAIResult;
        } catch (err) {
          console.error("[updates] AI pipeline error:", err);
          return res
            .status(500)
            .json({ message: "AI processing failed", error: String(err) });
        }
        const {
          title: processedTitle,
          formattedContent: processedContent,
          category: detectedCategory,
          isUrgent: detectedIsUrgent,
          dueDate: detectedDueDate,
          tags,
        } = processed;
        console.log("[updates] AI pipeline complete");

        const updateData = {
          title: processedTitle,
          content: processedContent,
          originalContent: aiInput,
          category: detectedCategory,
          priority: priority || "normal",
          authorId: req.session.userId!,
          isUrgent: detectedIsUrgent,
          dueDate: detectedDueDate ? new Date(detectedDueDate) : undefined,
          tags: tags || [],
        };

        const update = await storage.createUpdate(updateData);
        console.log("[updates] Update created in storage");

        if (files && files.length > 0) {
          for (const file of files) {
            await storage.createFile({
              updateId: update.id,
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
            });
          }
          console.log("[updates] Files saved");
        }

        const completeUpdate = await storage.getUpdate(update.id);
        console.log("[updates] Complete update ready");
        res.status(201).json(completeUpdate);
      } catch (error) {
        console.error("Create update error:", error);
        res
          .status(400)
          .json({ message: "Failed to create update", error: String(error) });
      }
    }
  );

  // New unified upload endpoint - handles text + multiple files
  app.post(
    "/api/updates/unified",
    requireCR,
    upload.array("files", 10),
    handleUploadError,
    async (req: Request, res: Response) => {
      try {
        console.log("[unified-upload] Received unified upload request");
        const { contextText } = req.body;
        const files = req.files as Express.Multer.File[];

        // Validate that we have either context text or files
        if (!contextText?.trim() && (!files || files.length === 0)) {
          return res.status(400).json({
            message: "Either context text or files must be provided",
          });
        }

        // Extract text from all uploaded files
        const extractedTexts = [];

        if (files && files.length > 0) {
          console.log(`[unified-upload] Processing ${files.length} files`);

          for (const file of files) {
            try {
              if (
                TextExtractionService.isSupportedFileType(file.originalname)
              ) {
                const extracted = await textExtractionService.extractText(
                  file.path
                );
                extractedTexts.push({
                  fileName: file.originalname,
                  content: extracted.content,
                  metadata: extracted.metadata,
                });
                console.log(
                  `[unified-upload] Extracted text from ${file.originalname}`
                );
              } else {
                // For unsupported file types, use filename as content
                extractedTexts.push({
                  fileName: file.originalname,
                  content: `File: ${file.originalname}`,
                  metadata: {},
                });
                console.log(
                  `[unified-upload] Unsupported file type: ${file.originalname}`
                );
              }
            } catch (error) {
              console.error(
                `[unified-upload] Error extracting text from ${file.originalname}:`,
                error
              );
              // Continue processing other files
              extractedTexts.push({
                fileName: file.originalname,
                content: `Failed to extract text from ${file.originalname}`,
                metadata: {},
              });
            }
          }
        }

        // Process combined content with AI
        console.log("[unified-upload] Processing content with AI");
        let processed;
        try {
          processed = await processContentWithFiles(
            contextText || "",
            extractedTexts
          );
        } catch (error) {
          console.error("[unified-upload] AI processing error:", error);
          return res.status(500).json({
            message: "AI processing failed",
            error: String(error),
          });
        }

        // Create the update
        const updateData = {
          title: processed.title,
          content: processed.content,
          description: processed.description,
          originalContent: contextText || "",
          category: processed.category.category,
          priority: processed.category.isUrgent ? "urgent" : "normal",
          authorId: req.session.userId!,
          isUrgent: processed.category.isUrgent,
          dueDate: processed.category.dueDate
            ? new Date(processed.category.dueDate)
            : undefined,
          tags: processed.category.tags || [],
        };

        const update = await storage.createUpdate(updateData);
        console.log("[unified-upload] Update created in storage");

        // Save files to storage
        if (files && files.length > 0) {
          console.log("[unified-upload] Saving files to storage");
          for (const file of files) {
            await storage.createFile({
              updateId: update.id,
              filename: `${Date.now()}-${file.originalname}`,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
            });
          }
          console.log("[unified-upload] Files saved");
        }

        const completeUpdate = await storage.getUpdate(update.id);
        console.log("[unified-upload] Complete update ready");

        res.status(201).json({
          update: completeUpdate,
          processing: {
            extractedTexts: processed.extractedTexts?.map((et) => ({
              fileName: et.fileName,
              extractedLength: et.content.length,
            })),
            category: processed.category,
          },
        });
      } catch (error) {
        console.error("[unified-upload] Error:", error);
        res.status(400).json({
          message: "Failed to process unified upload",
          error: String(error),
        });
      }
    }
  );

  // AI routes
  app.post("/api/ai/categorize", requireCR, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const result = await categorizeContent(content);
      res.json(result);
    } catch (error) {
      console.error("AI categorization error:", error);
      res.status(500).json({ message: "Failed to categorize content" });
    }
  });

  app.post("/api/ai/format", requireCR, async (req, res) => {
    try {
      const { content, category } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const categoryData = category || {
        category: "general",
        confidence: 0.5,
        isUrgent: false,
        tags: [],
      };
      const result = await formatContent(content, categoryData);
      res.json(result);
    } catch (error) {
      console.error("AI formatting error:", error);
      res.status(500).json({ message: "Failed to format content" });
    }
  });

  app.post(
    "/api/ai/analyze-image",
    requireCR,
    upload.single("image"),
    async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "Image file is required" });
        }

        // Convert image to base64
        const imageBuffer = fs.readFileSync(file.path);
        const base64Image = imageBuffer.toString("base64");

        const extractedText = await analyzeImage(base64Image);

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        res.json({ extractedText });
      } catch (error) {
        console.error("Image analysis error:", error);
        res.status(500).json({ message: "Failed to analyze image" });
      }
    }
  );

  // AI Test route
  app.post("/api/ai/test", requireCR, async (req, res) => {
    try {
      const { prompt, provider } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      console.log(
        `[ai-test] Testing AI with provider: ${provider || "auto-fallback"}`
      );
      console.log(`[ai-test] Prompt: ${prompt.substring(0, 100)}...`);

      let result;
      if (provider === "huggingface") {
        result = await aiManager.useHuggingFace(prompt);
      } else if (provider === "gemini") {
        result = await aiManager.useGemini("gemini-1.5-flash", prompt);
      } else {
        // Use automatic fallback
        result = await aiManager.generateWithFallback(prompt, "gemini");
      }

      if (result.success) {
        console.log(`[ai-test] Success with provider: ${result.provider}`);
        res.json({
          success: true,
          provider: result.provider,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(`[ai-test] Failed: ${result.error}`);
        res.status(500).json({
          success: false,
          error: result.error,
          provider: result.provider,
        });
      }
    } catch (error) {
      console.error("AI test error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test AI provider",
        error: String(error),
      });
    }
  });

  // File routes
  app.get("/api/files/:filename", requireAuth, async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = getFilePath(filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      // Get file info from storage by searching through all files
      const allFiles = await storage.getAllFiles();
      const file = allFiles.find((f) => f.filename === filename);

      const download = req.query.download === "true";

      if (file && download) {
        // Increment download count only for actual downloads
        await storage.incrementDownloadCount(file.updateId);
      }

      // Set appropriate headers for inline viewing vs download
      if (download) {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file?.originalName || filename}"`
        );
      } else {
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${file?.originalName || filename}"`
        );

        // Set proper Content-Type for preview
        if (file?.mimeType) {
          res.setHeader("Content-Type", file.mimeType);
        }

        // Add headers to allow iframe embedding
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
      }

      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Dedicated preview endpoint
  app.get("/api/preview/:filename", requireAuth, async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = getFilePath(filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      // Get file info from storage
      const allFiles = await storage.getAllFiles();
      const file = allFiles.find((f) => f.filename === filename);

      // Force inline display for preview with minimal headers
      res.setHeader("Content-Disposition", "inline");

      if (file?.mimeType) {
        res.setHeader("Content-Type", file.mimeType);
      }

      // Send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("File preview error:", error);
      res.status(500).json({ message: "Failed to preview file" });
    }
  });

  // Admin endpoint to regenerate descriptions for existing updates
  app.post(
    "/api/admin/regenerate-descriptions",
    requireAuth,
    async (req, res) => {
      try {
        // Check if user has admin/cr privileges
        const userRole = req.session.userRole;
        if (userRole !== "cr") {
          return res
            .status(403)
            .json({ message: "Access denied. CR privileges required." });
        }

        // Get all updates without pagination
        const allUpdates = await storage.getUpdates({ limit: 1000 }); // Get up to 1000 updates

        let processedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const update of allUpdates) {
          try {
            // Skip if description already exists and is meaningful (more than just basic info)
            if (
              update.description &&
              update.description.length > 50 &&
              !update.description.includes("No schedule mentioned") &&
              !update.description.includes("No deadline mentioned")
            ) {
              continue;
            }

            // Use the content field if available, otherwise use title
            const contentToAnalyze = update.content || update.title;

            if (!contentToAnalyze || contentToAnalyze.trim().length < 10) {
              errors.push(
                `Update ${update.id}: Insufficient content to analyze`
              );
              errorCount++;
              continue;
            }

            // Use the AI service to generate new description
            const categoryResult = {
              category: update.category as
                | "assignments"
                | "notes"
                | "presentations"
                | "general",
              confidence: 1.0,
              isUrgent: false,
              tags: [],
            };
            const result = await formatContent(
              contentToAnalyze,
              categoryResult
            );

            if (result && result.content && result.content.trim().length > 0) {
              // Extract description from the formatted content
              // The AI returns content that should be used as description
              await storage.updateDescription(update.id, result.content);
              processedCount++;
            } else {
              errors.push(
                `Update ${update.id}: AI failed to generate description`
              );
              errorCount++;
            }
          } catch (error) {
            errors.push(
              `Update ${update.id}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            errorCount++;
          }
        }

        res.json({
          message: "Description regeneration completed",
          totalUpdates: allUpdates.length,
          processedCount,
          errorCount,
          errors: errors.slice(0, 10), // Limit to first 10 errors
        });
      } catch (error) {
        console.error("Regenerate descriptions error:", error);
        res.status(500).json({ message: "Failed to regenerate descriptions" });
      }
    }
  );

  // Stats routes
  app.get("/api/stats/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
