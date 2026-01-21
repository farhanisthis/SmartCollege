import mongoose from "mongoose";
import { Subject } from "../models/Subject";
import { TimetableSlot } from "../models/Timetable";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function renameSubject() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // 1. Update Subject
    const subjectResult = await Subject.updateOne(
      { code: "e-com" },
      { 
        $set: { 
          code: "E-COM", 
          name: "E-Commerce" 
        } 
      }
    );

    if (subjectResult.modifiedCount > 0) {
      console.log("✅ Updated Subject: e-com -> E-COM");
    } else {
      console.log("⚠️ Subject 'e-com' not found or already updated");
    }

    // 2. Update Timetable Slots
    const timetableResult = await TimetableSlot.updateMany(
      { subjectCode: "e-com" },
      { $set: { subjectCode: "E-COM" } }
    );

    console.log(`✅ Updated ${timetableResult.modifiedCount} timetable slots from e-com to E-COM`);

  } catch (error) {
    console.error("Error renaming subject:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

renameSubject();
