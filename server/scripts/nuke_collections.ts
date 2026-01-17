
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/smartcollege";

async function nukeCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB at", MONGODB_URI);
    
    if (!mongoose.connection.db) {
        throw new Error("Database connection undefined");
    }

    const collectionsToDrop = [
        'attendances', 
        'class_representatives', 
        'classrepresentatives', 
        'assignments',
        'studentassignments', 
        'dashboardalerts', 
        'performanceconfigs',
        // Optional: clear active data if we want "restructure"
        // 'assignmentsubmissions',
        // 'dailyattendances', 
        // 'presentations',
        // 'performancemetrics'
    ];

    console.log("💥 Starting Drop Sequence...");

    for (const colName of collectionsToDrop) {
        try {
            await mongoose.connection.db.dropCollection(colName);
            console.log(`✅ Dropped: ${colName}`);
        } catch (err: any) {
            if (err.code === 26 || err.message.includes('ns not found')) {
                console.log(`⚠️  Skipped (not found): ${colName}`);
            } else {
                console.error(`❌ Error dropping ${colName}: ${err.message}`);
            }
        }
    }

    console.log("\nSequence Complete.");
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

nukeCollections();
