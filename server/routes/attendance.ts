import express, { Request, Response, NextFunction } from "express";
import { AttendanceModel, UserModel } from "../models/mongodb";
import { nanoid } from "nanoid";
import { format } from "date-fns";
import { upload } from "../services/fileUpload";
import { textExtractionService } from "../services/textExtraction";
import {
  processAttendanceSheet,
  matchStudentsToDatabase,
  type StudentAttendanceEntry,
} from "../services/attendanceProcessor";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    username: string;
    class?: string;
  };
}

const router = express.Router();

// Helper to extract section from class string
function getSection(classStr: string): string | null {
  const match = classStr.match(/\b(E1|E2|M1|M2)\b/);
  return match ? match[1] : null;
}

// Helper function to get subjects for a given day of the week
function getSubjectsForDay(dayOfWeek: string): string[] {
  // E1 Timetable Data
  // TODO: Make timetable dynamic per section
  const E1Schedule: Record<
    string,
    Record<string, { text: string; bg: string }>
  > = {
    "10:30 AM—11:30 AM": {
      Monday: {
        text: "CG",
        bg: "from-green-600 via-green-500 to-green-400",
      },
      Thursday: {
        text: "CC",
        bg: "from-blue-600 via-blue-500 to-blue-400",
      },
    },
    // ... (rest of schedule omitted for brevity, keeping existing structure)
    // NOTE: In a real generalized system, Timetable should be fetched from DB based on section.
    // For now, we assume E1 schedule or use it as fallback.
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

  // Extract unique subjects for the day
  const subjects = new Set<string>();

  Object.entries(E1Schedule).forEach(([timeSlot, schedule]) => {
    const daySchedule = schedule[dayOfWeek];
    if (daySchedule && daySchedule.text) {
      subjects.add(daySchedule.text);
    }
  });

  return Array.from(subjects);
}

// Authentication middleware to populate req.user from session
const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = await UserModel.findById(req.session.userId);
    if (!user) {
        return res.status(401).json({ message: "User not found" });
    }

    // Populate req.user from session AND DB
    req.user = {
        userId: user.id,
        role: user.role,
        username: user.username,
        class: user.class
    };

    next();
  } catch (err) {
      console.error("Auth middleware error:", err);
      res.status(500).json({ message: "Internal server error" });
  }
};

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

// Get attendance for a specific day
router.get(
  "/daily",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({
          success: false,
          error: "Date is required",
        });
      }

      const section = getSection(req.user?.class || "");
      if (!section) {
         return res.json({ success: true, data: null });
      }

      const queryDate = new Date(date as string);
      console.log(`Fetching attendance for date: ${queryDate}, Section: ${section}`);

      // Fetch all attendance records for this date and section
      const records = await AttendanceModel.find({
        date: queryDate,
        classSection: section,
      }).lean();

      if (records.length === 0) {
        return res.json({ success: true, data: null });
      }

      // Group by studentId to reconstruct the expected legacy format
      const studentMap = new Map<string, any>();
      
      for (const record of records) {
        if (!studentMap.has(record.studentId)) {
          studentMap.set(record.studentId, {
            studentId: record.studentId,
            subjects: []
          });
        }
        studentMap.get(record.studentId).subjects.push({
          subjectName: record.subject,
          status: record.status,
          timestamp: record.createdAt // Use creation time as timestamp
        });
      }

      // Construct the response object that looks like the old DailyAttendance document
      const reconstructedDoc = {
        _id: `generated-${queryDate.getTime()}`, // Virtual ID since we don't have a single doc
        date: queryDate,
        classSection: section,
        markedBy: records[0].markedBy, // Take from first record
        students: Array.from(studentMap.values())
      };

      console.log(`Found ${records.length} records, grouped into ${studentMap.size} students`);

      res.json({
        success: true,
        data: reconstructedDoc,
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch attendance",
      });
    }
  }
);

