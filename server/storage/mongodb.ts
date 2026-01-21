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
import bcrypt from "bcrypt";
import {
  UserModel,
  UpdateModel,
  FileModel,
  UserViewModel,
  AssignmentSubmissionModel,
  AttendanceModel,
  PresentationModel,
  PerformanceMetricsModel,
  type IUserDocument,
  type IUpdateDocument,
  type IFileDocument,
  type IUserViewDocument,
  type IAttendanceDocument,
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

      // MEMORY OPTIMIZED: Reduced connection pool for low-memory environments
      const options = {
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 3, // REDUCED: Maintain up to 3 socket connections (was 10)
        minPoolSize: 1, // Maintain at least 1 socket connection
        maxIdleTimeMS: 15000, // REDUCED: Close connections after 15 seconds (was 30)
      };

      await mongoose.connect(mongoUri, options);

      // MEMORY OPTIMIZATION: Disable mongoose buffering (this is the correct way)
      mongoose.set("bufferCommands", false);
      console.log("Connected to MongoDB successfully");
      this.isConnected = true;

      // Initialize sample data if collections are empty
      // await this.initializeSampleData();
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
          username: "farhanisthis",
          password: "123456", // In production, this would be hashed
          role: "cr",
          name: "Farhan Ali",
          class: "Computer Science - Semester 5",
          createdAt: new Date(),
        });
        await crUser.save();

        // Create second CR user - Kashish
        const kashishUser = new UserModel({
          _id: randomUUID(),
          username: "kashish",
          password: "123123", // In production, this would be hashed
          role: "cr",
          name: "Kashish",
          class: "Computer Science - Semester 5",
          createdAt: new Date(),
        });
        await kashishUser.save();

        // Create sample student user
        const studentUser = new UserModel({
          _id: randomUUID(),
          username: "rohit",
          password: "123123",
          role: "student",
          name: "Rohit",
          class: "Computer Science - Semester 5",
          createdAt: new Date(),
        });
        await studentUser.save();

        // Initialize sample performance data
        await this.initializeSamplePerformanceData(
          [crUser._id, kashishUser._id],
          [studentUser._id]
        );

        console.log("Sample data initialized successfully");
      } else {
        // Check if Kashish user exists, if not add it
        const kashishExists = await UserModel.findOne({ username: "kashish" });
        if (!kashishExists) {
          console.log("Adding new CR user: Kashish");
          const kashishUser = new UserModel({
            _id: randomUUID(),
            username: "kashish",
            password: "123123", // In production, this would be hashed
            role: "cr",
            name: "Kashish",
            class: "Computer Science - Semester 5",
            createdAt: new Date(),
          });
          await kashishUser.save();
          console.log("Kashish user added successfully");
        }

        // Always check and create performance data if missing
        const performanceCount = await PerformanceMetricsModel.countDocuments();
        if (performanceCount === 0) {
          console.log("Initializing missing performance data...");
          const crUsers = await UserModel.find({ role: "cr" });
          const studentUsers = await UserModel.find({ role: "student" });

          if (crUsers.length > 0 && studentUsers.length > 0) {
            await this.initializeSamplePerformanceData(
              crUsers.map((u) => u._id),
              studentUsers.map((u) => u._id)
            );
          }
        }
      }
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  public async initializeSamplePerformanceData(
    crIds: any[],
    studentIds: any[]
  ) {
    console.log("Initializing sample performance data...");

    // Create attendance records for the past 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      for (const studentId of studentIds) {
        // 85% attendance rate - randomly miss some days
        const subjects = [
          "Mathematics",
          "Physics",
          "Chemistry",
          "English",
          "Computer Science",
        ];

        for (const subjectName of subjects) {
          const isPresent = Math.random() > 0.15;
          
          await AttendanceModel.create({
             _id: randomUUID(),
             studentId: studentId,
             date: date,
             subject: subjectName,
             status: isPresent ? "present" : "absent",
             markedBy: crIds[0],
             classSection: "E1",
             createdAt: new Date(),
             updatedAt: new Date(),
          });
        }
      }
    }

    // Create some sample updates for assignments and presentations
    const assignments = [
      {
        title: "Linear Algebra Problem Set",
        category: "assignments",
        subject: "Mathematics",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      },
      {
        title: "Physics Lab Report - Mechanics",
        category: "assignments",
        subject: "Physics",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
      },
      {
        title: "Organic Chemistry Assignment",
        category: "assignments",
        subject: "Chemistry",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Due in 10 days
      },
      {
        title: "Essay on Modern Literature",
        category: "assignments",
        subject: "English",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Due in 5 days
      },
      {
        title: "Data Structures Implementation",
        category: "assignments",
        subject: "Computer Science",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
      },
    ];

    const presentations = [
      {
        title: "Quantum Mechanics Fundamentals",
        category: "presentations",
        subject: "Physics",
      },
      {
        title: "Environmental Impact of Technology",
        category: "presentations",
        subject: "Computer Science",
      },
      {
        title: "Shakespearean Sonnets Analysis",
        category: "presentations",
        subject: "English",
      },
    ];

    const allUpdates = [...assignments, ...presentations];

    // Create update records for assignments and presentations
    for (const updateData of allUpdates) {
      const update = new (await import("../models/mongodb")).UpdateModel({
        _id: randomUUID(),
        title: updateData.title,
        content: `This is ${
          updateData.category === "assignments"
            ? "an assignment"
            : "a presentation"
        } for ${updateData.subject}.`,
        category: updateData.category,
        subject: updateData.subject,
        authorId: crIds[0],
        createdAt: new Date(
          Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000
        ),
        updatedAt: new Date(),
      });

      await update.save();

      // Create assignment submissions or presentation records for each student
      for (const studentId of studentIds) {
        if (updateData.category === "assignments") {
          // Only submit 50% of assignments randomly, leaving 50% pending
          const shouldSubmit = Math.random() < 0.5;

          if (shouldSubmit) {
            const scorePercentage = 0.6 + Math.random() * 0.4; // 60-100% score range
            const score = Math.round(100 * scorePercentage);

            const submission = new AssignmentSubmissionModel({
              _id: randomUUID(),
              updateId: update._id,
              userId: studentId,
              submittedAt: new Date(
                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
              ),
              status: Math.random() > 0.1 ? "submitted" : "late",
              score,
              feedback:
                score > 80
                  ? "Excellent work! Well structured and comprehensive."
                  : score > 60
                  ? "Good effort. Some areas need improvement."
                  : "Please review the concepts and resubmit if possible.",
            });

            await submission.save();
          }
          // If shouldSubmit is false, no submission is created = pending assignment
        } else {
          // Presentation: Only mark 50% as completed, rest as scheduled (pending)
          const isCompleted = Math.random() < 0.5;
          let status = isCompleted ? "completed" : "scheduled";
          let score = undefined;
          let feedback = undefined;
          if (isCompleted) {
            const scorePercentage = 0.65 + Math.random() * 0.35; // 65-100% score range
            score = Math.round(100 * scorePercentage);
            feedback =
              score > 85
                ? "Outstanding presentation! Clear delivery and excellent content."
                : score > 70
                ? "Good presentation. Work on confidence and eye contact."
                : "Needs improvement in content organization and delivery.";
          }
          const presentationRecord = new PresentationModel({
            _id: randomUUID(),
            updateId: update._id,
            userId: studentId,
            scheduledDate: new Date(
              Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000
            ),
            status,
            score,
            feedback,
            duration: 15 + Math.floor(Math.random() * 15), // 15-30 minutes
          });

          await presentationRecord.save();
        }
      }
    }

    // Create performance metrics for each student
    for (const studentId of studentIds) {
      const totalSubjectInstances = await AttendanceModel.countDocuments({
        studentId: studentId,
      });

      const presentSubjectInstances = await AttendanceModel.countDocuments({
        studentId: studentId,
        status: "present",
      });

      const attendancePercentage =
        totalSubjectInstances > 0
          ? (presentSubjectInstances / totalSubjectInstances) * 100
          : 0;

      const assignmentSubmissions = await AssignmentSubmissionModel.find({
        userId: studentId,
      });
      const assignmentCompletion =
        assignmentSubmissions.length > 0
          ? assignmentSubmissions.reduce(
              (sum, sub) => sum + (sub.score || 0),
              0
            ) / assignmentSubmissions.length
          : 0;

      const presentationRecords = await PresentationModel.find({
        userId: studentId,
      });
      const presentationScore =
        presentationRecords.length > 0
          ? presentationRecords.reduce(
              (sum, pres) => sum + (pres.score || 0),
              0
            ) / presentationRecords.length
          : 0;

      const overallScore =
        attendancePercentage * 0.3 +
        assignmentCompletion * 0.5 +
        presentationScore * 0.2;

      const metrics = new PerformanceMetricsModel({
        _id: randomUUID(),
        userId: studentId,
        attendancePercentage: Math.round(attendancePercentage * 10) / 10,
        assignmentCompletion: Math.round(assignmentCompletion * 10) / 10,
        presentationScore: Math.round(presentationScore * 10) / 10,
        overallScore: Math.round(overallScore * 10) / 10,
        lastUpdated: new Date(),
      });

      await metrics.save();
    }

    console.log("Sample performance data initialized successfully");
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

  async updateProfile(
    userId: string,
    profileData: {
      name?: string;
      phone?: string;
      location?: string;
      bio?: string;
      department?: string;
      year?: string;
      rollNumber?: string;
    }
  ): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        profileData,
        { new: true }
      ).lean();
      return updatedUser ? this.mapUserDocument(updatedUser) : undefined;
    } catch (error) {
      console.error("Error updating profile:", error);
      return undefined;
    }
  }

  async updatePreferences(
    userId: string,
    preferences: any
  ): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { preferences },
        { new: true }
      ).lean();
      return updatedUser ? this.mapUserDocument(updatedUser) : undefined;
    } catch (error) {
      console.error("Error updating preferences:", error);
      return undefined;
    }
  }

  async getUserStats(userId: string): Promise<{
    assignmentsCompleted: number;
    presentationsDelivered: number;
    attendancePercentage: number;
  }> {
    try {
      await this.ensureConnected();

      // Count completed assignments (submissions by this user)
      const assignmentsCompleted =
        await AssignmentSubmissionModel.countDocuments({
          userId,
          status: "submitted",
        });

      // Count presentations delivered
      const presentationsDelivered = await PresentationModel.countDocuments({
        userId,
        status: "completed",
      });

      // Calculate attendance percentage using AttendanceModel
      const totalSubjectInstances = await AttendanceModel.countDocuments({
        studentId: userId,
      });

      const presentSubjectInstances = await AttendanceModel.countDocuments({
        studentId: userId,
        status: "present",
      });

      const attendancePercentage =
        totalSubjectInstances > 0
          ? Math.round((presentSubjectInstances / totalSubjectInstances) * 100)
          : 0;

      return {
        assignmentsCompleted,
        presentationsDelivered,
        attendancePercentage,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        assignmentsCompleted: 0,
        presentationsDelivered: 0,
        attendancePercentage: 0,
      };
    }
  }

  async updateUsername(userId: string, newUsername: string): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      const existingUser = await UserModel.findOne({ username: newUsername }).lean();
      if (existingUser && existingUser._id !== userId) {
        throw new Error("Username already taken");
      }
      const updatedUser = await UserModel.findByIdAndUpdate(userId, { username: newUsername }, { new: true }).lean();
      return updatedUser ? this.mapUserDocument(updatedUser) : undefined;
    } catch (error) {
      console.error("Error updating username:", error);
      throw error;
    }
  }

  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      const user = await UserModel.findById(userId).lean();
      if (!user) throw new Error("User not found");
      const isMatch = await bcrypt.compare(oldPassword, user.password).catch(() => false);
      if (!isMatch && user.password !== oldPassword) throw new Error("Current password is incorrect");
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.findByIdAndUpdate(userId, { password: hashedPassword, passwordChangedAt: new Date() });
      return true;
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }

  // Update methods
  async getUpdates(filters?: {
    category?: string;
    authorId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<UpdateWithAuthor[]> {
    try {
      await this.ensureConnected();
      const query: any = {};
      if (filters?.category) query.category = filters.category;
      if (filters?.authorId) query.authorId = filters.authorId;
      
      if (filters?.search) {
        const searchRegex = { $regex: filters.search, $options: "i" };
        query.$or = [
          { title: searchRegex },
          { content: searchRegex },
          { description: searchRegex }
        ];
      }

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
            ? {
                id: author._id,
                name: author.name,
                role: author.role,
              }
            : {
                id: update.authorId,
                name: "Unknown User",
                role: "student",
              },
          files: updateFiles,
        };
      });
    } catch (error) {
      console.error("Error getting updates:", error);
      console.error("Query was:", JSON.stringify(filters || {}));
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
          ? {
              id: author._id,
              name: author.name,
              role: author.role,
            }
          : {
              id: update.authorId,
              name: "Unknown User",
              role: "student",
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
      await this.ensureConnected();
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
      phone: doc.phone,
      location: doc.location,
      bio: doc.bio,
      department: doc.department,
      year: doc.year,
      rollNumber: doc.rollNumber,
      preferences: doc.preferences,
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
      subject: doc.subject,
      priority: doc.priority,
      tags: doc.tags,
      authorId: doc.authorId,
      isUrgent: doc.isUrgent,
      dueDate: doc.dueDate,
      deadlineDate: doc.deadlineDate,
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
