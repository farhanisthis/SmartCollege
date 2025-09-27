import express, { Request, Response, NextFunction } from "express";
import { DailyAttendanceModel } from "../models/mongodb";
import { nanoid } from "nanoid";
import { format } from "date-fns";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    username: string;
  };
}

const router = express.Router();

// Middleware to check if user is CR
const requireCRRole = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "cr") {
    return res.status(403).json({
      success: false,
      error: "Only Class Representatives can manage attendance",
    });
  }
  next();
};

// Get attendance for a specific date
router.get("/daily", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required",
      });
    }

    console.log(`Fetching attendance for date: ${date}`);

    const attendanceRecord = await DailyAttendanceModel.findOne({
      date: new Date(date as string),
      classSection: "E1",
    });

    console.log(`Found attendance record:`, attendanceRecord ? "Yes" : "No");

    res.json({
      success: true,
      data: attendanceRecord || null,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch attendance",
    });
  }
});

// Save attendance for a day
router.post(
  "/save-day",
  requireCRRole,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, attendance } = req.body;
      const userId = req.user?.userId;

      if (!date || !attendance) {
        return res.status(400).json({
          success: false,
          error: "Date and attendance data are required",
        });
      }

      console.log(`Saving attendance for date: ${date} by user: ${userId}`);

      // Transform attendance data to match schema
      const students = Object.entries(attendance)
        .map(([studentId, subjects]: [string, any]) => ({
          studentId,
          subjects: Object.entries(subjects || {})
            .filter(([_, status]) => status !== undefined && status !== null)
            .map(([subjectName, status]) => ({
              subjectName,
              status: status as "present" | "absent",
              timestamp: new Date(),
            })),
        }))
        .filter((student) => student.subjects.length > 0);

      console.log(
        `Transformed students data:`,
        students.length,
        "students with attendance"
      );

      // Update or create attendance record
      const attendanceRecord = await DailyAttendanceModel.findOneAndUpdate(
        {
          date: new Date(date),
          classSection: "E1",
        },
        {
          _id: nanoid(),
          date: new Date(date),
          classSection: "E1",
          markedBy: userId,
          students: students,
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log(`Attendance saved successfully:`, attendanceRecord._id);

      res.json({
        success: true,
        message: "Attendance saved successfully",
        data: attendanceRecord,
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save attendance",
      });
    }
  }
);

// Get attendance history
router.get("/history", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    console.log(`Fetching attendance history with params:`, {
      startDate,
      endDate,
      limit,
    });

    const query: any = { classSection: "E1" };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const attendanceHistory = await DailyAttendanceModel.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit as string));

    console.log(`Found ${attendanceHistory.length} attendance records`);

    res.json({
      success: true,
      data: attendanceHistory,
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch attendance history",
    });
  }
});

// Get attendance statistics
router.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month
      ? parseInt(month as string)
      : new Date().getMonth() + 1;
    const currentYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    console.log(
      `Calculating attendance stats for ${currentMonth}/${currentYear}`
    );

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    const attendanceRecords = await DailyAttendanceModel.find({
      classSection: "E1",
      date: { $gte: startDate, $lte: endDate },
    });

    console.log(
      `Found ${attendanceRecords.length} records for stats calculation`
    );

    // Calculate statistics
    const subjectWiseStats: Record<
      string,
      { present: number; total: number; percentage: number }
    > = {};
    let totalPresentCount = 0;
    let totalPossibleCount = 0;

    attendanceRecords.forEach((record) => {
      record.students.forEach((student) => {
        student.subjects.forEach((subject) => {
          if (!subjectWiseStats[subject.subjectName]) {
            subjectWiseStats[subject.subjectName] = {
              present: 0,
              total: 0,
              percentage: 0,
            };
          }

          subjectWiseStats[subject.subjectName].total++;
          totalPossibleCount++;

          if (subject.status === "present") {
            subjectWiseStats[subject.subjectName].present++;
            totalPresentCount++;
          }
        });
      });
    });

    // Calculate percentages
    Object.keys(subjectWiseStats).forEach((subject) => {
      const stats = subjectWiseStats[subject];
      stats.percentage =
        stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
    });

    const stats = {
      totalDays: attendanceRecords.length,
      avgAttendance:
        totalPossibleCount > 0
          ? (totalPresentCount / totalPossibleCount) * 100
          : 0,
      subjectWiseStats,
      dailyStats: attendanceRecords.map((record) => {
        const totalStudents = record.students.length;
        const presentCount = record.students.reduce(
          (acc, student) =>
            acc + student.subjects.filter((s) => s.status === "present").length,
          0
        );

        return {
          date: record.date,
          totalStudents,
          presentCount,
          subjects:
            record.students[0]?.subjects.map((s) => s.subjectName) || [],
        };
      }),
    };

    console.log(`Stats calculated:`, {
      totalDays: stats.totalDays,
      avgAttendance: stats.avgAttendance.toFixed(2),
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error calculating attendance stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate attendance statistics",
    });
  }
});

