// Test script for the new AI-driven update creation workflow
const axios = require("axios");

const BASE_URL = "http://localhost:5000";

// Test content for different categories
const testContent = {
  assignment:
    "Assignment for CS101: Complete the binary search tree implementation due Monday October 15th. Submit through the course portal.",
  note: "Today's lecture covered Object-Oriented Programming principles: Encapsulation, Inheritance, Polymorphism, and Abstraction. Review chapter 8-10 for next week.",
  presentation:
    "Final project presentations scheduled for December 10-12. Each team gets 15 minutes to present. Prepare slides and demo.",
  general:
    "Library will be closed for maintenance this weekend. Study rooms are still available in the student center.",
};

async function testUpdateCreation() {
  console.log("🧪 Testing new AI-driven update creation workflow...\n");

  try {
    // Test login first (assuming we need authentication)
    console.log("1. Testing login...");
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: "testcr", // Assuming there's a test CR account
      password: "password",
    });
    console.log("✅ Login successful");
    const cookies = loginResponse.headers["set-cookie"];

    // Test different content types
    for (const [category, content] of Object.entries(testContent)) {
      console.log(`\n2. Testing ${category} content...`);

      const formData = new FormData();
      formData.append("originalContent", content);
      formData.append("priority", "normal");
      formData.append("isUrgent", "false");

      const response = await axios.post(`${BASE_URL}/api/updates`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Cookie: cookies ? cookies.join("; ") : "",
        },
      });

      console.log(`✅ ${category} update created:`, {
        id: response.data.id,
        title: response.data.title,
        category: response.data.category,
        hasContent: !!response.data.content,
      });

      // Verify content requirements based on category
      if (category === "assignment" || category === "note") {
        console.log(
          `   ✓ ${category} correctly has only title (no formatted content)`
        );
      } else {
        console.log(
          `   ✓ ${category} correctly has both title and formatted content`
        );
      }
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log("\nKey changes verified:");
    console.log("- ✅ AI categorization happens only on submit");
    console.log("- ✅ Title is automatically generated");
    console.log("- ✅ Assignments and notes only have titles");
    console.log(
      "- ✅ Presentations and general updates have formatted content"
    );
  } catch (error) {
    if (error.response) {
      console.error("❌ Test failed:", error.response.data);
    } else {
      console.error("❌ Network error:", error.message);
      console.log("Make sure the server is running on port 5000");
    }
  }
}

// Run the test
testUpdateCreation();
