// Direct AI test for deadline detection
const { categorizeContent } = require("./server/services/ai.ts");

async function testAI() {
  try {
    const testContent =
      "Assignment due this coming Monday. Complete all exercises.";
    console.log("Testing content:", testContent);

    const result = await categorizeContent(testContent);
    console.log("AI Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testAI();
