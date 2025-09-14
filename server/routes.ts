import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUpdateSchema, loginSchema, createUpdateSchema } from "@shared/schema";
import { categorizeContent, formatContent, analyzeImage } from "./services/ai";
import { upload, getFilePath } from "./services/fileUpload";
import path from "path";
import fs from "fs";
import session from "express-session";

// Session types are defined in types/session.d.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireCR = (req: any, res: any, next: any) => {
    if (!req.session.userId || req.session.userRole !== 'cr') {
      return res.status(403).json({ message: "CR access required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userName = user.name;

      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          class: user.class,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
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
      const user = await storage.getUser(req.session.userId);
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
        }
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
        update.hasViewed = await storage.hasUserViewed(req.session.userId, update.id);
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
      await storage.markAsViewed(req.session.userId, id);

      update.hasViewed = true;
      res.json(update);
    } catch (error) {
      console.error("Get update error:", error);
      res.status(500).json({ message: "Failed to get update" });
    }
  });

  app.post("/api/updates", requireCR, upload.array('files', 5), async (req, res) => {
    try {
      const { title, content, originalContent, category, priority, isUrgent, dueDate } = req.body;
      const files = req.files as Express.Multer.File[];

      let processedContent = content;
      let processedTitle = title;
      let detectedCategory = category;
      let detectedIsUrgent = isUrgent === 'true';
      let detectedDueDate = dueDate;

      // If no title/content provided but have original content, use AI to process
      if (originalContent && (!title || !content)) {
        const categoryResult = await categorizeContent(originalContent);
        const formattedResult = await formatContent(originalContent, categoryResult);
        
        processedTitle = formattedResult.title;
        processedContent = formattedResult.content;
        detectedCategory = detectedCategory || formattedResult.category.category;
        detectedIsUrgent = detectedIsUrgent || formattedResult.category.isUrgent;
        detectedDueDate = detectedDueDate || formattedResult.category.dueDate;
      }

      // Create update
      const updateData = {
        title: processedTitle,
        content: processedContent,
        originalContent: originalContent || content,
        category: detectedCategory,
        priority: priority || 'normal',
        authorId: req.session.userId,
        isUrgent: detectedIsUrgent,
        dueDate: detectedDueDate ? new Date(detectedDueDate) : undefined,
        tags: [],
      };

      const update = await storage.createUpdate(updateData);

      // Handle file uploads
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
      }

      // Get the complete update with author and files
      const completeUpdate = await storage.getUpdate(update.id);
      res.status(201).json(completeUpdate);
    } catch (error) {
      console.error("Create update error:", error);
      res.status(400).json({ message: "Failed to create update" });
    }
  });

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

      const categoryData = category || { category: 'general', confidence: 0.5, isUrgent: false, tags: [] };
      const result = await formatContent(content, categoryData);
      res.json(result);
    } catch (error) {
      console.error("AI formatting error:", error);
      res.status(500).json({ message: "Failed to format content" });
    }
  });

  app.post("/api/ai/analyze-image", requireCR, upload.single('image'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      // Convert image to base64
      const imageBuffer = fs.readFileSync(file.path);
      const base64Image = imageBuffer.toString('base64');

      const extractedText = await analyzeImage(base64Image);
      
      // Clean up uploaded file
      fs.unlinkSync(file.path);

      res.json({ extractedText });
    } catch (error) {
      console.error("Image analysis error:", error);
      res.status(500).json({ message: "Failed to analyze image" });
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
      const file = allFiles.find(f => f.filename === filename);
      
      if (file) {
        // Increment download count
        await storage.incrementDownloadCount(file.updateId);
      }

      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

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
