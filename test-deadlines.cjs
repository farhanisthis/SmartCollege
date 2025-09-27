// Test script to verify deadline functionality
const { MongoClient } = require("mongodb");

async function testDeadlines() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db("smart_college");
    const updates = db.collection("updates");

    // Get recent updates with deadlines
    const recentUpdates = await updates
      .find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log("\nRecent updates with deadline fields:");
    recentUpdates.forEach((update) => {
      console.log(`\nID: ${update.id}`);
      console.log(`Title: ${update.title}`);
      console.log(`dueDate: ${update.dueDate}`);
      console.log(`deadlineDate: ${update.deadlineDate}`);
      console.log(`isUrgent: ${update.isUrgent}`);
      console.log(`Category: ${update.category}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

testDeadlines();
