import { type User, type InsertUser, type Update, type InsertUpdate, type File, type InsertFile, type UpdateWithAuthor, type DashboardStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Update methods
  getUpdates(filters?: { category?: string; authorId?: string; limit?: number; offset?: number }): Promise<UpdateWithAuthor[]>;
  getUpdate(id: string): Promise<UpdateWithAuthor | undefined>;
  createUpdate(update: InsertUpdate): Promise<Update>;
  updateUpdate(id: string, update: Partial<InsertUpdate>): Promise<Update | undefined>;
  deleteUpdate(id: string): Promise<boolean>;
  incrementViewCount(id: string): Promise<void>;
  incrementDownloadCount(id: string): Promise<void>;
  
  // File methods
  createFile(file: InsertFile): Promise<File>;
  getFilesByUpdateId(updateId: string): Promise<File[]>;
  getAllFiles(): Promise<File[]>;
  getFile(id: string): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;
  
  // Stats methods
  getDashboardStats(): Promise<DashboardStats>;
  
  // User views
  markAsViewed(userId: string, updateId: string): Promise<void>;
  hasUserViewed(userId: string, updateId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private updates: Map<string, Update>;
  private files: Map<string, File>;
  private userViews: Map<string, { userId: string; updateId: string; viewedAt: Date }>;

  constructor() {
    this.users = new Map();
    this.updates = new Map();
    this.files = new Map();
    this.userViews = new Map();
    
    // Initialize with sample users
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Create sample CR user
    const crUser: User = {
      id: randomUUID(),
      username: "sarah.cr",
      password: "password123", // In production, this would be hashed
      role: "cr",
      name: "Sarah Chen",
      class: "Computer Science - Semester 5",
      createdAt: new Date(),
    };
    this.users.set(crUser.id, crUser);

    // Create sample student user
    const studentUser: User = {
      id: randomUUID(),
      username: "john.student",
      password: "password123",
      role: "student",
      name: "John Doe",
      class: "Computer Science - Semester 5",
      createdAt: new Date(),
    };
    this.users.set(studentUser.id, studentUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      role: insertUser.role || "student", // Ensure role has default value
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getUpdates(filters?: { category?: string; authorId?: string; limit?: number; offset?: number }): Promise<UpdateWithAuthor[]> {
    let updatesArray = Array.from(this.updates.values());
    
    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      updatesArray = updatesArray.filter(update => update.category === filters.category);
    }
    
    if (filters?.authorId) {
      updatesArray = updatesArray.filter(update => update.authorId === filters.authorId);
    }
    
    // Sort by creation date (newest first)
    updatesArray.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    updatesArray = updatesArray.slice(offset, offset + limit);
    
    // Enrich with author and files
    const enrichedUpdates: UpdateWithAuthor[] = [];
    for (const update of updatesArray) {
      const author = await this.getUser(update.authorId);
      const files = await this.getFilesByUpdateId(update.id);
      
      if (author) {
        enrichedUpdates.push({
          ...update,
          author: {
            id: author.id,
            name: author.name,
            role: author.role,
          },
          files,
        });
      }
    }
    
    return enrichedUpdates;
  }

  async getUpdate(id: string): Promise<UpdateWithAuthor | undefined> {
    const update = this.updates.get(id);
    if (!update) return undefined;
    
    const author = await this.getUser(update.authorId);
    const files = await this.getFilesByUpdateId(update.id);
    
    if (!author) return undefined;
    
    return {
      ...update,
      author: {
        id: author.id,
        name: author.name,
        role: author.role,
      },
      files,
    };
  }

  async createUpdate(insertUpdate: InsertUpdate): Promise<Update> {
    const id = randomUUID();
    const now = new Date();
    const update: Update = {
      ...insertUpdate,
      originalContent: insertUpdate.originalContent || null, // Ensure originalContent is properly typed
      id,
      viewCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.updates.set(id, update);
    return update;
  }

  async updateUpdate(id: string, updateData: Partial<InsertUpdate>): Promise<Update | undefined> {
    const existing = this.updates.get(id);
    if (!existing) return undefined;
    
    const updated: Update = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    this.updates.set(id, updated);
    return updated;
  }

  async deleteUpdate(id: string): Promise<boolean> {
    return this.updates.delete(id);
  }

  async incrementViewCount(id: string): Promise<void> {
    const update = this.updates.get(id);
    if (update) {
      update.viewCount = (update.viewCount || 0) + 1;
      this.updates.set(id, update);
    }
  }

  async incrementDownloadCount(id: string): Promise<void> {
    const update = this.updates.get(id);
    if (update) {
      update.downloadCount = (update.downloadCount || 0) + 1;
      this.updates.set(id, update);
    }
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = {
      ...insertFile,
      id,
      createdAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async getFilesByUpdateId(updateId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => file.updateId === updateId);
  }

  async getAllFiles(): Promise<File[]> {
    return Array.from(this.files.values());
  }

  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const updates = Array.from(this.updates.values());
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const thisWeekUpdates = updates.filter(update => 
      update.createdAt && new Date(update.createdAt) >= weekAgo
    );
    
    return {
      totalUpdates: updates.length,
      thisWeek: thisWeekUpdates.length,
      counts: {
        all: updates.length,
        assignments: updates.filter(u => u.category === 'assignments').length,
        notes: updates.filter(u => u.category === 'notes').length,
        presentations: updates.filter(u => u.category === 'presentations').length,
        general: updates.filter(u => u.category === 'general').length,
      },
    };
  }

  async markAsViewed(userId: string, updateId: string): Promise<void> {
    const id = `${userId}-${updateId}`;
    this.userViews.set(id, {
      userId,
      updateId,
      viewedAt: new Date(),
    });
  }

  async hasUserViewed(userId: string, updateId: string): Promise<boolean> {
    const id = `${userId}-${updateId}`;
    return this.userViews.has(id);
  }
}

export const storage = new MemStorage();
