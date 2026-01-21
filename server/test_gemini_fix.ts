import dotenv from "dotenv";
import { aiManager } from "./services/aiManager";
import { aiConfig } from "./config/aiProviders";

dotenv.config();

async function testGeminiIntegration() {
  console.log("=== Testing Gemini API Integration ===\n");

  // 1. Check loaded providers
  const providers = aiConfig.getProviders();
  console.log(`✓ Loaded ${providers.length} Gemini providers`);
  providers.forEach((p) => {
    console.log(
      `  - ${p.name}: ${p.model} (Key: ${p.apiKey.substring(0, 8)}...)`,
    );
  });

  // 2. Validate API keys
  const validation = aiConfig.validateApiKeys();
  console.log(`\n✓ Valid keys: ${validation.valid.length}`);
  console.log(`✗ Invalid keys: ${validation.invalid.length}`);
  if (validation.invalid.length > 0) {
    console.log(`  Invalid: ${validation.invalid.join(", ")}`);
  }

  // 3. Test simple prompt
  console.log("\n=== Testing AI Generation ===");
  const testPrompt = "Say 'Hello, SmartCollege!' in one sentence.";
  console.log(`Prompt: "${testPrompt}"\n`);

  try {
    const result = await aiManager.generateWithFallback(testPrompt);

    if (result.success) {
      console.log("✓ SUCCESS!");
      console.log(`Provider: ${result.provider}`);
      console.log(`Model: ${result.model}`);
      console.log(`Response: ${result.data}\n`);
    } else {
      console.log("✗ FAILED!");
      console.log(`Error: ${result.error}\n`);
    }
  } catch (error) {
    console.error("✗ EXCEPTION:", error);
  }

  // 4. Test with specific model
  console.log("=== Testing Specific Model (gemini-1.5-flash) ===");
  try {
    const result = await aiManager.useGemini(
      "gemini-1.5-flash",
      "What is 2+2? Answer in one word.",
    );

    if (result.success) {
      console.log("✓ Flash model works!");
      console.log(`Response: ${result.data}\n`);
    } else {
      console.log("✗ Flash model failed!");
      console.log(`Error: ${result.error}\n`);
    }
  } catch (error) {
    console.error("✗ EXCEPTION:", error);
  }

  console.log("=== Test Complete ===");
}

testGeminiIntegration().catch(console.error);
