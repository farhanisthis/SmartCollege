import mongoose, { Schema, Document } from "mongoose";

// User Model
export interface IUserDocument extends Document {
  _id: string;
  username: string;
  password: string;
  role: "student" | "cr";
  name: string;
  class: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "cr"], required: true },
  name: { type: String, required: true },
  class: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Update Model
export interface IUpdateDocument extends Document {
  _id: string;
  title: string;
  content: string;
  description?: string;
  category:
    | "assignments"
    | "notes"
    | "presentations"
    | "announcements"
    | "general";
  authorId: string;
  createdAt: Date;
  viewCount: number;
  downloadCount: number;
}

const UpdateSchema = new Schema<IUpdateDocument>({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ["assignments", "notes", "presentations", "announcements", "general"],
    required: true,
  },
  authorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  viewCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
});

// File Model
export interface IFileDocument extends Document {
  _id: string;
  updateId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

const FileSchema = new Schema<IFileDocument>({
  _id: { type: String, required: true },
  updateId: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// User Views Model
export interface IUserViewDocument extends Document {
  _id: string;
  userId: string;
  updateId: string;
  viewedAt: Date;
}

const UserViewSchema = new Schema<IUserViewDocument>({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  updateId: { type: String, required: true },
  viewedAt: { type: Date, default: Date.now },
});

// Create unique compound index for user views
UserViewSchema.index({ userId: 1, updateId: 1 }, { unique: true });

export const UserModel = mongoose.model<IUserDocument>("User", UserSchema);
export const UpdateModel = mongoose.model<IUpdateDocument>(
  "Update",
  UpdateSchema
);
export const FileModel = mongoose.model<IFileDocument>("File", FileSchema);
export const UserViewModel = mongoose.model<IUserViewDocument>(
  "UserView",
  UserViewSchema
);
