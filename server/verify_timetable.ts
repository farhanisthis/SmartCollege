import "dotenv/config";
import mongoose from "mongoose";
import { TimetableSlot } from "./models/Timetable";

async function verifyTimetable() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not set");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    // Check Thursday 1:30-2:30 PM
    const thursday = await TimetableSlot.findOne({
      section: "E1",
      day: "Thursday",
      timeSlot: "01:30 PM - 02:30 PM"
    });

    console.log("Thursday 01:30 PM - 02:30 PM:");
    console.log(`  Subject Code: ${thursday?.subjectCode}`);
    console.log(`  ✅ Expected: DWDM (Data Warehousing & Data Mining)`);
    console.log(`  ✅ Actual: ${thursday?.subjectCode === 'DWDM' ? 'CORRECT ✓' : 'WRONG! ✗'}\n`);

    // Check Friday 1:30-2:30 PM
    const friday = await TimetableSlot.findOne({
      section: "E1",
      day: "Friday",
      timeSlot: "01:30 PM - 02:30 PM"
    });

    console.log("Friday 01:30 PM - 02:30 PM:");
    console.log(`  Subject Code: ${friday?.subjectCode}`);
    console.log(`  ✅ Expected: DVA Lab 4 (Data Visualization & Analytics Lab)`);
    console.log(`  ✅ Actual: ${friday?.subjectCode === 'DVA Lab 4' ? 'CORRECT ✓' : 'WRONG! ✗'}\n`);

    if (thursday?.subjectCode === 'DWDM' && friday?.subjectCode === 'DVA Lab 4') {
      console.log("🎉 Timetable is CORRECT! Both slots are fixed.\n");
    } else {
      console.log("❌ Timetable needs fixing!\n");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

verifyTimetable();
