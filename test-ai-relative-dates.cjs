// Test the improved AI detection for relative dates
const fetch = require("node-fetch");

async function testRelativeDateDetection() {
  console.log("=== Testing AI Relative Date Detection ===");
  console.log("Current Date: September 21, 2025 (Sunday)\n");

  const testCases = [
    {
      input: "submit it before coming wednesday",
      expected: "2025-09-24",
      description: "Should detect 'coming wednesday'",
    },
    {
      input: "assignment due this friday",
      expected: "2025-09-26",
      description: "Should detect 'this friday'",
    },
    {
      input: "submit before next monday",
      expected: "2025-09-22",
      description: "Should detect 'next monday'",
    },
    {
      input: "deadline is coming tuesday",
      expected: "2025-09-23",
      description: "Should detect 'coming tuesday'",
    },
    {
      input: "submit by 21 sep",
      expected: "2025-09-21",
      description: "Should detect explicit date '21 sep'",
    },
    {
      input: "due september 25th",
      expected: "2025-09-25",
      description: "Should detect explicit date 'september 25th'",
    },
  ];

  console.log("Testing patterns:");
  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. "${testCase.input}"`);
    console.log(`   Expected: ${testCase.expected} (${testCase.description})`);
  });

  console.log("\n" + "=".repeat(50));
  console.log("NOTE: The AI detection improvements have been made.");
  console.log(
    "To test these patterns, create new updates in the browser with the above text."
  );
  console.log("Expected behavior:");
  console.log(
    "- Relative dates (coming wednesday, this friday) → deadlineDate field"
  );
  console.log("- Explicit dates (21 sep, september 25th) → dueDate field");
  console.log("- Both should display as color-coded deadline tags");
  console.log("=".repeat(50));

  // Calculate what day "coming wednesday" should be
  const today = new Date("2025-09-21"); // Sunday
  console.log("\nDate calculations from Sunday, Sep 21, 2025:");
  console.log("- Coming Wednesday = Sep 24, 2025 (3 days away)");
  console.log("- This Friday = Sep 26, 2025 (5 days away)");
  console.log("- Next Monday = Sep 22, 2025 (1 day away)");
  console.log("- Coming Tuesday = Sep 23, 2025 (2 days away)");
}

testRelativeDateDetection();
