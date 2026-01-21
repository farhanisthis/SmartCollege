
import dotenv from "dotenv";
import mongoose from "mongoose";
import { UserModel, AttendanceModel, UpdateModel, AssignmentSubmissionModel, PresentationModel } from "./models/mongodb";

dotenv.config();

// Helper copied from routes
function getSection(classStr: string): string | null {
    const match = classStr?.match(/\b(E1|E2|M1|M2)\b/);
    return match ? match[1] : null;
}

async function debugPerformance() {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const username = "mohammadasad"; // One of the seeded students
        const user = await UserModel.findOne({ username });
        
        if (!user) {
            console.log("User not found!");
            return;
        }
        
        const userId = user._id;
        const section = getSection(user.class);
        
        console.log(`User Found: ${user.name} (${user.username})`);
        console.log(`Class: ${user.class}, Section: ${section}`);
        
        if (!section) {
            console.log("NO SECTION FOUND - This might be the issue!");
        }

        // Simulate Query Logic
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // 1. Attendance
        const recentAttendance = await AttendanceModel.find({
            studentId: user.enrollment, // Use enrollment as ID
            date: { $gte: thirtyDaysAgo }
        }).limit(5).lean();
        
        console.log(`Attendance Records Found: ${recentAttendance.length}`);

        // 2. Assignments
        const assignments = await UpdateModel.find({ category: "assignments" }).lean();
        console.log(`Assignments Found: ${assignments.length}`);
        
        // 3. Presentations
        const presentations = await UpdateModel.find({ category: "presentations" }).lean();
        console.log(`Presentations Found: ${presentations.length}`);
        
        console.log("Debug Complete. If section is null, that's likely the cause.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

debugPerformance();
