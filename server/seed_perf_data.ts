
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AttendanceModel, UserModel } from "./models/mongodb";
import { nanoid } from "nanoid";

dotenv.config();

async function seedAttendance() {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const username = "mohammadasad";
        const user = await UserModel.findOne({ username });
        if (!user) throw new Error("User not found");

        console.log(`Seeding attendance for ${user.name} (${user.enrollment})`);

        const dates = [
            new Date(),
            new Date(Date.now() - 86400000), // Yesterday
            new Date(Date.now() - 172800000), // 2 days ago
        ];

        const subjects = ["Machine Learning", "Cloud Computing"];

        for (const date of dates) {
            for (const subject of subjects) {
                await AttendanceModel.create({
                    _id: nanoid(),
                    studentId: user.enrollment,
                    date: date,
                    subject: subject,
                    status: Math.random() > 0.2 ? "present" : "absent",
                    classSection: "E1",
                    markedBy: "SYSTEM_SEED",
                    createdAt: new Date()
                });
            }
        }
        
        console.log("Seeded attendance records.");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

seedAttendance();
