
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/smartcollege";

async function dropUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB...");
    
    if (!mongoose.connection.db) {
        throw new Error("Database connection not established");
    }
    await mongoose.connection.db.dropCollection("users");
    console.log("✅ Dropped 'users' collection.");

    await mongoose.disconnect();
  } catch (error: any) {
    // defined error even if it doesn't exist
    if (error?.code === 26 || error?.message?.includes('ns not found')) {
        console.log("⚠️ Users collection not found (already clean).");
    } else {
        console.error("Error:", error);
    }
    process.exit(0);
  }
}

dropUsers();
