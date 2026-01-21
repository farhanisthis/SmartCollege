import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
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
const UpdateSchema = new Schema({
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
const FileSchema = new Schema({
    _id: { type: String, required: true },
    updateId: { type: String, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});
const UserViewSchema = new Schema({
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    updateId: { type: String, required: true },
    viewedAt: { type: Date, default: Date.now },
});
const AssignmentSubmissionSchema = new Schema({
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
const AttendanceSchema = new Schema({
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
}, {
    timestamps: true,
});
const PresentationSchema = new Schema({
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
const PerformanceMetricsSchema = new Schema({
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
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true }); // A student can have only one record per subject per date? No, per subject.
// Wait, one record per subject per date.
AttendanceSchema.index({ studentId: 1, date: 1, subject: 1 }, { unique: true });
AttendanceSchema.index({ classSection: 1, date: 1 }); // For CR view
AttendanceSchema.index({ markedBy: 1, date: -1 });
// Create unique compound index for presentations
PresentationSchema.index({ updateId: 1, userId: 1 }, { unique: true });
// Create unique compound index for performance metrics
PerformanceMetricsSchema.index({ userId: 1, subject: 1 }, { unique: true });
export const UserModel = mongoose.model("User", UserSchema);
export const UpdateModel = mongoose.model("Update", UpdateSchema);
export const FileModel = mongoose.model("File", FileSchema);
export const UserViewModel = mongoose.model("UserView", UserViewSchema);
export const AssignmentSubmissionModel = mongoose.model("AssignmentSubmission", AssignmentSubmissionSchema);
export const AttendanceModel = mongoose.model("Attendance", AttendanceSchema);
export const PresentationModel = mongoose.model("Presentation", PresentationSchema);
export const PerformanceMetricsModel = mongoose.model("PerformanceMetrics", PerformanceMetricsSchema);
