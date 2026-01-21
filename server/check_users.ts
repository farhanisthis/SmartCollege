
import { UserModel } from "./models/mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function checkUsers() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI must be set");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const count = await UserModel.countDocuments();
    console.log(`Total users in database: ${count}`);
    
    if (count > 0) {
        const students = await UserModel.find({ role: 'student' }).sort({ enrollment: 1 }).limit(10);
        console.log("Sample students (Sorted by Enrollment):");
        console.log(students.map(s => ({ name: s.name, enrollment: s.enrollment })));
    }

  } catch (error) {
    console.error("Error checking users:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
