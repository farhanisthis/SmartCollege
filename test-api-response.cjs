const { MongoClient } = require("mongodb");

async function testAPIResponse() {
  console.log("=== Testing API Response for Deadline Fields ===\n");

  try {
    // First, check what's in the database
    const client = new MongoClient(
      "mongodb+srv://farhanisthis:cb2dNEUcolcHNdnr@attendancetracker.26g51zn.mongodb.net/smartcollege?retryWrites=true&w=majority"
    );
    await client.connect();

    const db = client.db("smartcollege");
    const collection = db.collection("updates");

    // Get recent updates with deadline fields
    const updatesFromDB = await collection
      .find(
        {
          $or: [
            { dueDate: { $exists: true, $ne: null } },
            { deadlineDate: { $exists: true, $ne: null } },
          ],
        },
        {
          sort: { createdAt: -1 },
          limit: 3,
          projection: {
            _id: 1,
            title: 1,
            dueDate: 1,
            deadlineDate: 1,
            createdAt: 1,
          },
        }
      )
      .toArray();

    console.log("Updates with deadline fields in database:");
    updatesFromDB.forEach((update, index) => {
      console.log(`${index + 1}. ${update.title}`);
      console.log(`   ID: ${update._id}`);
      console.log(`   dueDate: ${update.dueDate || "null"}`);
      console.log(`   deadlineDate: ${update.deadlineDate || "null"}`);
      console.log("");
    });

    await client.close();

    // Now test what the API returns
    console.log("\n=== Testing API Response ===");

    const response = await fetch("http://localhost:10000/api/updates", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const apiUpdates = await response.json();
      console.log(`API returned ${apiUpdates.length} updates`);

      // Find updates with deadline fields
      const updatesWithDeadlines = apiUpdates.filter(
        (update) => update.dueDate || update.deadlineDate
      );

      console.log(
        `\nUpdates with deadline fields from API: ${updatesWithDeadlines.length}`
      );
      updatesWithDeadlines.forEach((update, index) => {
        console.log(`${index + 1}. ${update.title}`);
        console.log(`   ID: ${update.id}`);
        console.log(`   dueDate: ${update.dueDate || "null"}`);
        console.log(`   deadlineDate: ${update.deadlineDate || "null"}`);
        console.log("");
      });

      if (updatesWithDeadlines.length === 0) {
        console.log("❌ No updates with deadline fields returned by API!");
        console.log("Sample API response structure:");
        if (apiUpdates.length > 0) {
          console.log(JSON.stringify(apiUpdates[0], null, 2));
        }
      } else {
        console.log("✅ API is returning deadline fields correctly!");
      }
    } else {
      console.log(
        "❌ API request failed:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testAPIResponse();
