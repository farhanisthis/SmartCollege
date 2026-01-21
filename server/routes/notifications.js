import { Router } from "express";
import { UserModel } from "../models/mongodb";
const router = Router();
// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
};
// Get notifications for the current user
router.get("/", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // Generate mock notifications based on user role and performance
        const notifications = await generateNotificationsForUser(user);
        res.json(notifications);
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});
// Get unread notification count
router.get("/unread-count", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // For now, return a mock count
        // In a real implementation, you'd query a notifications collection
        const count = user.role === "cr" ? 5 : 3;
        res.json({ count });
    }
    catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ error: "Failed to fetch unread count" });
    }
});
// Mark notification as read
router.put("/:id/read", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.userId;
        // In a real implementation, you'd update the notification in the database
        // For now, just return success
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Failed to mark notification as read" });
    }
});
// Delete notification
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.userId;
        // In a real implementation, you'd delete the notification from the database
        // For now, just return success
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ error: "Failed to delete notification" });
    }
});
// Helper function to generate notifications based on user data
async function generateNotificationsForUser(user) {
    const notifications = [];
    const now = new Date();
    if (user.role === "student") {
        // Student notifications
        notifications.push({
            id: "1",
            type: "deadline",
            title: "Assignment Due Soon",
            message: "Data Structures Implementation is due in 2 days",
            priority: "high",
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            read: false,
            actionRequired: true,
            actionUrl: "/assignments/ds-impl",
        }, {
            id: "2",
            type: "performance",
            title: "Attendance Warning",
            message: "Your attendance is below 75%. Current: 72%",
            priority: "urgent",
            createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            read: false,
            actionRequired: true,
        }, {
            id: "3",
            type: "achievement",
            title: "Excellent Performance!",
            message: "You scored 95% on Physics Lab Report - Mechanics",
            priority: "medium",
            createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            read: true,
        }, {
            id: "4",
            type: "deadline",
            title: "Presentation Tomorrow",
            message: "Quantum Mechanics Fundamentals presentation scheduled for tomorrow at 10 AM",
            priority: "high",
            createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
            read: false,
            actionRequired: true,
        });
    }
    else if (user.role === "cr") {
        // CR notifications
        notifications.push({
            id: "5",
            type: "warning",
            title: "Students Need Attention",
            message: "3 students have attendance below 75%",
            priority: "medium",
            createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
            read: false,
            actionRequired: true,
            actionUrl: "/cr/attendance",
        }, {
            id: "6",
            type: "deadline",
            title: "Assignment Grading Required",
            message: "15 assignments pending grading for Linear Algebra Problem Set",
            priority: "high",
            createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
            read: false,
            actionRequired: true,
            actionUrl: "/cr/assignments",
        }, {
            id: "7",
            type: "performance",
            title: "Class Performance Update",
            message: "Average class attendance has improved to 88% this week",
            priority: "low",
            createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            read: true,
        }, {
            id: "8",
            type: "deadline",
            title: "Presentation Evaluations Due",
            message: "5 presentations require scoring and feedback",
            priority: "medium",
            createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
            read: false,
            actionRequired: true,
        }, {
            id: "9",
            type: "achievement",
            title: "Milestone Reached",
            message: "Your class achieved 90% average in recent assignments",
            priority: "low",
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            read: false,
        });
    }
    return notifications;
}
export default router;
