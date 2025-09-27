const { MongoClient } = require("mongodb");

async function checkSmartCollegeDatabase() {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    // Check smart_college database collections
    const db = client.db("smart_college");
    const collections = await db.listCollections().toArray();
    console.log("Collections in smart_college database:");
    collections.forEach((col) => {
      console.log(` - ${col.name}`);
    });

    // Check updates collection
    if (collections.some((col) => col.name === "updates")) {
      const updatesCount = await db.collection("updates").countDocuments();
      console.log(`\nUpdates collection has ${updatesCount} documents`);

      // Get the most recent update
      const latestUpdate = await db
        .collection("updates")
        .findOne({}, { sort: { createdAt: -1 } });

      console.log("\nLatest update:");
      console.log(JSON.stringify(latestUpdate, null, 2));

      // Check for deadline fields specifically
      if (latestUpdate) {
        console.log("\nDeadline fields:");
        console.log("dueDate:", latestUpdate.dueDate);
        console.log("deadlineDate:", latestUpdate.deadlineDate);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkSmartCollegeDatabase();
