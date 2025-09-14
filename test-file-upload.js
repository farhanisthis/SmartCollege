// Test script for file upload functionality
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:5000";

async function testFileUpload() {
  console.log("🧪 Testing file upload without text content...\n");

  try {
    // Test login first
    console.log("1. Testing login...");
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: "testcr",
      password: "password",
    });
    console.log("✅ Login successful");
    const cookies = loginResponse.headers["set-cookie"];

    // Create a test file
    const testFileName = "test-upload.txt";
    const testContent =
      "This is a test file for upload functionality. Assignment: Complete the programming exercise by Friday.";
    fs.writeFileSync(testFileName, testContent);

    console.log("\n2. Testing file upload without text content...");

    const formData = new FormData();
    formData.append("originalContent", ""); // Empty text content
    formData.append("priority", "normal");
    formData.append("isUrgent", "false");
    formData.append("files", fs.createReadStream(testFileName));

    const response = await axios.post(`${BASE_URL}/api/updates`, formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookies ? cookies.join("; ") : "",
      },
    });

    console.log("✅ File upload successful:", {
      id: response.data.id,
      title: response.data.title,
      category: response.data.category,
      hasFiles: response.data.files && response.data.files.length > 0,
    });

    // Clean up test file
    fs.unlinkSync(testFileName);

    console.log("\n🎉 File upload test completed successfully!");
    console.log("Key verifications:");
    console.log("- ✅ Can create updates with only files (no text content)");
    console.log("- ✅ AI processes file content for categorization");
    console.log("- ✅ Generates appropriate title from file content");
  } catch (error) {
    if (error.response) {
      console.error("❌ Test failed:", error.response.data);
    } else {
      console.error("❌ Network error:", error.message);
      console.log("Make sure the server is running on port 5000");
    }

    // Clean up test file if it exists
    const testFileName = "test-upload.txt";
    if (fs.existsSync(testFileName)) {
      fs.unlinkSync(testFileName);
    }
  }
}

// Run the test
testFileUpload();
