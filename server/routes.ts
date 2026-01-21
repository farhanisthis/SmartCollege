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
import { aiManager } from "./services/aiManager";
import { processInput } from "./services/inputPipeline";
import {
  textExtractionService,
  TextExtractionService,
} from "./services/textExtraction";
import { getWebSocketService } from "./services/websocket";
import session from "express-session";
import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import performanceRoutes from "./routes/performance";
import notificationRoutes from "./routes/notifications";
import attendanceRoutes from "./routes/attendance";
import bulkUsersRoutes from "./routes/bulk-users";
import subjectsRoutes from "./routes/subjects";
import timetableRoutes from "./routes/timetable";
import { generatePerformanceInsight, summarizeText } from "./services/gemini";
import { compare } from "bcrypt";

// File upload error handler
const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
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
  // Enable trust proxy for Render (required for secure cookies)
  app.set("trust proxy", 1);

  // Session middleware setup (must be before all routes)
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecretkey",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in production
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // none for cross-site
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }),
  );

  // Health check / root endpoint
  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      message: "SmartCollege API Server is running",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      let { username, password } = req.body;

      // Trim whitespace to prevent copy-paste errors
      username = typeof username === "string" ? username.trim() : username;
      password = typeof password === "string" ? password.trim() : password;

      console.log(`[Login Attempt] Username: '${username}'`);

      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "Username and password required" });
      }

      // Find user by username
      const user = await storage.getUserByUsername(username);

      console.log(`[Login Attempt] User found: ${!!user}`);

      if (!user) {
        console.log(`[Login Attempt] Failed: User not found`);
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Check password (support both hashed and legacy plain text)
      const isMatch = await compare(password, user.password).catch(() => false);

      if (!isMatch && user.password !== password) {
        console.log(
          `[Login Attempt] Failed: Password mismatch for user '${username}'`,
        );
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      console.log(`[Login Attempt] Success for user '${username}'`);

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
          rollNumber: user.rollNumber, // Include rollNumber for attendance matching
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
          rollNumber: user.rollNumber, // Include rollNumber for attendance matching
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Profile routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user stats
      const stats = await storage.getUserStats(req.session.userId!);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          class: user.class,
          phone: user.phone,
          location: user.location,
          bio: user.bio,
          department: user.department,
          year: user.year,
          rollNumber: user.rollNumber,
          createdAt: user.createdAt,
          passwordChangedAt: user.passwordChangedAt,
        },
        stats,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const { name, phone, location, bio, department, year, rollNumber } =
        req.body;

      const updatedUser = await storage.updateProfile(req.session.userId!, {
        name,
        phone,
        location,
        bio,
        department,
        year,
        rollNumber,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          role: updatedUser.role,
          class: updatedUser.class,
          phone: updatedUser.phone,
          location: updatedUser.location,
          bio: updatedUser.bio,
          department: updatedUser.department,
          year: updatedUser.year,
          rollNumber: updatedUser.rollNumber,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update username
  app.put("/api/profile/username", requireAuth, async (req, res) => {
    try {
      const { newUsername } = req.body;

      if (!newUsername || newUsername.trim().length === 0) {
        return res.status(400).json({ message: "Username is required" });
      }

      const updatedUser = await storage.updateUsername(req.session.userId!, newUsername.trim());

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update session with new username
      req.session.userRole = updatedUser.role;

      res.json({
        message: "Username updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          role: updatedUser.role,
          class: updatedUser.class,
        },
      });
    } catch (error: any) {
      console.error("Update username error:", error);
      if (error.message === "Username already taken") {
        return res.status(409).json({ message: "Username already taken" });
      }
      res.status(500).json({ message: "Failed to update username" });
    }
  });

  // Change password
  app.put("/api/profile/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const success = await storage.updatePassword(req.session.userId!, currentPassword, newPassword);

      if (!success) {
        return res.status(400).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Update password error:", error);
      if (error.message === "Current password is incorrect") {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Preferences routes
  app.get("/api/preferences", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        preferences: user.preferences || {
          notifications: {
            assignments: true,
            presentations: true,
            announcements: true,
            reminders: true,
            emailDigest: false,
            pushNotifications: true,
            soundEnabled: true,
          },
          display: {
            compactMode: false,
            showPreviewCards: true,
            animationsEnabled: true,
            highContrast: false,
          },
          privacy: {
            profileVisibility: "public",
            showOnlineStatus: true,
            allowDirectMessages: true,
            dataCollection: true,
          },
          language: "en",
          timezone: "UTC",
        },
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  app.put("/api/preferences", requireAuth, async (req, res) => {
    try {
      const { preferences } = req.body;

      const updatedUser = await storage.updatePreferences(
        req.session.userId!,
        preferences,
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "Preferences updated successfully",
        preferences: updatedUser.preferences,
      });
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Updates routes
  app.get("/api/updates", requireAuth, async (req, res) => {
    try {
      const { category, limit, offset, search } = req.query;

      const updates = await storage.getUpdates({
        category: category as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        search: search as string,
      });

      // Mark view status for current user
      for (const update of updates) {
        update.hasViewed = await storage.hasUserViewed(
          req.session.userId!,
          update.id,
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

      // Check if user has already viewed this update
      const hasViewed = await storage.hasUserViewed(req.session.userId!, id);

      // Only increment view count if this is the user's first view
      if (!hasViewed) {
        await storage.incrementViewCount(id);
        await storage.markAsViewed(req.session.userId!, id);
      }

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

        // Broadcast update deletion via WebSocket
        try {
          const webSocketService = getWebSocketService();
          webSocketService.broadcastUpdateChange(update, "deleted");
        } catch (wsError) {
          console.error("WebSocket broadcast error:", wsError);
          // Don't fail the deletion if WebSocket fails
        }

        res.json({ message: "Update deleted successfully" });
      } catch (error) {
        console.error("Delete update error:", error);
        res.status(500).json({ message: "Failed to delete update" });
      }
    },
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
            30000,
          ),
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
          subject: processedSubject,
          formattedContent: processedContent,
          category: detectedCategory,
          isUrgent: detectedIsUrgent,
          dueDate: detectedDueDate,
          deadlineDate: detectedDeadlineDate,
          tags,
        } = processed;
        console.log("[updates] AI pipeline complete");

        const updateData = {
          title: processedTitle,
          content: processedContent,
          description: processedContent, // Save AI-generated content as description too
          originalContent: aiInput,
          category: detectedCategory,
          subject: processedSubject,
          priority: priority || "normal",
          authorId: req.session.userId!,
          isUrgent: detectedIsUrgent,
          dueDate: detectedDueDate ? new Date(detectedDueDate) : undefined,
          deadlineDate: detectedDeadlineDate
            ? new Date(detectedDeadlineDate)
            : undefined,
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

        // Broadcast new update via WebSocket
        if (completeUpdate) {
          try {
            const webSocketService = getWebSocketService();
            webSocketService.broadcastNewUpdate(completeUpdate);
            console.log("[updates] WebSocket broadcast sent");
          } catch (wsError) {
            console.error("WebSocket broadcast error:", wsError);
            // Don't fail the creation if WebSocket fails
          }
        }

        res.status(201).json(completeUpdate);
      } catch (error) {
        console.error("Create update error:", error);
        res
          .status(400)
          .json({ message: "Failed to create update", error: String(error) });
      }
    },
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
                  file.path,
                );
                extractedTexts.push({
                  fileName: file.originalname,
                  content: extracted.content,
                  metadata: extracted.metadata,
                });
                console.log(
                  `[unified-upload] Extracted text from ${file.originalname}`,
                );
              } else {
                // For unsupported file types, use filename as content
                extractedTexts.push({
                  fileName: file.originalname,
                  content: `File: ${file.originalname}`,
                  metadata: {},
                });
                console.log(
                  `[unified-upload] Unsupported file type: ${file.originalname}`,
                );
              }
            } catch (error) {
              console.error(
                `[unified-upload] Error extracting text from ${file.originalname}:`,
                error,
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
            extractedTexts.map((et) => et.content),
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
          content: Array.isArray(processed.content)
            ? processed.content.map((item) => `• ${item}`).join("\n")
            : processed.content,
          description: Array.isArray(processed.description)
            ? processed.description.map((item) => `• ${item}`).join("\n")
            : processed.description,
          originalContent: contextText || "",
          category: processed.category.category,
          subject: processed.subject || null,
          priority: processed.category.isUrgent ? "urgent" : "normal",
          authorId: req.session.userId!,
          isUrgent: processed.category.isUrgent,
          dueDate: processed.category.dueDate
            ? new Date(processed.category.dueDate)
            : undefined,
          deadlineDate: processed.category.deadlineDate
            ? new Date(processed.category.deadlineDate)
            : undefined,
          tags: processed.category.tags || [],
        };

        console.log("[unified-upload] UpdateData being sent to storage:", {
          title: updateData.title,
          subject: updateData.subject,
          category: updateData.category,
          dueDate: updateData.dueDate,
          deadlineDate: updateData.deadlineDate,
          isUrgent: updateData.isUrgent,
          tags: updateData.tags,
        });

        const update = await storage.createUpdate(updateData);
        console.log("[unified-upload] Update created in storage:", {
          id: update.id,
          subject: update.subject,
          title: update.title,
        });

        // Save files to storage
        if (files && files.length > 0) {
          console.log("[unified-upload] Saving files to storage");
          for (const file of files) {
            await storage.createFile({
              updateId: update.id,
              filename: file.filename, // Use the actual filename from multer
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

        // Broadcast new update via WebSocket
        if (completeUpdate) {
          try {
            const webSocketService = getWebSocketService();
            webSocketService.broadcastNewUpdate(completeUpdate);
            console.log("[unified-upload] WebSocket broadcast sent");
          } catch (wsError) {
            console.error("WebSocket broadcast error:", wsError);
            // Don't fail the creation if WebSocket fails
          }
        }

        res.status(201).json({
          update: completeUpdate,
          processing: {
            extractedTexts: extractedTexts.map((et) => ({
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
    },
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
    },
  );

  // --- New AI Features ---
  app.post("/api/ai/performance-insight", async (req, res) => {
    if (!req.session.userId) return res.status(401).send("Unauthorized");
    try {
      console.log("[API] Generating performance insight...");
      const insight = await generatePerformanceInsight(req.body);
      console.log("[API] Insight generated:", insight.slice(0, 50) + "...");
      res.json({ insight });
    } catch (e: any) {
      console.error("[API] Gemini Error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/ai/summarize", async (req, res) => {
    if (!req.session.userId) return res.status(401).send("Unauthorized");
    try {
      const { text } = req.body;
      if (!text) return res.status(400).send("Text is required");

      const summary = await summarizeText(text);
      res.json({ summary });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // AI Test route
  app.post("/api/ai/test", requireCR, async (req, res) => {
    try {
      const { prompt, provider } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      console.log(
        `[ai-test] Testing AI with provider: ${provider || "auto-fallback"}`,
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

  // Simple Gemini v1 test endpoint (no auth required for debugging)
  app.get("/api/test/gemini-v1", async (req, res) => {
    try {
      console.log("[gemini-v1-test] Testing Gemini v1 API");

      const result = await aiManager.useGemini(
        "gemini-2.5-flash",
        "Say hello in one word",
      );

      if (result.success) {
        console.log(
          `[gemini-v1-test] ✅ SUCCESS: Using v1 API with provider: ${result.provider}`,
        );
        res.json({
          success: true,
          message: "Gemini v1 API is working correctly!",
          provider: result.provider,
          model: result.model,
          response: result.data,
          timestamp: new Date().toISOString(),
          apiVersion: "v1",
        });
      } else {
        console.log(`[gemini-v1-test] ❌ FAILED: ${result.error}`);
        res.status(500).json({
          success: false,
          message: "Gemini v1 API test failed",
          error: result.error,
          provider: result.provider,
        });
      }
    } catch (error) {
      console.error("[gemini-v1-test] Error:", error);
      res.status(500).json({
        success: false,
        message: "Gemini v1 API test error",
        error: String(error),
      });
    }
  });

  // File routes
  app.get("/api/files/:filename", requireAuth, async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = getFilePath(filename);

      console.log(
        "File request for:",
        filename,
        "from user:",
        req.session.userId,
      );

      if (!fs.existsSync(filePath)) {
        console.log("File not found:", filePath);
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

      console.log(
        "Serving file:",
        filename,
        "download mode:",
        download,
        "MIME type:",
        file?.mimeType,
      );

      // Set appropriate headers for inline viewing vs download
      if (download) {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file?.originalName || filename}"`,
        );
      } else {
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${file?.originalName || filename}"`,
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

      console.log(
        "Preview request for:",
        filename,
        "from user:",
        req.session.userId,
      );

      if (!fs.existsSync(filePath)) {
        console.log("File not found:", filePath);
        return res.status(404).json({ message: "File not found" });
      }

      // Get file info from storage
      const allFiles = await storage.getAllFiles();
      const file = allFiles.find((f) => f.filename === filename);

      // Force inline display for preview with minimal headers
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");

      if (file?.mimeType) {
        res.setHeader("Content-Type", file.mimeType);
      }

      console.log(
        "Serving preview file:",
        filename,
        "with MIME type:",
        file?.mimeType,
      );

      // Send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("File preview error:", error);
        res.status(500).json({ message: "Failed to preview file" });
    }
  });

  // Attach user info to request for authenticated routes
  app.use((req: any, res, next) => {
    if (req.session.userId) {
      req.user = {
        userId: req.session.userId,
        role: req.session.userRole,
      };
    }
    next();
  });

  // Register modular routes
  app.use("/api/performance", performanceRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/bulk-users", bulkUsersRoutes);
  app.use("/api/subjects", subjectsRoutes);
  app.use("/api/timetable", timetableRoutes);

  // Debug endpoint to test authentication
  app.get("/api/debug/auth", requireAuth, async (req, res) => {
    res.json({
      message: "Authentication working",
      userId: req.session.userId,
      userRole: req.session.userRole,
    });
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
                `Update ${update.id}: Insufficient content to analyze`,
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
              categoryResult,
            );

            if (result && result.content && result.content.trim().length > 0) {
              // Extract description from the formatted content
              // The AI returns content that should be used as description
              await storage.updateDescription(update.id, result.content);
              processedCount++;
            } else {
              errors.push(
                `Update ${update.id}: AI failed to generate description`,
              );
              errorCount++;
            }
          } catch (error) {
            errors.push(
              `Update ${update.id}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
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
    },
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

  // Debug endpoint (no auth required) to check updates
  app.get("/api/debug/check-assignments", async (req, res) => {
    try {
      const { UpdateModel } = await import("./models/mongodb");
      const assignments = await UpdateModel.find({
        category: "assignments",
      }).lean();

      res.json({
        count: assignments.length,
        assignments: assignments.map((a) => ({
          id: a._id,
          title: a.title,
          dueDate: a.dueDate,
          category: a.category,
          subject: a.subject,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Update enhancement endpoint
  app.post("/api/updates/:id/enhance", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { id } = req.params;
      const update = await storage.getUpdate(id);

      if (!update) {
        return res.status(404).json({ message: "Update not found" });
      }

      // Use the existing description or content as base
      const baseContent = update.description || update.content;

      // Create an enhanced prompt for better formatting
      const enhancementPrompt = `
Please enhance and reformat the following text to be more detailed, professional, and well-formatted. 
Add bullet points for lists, proper headings, and more context where needed.
Make it comprehensive and easy to read while maintaining all the original information.
Focus on clarity, proper formatting, and adding helpful details.

Original text:
${baseContent}

Please provide a well-formatted, enhanced version with:
- Clear headings and subheadings
- Bullet points for lists
- Proper formatting
- Additional helpful context
- Professional tone
- Better organization
`;

      // Try to get enhanced description using AI
      const result = await aiManager.generateWithFallback(
        enhancementPrompt,
        "gemini",
      );

      let enhancedDescription = baseContent; // fallback to original

      if (result.success && result.data) {
        enhancedDescription = result.data.trim();
        // Clean up any markdown formatting markers that shouldn't be there
        enhancedDescription = enhancedDescription
          .replace(/^```.*\n|```$/gm, "")
          .trim();
      }

      res.json({
        enhancedDescription,
        original: baseContent,
      });
    } catch (error) {
      console.error("Enhancement error:", error);
      res.status(500).json({
        message: "Failed to enhance description",
        error: String(error),
      });
    }
  });

  // Performance tracking routes
  app.use("/api/performance", performanceRoutes);

  // Notification routes
  app.use("/api/notifications", notificationRoutes);

  // Attendance routes
  app.use("/api/attendance", attendanceRoutes);

  // Bulk user management routes
  app.use("/api/bulk-users", bulkUsersRoutes);

  // Memory monitoring endpoint for debugging
  app.get("/api/health/memory", (req, res) => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // Resident Set Size
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    res.json({
      memory: memUsageMB,
      uptime: Math.round(process.uptime()),
      aiInstances: aiManager.getStatus().geminiInstancesInitialized,
    });
  });

  // OCR test page route
  app.get("/test-ocr", (req, res) => {
    const htmlPath = path.join(process.cwd(), "test-enhanced-ocr.html");
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send("OCR test page not found");
    }
  });

  // Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", ip: _req.ip });
  });

  const httpServer = createServer(app);
  return httpServer;
}
