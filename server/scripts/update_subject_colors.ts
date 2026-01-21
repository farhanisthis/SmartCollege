import mongoose from "mongoose";
import { Subject } from "../models/Subject";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function updateSubjectColors() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Updated color scheme - more vibrant and distinct
    const colorUpdates = [
      // DWDM - Data Warehousing (Purple/Violet - data analysis theme)
      { code: "DWDM", color: "from-violet-600 via-violet-500 to-purple-400" },
      
      // e-com - e-Commerce (Emerald/Teal - shopping/money theme)
      { code: "e-com", color: "from-emerald-600 via-teal-500 to-cyan-400" },
      
      // IOT - Internet of Things (Sky Blue - connectivity theme)
      { code: "IOT", color: "from-sky-600 via-blue-500 to-indigo-400" },
      { code: "IOT Lab1", color: "from-sky-700 via-blue-600 to-indigo-500" },
      
      // DVA - Data Visualization (Lime/Green - charts/graphs theme)
      { code: "DVA", color: "from-lime-600 via-green-500 to-emerald-400" },
      { code: "DVA 311", color: "from-lime-600 via-green-500 to-emerald-400" },
      { code: "DVA Lab 4", color: "from-lime-700 via-green-600 to-emerald-500" },
      
      // DL - Deep Learning (Deep Purple/Indigo - AI/neural theme)
      { code: "DL", color: "from-purple-600 via-indigo-500 to-blue-400" },
      { code: "DL 312", color: "from-purple-700 via-indigo-600 to-blue-500" },
      { code: "DL Lab 5", color: "from-purple-800 via-indigo-700 to-blue-600" },
      
      // MP - Major Project (Amber/Orange - important/highlight theme)
      { code: "MP", color: "from-amber-600 via-orange-500 to-red-400" },
      { code: "MP 212", color: "from-amber-600 via-orange-500 to-red-400" },
      { code: "MP Lab1", color: "from-amber-700 via-orange-600 to-red-500" },
      
      // BREAK - Keep red but make it softer
      { code: "BREAK", color: "from-rose-500 via-pink-400 to-red-300" },
    ];

    console.log("\nUpdating subject colors...\n");

    for (const update of colorUpdates) {
      const result = await Subject.updateOne(
        { code: update.code, section: "E1" },
        { $set: { color: update.color } }
      );

      if (result.modifiedCount > 0) {
        console.log(`✓ Updated ${update.code}: ${update.color}`);
      } else {
        console.log(`✗ No update for ${update.code} (not found or already set)`);
      }
    }

    console.log("\n✅ Color update complete!");
    
    // Display all subjects with their new colors
    const subjects = await Subject.find({ section: "E1", active: true }).sort({ code: 1 });
    console.log("\n📚 All Subjects:");
    subjects.forEach(subject => {
      console.log(`  ${subject.code.padEnd(15)} - ${subject.name.padEnd(40)} [${subject.color}]`);
    });

  } catch (error) {
    console.error("Error updating colors:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

updateSubjectColors();
