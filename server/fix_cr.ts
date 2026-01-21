
import { UserModel } from "./models/mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function checkAndFixCR() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI must be set");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // optimize: check for 'farhanisthis' or any CR
    const crUser = await UserModel.findOne({ role: 'cr' });
    
    if (crUser) {
        console.log(`Found CR User: ${crUser.username}`);
        console.log(`Current Class: '${crUser.class}'`);
        
        // Check if class contains E1
        if (!crUser.class || !crUser.class.includes('E1')) {
            console.log("Class does not contain 'E1'. Updating...");
            crUser.class = "Computer Science - Semester 5 E1";
            await crUser.save();
            console.log("CR Class updated to: Computer Science - Semester 5 E1");
        } else {
            console.log("CR Class is correct.");
        }
    } else {
        console.log("No CR user found!");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAndFixCR();
