
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/smartcollege";

async function analyzeUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for User Analysis");
    
    const db = mongoose.connection.db;
    if (!db) throw new Error("No DB connection");

    const usersCol = db.collection("users");
    
    // 1. Total Count
    const total = await usersCol.countDocuments();
    console.log(`\n📊 Total Users: ${total}`);

    // 2. Breakdown by Role
    const byRole = await usersCol.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } }
    ]).toArray();
    
    console.log("\n👥 Breakdown by Role:");
    byRole.forEach(r => console.log(`- ${r._id}: ${r.count}`));

    // 3. Breakdown by Class (for students)
    const byClass = await usersCol.aggregate([
        { $match: { role: "student" } },
        { $group: { _id: "$class", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]).toArray();

    console.log("\n🏫 Breakdown by Class (Students):");
    byClass.forEach(c => console.log(`- "${c._id}": ${c.count}`));

    console.log("\n🔍 Sample Students (First 5):");
    const samples = await usersCol.find({ role: "student" }).limit(5).project({ name: 1, rollNumber: 1, class: 1 }).toArray();
    samples.forEach(s => console.log(`- ${s.name} (${s.rollNumber})`));

    await mongoose.disconnect();
  } catch (error) {
    console.error("Analysis Error:", error);
    process.exit(1);
  }
}

analyzeUsers();
