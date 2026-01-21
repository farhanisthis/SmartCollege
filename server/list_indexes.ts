
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AttendanceModel } from "./models/mongodb";

dotenv.config();

async function checkIndexes() {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const indexes = await AttendanceModel.collection.indexes();
        console.log("Current Indexes:", JSON.stringify(indexes, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkIndexes();
