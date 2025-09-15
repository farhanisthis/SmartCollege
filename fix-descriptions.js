// Fix script to identify and reprocess updates with identical content and description
import { storage } from "./server/storage.js";
import { processContentWithFiles } from "./server/services/ai.js";

console.log("Checking for updates with identical content and description...");

try {
  const updates = await storage.getUpdates();

  console.log(`Found ${updates.length} total updates`);

  const problematicUpdates = updates.filter(
    (update) =>
      update.content === update.description &&
      update.content &&
      update.content.length > 10
  );

  console.log(
    `Found ${problematicUpdates.length} updates with identical content and description:`
  );

  for (const update of problematicUpdates) {
    console.log(
      `- ID: ${update.id}, Title: "${update.title}", Category: ${update.category}`
    );
    console.log(`  Content: "${update.content.substring(0, 50)}..."`);
    console.log("");
  }

  if (problematicUpdates.length > 0) {
    console.log(
      "Would you like to reprocess these descriptions? This will call the AI to generate proper descriptions."
    );
  }
} catch (error) {
  console.error("Error:", error);
}
