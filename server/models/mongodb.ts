import mongoose, { Schema, Document } from "mongoose";

// User Model
export interface IUserDocument extends Omit<Document, "_id"> {
  _id: string;
  username: string;
  enrollment?: string;
  password: string;
  role: "student" | "cr";
  name: string;
  class: string;
  createdAt: Date;
  // Preferences
  preferences?: {
    notifications?: {
      assignments?: boolean;
      presentations?: boolean;
      announcements?: boolean;
      reminders?: boolean;
      emailDigest?: boolean;
      pushNotifications?: boolean;
      soundEnabled?: boolean;
    };
    display?: {
      compactMode?: boolean;
      showPreviewCards?: boolean;
      animationsEnabled?: boolean;
      highContrast?: boolean;
    };
    privacy?: {
      profileVisibility?: "public" | "classmates" | "private";
      showOnlineStatus?: boolean;
      allowDirectMessages?: boolean;
      dataCollection?: boolean;
    };
    language?: string;
    timezone?: string;
  };
  rollNumber?: string;
  profilePicture?: string;
  passwordChangedAt?: Date;
}

const UserSchema = new Schema<IUserDocument>({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  enrollment: { type: String, unique: true, sparse: true }, // Added enrollment number
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "cr"], required: true },
  name: { type: String, required: true },
  class: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Preferences
  preferences: {
    notifications: {
      assignments: { type: Boolean, default: true },
      presentations: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      emailDigest: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
    },
    display: {
      compactMode: { type: Boolean, default: false },
      showPreviewCards: { type: Boolean, default: true },
      animationsEnabled: { type: Boolean, default: true },
      highContrast: { type: Boolean, default: false },
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ["public", "classmates", "private"],
        default: "public",
      },
      showOnlineStatus: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true },
      dataCollection: { type: Boolean, default: true },
    },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "UTC" },
  },
  rollNumber: { type: String },
  passwordChangedAt: { type: Date },
  profilePicture: { type: String },
});

// Update Model
export interface IUpdateDocument extends Omit<Document, "_id"> {
  _id: string;
  title: string;
  content: string;
  description?: string;
  originalContent?: string;
  category:
    | "assignments"
    | "notes"
    | "presentations"
    | "announcements"
    | "general";
  subject?: string; // Subject for grouping (e.g. "Cloud Computing")
  priority?: string;
  tags?: string[];
  authorId: string;
  isUrgent?: boolean;
  dueDate?: Date;
  deadlineDate?: Date; // Added for relative deadline detection
  viewCount: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

const UpdateSchema = new Schema<IUpdateDocument>({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  description: { type: String },
  originalContent: { type: String },
  category: {
    type: String,
    enum: ["assignments", "notes", "presentations", "announcements", "general"],
    required: true,
  },
  subject: { type: String }, // Subject for grouping
  priority: { type: String, default: "normal" },
  tags: [{ type: String }],
  authorId: { type: String, required: true },
  isUrgent: { type: Boolean, default: false },
  dueDate: { type: Date },
  deadlineDate: { type: Date }, // Added for relative deadline detection
  viewCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// File Model
export interface IFileDocument extends Omit<Document, "_id"> {
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
export interface IUserViewDocument extends Omit<Document, "_id"> {
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

// Assignment Submission Model
export interface IAssignmentSubmissionDocument extends Omit<Document, "_id"> {
  _id: string;
  updateId: string; // Links to the assignment update
  userId: string; // Student who submitted
  submittedAt: Date;
  status: "submitted" | "late" | "pending";
  score?: number; // Optional scoring
  feedback?: string;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmissionDocument>({
  _id: { type: String, required: true },
  updateId: { type: String, required: true },
  userId: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["submitted", "late", "pending"],
    default: "pending",
  },
  score: { type: Number, min: 0, max: 100 },
  feedback: { type: String },
});

// Attendance Model removed (Legacy)


// Attendance Model (Normalized)
export interface IAttendanceDocument extends Omit<Document, "_id"> {
  _id: string;
  studentId: string;
  date: Date;
  subject: string;
  status: "present" | "absent";
  markedBy: string; // CR
  classSection: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true },
    date: { type: Date, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
    markedBy: { type: String, required: true },
    classSection: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Presentation Model
export interface IPresentationDocument extends Omit<Document, "_id"> {
  _id: string;
  updateId: string; // Links to presentation update
  userId: string; // Student presenting
  scheduledDate: Date;
  status: "scheduled" | "completed" | "missed";
  score?: number;
  feedback?: string;
  duration?: number; // in minutes
}

const PresentationSchema = new Schema<IPresentationDocument>({
  _id: { type: String, required: true },
  updateId: { type: String, required: true },
  userId: { type: String, required: true },
  scheduledDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["scheduled", "completed", "missed"],
    default: "scheduled",
  },
  score: { type: Number, min: 0, max: 100 },
  feedback: { type: String },
  duration: { type: Number },
});

// Performance Metrics Model
export interface IPerformanceMetricsDocument extends Omit<Document, "_id"> {
  _id: string;
  userId: string;
  subject?: string;
  attendancePercentage: number;
  assignmentCompletion: number;
  presentationCompletion: number;
  overallScore: number;
  lastUpdated: Date;
}

const PerformanceMetricsSchema = new Schema<IPerformanceMetricsDocument>({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  subject: { type: String },
  attendancePercentage: { type: Number, default: 0, min: 0, max: 100 },
  assignmentCompletion: { type: Number, default: 0, min: 0, max: 100 },
  presentationCompletion: { type: Number, default: 0, min: 0, max: 100 },
  overallScore: { type: Number, default: 0, min: 0, max: 100 },
  lastUpdated: { type: Date, default: Date.now },
});

// Create unique compound index for user views
UserViewSchema.index({ userId: 1, updateId: 1 }, { unique: true });
// Create unique compound index for assignment submissions
AssignmentSubmissionSchema.index({ updateId: 1, userId: 1 }, { unique: true });
// Create unique compound index for attendance
// AttendanceSchema removed

// Create unique compound index for daily attendance sheets
// DailyAttendanceSchema.index({ date: 1, classSection: 1 }, { unique: true }); // Removed
// DailyAttendanceSchema.index({ markedBy: 1, date: -1 }); // Removed

// Create compound index for easy querying of student attendance
// AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true }); // REMOVED: Incorrectly prevents multiple subjects per day
// Wait, one record per subject per date.
AttendanceSchema.index({ studentId: 1, date: 1, subject: 1 }, { unique: true });
AttendanceSchema.index({ classSection: 1, date: 1 }); // For CR view
AttendanceSchema.index({ markedBy: 1, date: -1 }); 

// Create unique compound index for presentations
PresentationSchema.index({ updateId: 1, userId: 1 }, { unique: true });
// Create unique compound index for performance metrics
PerformanceMetricsSchema.index({ userId: 1, subject: 1 }, { unique: true });

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
export const AssignmentSubmissionModel =
  mongoose.model<IAssignmentSubmissionDocument>(
    "AssignmentSubmission",
    AssignmentSubmissionSchema
  );
export const AttendanceModel = mongoose.model<IAttendanceDocument>(
  "Attendance",
  AttendanceSchema
);
export const PresentationModel = mongoose.model<IPresentationDocument>(
  "Presentation",
  PresentationSchema
);
export const PerformanceMetricsModel =
  mongoose.model<IPerformanceMetricsDocument>(
    "PerformanceMetrics",
    PerformanceMetricsSchema
  );
