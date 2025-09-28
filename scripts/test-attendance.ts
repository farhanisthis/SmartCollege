import mongoose from "mongoose";
import { DailyAttendanceModel } from "../server/models/mongodb.js";
import { nanoid } from "nanoid";

// Connect to MongoDB
const MONGODB_URI =
  "mongodb+srv://farhanisthis:cb2dNEUcolcHNdnr@attendancetracker.26g51zn.mongodb.net/smartcollege?retryWrites=true&w=majority";

async function testAttendance() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully");

    // Check existing attendance records
    console.log("\n=== CHECKING EXISTING RECORDS ===");
    const existingRecords = await DailyAttendanceModel.find()
      .sort({ date: -1 })
      .limit(5);

    console.log(`Found ${existingRecords.length} existing records:`);
    existingRecords.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log(`  Date: ${record.date}`);
      console.log(`  Class: ${record.classSection}`);
      console.log(`  Marked by: ${record.markedBy}`);
      console.log(`  Students: ${record.students.length}`);

      // Show first student's data for debugging
      if (record.students.length > 0) {
        const firstStudent = record.students[0];
        console.log(`  First student ID: ${firstStudent.studentId}`);
        console.log(`  Subject count: ${firstStudent.subjects.length}`);
        if (firstStudent.subjects.length > 0) {
          console.log(`  Sample subject:`, firstStudent.subjects[0]);
        }
      }
    });

    // Test creating a new record
    console.log("\n=== TESTING NEW RECORD CREATION ===");
    const testDate = new Date("2025-09-27");
    const testRecord = new DailyAttendanceModel({
      _id: nanoid(),
      date: testDate,
      classSection: "E1",
      markedBy: "test-cr-id",
      students: [
        {
          studentId: "026a8bf4-aedd-4f53-9459-79a01933f8b7", // Known student ID
          subjects: [
            {
              subjectName: "Computer Graphics",
              status: "present" as const,
              timestamp: new Date(),
            },
            {
              subjectName: "Operating Systems",
              status: "present" as const,
              timestamp: new Date(),
            },
            {
              subjectName: "Cloud Computing",
              status: "absent" as const,
              timestamp: new Date(),
            },
          ],
        },
      ],
    });

    // Delete any existing record for this test date first
    await DailyAttendanceModel.deleteOne({
      date: testDate,
      classSection: "E1",
    });
    console.log("Deleted any existing test record");

    // Save the new record
    const savedRecord = await testRecord.save();
    console.log("Test record saved successfully:", savedRecord._id);

    // Fetch it back to verify
    const fetchedRecord = await DailyAttendanceModel.findOne({
      date: testDate,
      classSection: "E1",
    });
    if (fetchedRecord) {
      console.log("Record retrieved successfully:");
      console.log("  Students:", fetchedRecord.students.length);
      console.log(
        "  Student data:",
        JSON.stringify(fetchedRecord.students[0], null, 2)
      );
    }

    console.log("\n=== TEST COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Connection closed");
  }
}

testAttendance();
