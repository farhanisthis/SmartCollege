import { Router } from "express";
import mongoose from "mongoose";
import {
  UserModel,
  AttendanceModel,
  PerformanceMetricsModel,
  AssignmentSubmissionModel,
  PresentationModel,
} from "../models/mongodb";

const router = Router();
import { hash } from "bcrypt";

// Middleware to check if user is authenticated and is admin/CR
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Helper to generate username from name
const generateUsername = (name: string) => {
  return name.toLowerCase().replace(/\s+/g, "");
};

// Debug: NUKE AND PAVE (Reset DB to clean state)
// Warning: devastating.
router.post("/nuke-db", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    const user = await UserModel.findById(userId);

    // Strict Guard: Only CR (or specific admin if we had one)
    if (!user || user.role !== "cr") {
      return res
        .status(403)
        .json({ error: "Only CR can nuke database (for now)" });
    }

    const collectionsToDrop = [
      "attendances", // Legacy
      "class_representatives", // Legacy duplicate
      "classrepresentatives", // Legacy duplicate (no underscore)
      "assignments", // Legacy (now in updates)
      "studentassignments", // Legacy
      "dashboardalerts", // Legacy
      "performanceconfigs", // Legacy

      // Clean slate for these active tables too?
      // User asked for "restructure cleanly", possibly implying data wipe.
      // Let's clear operational data but keep Users to avoid login lockout.
      "assignmentsubmissions",
      "attendances", // New schema
      "dailyattendances", // Legacy to be sure
      "presentations",
      "performancemetrics",
    ];

    const results: string[] = [];

    for (const colName of collectionsToDrop) {
      try {
        if (!mongoose.connection.db) {
          throw new Error("Database connection not established");
        }
        await mongoose.connection.db.dropCollection(colName);
        results.push(`Dropped: ${colName}`);
      } catch (err: any) {
        // Ignore "ns not found" error (collection doesn't exist)
        if (err.code === 26 || err.message.includes("ns not found")) {
          results.push(`Skipped (not found): ${colName}`);
        } else {
          results.push(`Error dropping ${colName}: ${err.message}`);
        }
      }
    }

    res.json({
      success: true,
      message: "Database Nuked and Paved (Operational Data Cleared)",
      details: results,
    });
  } catch (error: any) {
    console.error("Nuke Error:", error);
    res.status(500).json({ error: "Nuke Operation Failed" });
  }
});
// E2 Students Data (Dummy Generator for now)
const E2Students = Array.from({ length: 20 }, (_, i) => ({
  id: `00${i + 1}24402024`, // 2024 batch (E2)
  name: `Student E2-${i + 1}`,
  email: `student.e2.${i + 1}@example.com`,
  enrollment: `00${i + 1}24402024`,
}));

