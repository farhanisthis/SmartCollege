const { MongoClient } = require("mongodb");

async function checkAtlasDatabase() {
  // Using the same connection string from .env
  const client = new MongoClient(
    "mongodb+srv://farhanisthis:cb2dNEUcolcHNdnr@attendancetracker.26g51zn.mongodb.net/smartcollege?retryWrites=true&w=majority"
  );

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const db = client.db("smartcollege");
    const collection = db.collection("updates");

    // Get count of updates
    const count = await collection.countDocuments();
    console.log(`Total updates in Atlas database: ${count}`);

    // Get the most recent update
    const latestUpdate = await collection.findOne(
      {},
      { sort: { createdAt: -1 } }
    );

    console.log("\nLatest update in Atlas:");
    console.log(JSON.stringify(latestUpdate, null, 2));

    // Check for deadline fields specifically
    if (latestUpdate) {
      console.log("\nDeadline fields:");
      console.log("dueDate:", latestUpdate.dueDate);
      console.log("deadlineDate:", latestUpdate.deadlineDate);
    }

    // Get last 3 updates to see if any have deadline fields
    const recentUpdates = await collection
      .find({}, { sort: { createdAt: -1 }, limit: 3 })
      .toArray();

    console.log("\nLast 3 updates with deadline info:");
    recentUpdates.forEach((update, index) => {
      console.log(`${index + 1}. ID: ${update._id}`);
      console.log(`   Title: ${update.title}`);
      console.log(`   dueDate: ${update.dueDate || "null"}`);
      console.log(`   deadlineDate: ${update.deadlineDate || "null"}`);
      console.log(`   Created: ${update.createdAt}`);
      console.log("");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkAtlasDatabase();
