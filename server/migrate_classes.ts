
import { UserModel } from "./models/mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function migrateClasses() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI must be set");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Update E1 students
    const resultE1 = await UserModel.updateMany(
      { class: { $regex: /E1/ } },
      { $set: { class: "E1" } }
    );
    console.log(`Updated ${resultE1.modifiedCount} E1 users to class 'E1'`);

    // Update E2 students (if any)
    const resultE2 = await UserModel.updateMany(
      { class: { $regex: /E2/ } },
      { $set: { class: "E2" } }
    );
    console.log(`Updated ${resultE2.modifiedCount} E2 users to class 'E2'`);

    // Verify
    const sample = await UserModel.findOne({ class: "E1" });
    if (sample) {
        console.log("Sample updated user:", { username: sample.username, class: sample.class });
    }

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateClasses();
