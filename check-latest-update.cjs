const { MongoClient } = require("mongodb");

async function checkLatestUpdate() {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("smartcollege");
    const collection = db.collection("updates");

    // Get the most recent update
    const latestUpdate = await collection.findOne(
      {},
      { sort: { createdAt: -1 } }
    );

    console.log("Latest update:");
    console.log(JSON.stringify(latestUpdate, null, 2));

    // Check for deadline fields specifically
    if (latestUpdate) {
      console.log("\nDeadline fields:");
      console.log("dueDate:", latestUpdate.dueDate);
      console.log("deadlineDate:", latestUpdate.deadlineDate);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkLatestUpdate();
