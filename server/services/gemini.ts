import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
// Log key status (don't log the full key)
const apiKey = process.env.GEMINI_API_KEY || "";
console.log(`[Gemini] Initializing with key length: ${apiKey.length}`);
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function generatePerformanceInsight(studentData: any) {
  try {
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing in server .env");

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
