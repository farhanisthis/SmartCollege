import { randomUUID } from "crypto";
import { MongoStorage } from "./storage/mongodb";
export class MemStorage {
    users;
    updates;
    files;
    userViews;
    constructor() {
        this.users = new Map();
        this.updates = new Map();
        this.files = new Map();
        this.userViews = new Map();
        // Initialize with sample users
        this.initializeSampleData();
    }
    async initializeSampleData() {
        // Create sample CR user
        const crUser = {
            id: randomUUID(),
            username: "farhanisthis",
            password: "123456", // In production, this would be hashed
            role: "cr",
            name: "Farhan Ali",
            class: "Computer Science - Semester 5",
            createdAt: new Date(),
            phone: null,
            location: null,
            bio: null,
            department: null,
            year: null,
            rollNumber: null,
            preferences: null,
        };
        this.users.set(crUser.id, crUser);
        // Create second CR user
        const kashishUser = {
            id: randomUUID(),
            username: "kashish",
            password: "123123", // In production, this would be hashed
            role: "cr",
            name: "Kashish",
            class: "Computer Science - Semester 5",
            createdAt: new Date(),
            phone: null,
            location: null,
            bio: null,
            department: null,
            year: null,
            rollNumber: null,
            preferences: null,
        };
        this.users.set(kashishUser.id, kashishUser);
        // Create sample student user
        const studentUser = {
            id: randomUUID(),
            username: "rohit",
            password: "123123",
            role: "student",
            name: "Rohit",
            class: "Computer Science - Semester 5",
            createdAt: new Date(),
            phone: null,
            location: null,
            bio: null,
            department: null,
            year: null,
            rollNumber: null,
            preferences: null,
        };
        this.users.set(studentUser.id, studentUser);
        // Create specific student user from issue report
        const issueStudent = {
            id: "00124402023",
            username: "00124402023",
            password: "password",
            role: "student",
            name: "Test Student",
            class: "Computer Science - Semester 5",
            createdAt: new Date(),
            phone: null,
            location: null,
            bio: null,
            department: "CS",
            year: "3",
            rollNumber: "CS123", // Valid roll number for performance data
            preferences: null,
        };
        this.users.set(issueStudent.id, issueStudent);
    }
    async getUser(id) {
        return this.users.get(id);
    }
    async getUserByUsername(username) {
        return Array.from(this.users.values()).find((user) => user.username === username);
    }
    async createUser(insertUser) {
        const id = randomUUID();
        const user = {
            ...insertUser,
            role: insertUser.role || "student", // Ensure role has default value
            id,
            createdAt: new Date(),
            phone: insertUser.phone || null,
            location: insertUser.location || null,
            bio: insertUser.bio || null,
            department: insertUser.department || null,
            year: insertUser.year || null,
            rollNumber: insertUser.rollNumber || null,
            preferences: insertUser.preferences || null,
        };
        this.users.set(id, user);
        return user;
    }
    async getUpdates(filters) {
        console.log("[getUpdates] Starting with filters:", filters);
        let updatesArray = Array.from(this.updates.values());
        // Apply filters
        if (filters?.category && filters.category !== "all") {
            updatesArray = updatesArray.filter((update) => update.category === filters.category);
        }
        if (filters?.search) {
            const query = filters.search.toLowerCase();
            updatesArray = updatesArray.filter((update) => update.title.toLowerCase().includes(query) ||
                update.content.toLowerCase().includes(query) ||
                (update.description && update.description.toLowerCase().includes(query)));
        }
        // Sort by creation date (newest first)
        updatesArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Apply pagination
        const offset = filters?.offset || 0;
        const limit = filters?.limit || 50;
        updatesArray = updatesArray.slice(offset, offset + limit);
        // Enrich with author and files
        const enrichedUpdates = [];
        for (const update of updatesArray) {
            const author = await this.getUser(update.authorId);
            const files = await this.getFilesByUpdateId(update.id);
            if (author) {
                const enrichedUpdate = {
                    ...update,
                    author: {
                        id: author.id,
                        name: author.name,
                        role: author.role,
                    },
                    files,
                };
                // Debug log to see if subject is present
                console.log(`[getUpdates] Update ${update.id} - subject: ${update.subject}, title: ${update.title}`);
                enrichedUpdates.push(enrichedUpdate);
            }
        }
        return enrichedUpdates;
    }
    async getUpdate(id) {
        const update = this.updates.get(id);
        if (!update)
            return undefined;
        const author = await this.getUser(update.authorId);
        const files = await this.getFilesByUpdateId(update.id);
        if (!author)
            return undefined;
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
    async createUpdate(insertUpdate) {
        const id = randomUUID();
        const now = new Date();
        const update = {
            ...insertUpdate,
            description: insertUpdate.description || null,
            originalContent: insertUpdate.originalContent || null,
            priority: insertUpdate.priority || null,
            tags: insertUpdate.tags || null,
            isUrgent: insertUpdate.isUrgent || null,
            dueDate: insertUpdate.dueDate || null,
            deadlineDate: insertUpdate.deadlineDate || null,
            subject: insertUpdate.subject ?? null,
            id,
            viewCount: 0,
            downloadCount: 0,
            createdAt: now,
            updatedAt: now,
        };
        this.updates.set(id, update);
        return update;
    }
    async updateUpdate(id, updateData) {
        const existing = this.updates.get(id);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            ...updateData,
            updatedAt: new Date(),
        };
        this.updates.set(id, updated);
        return updated;
    }
    async updateDescription(id, description) {
        const existing = this.updates.get(id);
        if (!existing)
            return false;
        const updated = {
            ...existing,
            description,
            updatedAt: new Date(),
        };
        this.updates.set(id, updated);
        return true;
    }
    async deleteUpdate(id) {
        return this.updates.delete(id);
    }
    async incrementViewCount(id) {
        const update = this.updates.get(id);
        if (update) {
            update.viewCount = (update.viewCount || 0) + 1;
            this.updates.set(id, update);
        }
    }
    async incrementDownloadCount(id) {
        const update = this.updates.get(id);
        if (update) {
            update.downloadCount = (update.downloadCount || 0) + 1;
            this.updates.set(id, update);
        }
    }
    async createFile(insertFile) {
        const id = randomUUID();
        const file = {
            ...insertFile,
            id,
            createdAt: new Date(),
        };
        this.files.set(id, file);
        return file;
    }
    async getFilesByUpdateId(updateId) {
        return Array.from(this.files.values()).filter((file) => file.updateId === updateId);
    }
    async getAllFiles() {
        return Array.from(this.files.values());
    }
    async getFile(id) {
        return this.files.get(id);
    }
    async deleteFile(id) {
        return this.files.delete(id);
    }
    async getDashboardStats() {
        const updates = Array.from(this.updates.values());
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekUpdates = updates.filter((update) => update.createdAt && new Date(update.createdAt) >= weekAgo);
        return {
            totalUpdates: updates.length,
            thisWeek: thisWeekUpdates.length,
            counts: {
                all: updates.length,
                assignments: updates.filter((u) => u.category === "assignments").length,
                notes: updates.filter((u) => u.category === "notes").length,
                presentations: updates.filter((u) => u.category === "presentations")
                    .length,
                general: updates.filter((u) => u.category === "general").length,
            },
        };
    }
    async markAsViewed(userId, updateId) {
        const id = `${userId}-${updateId}`;
        this.userViews.set(id, {
            userId,
            updateId,
            viewedAt: new Date(),
        });
    }
    async hasUserViewed(userId, updateId) {
        const id = `${userId}-${updateId}`;
        return this.userViews.has(id);
    }
    async updateProfile(userId, profileData) {
        // Stub implementation - not used since we use MongoStorage
        return undefined;
    }
    async updatePreferences(userId, preferences) {
        // Stub implementation - not used since we use MongoStorage
        return undefined;
    }
    async getUserStats(userId) {
        // Stub implementation - not used since we use MongoStorage
        return {
            assignmentsCompleted: 0,
            presentationsDelivered: 0,
            attendancePercentage: 0,
        };
    }
}
// Use MongoDB storage for data persistence
// Use MemStorage for development/testing with seed data
// export const storage = new MemStorage();
export const storage = new MongoStorage();
