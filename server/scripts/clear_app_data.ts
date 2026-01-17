
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/smartcollege";

async function clearAppData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB...");
    
    const collectionsToDrop = [
        'updates', 
        'files',
        'performancemetrics',
        'dailyattendances',
        'presentations',
        'assignmentsubmissions',
        'userviews' // Also clear view history
    ];

    console.log("♻️  Starting Data Cleanup (Keeping Users)...");

    for (const colName of collectionsToDrop) {
        try {
            if (!mongoose.connection.db) {
                throw new Error("Database connection not established");
            }
            await mongoose.connection.db.dropCollection(colName);
            console.log(`✅ Dropped: ${colName}`);
        } catch (err: any) {
            if (err?.code === 26 || err?.message?.includes('ns not found')) {
                console.log(`⚠️  Skipped (not found): ${colName}`);
            } else {
                console.error(`❌ Error dropping ${colName}: ${err?.message}`);
            }
        }
    }

    console.log("\nCleanup Complete. Users are safe.");
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

clearAppData();
