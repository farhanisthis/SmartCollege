
import { processInput } from "./services/inputPipeline";
import dotenv from "dotenv";

// Load env vars
dotenv.config();

async function testAI() {
  const input = "presenetatons of e commerce should be done beffore 15 febv";
  console.log("Testing AI Update Generation with input:", input);
  
  try {
    const result = await processInput(input, "text");
    console.log("--------------------------------");
    console.log("Raw Text:", result.rawText);
    console.log("Title:", result.title);
    console.log("Category:", result.category);
    console.log("Subject:", result.subject);
    console.log("Tags:", result.tags);
    console.log("Formatted Content (Description):");
    console.log(result.formattedContent);
    console.log("--------------------------------");
    
    if (result.formattedContent.trim() === input.trim()) {
        console.error("FAIL: Content was NOT enhanced (identical to input)");
    } else {
        console.log("SUCCESS: Content was enhanced");
    }

  } catch (error) {
    console.error("AI Pipeline Failed:", error);
  }
}

testAI();
