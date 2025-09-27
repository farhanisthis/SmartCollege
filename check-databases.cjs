const { MongoClient } = require("mongodb");

async function checkDatabases() {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    // List all databases
    const dbs = await client.db().admin().listDatabases();
    console.log("Available databases:");
    dbs.databases.forEach((db) => {
      console.log(` - ${db.name}`);
    });

    // Check smartcollege database collections
    const db = client.db("smartcollege");
    const collections = await db.listCollections().toArray();
    console.log("\nCollections in smartcollege database:");
    collections.forEach((col) => {
      console.log(` - ${col.name}`);
    });

    // Check updates collection count
    if (collections.some((col) => col.name === "updates")) {
      const updatesCount = await db.collection("updates").countDocuments();
      console.log(`\nUpdates collection has ${updatesCount} documents`);

      if (updatesCount > 0) {
        const sample = await db.collection("updates").findOne();
        console.log("\nSample update:");
        console.log(JSON.stringify(sample, null, 2));
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkDatabases();
