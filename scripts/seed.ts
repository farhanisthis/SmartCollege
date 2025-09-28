import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { UserModel } from "../server/models/mongodb";

async function seedUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Clear existing users (optional: comment this if you don’t want to wipe data)
    await UserModel.deleteMany({});
    console.log("🗑️ Cleared existing users");

    // Define seed users
    const users = [
      {
        _id: randomUUID(),
        username: "farhanisthis",
        password: "123456", // hash in production
        role: "cr",
        name: "Farhan Ali",
        class: "Computer Science - Semester 5",
        createdAt: new Date(),
      },
      {
        _id: randomUUID(),
        username: "kashish",
        password: "123123",
        role: "cr",
        name: "Kashish",
        class: "Computer Science - Semester 5",
        createdAt: new Date(),
      },
      {
        _id: randomUUID(),
        username: "rohit",
        password: "123123",
        role: "student",
        name: "Rohit",
        class: "Computer Science - Semester 5",
        createdAt: new Date(),
      },
      {
        _id: randomUUID(),
        username: "ananya",
        password: "123123",
        role: "student",
        name: "Ananya",
        class: "Computer Science - Semester 5",
        createdAt: new Date(),
      },
      {
        _id: randomUUID(),
        username: "sahil",
        password: "123123",
        role: "student",
        name: "Sahil",
        class: "Computer Science - Semester 5",
        createdAt: new Date(),
      },
      {
        _id: randomUUID(),
        username: "asad",
        password: "123123",
        role: "student",
        name: "Asad",
        class: "Computer Science - Semester 5",
        createdAt: new Date(),
      },
    ];

    // Insert users
    await UserModel.insertMany(users);
    console.log("✅ Seed data inserted successfully");

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
}

seedUsers();
