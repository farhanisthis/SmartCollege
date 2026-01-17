import { Router } from "express";
import {
  AssignmentSubmissionModel,
  DailyAttendanceModel,
  PresentationModel,
  PerformanceMetricsModel,
  UpdateModel,
  UserModel,
} from "../models/mongodb";
import { nanoid } from "nanoid";

const router = Router();

// Helper to extract section from class string
function getSection(classStr: string): string | null {
  const match = classStr.match(/\b(E1|E2|M1|M2)\b/);
  return match ? match[1] : null;
}

// Middleware to check if user is authenticated and populate class
const requireAuth = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
     const user = await UserModel.findById(req.session.userId);
     if (!user) return res.status(401).json({ error: "User not found" });
     
     req.user = {
         userId: user.id,
         role: user.role,
         username: user.username,
         class: user.class
     };
     next();
  } catch (err) {
      console.error("Performance Auth Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
};

// Calculate performance metrics for a user
// @param userId - Should be the student's rollNumber (enrollment number) for attendance matching
async function calculatePerformanceMetrics(userId: string, section: string, subject?: string) {
  const filter = subject ? { subject } : {};

  // Attendance percentage using DailyAttendanceModel
  let totalAttendanceCount = 0;
  let presentCount = 0;

  if (!section) {
      console.warn("No section provided for metrics calculation");
      // Return zeroed metrics or handle as error? For now, return safe defaults.
      return {
        attendancePercentage: 0,
        assignmentCompletion: 0,
        presentationCompletion: 0,
        overallScore: 0,
      };
  }

  // Get all daily attendance records for the specific section
  const dailyAttendanceRecords = await DailyAttendanceModel.find({
    classSection: section, // DYNAMIC SECTION
  });

  // Calculate attendance from daily records
  // Note: studentId in attendance records is the rollNumber, not UUID
  dailyAttendanceRecords.forEach((record) => {
    const studentRecord = record.students.find((s) => s.studentId === userId);

    if (studentRecord) {
      studentRecord.subjects.forEach((subjectRecord) => {
        // If filtering by subject, only count matching subjects
        if (!subject || subjectRecord.subjectName === subject) {
          totalAttendanceCount++;
          // Handle both correct format ("present"/"absent") and corrupted format (individual characters)
          // If status is "present" or single character "p", count as present
          if (
            subjectRecord.status === "present" ||
            (subjectRecord.status as string) === "p"
          ) {
            presentCount++;
          }
        }
      });
    }
  });

  const attendancePercentage =
    totalAttendanceCount > 0 ? (presentCount / totalAttendanceCount) * 100 : 0;

  // Assignment completion (based on submission count, not scores)
  // TODO: Scope assignments by section if needed in future (currently categorized globally)
  const assignments = await UpdateModel.find({
    category: "assignments",
    ...(subject && { subject }),
  });
  const submittedAssignments = await AssignmentSubmissionModel.countDocuments({
    userId, // Checks submission by UUID (correct)
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

// Debug route to reset sample data - REMOVED or SIMPLIFIED
// Removing payload-heavy logic that used legacy models
router.post(
  "/debug/reset-sample-data",
  requireAuth,
  async (req: any, res: any) => {
      // Deprecated in favor of the 'Nuke and Pave' strategy
      res.status(410).json({ error: "This endpoint is deprecated. Use Nuke DB." });
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
    const userId = req.session.userId;

    // Get user's rollNumber for attendance matching
    // req.user is populated by requireAuth now
    const user = req.user;
    const rollNumber = user?.rollNumber || userId; // Fallback to userId if rollNumber not set
    const section = getSection(user?.class || "");

    console.log(
      `[Performance Metrics] User ${userId}, RollNumber: ${rollNumber}, Section: ${section}`
    );

    const metrics = await calculatePerformanceMetrics(
      rollNumber, // Use rollNumber instead of userId
      section || "", // Pass section
      subject
    );
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

// Get detailed performance data for dashboard boxes (OPTIMIZED)
router.get("/dashboard", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const { subject } = req.query;
    // req.user is populated by requireAuth
    const user = req.user;
    const rollNumber = user?.rollNumber || userId; // Fallback
    const section = getSection(user?.class || "");

    console.time("Dashboard API Total Time");
    console.log(
      `[Performance Dashboard] User ${userId}, RollNumber: ${rollNumber}, Section: ${section}`
    );

    if (!section) {
        // Return null/empty data if section not found
        return res.json({
            attendance: { recent: [], percentage: 0 },
            assignments: { pending: [], completion: 0, total: 0, submitted: 0 },
            presentations: { pending: [], upcoming: [], completion: 0, total: 0, completed: 0 },
            overall: { score: 0, trend: "flat", streak: 0 },
            subjectPerformance: [],
            monthlyProgress: []
        });
    }

    // Execute all major queries in parallel for better performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.time("Parallel Database Queries");

    // Run all major queries in parallel instead of sequentially
    const [
      recentDailyRecords,
      allAssignments,
      allPresentationUpdates,
      userSubmissions,
      userPresentations,
      allUserPresentations,
    ] = await Promise.all([
      // Recent attendance (optimized with projection) - use rollNumber for matching
      DailyAttendanceModel.find({
        classSection: section, // DYNAMIC SECTION
        date: { $gte: thirtyDaysAgo },
        "students.studentId": rollNumber, // Use rollNumber instead of userId
      })
        .select("date students.studentId students.subjects markedBy")
        .sort({ date: -1 })
        .limit(10)
        .lean(),

      // All assignments (with projection to reduce data transfer)
      UpdateModel.find({
        category: "assignments",
        ...(subject && { subject }),
      })
        .select("title subject dueDate")
        .lean(),

      // All presentation updates (with projection)
      UpdateModel.find({
        category: "presentations",
      })
        .select("title subject category")
        .lean(),

      // User's assignment submissions (single query with projection)
      AssignmentSubmissionModel.find({ userId })
        .select("updateId status submittedAt")
        .lean(),

      // User's presentations (single query with projection)
      PresentationModel.find({
        userId,
        scheduledDate: { $gte: new Date() },
        status: { $in: ["scheduled"] },
      })
        .select("updateId scheduledDate status")
        .sort({ scheduledDate: 1 })
        .limit(5)
        .lean(),

      // All user presentations for counting (with projection)
      PresentationModel.find({ userId })
        .select("updateId status completedAt")
        .lean(),
    ]);

    console.timeEnd("Parallel Database Queries");

    console.time("Transform Attendance Data");

    // Transform daily attendance records (optimized processing) - use rollNumber for matching
    const recentAttendance: any[] = [];
    recentDailyRecords.forEach((dailyRecord) => {
      const studentRecord = dailyRecord.students?.find(
        (s) => s.studentId === rollNumber // Use rollNumber instead of userId
      );

      if (studentRecord) {
        studentRecord.subjects?.forEach((subjectRecord) => {
          // If filtering by subject, only include matching subjects
          if (!subject || subjectRecord.subjectName === subject) {
            // Normalize status: treat "p" as "present" and others as "absent"
            const normalizedStatus =
              (subjectRecord.status as string) === "p" ||
              subjectRecord.status === "present"
                ? "present"
                : "absent";

            recentAttendance.push({
              _id: `${dailyRecord._id}-${subjectRecord.subjectName}`,
              userId,
              date: dailyRecord.date,
              status: normalizedStatus,
              subject: subjectRecord.subjectName,
              markedBy: dailyRecord.markedBy,
              markedAt: subjectRecord.timestamp,
            });
          }
        });
      }
    });

    // Sort by date descending and limit to 10 (already done by DB query, but ensure)
    recentAttendance.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    recentAttendance.splice(10);

    console.timeEnd("Transform Attendance Data");

    console.time("Process Submissions Data");

    // Get all assignment IDs that exist (already fetched in parallel)
    const allAssignmentIds = allAssignments.map((a) => a._id.toString());

    // Filter submissions to only existing assignments (data already fetched)
    const validSubmissions = userSubmissions.filter((sub) =>
      allAssignmentIds.includes(sub.updateId.toString())
    );

    const submittedAssignmentIds = validSubmissions.map((sub) =>
      sub.updateId.toString()
    );

    console.log(
      `Optimized: ${allAssignments.length} assignments, ${submittedAssignmentIds.length} submitted`
    );

    // Pending assignments (not submitted) - optimized filtering
    const userPendingAssignments = allAssignments.filter((assignment) => {
      const isSubmitted = submittedAssignmentIds.includes(
        assignment._id.toString()
      );
      return !isSubmitted;
    });

    console.timeEnd("Process Submissions Data");

    console.time("Process Presentations Data");

    // Get all presentation IDs that exist (already fetched)
    const allPresentationIds = allPresentationUpdates.map((p) =>
      p._id.toString()
    );

    // Filter user presentations for completed ones (data already fetched)
    const completedUserPresentations = allUserPresentations.filter(
      (pres) =>
        pres.status === "completed" &&
        allPresentationIds.includes(pres.updateId.toString())
    );

    const completedPresentationIds = completedUserPresentations.map((p) =>
      p.updateId.toString()
    );

    // Pending presentations (not completed) - optimized filtering
    const userPendingPresentations = allPresentationUpdates.filter(
      (presentation) =>
        !completedPresentationIds.includes(presentation._id.toString())
    );

    // Upcoming presentations (already fetched in parallel query above)

    // Add title from updateId for upcoming presentations (optimized)
    const populatedUpcomingPresentations = [];
    for (const presentation of userPresentations) {
      const update = allPresentationUpdates.find(
        (u) => u._id.toString() === presentation.updateId.toString()
      );
      populatedUpcomingPresentations.push({
        ...presentation,
        title: update?.title || "Presentation",
      });
    }

    console.timeEnd("Process Presentations Data");

    console.time("Calculate Optimized Metrics");

    // Calculate metrics using already fetched data (avoid recalculating)
    const totalSubmissions = validSubmissions.length;
    const totalAssignments = allAssignments.length;
    const assignmentCompletion =
      totalAssignments > 0 ? (totalSubmissions / totalAssignments) * 100 : 0;

    const totalPresentationsCompleted = completedUserPresentations.length;
    const totalPresentations = allPresentationUpdates.length;
    const presentationCompletion =
      totalPresentations > 0
        ? (totalPresentationsCompleted / totalPresentations) * 100
        : 0;

    // For attendance, we'll still use the calculatePerformanceMetrics function for now
    const attendanceMetrics = await calculatePerformanceMetrics(
      rollNumber, // Use rollNumber instead of userId for attendance matching
      section, // Pass section
      subject
    );

    const metrics = {
      attendancePercentage: attendanceMetrics.attendancePercentage,
      assignmentCompletion: Math.round(assignmentCompletion * 100) / 100,
      presentationCompletion: Math.round(presentationCompletion * 100) / 100,
      overallScore:
        Math.round(
          (attendanceMetrics.attendancePercentage * 0.3 +
            assignmentCompletion * 0.4 +
            presentationCompletion * 0.3) *
            100
        ) / 100,
    };

    console.timeEnd("Calculate Optimized Metrics");

    console.time("Calculate Activity Streak");

    // Optimized activity streak calculation using already fetched data
    let streak = 0;
    const today = new Date();

    // Group activities by date for faster lookup
    const activitiesByDate = new Map();

    // Process submissions (already fetched)
    validSubmissions.forEach((sub) => {
      const dateKey = new Date(sub.submittedAt).toDateString();
      activitiesByDate.set(dateKey, true);
    });

    // Process completed presentations (already fetched)
    completedUserPresentations.forEach((pres) => {
      // Use scheduledDate or current date as fallback
      const dateKey = new Date().toDateString(); // Simplified for now
      activitiesByDate.set(dateKey, true);
    });

    // Process attendance (from already fetched recent records)
    recentDailyRecords.forEach((record) => {
      const studentRecord = record.students?.find(
        (s) => s.studentId === rollNumber // Use rollNumber instead of userId
      );
      if (
        studentRecord?.subjects?.some(
          (s) => s.status === "present" || (s.status as any) === "p"
        )
      ) {
        const dateKey = new Date(record.date).toDateString();
        activitiesByDate.set(dateKey, true);
      }
    });

    // Calculate streak from today backwards
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateKey = checkDate.toDateString();

      if (activitiesByDate.has(dateKey)) {
        streak++;
      } else if (i === 0) {
        streak = 0;
        break;
      } else {
        break;
      }
    }

    console.timeEnd("Calculate Activity Streak");

    console.time("Calculate Subject Performance");

    // Optimized subject performance calculation using already fetched data
    const assignmentSubjects = Array.from(
      new Set(allAssignments.map((a) => a.subject).filter(Boolean))
    );
    const presentationSubjects = Array.from(
      new Set(allPresentationUpdates.map((p) => p.subject).filter(Boolean))
    );
    const allSubjects = Array.from(
      new Set([...assignmentSubjects, ...presentationSubjects])
    );

    const subjectPerformance = allSubjects
      .map((subject) => {
        // Filter assignments and presentations for this subject (from already fetched data)
        const subjectAssignments = allAssignments.filter(
          (a) => a.subject === subject
        );
        const subjectPresentations = allPresentationUpdates.filter(
          (p) => p.subject === subject
        );

        // Filter user submissions for this subject (from already fetched data)
        const subjectSubmissions = validSubmissions.filter((sub) =>
          subjectAssignments.some(
            (a) => a._id.toString() === sub.updateId.toString()
          )
        );

        const subjectCompletedPresentations = completedUserPresentations.filter(
          (pres) =>
            subjectPresentations.some(
              (p) => p._id.toString() === pres.updateId.toString()
            )
        );

        const totalItems =
          subjectAssignments.length + subjectPresentations.length;
        const totalCompleted =
          subjectSubmissions.length + subjectCompletedPresentations.length;
        const overallScore =
          totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0;

        return totalItems > 0
          ? {
              subject,
              score: Math.round(overallScore),
              total: totalItems,
              completed: totalCompleted,
              assignments: subjectAssignments.length,
              presentations: subjectPresentations.length,
            }
          : null;
      })
      .filter(Boolean);

    console.timeEnd("Calculate Subject Performance");

    console.time("Calculate Monthly Progress");

    // Simplified monthly progress using already fetched data
    const monthlyProgress = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // Count submissions in this month (from already fetched data)
      const monthSubmissions = validSubmissions.filter((sub) => {
        const subDate = new Date(sub.submittedAt);
        return subDate >= monthStart && subDate <= monthEnd;
      });

      // Count presentations completed in this month (simplified)
      const monthPresentations = completedUserPresentations.filter(() => {
        // Simplified logic - could be enhanced with actual completion dates
        return Math.random() > 0.5; // Placeholder for demo
      });

      // Simplified attendance calculation (could be optimized further with aggregation)
      const attendancePercentage = 75 + Math.random() * 20; // Placeholder for demo

      monthlyProgress.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short" }),
        assignments: monthSubmissions.length,
        presentations: monthPresentations.length,
        attendance: Math.round(attendancePercentage),
      });
    }

    console.timeEnd("Calculate Monthly Progress");

    console.time("Prepare Final Response");

    // Prepare optimized dashboard response
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

    console.timeEnd("Prepare Final Response");
    console.timeEnd("Dashboard API Total Time");

    console.log(
      `✅ Optimized Dashboard: ${allAssignments.length} assignments, ${allPresentationUpdates.length} presentations, ${recentAttendance.length} recent attendance`
    );

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

// Mark attendance (for CRs) - Updated to use DailyAttendanceModel
router.post("/attendance", requireAuth, async (req: any, res: any) => {
  try {
    const { userId: targetUserId, date, status, subject } = req.body;
    const crId = req.session.userId;

    // Check if user is CR
    const user = await UserModel.findById(crId);
    if (user?.role !== "cr") {
      return res.status(403).json({ error: "Access denied" });
    }

    const attendanceDate = new Date(date);

    // Find or create daily attendance record
    let dailyAttendance = await DailyAttendanceModel.findOne({
      date: attendanceDate,
      classSection: "E1",
    });

    if (!dailyAttendance) {
      // Create new daily attendance record
      dailyAttendance = new DailyAttendanceModel({
        _id: nanoid(),
        date: attendanceDate,
        classSection: "E1",
        markedBy: crId,
        students: [],
      });
    }

    // Find or create student record in daily attendance
    let studentRecord = dailyAttendance.students.find(
      (s) => s.studentId === targetUserId
    );

    if (!studentRecord) {
      studentRecord = {
        studentId: targetUserId,
        subjects: [],
      };
      dailyAttendance.students.push(studentRecord);
    }

    // Find or create subject record
    let subjectRecord = studentRecord.subjects.find(
      (s) => s.subjectName === subject
    );

    if (subjectRecord) {
      // Update existing subject attendance
      subjectRecord.status = status;
      subjectRecord.timestamp = new Date();
    } else {
      // Add new subject attendance
      studentRecord.subjects.push({
        subjectName: subject,
        status: status,
        timestamp: new Date(),
      });
    }

    await dailyAttendance.save();
    res.json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

// Get class attendance overview (for CRs) - Updated to use DailyAttendanceModel
router.get("/attendance/class", requireAuth, async (req: any, res: any) => {
  try {
    const crId = req.session.userId;
    const { date, subject } = req.query;

    // Check if user is CR
    const user = await UserModel.findById(crId);
    if (user?.role !== "cr") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all students in the same class (E1 section)
    const students = await UserModel.find({
      role: "student",
      // Assuming all students are in E1 for now, or filter by class if needed
    });

    // Get daily attendance record for the specified date
    const dailyAttendance = await DailyAttendanceModel.findOne({
      date: new Date(date as string),
      classSection: "E1",
    });

    const attendanceData = [];
    for (const student of students) {
      let status = "not_marked";

      if (dailyAttendance) {
        // Use rollNumber for matching, fallback to _id if rollNumber not set
        const studentIdentifier = student.rollNumber || student._id;
        const studentRecord = dailyAttendance.students.find(
          (s) => s.studentId === studentIdentifier
        );

        if (studentRecord && subject) {
          const subjectRecord = studentRecord.subjects.find(
            (s) => s.subjectName === subject
          );
          if (subjectRecord) {
            status = subjectRecord.status;
          }
        } else if (studentRecord && !subject) {
          // If no specific subject, show overall status
          const presentCount = studentRecord.subjects.filter(
            (s) => s.status === "present"
          ).length;
          const totalCount = studentRecord.subjects.length;
          status = presentCount > totalCount / 2 ? "present" : "absent";
        }
      }

      attendanceData.push({
        student: {
          id: student._id,
          name: student.name,
          username: student.username,
          rollNumber: student.rollNumber, // Include rollNumber in response
        },
        status: status,
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
