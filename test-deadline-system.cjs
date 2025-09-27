const { MongoClient } = require("mongodb");

async function testDeadlineSystem() {
  const client = new MongoClient(
    "mongodb+srv://farhanisthis:cb2dNEUcolcHNdnr@attendancetracker.26g51zn.mongodb.net/smartcollege?retryWrites=true&w=majority"
  );

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    // Test the deadline detection system by making a POST request
    console.log("\n=== Testing Deadline Detection System ===");

    const testPayload = {
      input: "Math Assignment 3 - Calculus due monday",
      files: [],
    };

    console.log("Test payload:", testPayload);

    // Make request to the unified endpoint
    const response = await fetch("http://localhost:10000/api/unified", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("\n✅ Update created successfully!");
      console.log("Response:", JSON.stringify(data, null, 2));

      // Check the database for the new update
      const db = client.db("smartcollege");
      const collection = db.collection("updates");

      const latestUpdate = await collection.findOne(
        { _id: data.update.id },
        {
          projection: {
            title: 1,
            dueDate: 1,
            deadlineDate: 1,
            category: 1,
            tags: 1,
            createdAt: 1,
          },
        }
      );

      console.log("\n=== Database Verification ===");
      console.log("Latest update in database:");
      console.log(JSON.stringify(latestUpdate, null, 2));

      if (latestUpdate?.deadlineDate) {
        console.log("\n🎉 SUCCESS: deadlineDate field is properly saved!");
        console.log("Deadline Date:", latestUpdate.deadlineDate);
      } else {
        console.log("\n❌ ISSUE: deadlineDate field is missing or null");
      }
    } else {
      console.log("❌ Request failed:", response.status, response.statusText);
      const errorText = await response.text();
      console.log("Error response:", errorText);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

testDeadlineSystem();
