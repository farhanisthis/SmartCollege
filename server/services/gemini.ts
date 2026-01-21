import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with first available key
// This file is deprecated - use aiManager.ts for production
const apiKey =
  process.env.GEMINI_KEY_1 ||
  process.env.GEMINI_KEY_2 ||
  process.env.GEMINI_KEY_3 ||
  "";
console.log(`[Gemini Legacy] Initializing with key length: ${apiKey.length}`);
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generatePerformanceInsight(studentData: any) {
  try {
    if (!apiKey) throw new Error("GEMINI_KEY_1/2/3 is missing in server .env");

    const prompt = `
      Analyze the following student performance data and provide a concise, motivational, and actionable insight (max 2-3 sentences).
      Address the student directly as "you".
      
      Data: ${JSON.stringify(studentData)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Error (Performance):", error.message);
    return "Keep up the hard work! Consistency is key to success. (AI Unavailable)";
  }
}

export async function summarizeText(text: string) {
  try {
    const prompt = `
      Summarize the following text into a very concise bulleted list (max 3 bullets).
      Keep it short and informative.
      
      Text: "${text}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error (Summarize):", error);
    return "Summary unavailable at the moment.";
  }
}