// Save attendance for a day
router.post(
  "/save-day",
  requireAuth,
  requireCRRole,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, attendance } = req.body;
      const userId = req.user?.userId;
      const section = getSection(req.user?.class || "");

      if (!section) {
          return res.status(400).json({ success: false, error: "CR has no valid section" });
      }

      if (!date || !attendance) {
        return res.status(400).json({
          success: false,
          error: "Date and attendance data are required",
        });
      }

      const attendanceDate = new Date(date);
      console.log(`Saving attendance for date: ${attendanceDate} by user: ${userId} in Section: ${section}`);
      
      // Valid subject names from timetable
      // Relaxed validation to allow for dynamic subjects (Sixth Semester)
      /*
      const validSubjects = [
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
      ];
      */

      // Prepare bulk operations
      const operations: any[] = [];

      // Validate and process attendance data
      Object.entries(attendance).forEach(([studentId, statusOrSubjects]: [string, any]) => {
         // ... existing validation logic ...
         if (!studentId || typeof studentId !== "string" || studentId.trim().length < 5) return;

         let subjectsData: Array<{subjectName: string; status: "present" | "absent"}> = [];

         if (typeof statusOrSubjects === "string") {
            const dayOfWeek = format(attendanceDate, "EEEE");
            const subjects = getSubjectsForDay(dayOfWeek);
            const status = (statusOrSubjects.toLowerCase() === "present" || statusOrSubjects.toLowerCase() === "p") ? "present" : "absent";
            
            subjects.forEach(subject => {
                subjectsData.push({ subjectName: subject, status });
            });
         } else if (typeof statusOrSubjects === "object") {
            Object.entries(statusOrSubjects).forEach(([subject, status]: [string, any]) => {
                // Check if status is defined
                if (status === undefined || status === null) return;
                const validStatus = (String(status).toLowerCase() === "present" || String(status).toLowerCase() === "p") ? "present" : "absent";
                subjectsData.push({ subjectName: subject, status: validStatus });
            });
         }

         subjectsData.forEach(item => {
             operations.push({
                 updateOne: {
                     filter: { 
                         studentId: studentId, 
                         date: attendanceDate, 
                         subject: item.subjectName 
                     },
                     update: { 
                         $set: { 
                             status: item.status, 
                             markedBy: userId,
                             classSection: section,
                             updatedAt: new Date()
                         },
                         $setOnInsert: {
                             _id: nanoid(),
                             createdAt: new Date()
                         }
                     },
                     upsert: true
                 }
             });
         });
      });

      if (operations.length > 0) {
          await AttendanceModel.bulkWrite(operations);
          console.log(`Executed ${operations.length} attendance updates`);
      }

      res.json({
        success: true,
        message: "Attendance saved successfully",
        data: { count: operations.length }
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
router.get(
  "/history",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, limit = 10 } = req.query;
      const section = getSection(req.user?.class || "");

      console.log(`Fetching attendance history with params:`, {
        startDate,
        endDate,
        limit,
        section
      });

      if (!section) return res.json({success: true, data: []});

      const query: any = { classSection: section }; // Dynamic

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string),
        };
      }

      // Aggregate distinct dates first to show history list
      const distinctDates = await AttendanceModel.distinct("date", query);
      
      // Sort dates descending and limits
      const sortedDates = distinctDates
          .map(d => new Date(d))
          .sort((a, b) => b.getTime() - a.getTime())
          .slice(0, parseInt(limit as string));

      const history = await Promise.all(sortedDates.map(async (date) => {
          const count = await AttendanceModel.distinct("studentId", {
               date: date,
               classSection: section
          });
          
          return {
              _id: `history-${date.getTime()}`,
              date: date,
              classSection: section,
              studentCount: count.length,
              // Legacy fields stub
              students: [] 
          };
      }));

      console.log(`Found ${history.length} attendance history records`);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch attendance history",
      });
    }
  }
);

