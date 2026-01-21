import dotenv from "dotenv";
import { processContentWithFiles } from "./services/ai";

dotenv.config();

async function testArrayHandling() {
  console.log("Testing AI array handling fix...\n");

  const testContent = "75% attendance for exams otherwise debarred";

  try {
    const result = await processContentWithFiles(testContent, []);

    console.log("✅ SUCCESS - No errors!");
    console.log("\nProcessed Result:");
    console.log("Title:", result.title);
    console.log("Subject:", result.subject);
    console.log("Content type:", typeof result.content);
    console.log("Content:", result.content);
    console.log("\nDescription type:", typeof result.description);
    console.log("Description:", result.description);

    // Verify they are strings
    if (
      typeof result.content === "string" &&
      typeof result.description === "string"
    ) {
      console.log(
        "\n✅ Both content and description are strings (MongoDB compatible)",
      );
    } else {
      console.log("\n❌ ERROR: content or description is not a string!");
      console.log("Content type:", typeof result.content);
      console.log("Description type:", typeof result.description);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testArrayHandling()
  .catch(console.error)
  .finally(() => process.exit(0));