// Delete attendance record (CR only)
router.delete(
  "/daily/:date",
  requireCRRole,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.params;

      console.log(`Deleting attendance record for date: ${date}`);

      const result = await DailyAttendanceModel.findOneAndDelete({
        date: new Date(date),
        classSection: "E1",
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Attendance record not found",
        });
      }

      console.log(`Successfully deleted attendance record: ${result._id}`);

      res.json({
        success: true,
        message: "Attendance record deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting attendance:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete attendance record",
      });
    }
  }
);

// Get timetable for a specific day (helper endpoint)
router.get("/timetable", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required",
      });
    }

    const dayOfWeek = format(new Date(date as string), "EEEE"); // Monday, Tuesday, etc.

    // E1 Timetable Data
    const E1Schedule: Record<
      string,
      Record<string, { text: string; bg: string }>
    > = {
      "10:30 AM—11:30 AM": {
        Monday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
        Thursday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
      },
      "11:30 AM—12:30 PM": {
        Monday: { text: "CG", bg: "from-blue-600 via-blue-500 to-blue-400" },
        Tuesday: {
          text: "CG",
          bg: "from-green-600 via-green-500 to-green-400",
        },
        Wednesday: {
          text: "OS",
          bg: "from-purple-600 via-purple-500 to-purple-400",
        },
        Thursday: {
          text: "OS",
          bg: "from-purple-600 via-purple-500 to-purple-400",
        },
        Friday: {
          text: "OS",
          bg: "from-purple-600 via-purple-500 to-purple-400",
        },
      },
      "12:30 PM—01:30 PM": {
        Monday: {
          text: "OS",
          bg: "from-purple-600 via-purple-500 to-purple-400",
        },
        Tuesday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
        Wednesday: {
          text: "CG",
          bg: "from-green-600 via-green-500 to-green-400",
        },
        Thursday: {
          text: "CG",
          bg: "from-green-600 via-green-500 to-green-400",
        },
        Friday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
      },
      "01:30 PM—02:30 PM": {
        Wednesday: {
          text: "CG Lab 4",
          bg: "from-green-700 via-green-600 to-green-500",
        },
      },
      "02:30 PM—03:30 PM": {
        Monday: {
          text: "CG Lab 4",
          bg: "from-green-700 via-green-600 to-green-500",
        },
        Tuesday: {
          text: "CG Lab 4",
          bg: "from-green-700 via-green-600 to-green-500",
        },
        Thursday: {
          text: "CG Lab 4",
          bg: "from-green-700 via-green-600 to-green-500",
        },
        Friday: {
          text: "ML Lab 4",
          bg: "from-orange-600 via-orange-500 to-orange-400",
        },
      },
      "03:30 PM—04:30 PM": {
        Monday: {
          text: "ML",
          bg: "from-orange-600 via-orange-500 to-orange-400",
        },
        Tuesday: {
          text: "Linux Lab 4",
          bg: "from-blue-700 via-blue-600 to-blue-500",
        },
        Wednesday: {
          text: "Linux Lab 4",
          bg: "from-blue-700 via-blue-600 to-blue-500",
        },
        Thursday: {
          text: "ML",
          bg: "from-orange-600 via-orange-500 to-orange-400",
        },
        Friday: {
          text: "Linux Lab 4",
          bg: "from-blue-700 via-blue-600 to-blue-500",
        },
      },
      "04:30 PM—05:30 PM": {
        Monday: {
          text: "ML Lab 4",
          bg: "from-orange-600 via-orange-500 to-orange-400",
        },
        Wednesday: {
          text: "ML",
          bg: "from-orange-600 via-orange-500 to-orange-400",
        },
        Thursday: {
          text: "Linux Lab 4",
          bg: "from-blue-700 via-blue-600 to-blue-500",
        },
        Friday: {
          text: "ML",
          bg: "from-orange-600 via-orange-500 to-orange-400",
        },
      },
    };

    // Extract subjects for the day
    const subjects: Array<{ time: string; subject: string; bg: string }> = [];

    Object.entries(E1Schedule).forEach(([timeSlot, schedule]) => {
      const daySchedule = schedule[dayOfWeek];
      if (daySchedule && daySchedule.text) {
        subjects.push({
          time: timeSlot,
          subject: daySchedule.text,
          bg: daySchedule.bg,
        });
      }
    });

    console.log(`Timetable for ${dayOfWeek}:`, subjects.length, "subjects");

    res.json({
      success: true,
      data: {
        date: date,
        dayOfWeek: dayOfWeek,
        subjects: subjects,
      },
    });
  } catch (error) {
    console.error("Error fetching timetable:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch timetable",
    });
  }
});

export default router;
