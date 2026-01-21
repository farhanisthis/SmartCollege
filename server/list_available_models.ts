import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function listAvailableModels() {
  console.log("=== Checking Available Gemini Models ===\n");

  // Try with KEY_2 since KEY_1 is invalid
  const apiKey = process.env.GEMINI_KEY_2;

  if (!apiKey) {
    console.error("GEMINI_KEY_2 not found in .env");
    return;
  }

  console.log(`Using API Key: ${apiKey.substring(0, 8)}...`);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log(`\nFetching: ${url.replace(apiKey, "***")}\n`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP ${response.status}: ${errorText}`);
      return;
    }

    const data: any = await response.json();

    console.log("✅ Available Models:\n");

    if (data.models && Array.isArray(data.models)) {
      data.models.forEach((model: any) => {
        const supportsGenerate =
          model.supportedGenerationMethods?.includes("generateContent");
        const icon = supportsGenerate ? "✅" : "❌";
        console.log(`${icon} ${model.name}`);
        if (model.displayName) {
          console.log(`   Display: ${model.displayName}`);
        }
        if (model.description) {
          console.log(`   Info: ${model.description.substring(0, 80)}...`);
        }
        if (supportsGenerate) {
          console.log(`   ⭐ USE THIS MODEL`);
        }
        console.log();
      });

      console.log("\n=== Models that support generateContent ===");
      const validModels = data.models
        .filter((m: any) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: any) => m.name.replace("models/", ""));

      console.log(validModels.join("\n"));
    } else {
      console.log("No models found in response");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listAvailableModels();
