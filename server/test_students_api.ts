import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// Start a test to simulate what the frontend sees
async function testStudentsAPI() {
  console.log("Testing /api/bulk-users/e1-students endpoint\n");

  // This simulates what would happen if a CR user calls the endpoint
  // We need to check the server logs to see what's happening

  const apiUrl = "http://localhost:10000/api/bulk-users/e1-students";

  try {
    const response = await fetch(apiUrl, {
      credentials: "include" as any,
    });

    console.log(`Status: ${response.status}`);

    const data = await response.json();
    console.log("\nResponse data:");
    console.log(JSON.stringify(data, null, 2));

    if (data.students) {
      console.log(`\n✓ Found ${data.students.length} students`);
    } else {
      console.log("\n❌ No students in response!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testStudentsAPI();
