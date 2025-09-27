// Test the AI service directly to see what it returns
const { categorizeContent } = require("./server/services/ai.ts");

async function testAIDirect() {
  try {
    console.log("Testing AI categorization directly...");

    const tests = [
      "submit this assignment on wednesday",
      "submit it before coming wednesday",
      "homework due this friday",
      "complete project by next monday",
    ];

    for (const test of tests) {
      console.log(`\n--- Testing: "${test}" ---`);
      const result = await categorizeContent(test);
      console.log("AI Result:", JSON.stringify(result, null, 2));

      if (result.deadlineDate) {
        console.log(`✅ Deadline date extracted: ${result.deadlineDate}`);
      } else if (result.dueDate) {
        console.log(`✅ Due date extracted: ${result.dueDate}`);
      } else {
        console.log("❌ No date extracted");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testAIDirect();
