import mongoose from "mongoose";
import { DailyAttendanceModel, UserModel } from "../server/models/mongodb.js";

// Connect to MongoDB
const MONGODB_URI =
  "mongodb+srv://farhanisthis:cb2dNEUcolcHNdnr@attendancetracker.26g51zn.mongodb.net/smartcollege?retryWrites=true&w=majority";

// Subject name mapping for corrupted data
const subjectMapping: Record<string, string> = {
  "0": "Computer Graphics",
  "1": "Operating Systems",
  "2": "Cloud Computing",
  "3": "Machine Learning",
  "4": "CG Lab 4",
  "5": "ML Lab 4",
  "6": "Linux Lab 4",
  // Add more mappings as needed
};

// Status mapping for corrupted data
const statusMapping: Record<string, "present" | "absent"> = {
  p: "present",
  present: "present",
  a: "absent",
  absent: "absent",
  // Handle other variations
};

async function cleanupAttendanceData() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully");

    // Find all attendance records
    console.log("\n=== FINDING CORRUPTED RECORDS ===");
    const allRecords = await DailyAttendanceModel.find().sort({ date: -1 });

    let corruptedRecords = 0;
    let fixedRecords = 0;

    for (const record of allRecords) {
      let recordModified = false;

      console.log(`\nChecking record for ${record.date.toDateString()}`);
      console.log(`  Students: ${record.students.length}`);

      for (const student of record.students) {
        let studentModified = false;

        for (const subject of student.subjects) {
          // Check if subject name is corrupted (just numbers)
          if (/^\d+$/.test(subject.subjectName)) {
            console.log(
              `  🔧 Fixing corrupted subject: "${subject.subjectName}" -> "${
                subjectMapping[subject.subjectName] || "Unknown Subject"
              }"`
            );
            subject.subjectName =
              subjectMapping[subject.subjectName] || "Unknown Subject";
            studentModified = true;
          }

          // Check if status is corrupted (single letters)
          if (subject.status !== "present" && subject.status !== "absent") {
            const originalStatus = subject.status;
            const newStatus = statusMapping[subject.status as string];
            if (newStatus) {
              console.log(
                `  🔧 Fixing corrupted status: "${originalStatus}" -> "${newStatus}"`
              );
              subject.status = newStatus;
              studentModified = true;
            } else {
              console.log(
                `  ❌ Unknown status format: "${subject.status}" - setting to absent`
              );
              subject.status = "absent";
              studentModified = true;
            }
          }
        }

        if (studentModified) {
          recordModified = true;
        }
      }

      if (recordModified) {
        corruptedRecords++;
        try {
          await record.save();
          fixedRecords++;
          console.log(`  ✅ Record saved successfully`);
        } catch (error) {
          console.log(
            `  ❌ Error saving record:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      } else {
        console.log(`  ✅ Record is clean`);
      }
    }

    console.log(`\n=== CLEANUP SUMMARY ===`);
    console.log(`Total records checked: ${allRecords.length}`);
    console.log(`Corrupted records found: ${corruptedRecords}`);
    console.log(`Records successfully fixed: ${fixedRecords}`);

    // Verify the cleanup by checking for any remaining corrupted data
    console.log(`\n=== VERIFICATION ===`);
    const verificationRecords = await DailyAttendanceModel.find();
    let remainingCorruption = 0;

    for (const record of verificationRecords) {
      for (const student of record.students) {
        for (const subject of student.subjects) {
          if (
            /^\d+$/.test(subject.subjectName) ||
            (subject.status !== "present" && subject.status !== "absent")
          ) {
            remainingCorruption++;
            console.log(
              `❌ Still corrupted: ${record.date.toDateString()} - ${
                subject.subjectName
              }:${subject.status}`
            );
          }
        }
      }
    }

    if (remainingCorruption === 0) {
      console.log(`✅ All data is now clean!`);
    } else {
      console.log(`❌ ${remainingCorruption} corrupted entries still remain`);
    }

    console.log(`\n=== CLEANUP COMPLETED ===`);
  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Connection closed");
  }
}

cleanupAttendanceData();