// E1 Students Data
const E1Students = [
  {
    id: "00124402023",
    name: "Mohammad Asad",
    email: "mohammadasad@example.com",
    enrollment: "00124402023",
  },
  {
    id: "00224402023",
    name: "Shiven Sharma",
    email: "shivensharma@example.com",
    enrollment: "00224402023",
  },
  {
    id: "00424402023",
    name: "TANYA SINHA",
    email: "tanyasinha@example.com",
    enrollment: "00424402023",
  },
  {
    id: "00524402023",
    name: "Madhav Wadhwa",
    email: "madhavwadhwa@example.com",
    enrollment: "00524402023",
  },
  {
    id: "00624402023",
    name: "POSHIKA PAL",
    email: "poshikapal@example.com",
    enrollment: "00624402023",
  },
  {
    id: "00724402023",
    name: "Ranveer Singh",
    email: "ranveersingh@example.com",
    enrollment: "00724402023",
  },
  {
    id: "00824402023",
    name: "Devang bisht",
    email: "devangbisht@example.com",
    enrollment: "00824402023",
  },
  {
    id: "00924402023",
    name: "Vaibhav Kumar",
    email: "vaibhavkumar@example.com",
    enrollment: "00924402023",
  },
  {
    id: "01024402023",
    name: "Kkavya Sahni",
    email: "kkavyasahni@example.com",
    enrollment: "01024402023",
  },
  {
    id: "01124402023",
    name: "DEEPALI JAIN",
    email: "deepalijain@example.com",
    enrollment: "01124402023",
  },
  {
    id: "01224402023",
    name: "HARSH MAGGO",
    email: "harshmaggo@example.com",
    enrollment: "01224402023",
  },
  {
    id: "01324402023",
    name: "Vibhuti Panwar",
    email: "vibhutipanwar@example.com",
    enrollment: "01324402023",
  },
  {
    id: "01424402023",
    name: "Aryan verma",
    email: "aryanverma@example.com",
    enrollment: "01424402023",
  },
  {
    id: "01524402023",
    name: "Jai Malik",
    email: "jaimalik@example.com",
    enrollment: "01524402023",
  },
  {
    id: "01624402023",
    name: "NIHARIKA SHARMA",
    email: "niharikasharma@example.com",
    enrollment: "01624402023",
  },
  {
    id: "01724402023",
    name: "Siddharth Shrestha",
    email: "siddharthshrestha@example.com",
    enrollment: "01724402023",
  },
  {
    id: "01824402023",
    name: "ARYAN THAKUR",
    email: "aryanthakur@example.com",
    enrollment: "01824402023",
  },
  {
    id: "01924402023",
    name: "Aditya Kant Pathak",
    email: "adityakantpathak@example.com",
    enrollment: "01924402023",
  },
  {
    id: "02024402023",
    name: "Gursaibh Singh",
    email: "gursaibhsingh@example.com",
    enrollment: "02024402023",
  },
  {
    id: "02124402023",
    name: "brahmjot singh",
    email: "brahmjotsingh@example.com",
    enrollment: "02124402023",
  },
  {
    id: "02224402023",
    name: "HARSHITA SALUJA",
    email: "harshitasaluja@example.com",
    enrollment: "02224402023",
  },
  {
    id: "02324402023",
    name: "Sanskriti Singhal",
    email: "sanskritisinghal@example.com",
    enrollment: "02324402023",
  },
  {
    id: "02424402023",
    name: "SANDEEP KUMAR",
    email: "sandeepkumar@example.com",
    enrollment: "02424402023",
  },
  {
    id: "02524402023",
    name: "Vishnu Narayan Khanna",
    email: "vishnunarayankhanna@example.com",
    enrollment: "02524402023",
  },
  {
    id: "02624402023",
    name: "VAJIPAYAJULA ADITYA",
    email: "vajipayajulaaditya@example.com",
    enrollment: "02624402023",
  },
  {
    id: "02724402023",
    name: "Akshita",
    email: "akshita@example.com",
    enrollment: "02724402023",
  },
  {
    id: "02824402023",
    name: "Mishti sehgal",
    email: "mishtisehgal@example.com",
    enrollment: "02824402023",
  },
  {
    id: "02924402023",
    name: "TWINKLE SHARMA",
    email: "twinklesharma@example.com",
    enrollment: "02924402023",
  },
  {
    id: "03024402023",
    name: "DHRUV SHARMA",
    email: "dhruvsharma@example.com",
    enrollment: "03024402023",
  },
  {
    id: "03124402023",
    name: "Saif Siddiqui",
    email: "saifsiddiqui@example.com",
    enrollment: "03124402023",
  },
  {
    id: "03224402023",
    name: "Aman kumar",
    email: "amankumar@example.com",
    enrollment: "03224402023",
  },
  {
    id: "03324402023",
    name: "Muskan sharma",
    email: "muskansharma@example.com",
    enrollment: "03324402023",
  },
  {
    id: "03424402023",
    name: "Vansh Khatri",
    email: "vanshkhatri@example.com",
    enrollment: "03424402023",
  },
  {
    id: "03524402023",
    name: "Pansul Saxena",
    email: "pansulsaxena@example.com",
    enrollment: "03524402023",
  },
  {
    id: "03624402023",
    name: "Niyati Mittal",
    email: "niyatimittal@example.com",
    enrollment: "03624402023",
  },
  {
    id: "03724402023",
    name: "Jiya Basra",
    email: "jiyabasra@example.com",
    enrollment: "03724402023",
  },
  {
    id: "03824402023",
    name: "Aditya S. Bhandari",
    email: "adityas.bhandari@example.com",
    enrollment: "03824402023",
  },
  {
    id: "03924402023",
    name: "Krish Aggarwal",
    email: "krishaggarwal@example.com",
    enrollment: "03924402023",
  },
  {
    id: "04024402023",
    name: "Mohit Kumar Rawat",
    email: "mohitkumarrawat@example.com",
    enrollment: "04024402023",
  },
  {
    id: "04124402023",
    name: "Sunveen Kaur",
    email: "sunveenkaur@example.com",
    enrollment: "04124402023",
  },
  {
    id: "04224402023",
    name: "Priyanshu Shekhar Singh",
    email: "priyanshushekharsingh@example.com",
    enrollment: "04224402023",
  },
  {
    id: "04324402023",
    name: "Manas Sharma",
    email: "manassharma@example.com",
    enrollment: "04324402023",
  },
  {
    id: "04424402023",
    name: "Muskan Thapa",
    email: "muskanthapa@example.com",
    enrollment: "04424402023",
  },
  {
    id: "04524402023",
    name: "SHIVAN TIWARI",
    email: "shivantiwari@example.com",
    enrollment: "04524402023",
  },
  {
    id: "04624402023",
    name: "Megha Chakraborty",
    email: "meghachakraborty@example.com",
    enrollment: "04624402023",
  },
  {
    id: "04724402023",
    name: "Aryan Bhardwaj",
    email: "aryanbhardwaj@example.com",
    enrollment: "04724402023",
  },
  {
    id: "04824402023",
    name: "Manish Nainwal",
    email: "manishnainwal@example.com",
    enrollment: "04824402023",
  },
  {
    id: "04924402023",
    name: "Nitin Kamia",
    email: "nitinkamia@example.com",
    enrollment: "04924402023",
  },
  {
    id: "05024402023",
    name: "Krishna goyal",
    email: "krishnagoyal@example.com",
    enrollment: "05024402023",
  },
  {
    id: "05124402023",
    name: "Ashish Luthra",
    email: "ashishluthra@example.com",
    enrollment: "05124402023",
  },
  {
    id: "3rd-year-E1",
    name: "Farhan Ali",
    email: "farhanandfarhanali@gmail.com",
    enrollment: "05524402023",
  },
  {
    id: "05324402023",
    name: "Jashandeep singh",
    email: "jashandeepsingh@example.com",
    enrollment: "05324402023",
  },
  {
    id: "05424402023",
    name: "Aditiya Bhardwaj",
    email: "aditiyabhardwaj@example.com",
    enrollment: "05424402023",
  },
  {
    id: "05624402023",
    name: "Shreeyansh Srivastava",
    email: "shreeyanshsrivastava@example.com",
    enrollment: "05624402023",
  },
  {
    id: "05724402023",
    name: "Priyanshu sharma",
    email: "priyanshusharma@example.com",
    enrollment: "05724402023",
  },
];

