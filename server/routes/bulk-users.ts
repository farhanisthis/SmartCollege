import { Router } from "express";
import { UserModel } from "../models/mongodb";

const router = Router();

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

// Middleware to check if user is authenticated and is admin/CR
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Bulk create E1 students as users
router.post("/create-e1-students", requireAuth, async (req: any, res: any) => {
  try {
    const password = "123123"; // Plain text password to match existing system
    const createdUsers = [];
    const skippedUsers = [];

    console.log(
      `Starting bulk user creation for ${E1Students.length} students...`
    );

    for (const student of E1Students) {
      try {
        // Check if user already exists
        const existingUser = await UserModel.findOne({
          $or: [{ username: student.enrollment }, { email: student.email }],
        });

        if (existingUser) {
          console.log(
            `User already exists: ${student.name} (${student.enrollment})`
          );
          skippedUsers.push({
            name: student.name,
            enrollment: student.enrollment,
            reason: "Already exists",
          });
          continue;
        }

        // Create new user
        const newUser = new UserModel({
          _id: student.id,
          username: student.enrollment, // Use enrollment number as username
          password: password,
          email: student.email,
          name: student.name,
          role: "student",
          class: "Computer Science - Semester 5 E1",
          enrollment: student.enrollment,
          createdAt: new Date(),
        });

        await newUser.save();
        console.log(`Created user: ${student.name} (${student.enrollment})`);

        createdUsers.push({
          id: student.id,
          name: student.name,
          username: student.enrollment,
          email: student.email,
          enrollment: student.enrollment,
        });
      } catch (userError: any) {
        console.error(
          `Error creating user ${student.name}:`,
          userError.message
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

// Get all E1 students (for verification)
router.get("/e1-students", requireAuth, async (req: any, res: any) => {
  try {
    const students = await UserModel.find({
      class: "Computer Science - Semester 5 E1",
      role: "student",
    }).select("_id username name email enrollment createdAt");

    res.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error: any) {
    console.error("Error fetching E1 students:", error);
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

export default router;
