import { Router } from "express";
import {
  AssignmentSubmissionModel,
  AttendanceModel,
  PresentationModel,
  PerformanceMetricsModel,
  UpdateModel,
  UserModel,
} from "../models/mongodb";
import { nanoid } from "nanoid";

const router = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Calculate performance metrics for a user
async function calculatePerformanceMetrics(userId: string, subject?: string) {
  const filter = subject ? { subject } : {};

  // Attendance percentage
  const totalAttendance = await AttendanceModel.countDocuments({
    userId,
    ...filter,
  });
  const presentCount = await AttendanceModel.countDocuments({
    userId,
    status: "present",
    ...filter,
  });
  const attendancePercentage =
    totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

  // Assignment completion (based on submission count, not scores)
  const assignments = await UpdateModel.find({
    category: "assignments",
    ...(subject && { subject }),
  });
  const submittedAssignments = await AssignmentSubmissionModel.countDocuments({
    userId,
    updateId: { $in: assignments.map((a) => a._id) },
  });
  const assignmentCompletion =
    assignments.length > 0
      ? (submittedAssignments / assignments.length) * 100
      : 0;

  // Presentation completion (based on submission count, not individual scores)
  const allPresentations = await UpdateModel.find({
    category: "presentations",
    ...(subject && { subject }),
  });
  const completedPresentations = await PresentationModel.countDocuments({
    userId,
    status: "completed",
    updateId: { $in: allPresentations.map((p) => p._id) },
  });
  const presentationCompletion =
    allPresentations.length > 0
      ? (completedPresentations / allPresentations.length) * 100
      : 0;

  // Overall score (weighted average based on completion percentages)
  const overallScore =
    attendancePercentage * 0.3 +
    assignmentCompletion * 0.4 +
    presentationCompletion * 0.3;

  return {
    attendancePercentage: Math.round(attendancePercentage * 100) / 100,
    assignmentCompletion: Math.round(assignmentCompletion * 100) / 100,
    presentationCompletion: Math.round(presentationCompletion * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
  };
}

// Debug route to reset sample data
router.post(
  "/debug/reset-sample-data",
  requireAuth,
  async (req: any, res: any) => {
    try {
      // Clear all existing data
      await AssignmentSubmissionModel.deleteMany({});
      await AttendanceModel.deleteMany({});
      await PresentationModel.deleteMany({});
      await UpdateModel.deleteMany({});

      // Reinitialize sample data
      const mongodb = require("../storage/mongodb");
      const mongoStorage = new mongodb.MongoStorage();

      // Get user IDs
      const crUser = await UserModel.findOne({ username: "cr1" });
      const studentUser = await UserModel.findOne({ username: "student1" });

      if (crUser && studentUser) {
        await mongoStorage.initializeSamplePerformanceData(
          [crUser._id],
          [studentUser._id]
        );
        res.json({ message: "Sample data reset successfully" });
      } else {
        res.status(400).json({ error: "Users not found" });
      }
    } catch (error) {
      console.error("Reset error:", error);
      res.status(500).json({ error: "Reset failed" });
    }
  }
);

// Debug route to see all updates
router.get("/debug/assignments", requireAuth, async (req: any, res: any) => {
  try {
    const allUpdates = await UpdateModel.find().lean();
    const assignments = allUpdates.filter((u) => u.category === "assignments");

    res.json({
      totalUpdates: allUpdates.length,
      totalAssignments: assignments.length,
      allUpdates: allUpdates.map((u) => ({
        id: u._id,
        title: u.title,
        category: u.category,
        dueDate: u.dueDate,
        authorId: u.authorId,
      })),
      assignments: assignments.map((a) => ({
        id: a._id,
        title: a.title,
        dueDate: a.dueDate,
        authorId: a.authorId,
      })),
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

// Debug route to clear assignment submissions
router.post(
  "/debug/clear-submissions",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const deletedCount = await AssignmentSubmissionModel.deleteMany({});
      console.log(
        `Cleared ${deletedCount.deletedCount} assignment submissions`
      );
      res.json({
        success: true,
        message: `Cleared ${deletedCount.deletedCount} assignment submissions`,
      });
    } catch (error) {
      console.error("Clear submissions error:", error);
      res.status(500).json({ error: "Failed to clear submissions" });
    }
  }
);

// Get performance metrics for current user
router.get("/metrics", requireAuth, async (req: any, res: any) => {
  try {
    const { subject } = req.query;
    const metrics = await calculatePerformanceMetrics(
      req.session.userId,
      subject
    );
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

// Get detailed performance data for dashboard boxes
router.get("/dashboard", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const { subject } = req.query;
    const filter = subject ? { subject } : {};

    // Recent attendance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = await AttendanceModel.find({
      userId,
      date: { $gte: thirtyDaysAgo },
      ...filter,
    })
      .sort({ date: -1 })
      .limit(10);

    // All assignments
    const allAssignments = await UpdateModel.find({
      category: "assignments",
      ...(subject && { subject }),
    }).lean();

    console.log(
      "All assignments found:",
      allAssignments.length,
      allAssignments.map((a) => ({
        id: a._id,
        title: a.title,
        dueDate: a.dueDate,
      }))
    );

    // Get all assignment IDs that exist
    const allAssignmentIds = allAssignments.map((a) => a._id.toString());

    // Only get submissions for assignments that actually exist
    const submittedAssignmentIds = await AssignmentSubmissionModel.find({
      userId,
      updateId: { $in: allAssignmentIds }, // Only count existing assignments
    }).distinct("updateId");

    // Debug: Get all assignment submissions for this user
    const allSubmissions = await AssignmentSubmissionModel.find({
      userId,
      updateId: { $in: allAssignmentIds }, // Only existing assignments
    });
    console.log(
      "Assignment submissions for existing assignments:",
      allSubmissions.map((s) => ({
        id: s._id,
        updateId: s.updateId,
        status: s.status,
        submittedAt: s.submittedAt,
      }))
    );

    console.log("Submitted assignment IDs:", submittedAssignmentIds);

    // Convert ObjectIds to strings for comparison
    const submittedAssignmentIdsStr = submittedAssignmentIds.map((id) =>
      id.toString()
    );

    // Pending assignments (not submitted)
    const userPendingAssignments = allAssignments.filter((assignment) => {
      const isSubmitted = submittedAssignmentIdsStr.includes(
        assignment._id.toString()
      );
      const isPastDue =
        assignment.dueDate && new Date(assignment.dueDate) < new Date();

      console.log(`Assignment ${assignment.title}:`, {
        isSubmitted,
        isPastDue,
        dueDate: assignment.dueDate,
        shouldShow: !isSubmitted,
      });

      // Show assignments that are not submitted (regardless of due date for now)
      return !isSubmitted;
    });

    // All presentations for this user (similar to assignments logic)
    const allPresentationUpdates = await UpdateModel.find({
      category: "presentations",
    });

    console.log(
      "All presentation updates found:",
      allPresentationUpdates.length,
      allPresentationUpdates.map((p) => ({
        id: p._id,
        title: p.title,
        category: p.category,
      }))
    );

    // All presentation records for this user
    const allUserPresentations = await PresentationModel.find({
      userId,
    });

    console.log(
      "All presentation records for user:",
      allUserPresentations.map((p) => ({
        id: p._id,
        updateId: p.updateId,
        status: p.status,
        scheduledDate: p.scheduledDate,
      }))
    );

    // Get all presentation IDs that exist
    const allPresentationIds = allPresentationUpdates.map((p) =>
      p._id.toString()
    );

    // Only get completed presentations for presentations that actually exist
    const completedPresentationIds = await PresentationModel.find({
      userId,
      status: "completed",
      updateId: { $in: allPresentationIds }, // Only count existing presentations
    }).distinct("updateId");

    console.log("Completed presentation IDs:", completedPresentationIds);

    // Convert ObjectIds to strings for comparison
    const completedPresentationIdsStr = completedPresentationIds.map((id) =>
      id.toString()
    );

    // Pending presentations (not completed) - similar logic to assignments
    const userPendingPresentations = allPresentationUpdates.filter(
      (presentation) => {
        const isCompleted = completedPresentationIdsStr.includes(
          presentation._id.toString()
        );

        console.log(`Presentation ${presentation.title}:`, {
          isCompleted,
          shouldShow: !isCompleted,
        });

        // Show presentations that are not completed
        return !isCompleted;
      }
    );

    // Upcoming presentations (not completed) - keep old logic for now
    const upcomingPresentations = await PresentationModel.find({
      userId,
      scheduledDate: { $gte: new Date() },
      status: { $in: ["scheduled"] },
    })
      .sort({ scheduledDate: 1 })
      .limit(5);

    // Add title from updateId for presentations
    const populatedUpcomingPresentations = [];
    for (const presentation of upcomingPresentations) {
      const update = await UpdateModel.findById(presentation.updateId);
      populatedUpcomingPresentations.push({
        ...presentation.toObject(),
        title: update?.title || "Presentation",
      });
    }

    // Completed presentations by this user (already retrieved above)
    const completedPresentations = await PresentationModel.find({
      userId,
      status: "completed",
    });

    // Overall metrics
    const metrics = await calculatePerformanceMetrics(userId, subject);

    // Calculate activity streak (consecutive days with any activity)
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Check for any activity on this day
      const dayAssignmentSubmissions = await AssignmentSubmissionModel.find({
        userId,
        submittedAt: { $gte: checkDate, $lt: nextDay },
      });

      const dayPresentationCompletions = await PresentationModel.find({
        userId,
        status: "completed",
        completedAt: { $gte: checkDate, $lt: nextDay },
      });

      const dayAttendance = await AttendanceModel.find({
        userId,
        date: { $gte: checkDate, $lt: nextDay },
        status: "present",
      });

      const hasActivity =
        dayAssignmentSubmissions.length > 0 ||
        dayPresentationCompletions.length > 0 ||
        dayAttendance.length > 0;

      if (hasActivity) {
        streak++;
      } else if (i === 0) {
        // If no activity today, streak is 0
        streak = 0;
        break;
      } else {
        // Found a gap, stop counting
        break;
      }
    }

    // Calculate subject performance dynamically
    const subjectStats = {};

    // Get unique subjects from assignments and presentations
    const assignmentSubjects = Array.from(
      new Set(allAssignments.map((a) => a.subject).filter(Boolean))
    );
    const presentationSubjects = Array.from(
      new Set(allPresentationUpdates.map((p) => p.subject).filter(Boolean))
    );
    const allSubjects = Array.from(
      new Set([...assignmentSubjects, ...presentationSubjects])
    );

    // Calculate performance for each subject
    const subjectPerformance = [];
    for (const subject of allSubjects) {
      // Get assignments for this subject
      const subjectAssignments = allAssignments.filter(
        (a) => a.subject === subject
      );
      const subjectAssignmentIds = subjectAssignments.map((a) =>
        a._id.toString()
      );

      // Get submitted assignments for this subject
      const subjectSubmittedAssignments = await AssignmentSubmissionModel.find({
        userId,
        updateId: { $in: subjectAssignmentIds },
      });

      // Get presentations for this subject
      const subjectPresentations = allPresentationUpdates.filter(
        (p) => p.subject === subject
      );
      const subjectPresentationIds = subjectPresentations.map((p) =>
        p._id.toString()
      );

      // Get completed presentations for this subject
      const subjectCompletedPresentations = await PresentationModel.find({
        userId,
        status: "completed",
        updateId: { $in: subjectPresentationIds },
      });

      // Calculate subject score (combination of assignments and presentations)
      const assignmentScore =
        subjectAssignments.length > 0
          ? (subjectSubmittedAssignments.length / subjectAssignments.length) *
            100
          : 0;
      const presentationScore =
        subjectPresentations.length > 0
          ? (subjectCompletedPresentations.length /
              subjectPresentations.length) *
            100
          : 0;

      // Overall subject score (weighted average)
      const totalItems =
        subjectAssignments.length + subjectPresentations.length;
      const totalCompleted =
        subjectSubmittedAssignments.length +
        subjectCompletedPresentations.length;
      const overallScore =
        totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0;

      if (totalItems > 0) {
        // Only include subjects with actual content
        subjectPerformance.push({
          subject: subject,
          score: Math.round(overallScore),
          total: totalItems,
          completed: totalCompleted,
          assignments: subjectAssignments.length,
          presentations: subjectPresentations.length,
        });
      }
    }

    // Calculate monthly progress (last 6 months)
    const monthlyProgress = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // Get assignments submitted in this month (only count unique assignments)
      const monthAssignmentSubmissions = await AssignmentSubmissionModel.find({
        userId,
        submittedAt: { $gte: monthStart, $lte: monthEnd },
        updateId: { $in: allAssignmentIds }, // Only count existing assignments
      });

      // Get unique assignment IDs to avoid counting resubmissions
      const uniqueAssignmentIds = Array.from(
        new Set(monthAssignmentSubmissions.map((s) => s.updateId.toString()))
      );

      // Get presentations completed in this month (only count existing presentations)
      const monthPresentationCompletions = await PresentationModel.find({
        userId,
        status: "completed",
        completedAt: { $gte: monthStart, $lte: monthEnd },
        updateId: { $in: allPresentationIds }, // Only count existing presentations
      });

      // Get unique presentation IDs
      const uniquePresentationIds = Array.from(
        new Set(monthPresentationCompletions.map((p) => p.updateId.toString()))
      );

      // Get attendance for this month
      const monthAttendance = await AttendanceModel.find({
        userId,
        date: { $gte: monthStart, $lte: monthEnd },
      });

      const totalAttendanceDays = monthAttendance.length;
      const presentDays = monthAttendance.filter(
        (a) => a.status === "present"
      ).length;
      const attendancePercentage =
        totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

      monthlyProgress.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short" }),
        assignments: uniqueAssignmentIds.length, // Count unique assignments only
        presentations: uniquePresentationIds.length, // Count unique presentations only
        attendance: Math.round(attendancePercentage),
      });
    }

    console.log(
      "Pending assignments being sent:",
      userPendingAssignments.length
    );
    console.log("Total assignments:", allAssignments.length);
    console.log("Submitted assignments:", submittedAssignmentIds.length);
    console.log(
      "Pending presentations being sent:",
      userPendingPresentations.length
    );
    console.log("Total presentations:", allPresentationUpdates.length);
    console.log("Completed presentations:", completedPresentationIds.length);

    const dashboardData = {
      attendance: {
        recent: recentAttendance,
        percentage: metrics.attendancePercentage,
      },
      assignments: {
        pending: userPendingAssignments,
        completion: metrics.assignmentCompletion,
        total: allAssignments.length,
        submitted: submittedAssignmentIds.length,
      },
      presentations: {
        pending: userPendingPresentations,
        upcoming: populatedUpcomingPresentations,
        completion: metrics.presentationCompletion,
        total: allPresentationUpdates.length,
        completed: completedPresentationIds.length,
      },
      overall: {
        score: metrics.overallScore,
        trend: "up", // Can be calculated based on historical data
        streak: streak,
      },
      subjectPerformance: subjectPerformance,
      monthlyProgress: monthlyProgress,
    };

    console.log("Dashboard response:", JSON.stringify(dashboardData, null, 2));
    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// Submit assignment
router.post(
  "/assignments/:updateId/submit",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { updateId } = req.params;
      const userId = req.session.userId;

      // Check if assignment exists
      const assignment = await UpdateModel.findOne({
        _id: updateId,
        category: "assignments",
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Check if already submitted
      const existingSubmission = await AssignmentSubmissionModel.findOne({
        updateId,
        userId,
      });

      if (existingSubmission) {
        return res.status(400).json({ error: "Assignment already submitted" });
      }

      // Determine if late
      const isLate = assignment.dueDate && new Date() > assignment.dueDate;

      const submission = new AssignmentSubmissionModel({
        _id: nanoid(),
        updateId,
        userId,
        submittedAt: new Date(),
        status: isLate ? "late" : "submitted",
      });

      await submission.save();

      res.json({
        message: "Assignment submitted successfully",
        submission,
      });
    } catch (error) {
      console.error("Error submitting assignment:", error);
      res.status(500).json({ error: "Failed to submit assignment" });
    }
  }
);

// Get assignment submissions (for CRs)
router.get(
  "/assignments/:updateId/submissions",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { updateId } = req.params;

      // Check if user is CR
      const user = await UserModel.findById(req.session.userId);
      if (user?.role !== "cr") {
        return res.status(403).json({ error: "Access denied" });
      }

      const submissions = await AssignmentSubmissionModel.find({ updateId })
        .populate("userId", "name username")
        .sort({ submittedAt: -1 });

      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  }
);

// Mark attendance (for CRs)
router.post("/attendance", requireAuth, async (req: any, res: any) => {
  try {
    const { userId: targetUserId, date, status, subject } = req.body;
    const crId = req.session.userId;

    // Check if user is CR
    const user = await UserModel.findById(crId);
    if (user?.role !== "cr") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if attendance already marked for this date
    const existingAttendance = await AttendanceModel.findOne({
      userId: targetUserId,
      date: new Date(date),
      subject,
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.markedBy = crId;
      existingAttendance.markedAt = new Date();
      await existingAttendance.save();
    } else {
      // Create new attendance record
      const attendance = new AttendanceModel({
        _id: nanoid(),
        userId: targetUserId,
        date: new Date(date),
        status,
        subject,
        markedBy: crId,
        markedAt: new Date(),
      });
      await attendance.save();
    }

    res.json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

// Get class attendance overview (for CRs)
router.get("/attendance/class", requireAuth, async (req: any, res: any) => {
  try {
    const crId = req.session.userId;
    const { date, subject } = req.query;

    // Check if user is CR
    const user = await UserModel.findById(crId);
    if (user?.role !== "cr") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all students in the same class
    const students = await UserModel.find({
      class: user.class,
      role: "student",
    });

    const attendanceData = [];
    for (const student of students) {
      const attendance = await AttendanceModel.findOne({
        userId: student._id,
        date: new Date(date as string),
        ...(subject && { subject }),
      });

      attendanceData.push({
        student: {
          id: student._id,
          name: student.name,
          username: student.username,
        },
        status: attendance?.status || "not_marked",
      });
    }

    res.json(attendanceData);
  } catch (error) {
    console.error("Error fetching class attendance:", error);
    res.status(500).json({ error: "Failed to fetch class attendance" });
  }
});

// Schedule presentation
router.post("/presentations", requireAuth, async (req: any, res: any) => {
  try {
    const { updateId, userId: targetUserId, scheduledDate } = req.body;
    const crId = req.session.userId;

    // Check if user is CR
    const user = await UserModel.findById(crId);
    if (user?.role !== "cr") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if presentation already scheduled
    const existingPresentation = await PresentationModel.findOne({
      updateId,
      userId: targetUserId,
    });

    if (existingPresentation) {
      return res.status(400).json({ error: "Presentation already scheduled" });
    }

    const presentation = new PresentationModel({
      _id: nanoid(),
      updateId,
      userId: targetUserId,
      scheduledDate: new Date(scheduledDate),
      status: "scheduled",
    });

    await presentation.save();

    res.json({
      message: "Presentation scheduled successfully",
      presentation,
    });
  } catch (error) {
    console.error("Error scheduling presentation:", error);
    res.status(500).json({ error: "Failed to schedule presentation" });
  }
});

// Update presentation score
router.put(
  "/presentations/:id/score",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { score, feedback, duration } = req.body;
      const crId = req.session.userId;

      // Check if user is CR
      const user = await UserModel.findById(crId);
      if (user?.role !== "cr") {
        return res.status(403).json({ error: "Access denied" });
      }

      const presentation = await PresentationModel.findById(id);
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      presentation.score = score;
      presentation.feedback = feedback;
      presentation.duration = duration;
      presentation.status = "completed";
      await presentation.save();

      res.json({
        message: "Presentation scored successfully",
        presentation,
      });
    } catch (error) {
      console.error("Error updating presentation score:", error);
      res.status(500).json({ error: "Failed to update presentation score" });
    }
  }
);

// Mark presentation as complete (by student)
router.put(
  "/presentations/:id/complete",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      const presentation = await PresentationModel.findById(id);
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      // Check if the presentation belongs to the current user
      if (presentation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if already completed
      if (presentation.status === "completed") {
        return res
          .status(400)
          .json({ error: "Presentation already completed" });
      }

      presentation.status = "completed";
      await presentation.save();

      res.json({
        message: "Presentation marked as completed",
        presentation,
      });
    } catch (error) {
      console.error("Error completing presentation:", error);
      res.status(500).json({ error: "Failed to complete presentation" });
    }
  }
);

// Submit/Complete presentation by updateId (for pending presentations)
router.post(
  "/presentations/:updateId/submit",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { updateId } = req.params;
      const userId = req.session.userId;

      console.log(
        `Presentation submission attempt: updateId=${updateId}, userId=${userId}`
      );

      // Check if presentation update exists
      const presentationUpdate = await UpdateModel.findOne({
        _id: updateId,
        category: "presentations",
      });

      console.log("Presentation update found:", !!presentationUpdate);

      if (!presentationUpdate) {
        console.log("Presentation update not found");
        return res
          .status(404)
          .json({ error: "Presentation assignment not found" });
      }

      // Check if there's already a presentation record for this user and update
      let presentationRecord = await PresentationModel.findOne({
        updateId,
        userId,
      });

      console.log("Existing presentation record:", !!presentationRecord);

      if (presentationRecord) {
        // If already exists, just mark as completed
        if (presentationRecord.status === "completed") {
          console.log("Presentation already completed");
          return res
            .status(400)
            .json({ error: "Presentation already completed" });
        }

        console.log("Updating existing presentation record");
        presentationRecord.status = "completed";

        // Generate realistic score (65-100% range like sample data)
        const scorePercentage = 0.65 + Math.random() * 0.35;
        const score = Math.round(100 * scorePercentage);

        presentationRecord.score = score;
        presentationRecord.feedback =
          score > 85
            ? "Outstanding presentation! Clear delivery and excellent content."
            : score > 70
            ? "Good presentation. Work on confidence and eye contact."
            : "Needs improvement in content organization and delivery.";

        await presentationRecord.save();
        console.log(
          "Presentation record updated successfully with score:",
          score
        );
      } else {
        // Create a new presentation record and mark as completed
        console.log("Creating new presentation record");
        const { randomUUID } = await import("crypto");

        // Generate realistic score (65-100% range like sample data)
        const scorePercentage = 0.65 + Math.random() * 0.35;
        const score = Math.round(100 * scorePercentage);

        presentationRecord = new PresentationModel({
          _id: randomUUID(),
          updateId,
          userId,
          scheduledDate: new Date(), // Current date as completion date
          status: "completed",
          score,
          feedback:
            score > 85
              ? "Outstanding presentation! Clear delivery and excellent content."
              : score > 70
              ? "Good presentation. Work on confidence and eye contact."
              : "Needs improvement in content organization and delivery.",
          duration: 15 + Math.floor(Math.random() * 15), // 15-30 minutes like sample data
        });

        await presentationRecord.save();
        console.log("New presentation record created successfully");
      }

      console.log("Presentation submission completed successfully");
      res.json({
        message: "Presentation marked as completed",
        presentation: presentationRecord,
      });
    } catch (error) {
      console.error("Error submitting presentation:", error);
      res.status(500).json({ error: "Failed to submit presentation" });
    }
  }
);

