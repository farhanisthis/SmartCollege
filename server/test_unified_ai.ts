
import { processContentWithFiles } from "./services/ai";
import dotenv from "dotenv";

// Load env vars
dotenv.config();

async function testUnifiedAI() {
  const content = "presenetatons of e commerce";
  const files = ["Extracted text from file 1", "Extracted text from file 2"];
  
  console.log("Testing processContentWithFiles with content:", content);
  
  try {
    const result = await processContentWithFiles(content, files);
    console.log("--------------------------------");
    console.log("Result Object Keys:", Object.keys(result));
    console.log("Title:", result.title);
    console.log("Content:", result.content);
    console.log("Description (Alias):", result.description);
    console.log("Category Object:", result.category);
    console.log("--------------------------------");
    
    if (!result.category) {
        console.error("FAIL: result.category is missing!");
        process.exit(1);
    }
    
    if (result.category.category !== "presentations") {
         console.warn("WARNING: Category mismatch, expected presentations, got:", result.category.category);
    }

    if (!result.content && !result.description) {
        console.error("FAIL: Content/Description missing");
        process.exit(1);
    }

    console.log("SUCCESS: processContentWithFiles returned valid object structure");

  } catch (error) {
    console.error("Unified AI Pipeline Failed:", error);
    process.exit(1);
  }
}

testUnifiedAI();
