
import mongoose from "mongoose";
import { UserModel } from "./models/mongodb";
import dotenv from "dotenv";
import { hash } from "bcrypt";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";

dotenv.config();

async function seedStudents() {
  try {
      if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not found");
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Connected to MongoDB");

      // 1. Wipe existing students
      console.log("Wiping existing 'student' users...");
      const deleteResult = await UserModel.deleteMany({ role: "student" });
      console.log(`Deleted ${deleteResult.deletedCount} existing student records.`);

      // 2. Read new data
      const jsonPath = path.resolve("extracted_students.json");
      if (!fs.existsSync(jsonPath)) {
          throw new Error("extracted_students.json not found!");
      }
      const rawData = fs.readFileSync(jsonPath, "utf-8");
      const students = JSON.parse(rawData);

      console.log(`Found ${students.length} students to insert.`);

      const password = await hash("123123", 10);
      let createdCount = 0;

      for (const student of students) {
        // Generate uniform username
        // Use lowercase name + part of enrollment to ensure uniqueness if needed, 
        // or just name if unique. Let's start with name.replace spaces.
        let username = student.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        
        // Handle explicit email if present, else generate
        const email = student.email || `${username}@smartcollege.edu`;

        const newUser = new UserModel({
            _id: nanoid(),
            username: username, // Potential collision risk handled by unique index usually, but for batch seed assume unique list
            password: password,
            role: "student",
            name: student.name,
            email: email,
            enrollment: student.enrollment,
            class: "Computer Science - Semester 5 E1", // Hardcoded as per original context or generic
            createdAt: new Date(),
            preferences: {
                notifications: {
                  assignments: true,
                  presentations: true,
                  announcements: true
                }
            }
        });
        
        try {
            await newUser.save();
            createdCount++;
        } catch (err: any) {
            // Handle duplicate username by appending random char
            if (err.code === 11000) {
                 newUser.username = `${username}${Math.floor(Math.random() * 1000)}`;
                 await newUser.save();
                 createdCount++;
            } else {
                console.error(`Failed to create ${student.name}:`, err.message);
            }
        }
      }
      
      console.log(`Seeding complete. Successfully created: ${createdCount} students.`);

  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
}

seedStudents();
