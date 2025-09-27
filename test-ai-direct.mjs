import { categorizeContent } from "./server/services/ai.js";

async function testAIDirectly() {
  console.log("=== Testing AI Deadline Detection Directly ===");

  const testCases = [
    "Math assignment due monday",
    "Submit homework by friday",
    "Project deadline is next tuesday",
    "Assignment to be completed by this coming wednesday",
    "Report submission before thursday",
  ];

  for (const testCase of testCases) {
    console.log(`\nTesting: "${testCase}"`);
    try {
      const result = await categorizeContent(testCase);
      console.log("Result:", JSON.stringify(result, null, 2));

      if (result.deadlineDate) {
        console.log(`✅ Deadline detected: ${result.deadlineDate}`);
      } else {
        console.log("❌ No deadline detected");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

testAIDirectly();
