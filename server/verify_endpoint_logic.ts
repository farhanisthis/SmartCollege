
import dotenv from "dotenv";
import mongoose from "mongoose";
import { UserModel } from "./models/mongodb";

dotenv.config();

async function verifyEndpointSort() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not found");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Simulate the endpoint logic
    // const students = await UserModel.find(query)
    //   .select("_id username name email enrollment createdAt class")
    //   .sort({ enrollment: 1, name: 1 });

    const section = "E1";
    const query = { role: "student", class: { $regex: section } };

    const students = await UserModel.find(query)
      .select("name enrollment")
      .sort({ enrollment: 1, name: 1 })
      .limit(10); // Check top 10

    console.log("Simulating API Response (Top 10):");
    students.forEach(s => {
        console.log(`${s.enrollment} - ${s.name}`);
    });

  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyEndpointSort();
