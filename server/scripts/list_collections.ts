
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Default to local if not specified, but verify env
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/smartcollege";

async function listCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB at", MONGODB_URI);
    
    if (!mongoose.connection.db) {
        throw new Error("Database connection undefined");
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log("\n--- EXISTING COLLECTIONS ---");
    collections.forEach(c => console.log(`- ${c.name}`));
    console.log("----------------------------\n");

    const activeModels = [
        "users", "updates", "files", "userviews", 
        "assignmentsubmissions", "dailyattendances", 
        "presentations", "performancemetrics"
    ];

    const ghosts = collections.filter(c => !activeModels.includes(c.name)).map(c => c.name);
    
    if (ghosts.length > 0) {
        console.log("👻 GHOST COLLECTIONS FOUND (Candidates for deletion):");
        ghosts.forEach(g => console.log(`- ${g}`));
    } else {
        console.log("✅ Database is clean! No ghost collections found.");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

listCollections();
