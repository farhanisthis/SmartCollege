import mongoose from "mongoose";
import { UserModel } from "../models/mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function deleteStudents() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const studentsToDelete = [
      "Harsh Maggo",
      "Parth Malhotra",
      "Pavish Ahuja"
    ];

    // Case-insensitive regex search for safety
    for (const name of studentsToDelete) {
      const result = await UserModel.deleteMany({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        role: "student" // Ensure we only delete students
      });

      if (result.deletedCount > 0) {
        console.log(`✅ Deleted ${result.deletedCount} user(s) named "${name}"`);
      } else {
        console.log(`⚠️ No user found named "${name}"`);
      }
    }

  } catch (error) {
    console.error("Error deleting students:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

deleteStudents();
