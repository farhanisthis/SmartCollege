// Test script to list available models in Gemini v1 API
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const listGeminiV1Models = async () => {
  const API_KEY = process.env.GEMINI_KEY_1;

  if (!API_KEY) {
    console.log("❌ No GEMINI_KEY_1 found in environment");
    return;
  }

  console.log("Listing available models in Gemini v1 API...");

  const url = "https://generativelanguage.googleapis.com/v1/models";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-goog-api-key": API_KEY,
      },
    });

    console.log("Response Status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Available models in Gemini v1 API:");

      if (data.models) {
        data.models.forEach((model, index) => {
          console.log(`${index + 1}. ${model.name}`);
          console.log(`   Display Name: ${model.displayName}`);
          console.log(
            `   Supported Generation Methods: ${
              model.supportedGenerationMethods?.join(", ") || "N/A"
            }`
          );
          console.log("---");
        });
      } else {
        console.log("No models found in response");
      }
    } else {
      const errorData = await response.text();
      console.log("❌ FAILED: Gemini v1 API error");
      console.log("Error:", errorData);
    }
  } catch (error) {
    console.error("❌ NETWORK ERROR:", error.message);
  }
};

listGeminiV1Models();
