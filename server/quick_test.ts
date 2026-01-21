import dotenv from "dotenv";
import { aiManager } from "./services/aiManager";

dotenv.config();

async function quickTest() {
  console.log("Testing Gemini 2.5 Flash...\n");

  const result = await aiManager.generateWithFallback(
    "Say 'Hello from Gemini!' in one sentence.",
  );

  if (result.success) {
    console.log("✅ SUCCESS!");
    console.log(`Provider: ${result.provider}`);
    console.log(`Model: ${result.model}`);
    console.log(`Response: ${result.data}\n`);
  } else {
    console.log("❌ FAILED!");
    console.log(`Error: ${result.error}\n`);
  }
}

quickTest()
  .catch(console.error)
  .finally(() => process.exit(0));