// Get attendance statistics
router.get(
  "/stats",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { month, year } = req.query;
      const section = getSection(req.user?.class || "");
      if (!section) return res.json({ success: true, data: { totalDays: 0, avgAttendance: 0, subjectWiseStats: {}, dailyStats: [] } });

      const currentMonth = month
        ? parseInt(month as string)
        : new Date().getMonth() + 1;
      const currentYear = year
        ? parseInt(year as string)
        : new Date().getFullYear();

      console.log(
        `Calculating attendance stats for ${currentMonth}/${currentYear} Section: ${section}`
      );

      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);

      const records = await AttendanceModel.find({
        classSection: section, 
        date: { $gte: startDate, $lte: endDate },
      }).lean();

      console.log(
        `Found ${records.length} records for stats calculation`
      );

      // Calculate statistics
      const subjectWiseStats: Record<
        string,
        { present: number; total: number; percentage: number }
      > = {};
      let totalPresentCount = 0;
      let totalPossibleCount = 0;
      const dailyStatsMap = new Map<string, { date: Date, totalStudents: Set<string>, presentCount: number }>();

      records.forEach((record) => {
        // Daily stats aggregation
        const dateKey = record.date.toISOString().split('T')[0];
        if (!dailyStatsMap.has(dateKey)) {
            dailyStatsMap.set(dateKey, {
                date: record.date,
                totalStudents: new Set(),
                presentCount: 0
            });
        }
        const dailyStat = dailyStatsMap.get(dateKey)!;
        dailyStat.totalStudents.add(record.studentId);
        if (record.status === "present") {
            dailyStat.presentCount++;
        }

        // Subject stats aggregation
        if (!subjectWiseStats[record.subject]) {
            subjectWiseStats[record.subject] = {
            present: 0,
            total: 0,
            percentage: 0,
            };
        }

        subjectWiseStats[record.subject].total++;
        totalPossibleCount++;

        if (record.status === "present") {
            subjectWiseStats[record.subject].present++;
            totalPresentCount++;
        }
      });

      // Calculate percentages
      Object.keys(subjectWiseStats).forEach((subject) => {
        const stats = subjectWiseStats[subject];
        stats.percentage =
          stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
      });

      const stats = {
        totalDays: dailyStatsMap.size,
        avgAttendance:
          totalPossibleCount > 0
            ? (totalPresentCount / totalPossibleCount) * 100
            : 0,
        subjectWiseStats,
        dailyStats: Array.from(dailyStatsMap.values()).map(stat => ({
            date: stat.date,
            totalStudents: stat.totalStudents.size,
            presentCount: stat.presentCount,
            subjects: [] // Not easily available in aggregate, can leave empty or expensive fetch
        })),
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
  }
);

// Delete attendance record (CR only)
router.delete(
  "/daily/:date",
  requireAuth,
  requireCRRole,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.params;
      const section = getSection(req.user?.class || "");

      if (!section) return res.status(400).json({ error: "No section found" });

      console.log(`Deleting attendance record for date: ${date} Section: ${section}`);

      const result = await AttendanceModel.deleteMany({
        date: new Date(date),
        classSection: section, // Dynamic
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: "Attendance record not found",
        });
      }

      console.log(`Successfully deleted ${result.deletedCount} attendance records`);

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
router.get(
  "/timetable",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
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
          Monday: {
            text: "CG",
            bg: "from-green-600 via-green-500 to-green-400",
          },
          Thursday: {
            text: "CC",
            bg: "from-blue-600 via-blue-500 to-blue-400",
          },
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
  }
);

