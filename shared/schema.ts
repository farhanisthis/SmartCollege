import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"), // "cr" or "student"
  name: text("name").notNull(),
  class: text("class").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const updates = pgTable("updates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  description: text("description"), // AI-generated description
  originalContent: text("original_content"), // Raw content before AI formatting
  category: text("category").notNull(), // "assignments", "notes", "presentations", "general"
  priority: text("priority").default("normal"), // "normal", "urgent"
  tags: text("tags").array().default([]), // Additional tags
  authorId: varchar("author_id")
    .notNull()
    .references(() => users.id),
  isUrgent: boolean("is_urgent").default(false),
  dueDate: timestamp("due_date"),
  viewCount: integer("view_count").default(0),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  updateId: varchar("update_id")
    .notNull()
    .references(() => updates.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userViews = pgTable("user_views", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  updateId: varchar("update_id")
    .notNull()
    .references(() => updates.id),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUpdateSchema = createInsertSchema(updates).omit({
  id: true,
  viewCount: true,
  downloadCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const createUpdateSchema = insertUpdateSchema.extend({
  files: z.array(z.any()).optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUpdate = z.infer<typeof insertUpdateSchema>;
export type Update = typeof updates.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type Login = z.infer<typeof loginSchema>;
export type CreateUpdate = z.infer<typeof createUpdateSchema>;

// Extended types for API responses
export type UpdateWithAuthor = Update & {
  author: Pick<User, "id" | "name" | "role">;
  files: File[];
  hasViewed?: boolean;
};

export type DashboardStats = {
  totalUpdates: number;
  thisWeek: number;
  counts: {
    all: number;
    assignments: number;
    notes: number;
    presentations: number;
    general: number;
  };
};
