
import "dotenv/config";
import { aiConfig } from "./config/aiProviders";

console.log("--- ENV DEBUG ---");
console.log("GEMINI_KEY_1 defined:", !!process.env.GEMINI_KEY_1);
console.log("GEMINI_KEY_1 length:", process.env.GEMINI_KEY_1?.length);
console.log("GEMINI_KEY_1 start:", process.env.GEMINI_KEY_1?.substring(0, 5));

console.log("--- CONFIG DEBUG ---");
const providers = aiConfig.getProviders();
console.log("Active Providers:", providers.length);
providers.forEach(p => {
    console.log(`Provider: ${p.name}, Type: ${p.type}, KeyLen: ${p.apiKey?.length}, Model: ${p.model}`);
});

console.log("--- HF ENDPOINT TEST ---");
// Test the HF endpoint construction
const hf = providers.find(p => p.type === 'huggingface');
if (hf) {
    console.log(`HF URL: https://router.huggingface.co/hf-inference/models/${hf.model}`);
}
