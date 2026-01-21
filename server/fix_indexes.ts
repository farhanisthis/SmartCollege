
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AttendanceModel } from "./models/mongodb";

dotenv.config();

async function fixIndexes() {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log("Connected. Dropping indexes on 'attendances'...");
        
        try {
            await AttendanceModel.collection.dropIndexes();
            console.log("Indexes dropped!");
        } catch (e: any) {
            console.log("Error dropping indexes (maybe none exist?):", e.message);
        }

        // Re-create correct index if needed via Mongoose later, but for now dropping is enough to unblock.
        // Or we can define it here.
        // await AttendanceModel.collection.createIndex({ studentId: 1, date: 1, subject: 1 }, { unique: true });
        // console.log("Created proper unique index: studentId + date + subject");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndexes();
