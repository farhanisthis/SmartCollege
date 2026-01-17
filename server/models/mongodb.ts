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
}

const UserSchema = new Schema<IUserDocument>({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true },
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
});

// Update Model
export interface IUpdateDocument extends Document {
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

// Assignment Submission Model
export interface IAssignmentSubmissionDocument extends Document {
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


// Daily Attendance Sheet Model (New timetable-based system)
export interface IDailyAttendanceDocument extends Document {
  _id: string;
  date: Date;
  classSection: string; // "E1", "E2", etc.
  markedBy: string; // CR user ID
  students: Array<{
    studentId: string;
    subjects: Array<{
      subjectName: string;
      status: "present" | "absent";
      timestamp: Date;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DailyAttendanceSchema = new Schema<IDailyAttendanceDocument>(
  {
    _id: { type: String, required: true },
    date: { type: Date, required: true },
    classSection: {
      type: String,
      required: true,
      default: "E1",
      enum: ["E1", "E2", "E3", "E4"], // Valid class sections
    },
    markedBy: { type: String, required: true },
    students: [
      {
        studentId: {
          type: String,
          required: true,
          validate: {
            validator: function (v: string) {
              // Validate that studentId is a reasonable length (student IDs can be numeric)
              return typeof v === "string" && v.length >= 5 && v.length <= 50;
            },
            message:
              "Student ID must be a valid identifier between 5-50 characters",
          },
        },
        subjects: [
          {
            subjectName: {
              type: String,
              required: true,
              enum: [
                "Computer Graphics",
                "CG",
                "CG Lab 4",
                "Operating Systems",
                "OS",
                "Cloud Computing",
                "CC",
                "Machine Learning",
                "ML",
                "ML Lab 4",
                "Linux Lab 4",
              ], // Valid subject names from timetable
              validate: {
                validator: function (v: string) {
                  // Ensure subject name is not just a number
                  return (
                    typeof v === "string" && !/^\d+$/.test(v) && v.length > 1
                  );
                },
                message:
                  "Subject name must be a valid subject identifier, not just numbers",
              },
            },
            status: {
              type: String,
              enum: ["present", "absent"],
              required: true,
              validate: {
                validator: function (v: string) {
                  // Ensure status is not a single character like 'p'
                  return v === "present" || v === "absent";
                },
                message:
                  'Status must be either "present" or "absent", not abbreviated forms',
              },
            },
            timestamp: { type: Date, default: Date.now },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Presentation Model
export interface IPresentationDocument extends Document {
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
export interface IPerformanceMetricsDocument extends Document {
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
DailyAttendanceSchema.index({ date: 1, classSection: 1 }, { unique: true });
DailyAttendanceSchema.index({ markedBy: 1, date: -1 });
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
export const DailyAttendanceModel = mongoose.model<IDailyAttendanceDocument>(
  "DailyAttendance",
  DailyAttendanceSchema
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