// Bulk create E1 students as users
router.post("/create-e1-students", requireAuth, async (req: any, res: any) => {
  try {
    const password = "123123"; // Plain text password to match existing system
    const createdUsers = [];
    const skippedUsers = [];

    console.log(
      `Starting bulk user creation for ${E1Students.length} E1 students and ${E2Students.length} E2 students...`,
    );

    const allStudents = [
      ...E1Students.map((s) => ({ ...s, section: "E1" })),
      ...E2Students.map((s) => ({ ...s, section: "E2" })),
    ];

    for (const student of allStudents) {
      try {
        // Check if user already exists
        const existingUser = await UserModel.findOne({
          $or: [{ username: student.enrollment }, { email: student.email }],
        });

        if (existingUser) {
          console.log(
            `User already exists: ${student.name} (${student.enrollment})`,
          );
          skippedUsers.push({
            name: student.name,
            enrollment: student.enrollment,
            reason: "Already exists",
          });
          continue;
        }

        // Create new user
        const hashedPassword = await hash(password, 10);
        const username = generateUsername(student.name);

        const newUser = new UserModel({
          _id: student.id,
          username: username,
          password: hashedPassword,
          role: "student",
          name: student.name,
          class: student.section,
          createdAt: new Date(),
          preferences: {
            notifications: {
              assignments: true,
              presentations: true,
              announcements: true,
            },
          },
        });

        await newUser.save();
        console.log(`Created user: ${student.name} (${username})`);

        createdUsers.push({
          id: student.id,
          name: student.name,
          username: username,
          class: student.section,
        });
      } catch (userError: any) {
        console.error(
          `Error creating user ${student.name}:`,
          userError.message,
        );
        skippedUsers.push({
          name: student.name,
          enrollment: student.enrollment,
          reason: userError.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk user creation completed`,
      summary: {
        totalStudents: E1Students.length,
        created: createdUsers.length,
        skipped: skippedUsers.length,
      },
      createdUsers,
      skippedUsers,
    });
  } catch (error: any) {
    console.error("Bulk user creation error:", error);
    res.status(500).json({
      error: "Failed to create users",
      details: error.message,
    });
  }
});

// Helper to extract section from class string
function getSection(classStr: string): string | null {
  const match = classStr.match(/\b(E1|E2|M1|M2)\b/);
  return match ? match[1] : null;
}

// Fix CR Data (Temporary Helper)
router.post("/fix-cr-data", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "No session" });

    // Verify Is CR (Double Check)
    const user = await UserModel.findById(userId);
    if (!user || user.role !== "cr") {
      return res.status(403).json({ error: "Only CR can self-fix" });
    }

    // Explicitly set Farhan (or current CR) to E1 if appropriate
    const section = "E1";
    // Short class name as per new requirement
    const newClass = section;

    user.class = newClass;
    await user.save();

    res.json({ success: true, message: `Updated class to ${newClass}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get My Section Students (Dynamic)
// Kept URI /e1-students for backward compat, but logic is generic
router.get("/e1-students", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId)
      return res.status(401).json({ error: "Biometrics says: Who are you?" });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const userClass = user.class || "";
    const section = getSection(userClass);

    console.log(
      `[FetchStudents] User: ${user.username}, Class: ${userClass}, Section: ${section}`,
    );

    let query: any = { role: "student" };

    if (section) {
      // Filter by specific section (e.g. "E1") - ensure word boundary matching
      query.class = { $regex: `\\b${section}\\b`, $options: "i" };
      console.log(`[FetchStudents] Query:`, JSON.stringify(query));
    } else {
      console.warn("No section found for CR, returning empty list for safety.");
      return res.json({ success: true, count: 0, students: [] });
    }

    const students = await UserModel.find(query)
      .select("_id username name email enrollment createdAt class")
      .sort({ enrollment: 1, name: 1 });

    console.log(
      `[FetchStudents] Found ${students.length} students for section ${section}`,
    );

    res.json({
      success: true,
      count: students.length,
      section: section,
      students,
    });
  } catch (error: any) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      error: "Failed to fetch students",
      details: error.message,
    });
  }
});

// Delete all E1 student users (for cleanup if needed)
router.delete("/e1-students", requireAuth, async (req: any, res: any) => {
  try {
    const result = await UserModel.deleteMany({
      class: "Computer Science - Semester 5 E1",
      role: "student",
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} E1 student users`,
    });
  } catch (error: any) {
    console.error("Error deleting E1 students:", error);
    res.status(500).json({
      error: "Failed to delete students",
      details: error.message,
    });
  }
});

// Deep Clean / Reset E1 Data
router.delete("/reset-e1", requireAuth, async (req: any, res: any) => {
  try {
    console.log("Starting Deep Clean for E1 data...");

    // 1. Identify E1 Students
    const e1Students = await UserModel.find({
      class: "Computer Science - Semester 5 E1",
      role: "student",
    }).select("_id");

    const studentIds = e1Students.map((s) => s._id);
    console.log(`Found ${studentIds.length} E1 students to delete.`);

    // 2. Delete Related Data
    // AttendanceModel removed (Legacy)

    const performance = await PerformanceMetricsModel.deleteMany({
      userId: { $in: studentIds },
    });
    const submissions = await AssignmentSubmissionModel.deleteMany({
      userId: { $in: studentIds },
    });
    const presentations = await PresentationModel.deleteMany({
      userId: { $in: studentIds },
    });

    // Delete Daily Attendance Sheets for E1
    const dailySheets = await AttendanceModel.deleteMany({
      classSection: "E1",
    });

    // 3. Delete Users
    const users = await UserModel.deleteMany({
      class: "Computer Science - Semester 5 E1",
      role: "student",
    });

    res.json({
      success: true,
      message: "Deep clean completed successfully",
      summary: {
        studentsDeleted: users.deletedCount,
        // attendanceRecordsDeleted: 0, // Legacy removed

        performanceMetricsDeleted: performance.deletedCount,
        assignmentSubmissionsDeleted: submissions.deletedCount,
        presentationsDeleted: presentations.deletedCount,
        dailyAttendanceSheetsDeleted: dailySheets.deletedCount,
      },
    });
  } catch (error: any) {
    console.error("Deep clean error:", error);
    res.status(500).json({
      error: "Failed to reset data",
      details: error.message,
    });
  }
});

// Moved import to top

// ... existing imports ...

// Nuke DB route moved to top

// Export router at the end (keep existing)
export default router;
