import mongoose from "mongoose";
import {
  type User,
  type InsertUser,
  type Update,
  type InsertUpdate,
  type File,
  type InsertFile,
  type UpdateWithAuthor,
  type DashboardStats,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { IStorage } from "../storage";
import {
  UserModel,
  UpdateModel,
  FileModel,
  UserViewModel,
  type IUserDocument,
  type IUpdateDocument,
  type IFileDocument,
  type IUserViewDocument,
} from "../models/mongodb";

export class MongoStorage implements IStorage {
  private isConnected = false;
  private connectionPromise: Promise<void>;

  constructor() {
    this.connectionPromise = this.connect();
  }

  private async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error("MONGODB_URI environment variable is not set");
      }

      // Simplified connection options for better compatibility
      const options = {
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 1, // Maintain at least 1 socket connection
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      };

      await mongoose.connect(mongoUri, options);
      console.log("Connected to MongoDB successfully");
      this.isConnected = true;

      // Initialize sample data if collections are empty
      await this.initializeSampleData();
    } catch (error) {
      console.error("MongoDB connection error:", error);
      this.isConnected = false;
      throw error;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connectionPromise;
    }
  }

  private async initializeSampleData() {
    try {
      // Check if users exist
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        console.log("Initializing sample data...");

        // Create sample CR user
        const crUser = new UserModel({
          _id: randomUUID(),
          username: "farhanisthis@gmail.com",
          password: "123456", // In production, this would be hashed
          role: "cr",
          name: "Farhan Ali",
          class: "Computer Science - Semester 5",
          createdAt: new Date(),
        });
        await crUser.save();

        // Create sample student user
        const studentUser = new UserModel({
          _id: randomUUID(),
          username: "john.student",
          password: "password123",
          role: "student",
          name: "John Doe",
          class: "Computer Science - Semester 5",
          createdAt: new Date(),
        });
        await studentUser.save();

        console.log("Sample data initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      const user = await UserModel.findById(id).lean();
      return user ? this.mapUserDocument(user) : undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      const user = await UserModel.findOne({ username }).lean();
      return user ? this.mapUserDocument(user) : undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      await this.ensureConnected();
      const user = new UserModel({
        _id: randomUUID(),
        ...insertUser,
        createdAt: new Date(),
      });
      await user.save();
      return this.mapUserDocument(user.toObject());
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Update methods
  async getUpdates(filters?: {
    category?: string;
    authorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<UpdateWithAuthor[]> {
    try {
      await this.ensureConnected();
      const query: any = {};
      if (filters?.category) query.category = filters.category;
      if (filters?.authorId) query.authorId = filters.authorId;

      const updates = await UpdateModel.find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 50)
        .skip(filters?.offset || 0)
        .lean();

      // Get authors for all updates
      const authorIds = Array.from(new Set(updates.map((u) => u.authorId)));
      const authors = await UserModel.find({ _id: { $in: authorIds } }).lean();
      const authorMap = new Map(authors.map((a) => [a._id, a]));

      // Get files for all updates
      const updateIds = updates.map((u) => u._id);
      const files = await FileModel.find({
        updateId: { $in: updateIds },
      }).lean();
      const filesMap = new Map<string, File[]>();
      files.forEach((file) => {
        if (!filesMap.has(file.updateId)) {
          filesMap.set(file.updateId, []);
        }
        filesMap.get(file.updateId)!.push(this.mapFileDocument(file));
      });

      return updates.map((update) => {
        const author = authorMap.get(update.authorId);
        const updateFiles = filesMap.get(update._id) || [];

        return {
          ...this.mapUpdateDocument(update),
          author: author
            ? this.mapUserDocument(author)
            : {
                id: update.authorId,
                name: "Unknown User",
                role: "student",
                username: "",
                password: "",
                class: "",
                createdAt: new Date(),
              },
          files: updateFiles,
        };
      });
    } catch (error) {
      console.error("Error getting updates:", error);
      return [];
    }
  }

  async getUpdate(id: string): Promise<UpdateWithAuthor | undefined> {
    try {
      await this.ensureConnected();
      const update = await UpdateModel.findById(id).lean();
      if (!update) return undefined;

      const author = await UserModel.findById(update.authorId).lean();
      const files = await FileModel.find({ updateId: id }).lean();

      return {
        ...this.mapUpdateDocument(update),
        author: author
          ? this.mapUserDocument(author)
          : {
              id: update.authorId,
              name: "Unknown User",
              role: "student",
              username: "",
              password: "",
              class: "",
              createdAt: new Date(),
            },
        files: files.map((f) => this.mapFileDocument(f)),
      };
    } catch (error) {
      console.error("Error getting update:", error);
      return undefined;
    }
  }

  async createUpdate(insertUpdate: InsertUpdate): Promise<Update> {
    try {
      await this.ensureConnected();
      const update = new UpdateModel({
        _id: randomUUID(),
        ...insertUpdate,
        createdAt: new Date(),
        viewCount: 0,
        downloadCount: 0,
      });
      await update.save();
      return this.mapUpdateDocument(update.toObject());
    } catch (error) {
      console.error("Error creating update:", error);
      throw error;
    }
  }

  async updateUpdate(
    id: string,
    updateData: Partial<InsertUpdate>
  ): Promise<Update | undefined> {
    try {
      const updated = await UpdateModel.findByIdAndUpdate(id, updateData, {
        new: true,
      }).lean();
      return updated ? this.mapUpdateDocument(updated) : undefined;
    } catch (error) {
      console.error("Error updating update:", error);
      return undefined;
    }
  }

  async updateDescription(id: string, description: string): Promise<boolean> {
    try {
      const result = await UpdateModel.findByIdAndUpdate(
        id,
        { description, updatedAt: new Date() },
        { new: true }
      );
      return !!result;
    } catch (error) {
      console.error("Error updating description:", error);
      return false;
    }
  }

  async deleteUpdate(id: string): Promise<boolean> {
    try {
      // Delete associated files first
      await FileModel.deleteMany({ updateId: id });

      // Delete user views
      await UserViewModel.deleteMany({ updateId: id });

      // Delete the update
      const result = await UpdateModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error("Error deleting update:", error);
      return false;
    }
  }

  async incrementViewCount(id: string): Promise<void> {
    try {
      await UpdateModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  }

  async incrementDownloadCount(id: string): Promise<void> {
    try {
      await UpdateModel.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } });
    } catch (error) {
      console.error("Error incrementing download count:", error);
    }
  }

  // File methods
  async createFile(insertFile: InsertFile): Promise<File> {
    try {
      const file = new FileModel({
        _id: randomUUID(),
        ...insertFile,
        createdAt: new Date(),
      });
      await file.save();
      return this.mapFileDocument(file.toObject());
    } catch (error) {
      console.error("Error creating file:", error);
      throw error;
    }
  }

  async getFilesByUpdateId(updateId: string): Promise<File[]> {
    try {
      const files = await FileModel.find({ updateId }).lean();
      return files.map((f) => this.mapFileDocument(f));
    } catch (error) {
      console.error("Error getting files by update ID:", error);
      return [];
    }
  }

  async getAllFiles(): Promise<File[]> {
    try {
      const files = await FileModel.find().lean();
      return files.map((f) => this.mapFileDocument(f));
    } catch (error) {
      console.error("Error getting all files:", error);
      return [];
    }
  }

  async getFile(id: string): Promise<File | undefined> {
    try {
      const file = await FileModel.findById(id).lean();
      return file ? this.mapFileDocument(file) : undefined;
    } catch (error) {
      console.error("Error getting file:", error);
      return undefined;
    }
  }

  async deleteFile(id: string): Promise<boolean> {
    try {
      const result = await FileModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  // Stats methods
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const totalUpdates = await UpdateModel.countDocuments();

      // Get updates from this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeek = await UpdateModel.countDocuments({
        createdAt: { $gte: oneWeekAgo },
      });

      // Get category counts
      const categoryCounts = await UpdateModel.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]);

      const counts = {
        all: totalUpdates,
        assignments: 0,
        notes: 0,
        presentations: 0,
        general: 0,
      };

      categoryCounts.forEach((item) => {
        if (item._id in counts) {
          counts[item._id as keyof typeof counts] = item.count;
        }
      });

      return {
        totalUpdates,
        thisWeek,
        counts,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return {
        totalUpdates: 0,
        thisWeek: 0,
        counts: {
          all: 0,
          assignments: 0,
          notes: 0,
          presentations: 0,
          general: 0,
        },
      };
    }
  }

  // User views methods
  async markAsViewed(userId: string, updateId: string): Promise<void> {
    try {
      await UserViewModel.findOneAndUpdate(
        { userId, updateId },
        {
          _id: randomUUID(),
          userId,
          updateId,
          viewedAt: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error marking as viewed:", error);
    }
  }

  async hasUserViewed(userId: string, updateId: string): Promise<boolean> {
    try {
      const view = await UserViewModel.findOne({ userId, updateId });
      return !!view;
    } catch (error) {
      console.error("Error checking if user viewed:", error);
      return false;
    }
  }

  // Helper methods to map MongoDB documents to application types
  private mapUserDocument(doc: any): User {
    return {
      id: doc._id,
      username: doc.username,
      password: doc.password,
      role: doc.role,
      name: doc.name,
      class: doc.class,
      createdAt: doc.createdAt,
    };
  }

  private mapUpdateDocument(doc: any): Update {
    return {
      id: doc._id,
      title: doc.title,
      content: doc.content,
      description: doc.description,
      originalContent: doc.originalContent,
      category: doc.category,
      priority: doc.priority,
      tags: doc.tags,
      authorId: doc.authorId,
      isUrgent: doc.isUrgent,
      dueDate: doc.dueDate,
      viewCount: doc.viewCount,
      downloadCount: doc.downloadCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapFileDocument(doc: any): File {
    return {
      id: doc._id,
      updateId: doc.updateId,
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      path: doc.path,
      createdAt: doc.createdAt,
    };
  }
}