// Test upload attendance sheet (no auth required for testing)
router.post(
  "/upload-sheet-test",
  upload.single("attendanceSheet"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const { date, overrideDate } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded. Please select an attendance sheet file.",
        });
      }

      console.log(`[Upload] Processing attendance sheet: ${file.originalname}`);
      console.log(`[Upload] File size: ${file.size} bytes`);
      console.log(`[Upload] File type: ${file.mimetype}`);

      // Step 1: Extract text from uploaded file
      console.log(`[Upload] Step 1: Extracting text from ${file.originalname}`);
      console.log(`[Upload] File details:`, {
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
      });

      let extractedText = "";

      try {
        const extractionResult = await textExtractionService.extractText(
          file.path
        );
        extractedText = extractionResult?.content || "";

        console.log(
          `[Upload] Extracted text length: ${extractedText.length} characters`
        );
        console.log(
          `[Upload] Text preview: "${extractedText.substring(0, 200)}..."`
        );

        if (!extractedText || extractedText.trim().length < 20) {
          return res.status(400).json({
            success: false,
            error:
              "Could not extract sufficient text from the uploaded file. Please ensure the image is clear and contains readable text.",
          });
        }
      } catch (extractionError) {
        console.error("[Upload] Text extraction failed:", extractionError);
        return res.status(500).json({
          success: false,
          error: "Failed to extract text from the uploaded file",
          details:
            extractionError instanceof Error
              ? extractionError.message
              : String(extractionError),
        });
      }

      // Step 2: Process with AI
      console.log(`[Upload] Step 2: Processing attendance data with AI`);

      const processingResult = await processAttendanceSheet(
        extractedText,
        file.originalname,
        date || overrideDate
      );

      if (!processingResult.success || !processingResult.data) {
        return res.status(400).json({
          success: false,
          error: processingResult.error || "Failed to process attendance data",
          warnings: processingResult.warnings,
        });
      }

      const parsedData = processingResult.data;

      // For testing, just return the processed data without saving to database
      res.json({
        success: true,
        message: "Attendance sheet processed successfully (TEST MODE)",
        data: {
          date: parsedData.date,
          studentsProcessed: parsedData.students.length,
          subjectsFound: parsedData.subjects,
          students: parsedData.students,
          processingNotes: parsedData.metadata?.processingNotes || [],
        },
        warnings: processingResult.warnings,
        testMode: true,
      });
    } catch (error) {
      console.error("[Upload] Error processing attendance sheet:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process attendance sheet",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Upload attendance text for AI processing
router.post(
  "/upload-text",
  requireAuth,
  requireCRRole,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { attendanceText, overrideDate } = req.body;

      if (
        !attendanceText ||
        typeof attendanceText !== "string" ||
        !attendanceText.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "Attendance text is required and cannot be empty.",
        });
      }

      console.log(`[Text Upload] Processing attendance text`);
      console.log(
        `[Text Upload] Text length: ${attendanceText.length} characters`
      );
      console.log(`[Text Upload] Override date: ${overrideDate}`);

      // Step 1: Process attendance text using AI (no OCR needed)
      console.log(`[Text Upload] Step 1: Processing attendance data with AI`);
      const processingResult = await processAttendanceSheet(
        attendanceText.trim(),
        "manual-text-input",
        overrideDate
      );

      if (!processingResult.success || !processingResult.data) {
        return res.status(400).json({
          success: false,
          error: processingResult.error || "Failed to process attendance text",
          warnings: processingResult.warnings,
        });
      }

      const parsedData = processingResult.data;
      console.log(
        `[Text Upload] AI processed data: ${parsedData.students.length} students, ${parsedData.subjects.length} subjects`
      );

      // Step 2: Use enrollment numbers directly (no database matching needed)
      console.log(`[Text Upload] Step 2: Using enrollment numbers directly`);

      // Step 3: Transform to attendance format using enrollment numbers
      console.log(`[Text Upload] Step 3: Transforming to attendance format`);
      const attendanceData: Record<string, Record<string, string>> = {};

      parsedData.students.forEach((student: StudentAttendanceEntry) => {
        if (student.rollNumber) {
          // Use enrollment number directly as student ID
          attendanceData[student.rollNumber] = student.subjects;
          console.log(
            `[Text Upload] Added student: ${student.rollNumber} (${student.studentName})`
          );
        } else {
          console.warn(
            `[Text Upload] Skipping student without enrollment number: ${student.studentName}`
          );
        }
      });

      // Step 4: Save attendance to database
      console.log(`[Text Upload] Step 4: Saving attendance to database`);
      const attendanceDate = overrideDate || parsedData.date;
      console.log(`[Text Upload] Using date: ${attendanceDate}`);
      const userId = req.user?.userId;

      // Use the existing save logic (similar to save-day endpoint)
      const validSubjects = [
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
      ];

      const validateStatus = (status: string | unknown): "present" | "absent" => {
        if (typeof status === "string") {
          const normalizedStatus = status.toLowerCase().trim();
          if (normalizedStatus === "present" || normalizedStatus === "p") {
            return "present";
          } else if (
            normalizedStatus === "absent" ||
            normalizedStatus === "a"
          ) {
            return "absent";
          }
        }
        return "absent";
      };

      // Convert full subject names to frontend-expected short names
      const convertToFrontendSubjectName = (dbSubjectName: string): string => {
        switch (dbSubjectName.toLowerCase()) {
          case "cloud computing":
          case "cc":
            return "CC";
          case "computer graphics":
          case "cg":
            return "CG";
          case "cg lab 4":
            return "CG Lab 4";
          case "machine learning":
          case "ml":
            return "ML";
          case "ml lab 4":
            return "ML Lab 4";
          case "linux lab 4":
            return "Linux Lab 4";
          case "operating systems":
          case "os":
            return "OS";
          default:
            return dbSubjectName; // Return as-is if no mapping found
        }
      };

      const students = Object.entries(attendanceData)
        .map(([studentId, subjectsData]) => {
          const subjectsArray = Object.entries(subjectsData)
            .filter(([subject, _]: [string, string]) =>
              validSubjects.some(
                (vs: string) =>
                  vs.toLowerCase() === subject.toLowerCase() ||
                  subject.toLowerCase().includes(vs.toLowerCase()) ||
                  vs.toLowerCase().includes(subject.toLowerCase())
              )
            )
            .map(([subjectName, status]: [string, string]) => ({
              subjectName: convertToFrontendSubjectName(subjectName),
              status: validateStatus(status),
              timestamp: new Date(),
            }));

          return subjectsArray.length > 0
            ? {
                studentId,
                subjects: subjectsArray,
              }
            : null;
        })
        .filter(
          (student): student is NonNullable<typeof student> => student !== null
        );

      // Save to database
      const operations: any[] = [];
      const attendanceDateObj = new Date(attendanceDate);

      // Flatten students data for bulk write
      students.forEach(student => {
          student.subjects.forEach(subj => {
              operations.push({
                  updateOne: {
                      filter: {
                          studentId: student.studentId,
                          date: attendanceDateObj,
                          subject: subj.subjectName
                      },
                      update: {
                          $setOnInsert: {
                              _id: nanoid(),
                              createdAt: new Date()
                          },
                          $set: {
                              status: subj.status,
                              classSection: "E1", // Default/Implicit
                              markedBy: userId || "system-text-upload",
                              updatedAt: new Date()
                          }
                      },
                      upsert: true
                  }
              });
          });
      });

      if (operations.length > 0) {
          await AttendanceModel.bulkWrite(operations);
      }
      
      // Stub for response compatibility
      const attendanceRecord = { _id: "bulk-update-" + attendanceDate.getTime() };

      console.log(
        `[Text Upload] Attendance saved successfully: ${attendanceRecord._id}`
      );

      const processedCount = parsedData.students.length;
      const savedCount = Object.keys(attendanceData).length;
      const skippedCount = processedCount - savedCount;

      // Return success response with processing details
      res.json({
        success: true,
        message: "Attendance text processed and saved successfully",
        data: {
          attendanceId: attendanceRecord._id,
          date: attendanceDate,
          studentsProcessed: processedCount,
          studentsMatched: savedCount,
          studentsUnmatched: skippedCount,
          subjectsFound: parsedData.subjects,
          processingNotes: parsedData.metadata?.processingNotes || [],
        },
        warnings: processingResult.warnings,
        unmatchedStudents: parsedData.students
          .filter((s: StudentAttendanceEntry) => !s.rollNumber)
          .map((s: StudentAttendanceEntry) => ({
            name: s.studentName,
            rollNumber: s.rollNumber,
          })),
      });
    } catch (error) {
      console.error("[Text Upload] Error processing attendance text:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process attendance text",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Upload attendance sheet for AI processing
router.post(
  "/upload-sheet",
  requireAuth,
  requireCRRole,
  upload.single("attendanceSheet"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const file = req.file;
      const { date, overrideDate } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded. Please select an attendance sheet file.",
        });
      }

      console.log(`[Upload] Processing attendance sheet: ${file.originalname}`);
      console.log(`[Upload] File size: ${file.size} bytes`);
      console.log(`[Upload] File type: ${file.mimetype}`);

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "text/csv",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported file type: ${file.mimetype}. Please upload an image, PDF, Excel, CSV, or Word document.`,
        });
      }

      // Step 1: Extract text from uploaded file
      console.log(`[Upload] Step 1: Extracting text from ${file.originalname}`);
      console.log(`[Upload] File details:`, {
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
      });

      let extractedText = "";

      try {
        const extractionResult = await textExtractionService.extractText(
          file.path
        );
        extractedText = extractionResult.content || "";

        console.log(
          `[Upload] Extracted text length: ${extractedText.length} characters`
        );
        console.log(
          `[Upload] Text preview: "${extractedText.substring(0, 200)}..."`
        );

        if (!extractedText || extractedText.trim().length < 20) {
          return res.status(400).json({
            success: false,
            error:
              "Could not extract sufficient text from the uploaded file. Please ensure the file contains readable attendance data.",
            debug: {
              extractedLength: extractedText.length,
              preview: extractedText.substring(0, 100),
            },
          });
        }
      } catch (extractionError) {
        console.error(`[Upload] Text extraction failed:`, extractionError);
        return res.status(500).json({
          success: false,
          error:
            "Failed to extract text from the uploaded file. Please try with a different file format.",
          debug: {
            error:
              extractionError instanceof Error
                ? extractionError.message
                : String(extractionError),
          },
        });
      }

      // Step 2: Process attendance data using AI
      console.log(`[Upload] Step 2: Processing attendance data with AI`);
      const processingResult = await processAttendanceSheet(
        extractedText,
        file.originalname,
        overrideDate || date
      );

      if (!processingResult.success || !processingResult.data) {
        return res.status(400).json({
          success: false,
          error: processingResult.error || "Failed to process attendance sheet",
          warnings: processingResult.warnings,
        });
      }

      const parsedData = processingResult.data;
      console.log(
        `[Upload] AI processed data: ${parsedData.students.length} students, ${parsedData.subjects.length} subjects`
      );

      // Step 3: Use enrollment numbers directly (no database matching needed)
      console.log(`[Upload] Step 3: Using enrollment numbers directly`);

      // Step 4: Transform to attendance format using enrollment numbers
      console.log(`[Upload] Step 4: Transforming to attendance format`);
      const attendanceData: Record<string, Record<string, string>> = {};

      parsedData.students.forEach((student: StudentAttendanceEntry) => {
        if (student.rollNumber) {
          // Use enrollment number directly as student ID (like manual attendance)
          attendanceData[student.rollNumber] = student.subjects;
          console.log(
            `[Upload] Added student: ${student.rollNumber} (${student.studentName})`
          );
        } else {
          console.warn(
            `[Upload] Skipping student without enrollment number: ${student.studentName}`
          );
        }
      });

      // Step 5: Save attendance to database
      console.log(`[Upload] Step 5: Saving attendance to database`);
      const attendanceDate = overrideDate || date || parsedData.date;
      console.log(
        `[Upload] Using date: ${attendanceDate} (override: ${overrideDate}, selected: ${date}, AI parsed: ${parsedData.date})`
      );
      const userId = req.user?.userId;

      // Use the existing save logic (similar to save-day endpoint)
      const validSubjects = [
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
      ];

      const validateStatus = (status: string | unknown): "present" | "absent" => {
        if (typeof status === "string") {
          const normalizedStatus = status.toLowerCase().trim();
          if (normalizedStatus === "present" || normalizedStatus === "p") {
            return "present";
          } else if (
            normalizedStatus === "absent" ||
            normalizedStatus === "a"
          ) {
            return "absent";
          }
        }
        return "absent";
      };

      // Convert full subject names to frontend-expected short names
      const convertToFrontendSubjectName = (dbSubjectName: string): string => {
        switch (dbSubjectName.toLowerCase()) {
          case "cloud computing":
          case "cc":
            return "CC";
          case "computer graphics":
          case "cg":
            return "CG";
          case "cg lab 4":
            return "CG Lab 4";
          case "machine learning":
          case "ml":
            return "ML";
          case "ml lab 4":
            return "ML Lab 4";
          case "linux lab 4":
            return "Linux Lab 4";
          case "operating systems":
          case "os":
            return "OS";
          default:
            return dbSubjectName; // Return as-is if no mapping found
        }
      };

      const students = Object.entries(attendanceData)
        .map(([studentId, subjectsData]) => {
          const subjectsArray = Object.entries(subjectsData)
            .filter(([subject, _]: [string, string]) =>
              validSubjects.some(
                (vs: string) =>
                  vs.toLowerCase() === subject.toLowerCase() ||
                  subject.toLowerCase().includes(vs.toLowerCase()) ||
                  vs.toLowerCase().includes(subject.toLowerCase())
              )
            )
            .map(([subjectName, status]: [string, string]) => ({
              subjectName: convertToFrontendSubjectName(subjectName),
              status: validateStatus(status),
              timestamp: new Date(),
            }));

          return subjectsArray.length > 0
            ? {
                studentId,
                subjects: subjectsArray,
              }
            : null;
        })
        .filter(
          (student): student is NonNullable<typeof student> => student !== null
        );

      // Save to database
      const operations: any[] = [];
      const attendanceDateObj = new Date(attendanceDate); // attendanceDate is string or date from logic above

      // Flatten students data for bulk write
      students.forEach(student => {
          student.subjects.forEach(subj => {
              operations.push({
                  updateOne: {
                      filter: {
                          studentId: student.studentId,
                          date: attendanceDateObj,
                          subject: subj.subjectName
                      },
                      update: {
                          $setOnInsert: {
                              _id: nanoid(),
                              createdAt: new Date()
                          },
                          $set: {
                              status: subj.status,
                              classSection: "E1", // Default/Implicit
                              markedBy: userId || "system-upload",
                              updatedAt: new Date()
                          }
                      },
                      upsert: true
                  }
              });
          });
      });

      if (operations.length > 0) {
          await AttendanceModel.bulkWrite(operations);
      }

      // Stub for response compatibility
      const attendanceRecord = { _id: "bulk-update-" + attendanceDateObj.getTime() };

      console.log(
        `[Upload] Attendance saved successfully: ${attendanceRecord._id}`
      );

      const processedCount = parsedData.students.length;
      const savedCount = Object.keys(attendanceData).length;
      const skippedCount = processedCount - savedCount;

      // Return success response with processing details
      res.json({
        success: true,
        message: "Attendance sheet processed and saved successfully",
        data: {
          attendanceId: attendanceRecord._id,
          date: attendanceDate,
          studentsProcessed: processedCount,
          studentsMatched: savedCount,
          studentsUnmatched: skippedCount,
          subjectsFound: parsedData.subjects,
          processingNotes: parsedData.metadata?.processingNotes || [],
        },
        warnings: processingResult.warnings,
        unmatchedStudents: parsedData.students
          .filter((s: StudentAttendanceEntry) => !s.rollNumber)
          .map((s: StudentAttendanceEntry) => ({
            name: s.studentName,
            rollNumber: s.rollNumber,
          })),
      });
    } catch (error) {
      console.error("[Upload] Error processing attendance sheet:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process attendance sheet",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Enhanced OCR test endpoint
router.post(
  "/test-enhanced-ocr",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      console.log(`[OCR Test] Testing enhanced OCR on: ${file.originalname}`);
      console.log(`[OCR Test] File size: ${file.size} bytes`);
      console.log(`[OCR Test] File type: ${file.mimetype}`);

      const startTime = Date.now();
      const extractedText = await textExtractionService.extractText(file.path);
      const duration = Date.now() - startTime;

      // Analyze extracted content
      const enrollmentNumbers =
        extractedText.content.match(/\b\d{11}\b/g) || [];
      const studentNames =
        extractedText.content.match(/\b[A-Z][a-z]+(\s+[A-Z][a-z]+)*\b/g) || [];
      const attendanceMarkers = extractedText.content.match(/\b[PAL]\b/g) || [];

      res.json({
        success: true,
        ocr: {
          strategy: extractedText.metadata?.ocrStrategy || "standard",
          score: extractedText.metadata?.ocrScore || 0,
          duration: duration,
          textLength: extractedText.content.length,
        },
        analysis: {
          enrollmentNumbers: {
            count: enrollmentNumbers.length,
            samples: enrollmentNumbers.slice(0, 5),
          },
          studentNames: {
            count: studentNames.length,
            samples: studentNames.slice(0, 5),
          },
          attendanceMarkers: {
            count: attendanceMarkers.length,
            samples: attendanceMarkers.slice(0, 10),
          },
        },
        extractedText: extractedText.content.substring(0, 1000), // First 1000 chars
        fullText: extractedText.content, // Full text for debugging
        metadata: extractedText.metadata,
      });
    } catch (error) {
      console.error("[OCR Test] Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// OCR Space specific test endpoint
router.post(
  "/test-ocr-space",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      console.log(
        `[OCR Space Test] Testing OCR Space on: ${file.originalname}`
      );

      const { ocrSpaceService } = await import("../services/ocrSpaceService");

      // Test both engines
      const engine1Result = await ocrSpaceService.extractText(file.path, {
        engine: 1,
        isTable: true,
        detectOrientation: true,
        scale: true,
      });

      const engine2Result = await ocrSpaceService.extractText(file.path, {
        engine: 2,
        isTable: true,
        detectOrientation: true,
        scale: true,
      });

      // Analyze results
      const analyzeResult = (result: any, engineName: string) => {
        if (!result.success) return null;

        const enrollmentNumbers = result.content.match(/\b\d{11}\b/g) || [];
        const studentNames =
          result.content.match(/\b[A-Z][a-z]+(\s+[A-Z][a-z]+)*\b/g) || [];
        const attendanceMarkers = result.content.match(/\b[PAL]\b/g) || [];

        return {
          engine: engineName,
          success: result.success,
          confidence: result.confidence,
          processingTime: result.processingTime,
          textLength: result.content.length,
          analysis: {
            enrollmentNumbers: {
              count: enrollmentNumbers.length,
              samples: enrollmentNumbers.slice(0, 3),
            },
            studentNames: {
              count: studentNames.length,
              samples: studentNames.slice(0, 3),
            },
            attendanceMarkers: {
              count: attendanceMarkers.length,
              samples: attendanceMarkers.slice(0, 5),
            },
          },
          textPreview: result.content.substring(0, 300),
          error: result.error,
        };
      };

      const engine1Analysis = analyzeResult(engine1Result, "Engine 1");
      const engine2Analysis = analyzeResult(engine2Result, "Engine 2");

      // Determine best result
      let bestResult = null;
      if (engine1Analysis && engine2Analysis) {
        bestResult =
          engine1Analysis.confidence > engine2Analysis.confidence
            ? engine1Analysis
            : engine2Analysis;
      } else if (engine1Analysis) {
        bestResult = engine1Analysis;
      } else if (engine2Analysis) {
        bestResult = engine2Analysis;
      }

      res.json({
        success: true,
        ocrSpaceResults: {
          engine1: engine1Analysis,
          engine2: engine2Analysis,
          bestResult: bestResult,
          apiKeyStatus: process.env.OCR_SPACE_API_KEY
            ? "configured"
            : "missing",
        },
      });
    } catch (error) {
      console.error("[OCR Space Test] Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Comprehensive OCR + AI parsing test endpoint
router.post(
  "/test-complete-pipeline",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      console.log(`[Complete Pipeline Test] Processing: ${file.originalname}`);

      // Step 1: Extract text using full OCR pipeline
      const extractedText = await textExtractionService.extractText(file.path);

      // Step 2: Check if attendance data was parsed
      const hasAttendanceData = extractedText.attendanceData?.success === true;

      // Step 3: Manual AI parsing if not already done
      let manualParsingResult = null;
      if (!hasAttendanceData && extractedText.content.trim().length > 0) {
        try {
          const { attendanceTextParser } = await import(
            "../services/attendanceTextParser"
          );
          manualParsingResult = await attendanceTextParser.parseAttendanceText(
            extractedText.content
          );
        } catch (error) {
          console.error("[Manual AI Parsing] Error:", error);
        }
      }

      res.json({
        success: true,
        pipeline: {
          step1_ocr: {
            success: true,
            strategy: extractedText.metadata?.ocrStrategy || "unknown",
            confidence: extractedText.metadata?.ocrScore || 0,
            textLength: extractedText.content.length,
            textPreview: extractedText.content.substring(0, 200),
          },
          step2_ai_parsing: {
            automatic: hasAttendanceData ? extractedText.attendanceData : null,
            manual: manualParsingResult,
            used: hasAttendanceData ? "automatic" : "manual",
          },
          combined_result: {
            raw_text: extractedText.content,
            parsed_data: hasAttendanceData
              ? extractedText.attendanceData
              : manualParsingResult,
            student_count: hasAttendanceData
              ? extractedText.attendanceData?.data?.length || 0
              : manualParsingResult?.data?.length || 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Complete Pipeline Test] Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Test AI parsing with sample OCR text
router.post("/test-ai-parsing", async (req: Request, res: Response) => {
  try {
    const { attendanceTextParser } = await import(
      "../services/attendanceTextParser"
    );

    // Sample OCR text for testing
    const sampleOcrText =
      req.body.text ||
      `Enroll No Name [4 [9
00124402023 Mohammad Asad [J [3
00224402023 Shiven Sharma [J A
- SHIVANI VI) A [3
00424402023 TANYA SINHA [J [3
00524402023 Madhav Wadhwa [J [3
00624402023 POSHIKA PAL [J A
00724402023 Ranveer Singh A [3
00824402023 Devang bisht A A
00924402023 Vaibhav Kumar A A
01024402023 Kkavya Sahni A A
01124402023 DEEPALI JAIN A A`;

    console.log(
      `[AI Parsing Test] Testing with ${sampleOcrText.length} characters of OCR text`
    );

    const result = await attendanceTextParser.parseAttendanceText(
      sampleOcrText
    );

    res.json({
      success: true,
      input: {
        textLength: sampleOcrText.length,
        textPreview: sampleOcrText.substring(0, 200),
      },
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AI Parsing Test] Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// AI Provider status endpoint
router.get("/ai-status", async (req: Request, res: Response) => {
  try {
    const { aiManager } = await import("../services/aiManager");

    // Refresh Gemini instances to pick up new keys
    aiManager.refreshGeminiInstances();

    const status = aiManager.getStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AI Status] Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Simple test endpoint to test AI processing
router.post("/test-ai-processing", async (req: Request, res: Response) => {
  try {
    const testText = `
    Student List - Computer Graphics & Cloud Computing
    Date: 2023-09-27
    
    00124402023 - Mohammad Asad - CC: P, CG: P
    00224402023 - Shiven Sharma - CC: P, CG: A  
    — - SHIVANI VIJ - CC: A, CG: P
    00424402023 - TANYA SINHA - CC: P, CG: P
    00524402023 - Madhav Wadhwa - CC: P, CG: P
    00624402023 - POSHIKA PAL - CC: P, CG: A
    00724402023 - Ranveer Singh - CC: A, CG: P
    `;

    console.log(`[Test AI] Processing test attendance data`);

    const processingResult = await processAttendanceSheet(
      testText,
      "test-attendance.txt"
    );

    res.json({
      success: true,
      processingResult,
      testData: testText,
    });
  } catch (error) {
    console.error("[Test AI] Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
