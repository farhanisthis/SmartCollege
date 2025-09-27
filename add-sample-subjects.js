// Script to add sample updates with proper subjects for testing
import { MongoClient } from "mongodb";
import "dotenv/config";

const mongoUrl = process.env.MONGODB_URI;
if (!mongoUrl) {
  console.error("MONGODB_URI not found in environment variables");
  process.exit(1);
}

const client = new MongoClient(mongoUrl);

const sampleUpdates = [
  {
    _id: "sample-cs-1",
    title: "Data Structures Assignment",
    content:
      "Complete the binary tree implementation assignment. Due date: 25th September",
    description: "Complete binary tree implementation by 25th September",
    category: "assignments",
    subject: "Data Structures",
    authorId: "c890f15d-75cf-4977-9f53-daa7a6ab8b83",
    isUrgent: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "sample-cs-2",
    title: "Operating System Notes",
    content: "Chapter 5: Process Synchronization notes uploaded",
    description: "Process Synchronization chapter notes available",
    category: "notes",
    subject: "Operating System",
    authorId: "c890f15d-75cf-4977-9f53-daa7a6ab8b83",
    isUrgent: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "sample-cs-3",
    title: "Database Management Presentation",
    content: "DBMS presentation scheduled for 28th September at 10 AM",
    description: "DBMS presentation on 28th September at 10 AM",
    category: "presentations",
    subject: "Database Management",
    authorId: "c890f15d-75cf-4977-9f53-daa7a6ab8b83",
    isUrgent: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "sample-cs-4",
    title: "Web Development Assignment",
    content: "Create a responsive website using HTML, CSS, and JavaScript",
    description: "Build responsive website using HTML, CSS, JavaScript",
    category: "assignments",
    subject: "Web Development",
    authorId: "c890f15d-75cf-4977-9f53-daa7a6ab8b83",
    isUrgent: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "sample-cs-5",
    title: "Software Engineering Notes",
    content: "SDLC models and methodologies chapter uploaded",
    description: "SDLC models and methodologies notes",
    category: "notes",
    subject: "Software Engineering",
    authorId: "c890f15d-75cf-4977-9f53-daa7a6ab8b83",
    isUrgent: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "sample-cs-6",
    title: "Machine Learning Presentation",
    content: "ML presentation on supervised learning algorithms",
    description: "Supervised learning algorithms presentation",
    category: "presentations",
    subject: "Machine Learning",
    authorId: "c890f15d-75cf-4977-9f53-daa7a6ab8b83",
    isUrgent: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function addSampleSubjects() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const updatesCollection = db.collection("updates");

    // Remove existing sample updates
    await updatesCollection.deleteMany({ _id: { $regex: /^sample-/ } });

    // Insert new sample updates
    await updatesCollection.insertMany(sampleUpdates);

    console.log(`Added ${sampleUpdates.length} sample updates with subjects`);

    // Show the subjects that were added
    const subjects = [
      ...new Set(sampleUpdates.map((update) => update.subject)),
    ];
    console.log("Subjects added:", subjects);
  } catch (error) {
    console.error("Error adding sample subjects:", error);
  } finally {
    await client.close();
  }
}

addSampleSubjects();
