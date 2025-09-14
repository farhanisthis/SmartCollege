// Simple test script for AI providers
const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const testPrompt =
  "Categorize this college update: 'Assignment due next Monday for Computer Science course.'";

async function testAIProviders() {
  console.log("🧪 Testing AI Providers...\n");

  try {
    // Test with automatic fallback (default)
    console.log("1. Testing with automatic fallback...");
    const autoResult = await axios.post(
      `${BASE_URL}/api/ai/test`,
      {
        prompt: testPrompt,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log("✅ Auto fallback result:", autoResult.data);
    console.log("");

    // Test Hugging Face specifically
    console.log("2. Testing Hugging Face directly...");
    const hfResult = await axios.post(
      `${BASE_URL}/api/ai/test`,
      {
        prompt: testPrompt,
        provider: "huggingface",
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log("✅ Hugging Face result:", hfResult.data);
    console.log("");

    // Test Gemini specifically
    console.log("3. Testing Gemini directly...");
    const geminiResult = await axios.post(
      `${BASE_URL}/api/ai/test`,
      {
        prompt: testPrompt,
        provider: "gemini",
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log("✅ Gemini result:", geminiResult.data);
    console.log("");

    console.log("🎉 All tests completed successfully!");
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
testAIProviders();