// Debug endpoint to fix existing presentation scores
router.post("/debug/fix-presentation-scores", async (req: any, res: any) => {
  try {
    console.log("Fixing existing presentation scores...");

    // Find all presentation records with score of 85 (the hardcoded ones)
    const presentationsToFix = await PresentationModel.find({
      status: "completed",
      score: 85,
    });

    console.log(
      `Found ${presentationsToFix.length} presentations with hardcoded score of 85`
    );

    let updatedCount = 0;

    for (const presentation of presentationsToFix) {
      // Generate realistic score (65-100% range like sample data)
      const scorePercentage = 0.65 + Math.random() * 0.35;
      const score = Math.round(100 * scorePercentage);

      presentation.score = score;
      presentation.feedback =
        score > 85
          ? "Outstanding presentation! Clear delivery and excellent content."
          : score > 70
          ? "Good presentation. Work on confidence and eye contact."
          : "Needs improvement in content organization and delivery.";

      await presentation.save();
      updatedCount++;

      console.log(
        `Updated presentation ${presentation._id} with new score: ${score}`
      );
    }

    res.json({
      message: "Presentation scores updated successfully",
      totalFound: presentationsToFix.length,
      totalUpdated: updatedCount,
    });
  } catch (error) {
    console.error("Error fixing presentation scores:", error);
    res.status(500).json({ error: "Failed to fix presentation scores" });
  }
});

export default router;
