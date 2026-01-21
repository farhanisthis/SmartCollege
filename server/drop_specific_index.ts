
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AttendanceModel } from "./models/mongodb";

dotenv.config();

async function dropSpecificIndex() {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log("Dropping index 'studentId_1_date_1'...");
        await AttendanceModel.collection.dropIndex("studentId_1_date_1");
        console.log("Index dropped.");

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await mongoose.disconnect();
    }
}

dropSpecificIndex();
