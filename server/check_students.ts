import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB\n");

    const UserModel = mongoose.model(
      "User",
      new mongoose.Schema({}, { strict: false }),
      "users",
    );

    // Check all users
    const allUsers = await UserModel.find({})
      .select("username name role class")
      .lean();
    console.log(`Total users: ${allUsers.length}\n`);

    // Group by role
    const byRole = allUsers.reduce(
      (acc, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("Users by role:");
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    // Check students specifically
    const students = await UserModel.find({ role: "student" })
      .select("username name class enrollment")
      .lean();
    console.log(`\nTotal students: ${students.length}`);

    if (students.length > 0) {
      console.log("\nSample students:");
      students.slice(0, 5).forEach((s: any) => {
        console.log(
          `  - ${s.name} | class: "${s.class}" | enrollment: ${s.enrollment || "N/A"}`,
        );
      });

      // Check class field patterns
      const classPatterns = students.reduce(
        (acc, s: any) => {
          const cls = s.class || "NULL";
          acc[cls] = (acc[cls] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      console.log("\nClass field patterns:");
      Object.entries(classPatterns).forEach(([cls, count]) => {
        console.log(`  "${cls}": ${count} students`);
      });
    } else {
      console.log("\n❌ NO STUDENTS FOUND IN DATABASE!");
    }

    // Check CR user
    const cr = await UserModel.findOne({ role: "cr" })
      .select("username name class")
      .lean();
    if (cr) {
      console.log(`\n✓ CR Found: ${cr.name} | class: "${(cr as any).class}"`);
    } else {
      console.log("\n❌ NO CR USER FOUND!");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkStudents();
