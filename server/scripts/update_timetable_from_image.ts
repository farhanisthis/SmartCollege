import mongoose from "mongoose";
import { Subject } from "../models/Subject";
import { TimetableSlot } from "../models/Timetable";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function updateTimetableFromImage() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Delete existing timetable for E1
    await TimetableSlot.deleteMany({ section: "E1" });
    console.log("Cleared existing E1 timetable");

    // Get all subjects
    const subjects = await Subject.find({ section: "E1" });
    const subjectMap = new Map(subjects.map(s => [s.code, s]));

    // Correct BCA Timetable
    const schedule = [
      // MONDAY
      { day: "Monday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "-" },
      { day: "Monday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311" },
      { day: "Monday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "IOT" },
      { day: "Monday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "BREAK" },
      { day: "Monday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "IOT Lab1" },
      { day: "Monday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "e-com" },
      
      // TUESDAY
      { day: "Tuesday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "IOT Lab1" },
      { day: "Tuesday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311" },
      { day: "Tuesday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "BREAK" },
      { day: "Tuesday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "IOT" },
      { day: "Tuesday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "DWDM" },
      { day: "Tuesday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "e-com" },
      
      // WEDNESDAY
      { day: "Wednesday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "IOT" },
      { day: "Wednesday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311" },
      { day: "Wednesday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "BREAK" },
      { day: "Wednesday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "DVA Lab 4" },
      { day: "Wednesday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "DWDM" },
      { day: "Wednesday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "e-com" },
      
      // THURSDAY
      { day: "Thursday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "IOT Lab1" },
      { day: "Thursday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311" },
      { day: "Thursday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "BREAK" },
      { day: "Thursday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "DWDM" },
      { day: "Thursday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "e-com" },
      { day: "Thursday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "MP Lab1" },
      
      // FRIDAY
      { day: "Friday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "-" },
      { day: "Friday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "IOT Lab1" },
      { day: "Friday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "IOT" },
      { day: "Friday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "DVA Lab 4" },
      { day: "Friday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "DWDM" },
      { day: "Friday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "MP 212" },
    ];

    console.log("\nInserting timetable slots...\n");

    for (const slot of schedule) {
      const subject = subjectMap.get(slot.subjectCode);
      
      await TimetableSlot.create({
        section: "E1",
        day: slot.day,
        timeSlot: slot.timeSlot,
        subjectCode: slot.subjectCode,
        subject: subject ? subject._id : null,
      });

      console.log(`✓ ${slot.day.padEnd(10)} ${slot.timeSlot.padEnd(25)} -> ${slot.subjectCode}`);
    }

    console.log("\n✅ Timetable updated successfully!");
    console.log(`Total slots: ${schedule.length}`);

  } catch (error) {
    console.error("Error updating timetable:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

updateTimetableFromImage();
