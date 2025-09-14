import { GoogleGenerativeAI } from "@google/generative-ai";
import pLimit from "p-limit";
import crypto from "crypto";
import { aiManager } from "../../services/aiManager";

// Fallback to direct Gemini if needed
const apiKey = process.env.GEMINI_KEY_1 || process.env.GOOGLE_API_KEY;
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;
let visionModel: any = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  visionModel = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
  });
}

// Rate limiter: max 10 concurrent requests
const limit = pLimit(10);

// Simple in-memory cache for categorize/format
const aiCache = new Map<string, any>();

function hashKey(...args: string[]): string {
  return crypto
    .createHash("sha256")
    .update(args.join("|"), "utf8")
    .digest("hex");
}

// Shared wrapper for all Gemini API calls with retry and caching
async function callGeminiWithRetry({
  prompt,
  cacheKey,
  modelInstance,
  args = [],
  maxRetries = 3,
}: {
  prompt: string;
  cacheKey: string;
  modelInstance: any;
  args?: any[];
  maxRetries?: number;
}): Promise<any> {
  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await limit(() =>
        modelInstance.generateContent([prompt, ...args])
      );
      aiCache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      // Retry on 429 Too Many Requests
      if (error.status === 429 && error.errorDetails) {
        let retryDelay = 60000; // default 60s
        for (const detail of error.errorDetails) {
          if (detail["@type"]?.includes("RetryInfo") && detail.retryDelay) {
            // retryDelay is like "54s"
            const match = /([0-9]+)s/.exec(detail.retryDelay);
            if (match) retryDelay = parseInt(match[1], 10) * 1000;
          }
        }
        await new Promise((res) => setTimeout(res, retryDelay));
        continue;
      }
      lastError = error;
      break;
    }
  }
  throw lastError;
}

export interface CategoryResult {
  category: "assignments" | "notes" | "presentations" | "general";
  confidence: number;
  isUrgent: boolean;
  dueDate?: string;
  tags: string[];
}

export interface FormattedContent {
  title: string;
  content: string;
  category: CategoryResult;
}

export async function categorizeContent(
  content: string
): Promise<CategoryResult> {
  const prompt = `You are an AI assistant that categorizes college academic content. Analyze the given content and categorize it into one of these categories:
    - assignments: homework, projects, tasks to be completed by students
    - notes: lecture notes, study materials, educational content
    - presentations: presentation guidelines, templates, presentation schedules
    - general: announcements, schedule changes, general information
\nAlso determine if the content is urgent (contains deadline mentions, "urgent", "immediate", etc.) and extract any due dates mentioned.\n\nAnalyze this content and respond with JSON in this exact format:\n{\n  "category": "assignments|notes|presentations|general",\n  "confidence": 0.95,\n  "isUrgent": true/false,\n  "dueDate": "YYYY-MM-DD" or null,\n  "tags": ["tag1", "tag2"]\n}\n\nContent to analyze:\n${content}`;

  const cacheKey = hashKey("categorize", content);

  // Check cache first
  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    // Try new AI manager first
    const result = await aiManager.generateWithFallback(prompt, "gemini");

    if (result.success && result.data) {
      let text = result.data;
      text = text.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
      const parsedResult = JSON.parse(text);

      const categoryResult = {
        category: parsedResult.category || "general",
        confidence: Math.max(0, Math.min(1, parsedResult.confidence || 0.8)),
        isUrgent: parsedResult.isUrgent || false,
        dueDate: parsedResult.dueDate || undefined,
        tags: Array.isArray(parsedResult.tags) ? parsedResult.tags : [],
      };

      // Cache the result
      aiCache.set(cacheKey, categoryResult);
      return categoryResult;
    }

    // Fallback to original implementation if AI manager fails
    if (model) {
      const fallbackResult = await callGeminiWithRetry({
        prompt,
        cacheKey,
        modelInstance: model,
      });
      let text = fallbackResult.response.text();
      text = text.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
      const parsedResult = JSON.parse(text);
      return {
        category: parsedResult.category || "general",
        confidence: Math.max(0, Math.min(1, parsedResult.confidence || 0.8)),
        isUrgent: parsedResult.isUrgent || false,
        dueDate: parsedResult.dueDate || undefined,
        tags: Array.isArray(parsedResult.tags) ? parsedResult.tags : [],
      };
    }

    throw new Error("No AI providers available");
  } catch (error) {
    let errMsg = "";
    if (typeof error === "object" && error !== null && "message" in error) {
      errMsg = (error as any).message;
    } else {
      try {
        errMsg = JSON.stringify(error);
      } catch {
        errMsg = String(error);
      }
    }
    console.error("AI categorization error:", error, errMsg);
    return {
      category: "general",
      confidence: 0.5,
      isUrgent: false,
      tags: [],
    };
  }
}

export async function formatContent(
  rawContent: string,
  detectedCategory: CategoryResult
): Promise<FormattedContent> {
  // For assignments, notes, and presentations, we only need a title, no formatted content
  const shouldGenerateContent =
    detectedCategory.category !== "assignments" &&
    detectedCategory.category !== "notes" &&
    detectedCategory.category !== "presentations";

  let prompt: string;

  if (shouldGenerateContent) {
    // Full formatting for general updates only
    prompt = `You are an AI assistant that formats and improves college academic content for better readability.\nThe content has been categorized as "${detectedCategory.category}".\n\nYour task is to:\n1. Create a clear, descriptive title (max 80 characters)\n2. Reformat the content for better readability while preserving all important information\n3. Fix grammar and spelling errors\n4. Structure the content with proper paragraphs\n5. Maintain the original meaning and tone\n\nFormat this content and respond with JSON in this exact format:\n{\n  "title": "Clear descriptive title",\n  "content": "Well-formatted content with proper structure and grammar"\n}\n\nContent to format:\n${rawContent}`;
  } else {
    // Only generate title for assignments, notes, and presentations
    prompt = `You are an AI assistant that creates clear, descriptive titles for college academic content.\nThe content has been categorized as "${detectedCategory.category}".\n\nYour task is to create a clear, descriptive title (max 80 characters) that accurately represents the main topic or purpose of this content.\n\nAnalyze this content and respond with JSON in this exact format:\n{\n  "title": "Clear descriptive title"\n}\n\nContent to analyze:\n${rawContent}`;
  }

  const cacheKey = hashKey(
    "format",
    rawContent,
    JSON.stringify(detectedCategory),
    shouldGenerateContent.toString()
  );

  // Check cache first
  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    // Try new AI manager first
    const result = await aiManager.generateWithFallback(prompt, "gemini");

    if (result.success && result.data) {
      let text = result.data;
      text = text.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
      const parsedResult = JSON.parse(text);

      const formatResult = {
        title: parsedResult.title || extractTitleFromContent(rawContent),
        content: shouldGenerateContent
          ? parsedResult.content || rawContent
          : "", // Empty content for assignments, notes, and presentations
        category: detectedCategory,
      };

      // Cache the result
      aiCache.set(cacheKey, formatResult);
      return formatResult;
    }

    // Fallback to original implementation if AI manager fails
    if (model) {
      const fallbackResult = await callGeminiWithRetry({
        prompt,
        cacheKey,
        modelInstance: model,
      });
      let text = fallbackResult.response.text();
      text = text.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
      const parsedResult = JSON.parse(text);
      return {
        title: parsedResult.title || extractTitleFromContent(rawContent),
        content: shouldGenerateContent
          ? parsedResult.content || rawContent
          : "", // Empty content for assignments, notes, and presentations
        category: detectedCategory,
      };
    }

    throw new Error("No AI providers available");
  } catch (error) {
    let errMsg = "";
    if (typeof error === "object" && error !== null && "message" in error) {
      errMsg = (error as any).message;
    } else {
      try {
        errMsg = JSON.stringify(error);
      } catch {
        errMsg = String(error);
      }
    }
    console.error("AI formatting error:", error, errMsg);
    return {
      title: extractTitleFromContent(rawContent),
      content: shouldGenerateContent ? rawContent : rawContent,
      category: detectedCategory,
    };
  }
}

function extractTitleFromContent(content: string): string {
  // Simple title extraction as fallback
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    return firstLine.length > 80
      ? firstLine.substring(0, 77) + "..."
      : firstLine;
  }
  return "Untitled";
}

export async function analyzeImageContent(
  base64Image: string
): Promise<string> {
  const prompt =
    "Analyze this image and extract any text content, especially if it contains academic information like assignments, notes, announcements, or presentations. Provide a detailed transcription of any text found.";
  const cacheKey = hashKey("analyzeImage", base64Image);

  // Check cache first
  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    // Try Hugging Face first for image analysis (if available)
    const hfResult = await aiManager.useHuggingFace(
      `Image Analysis: ${prompt}`
    );

    if (hfResult.success && hfResult.data) {
      const result = hfResult.data;
      aiCache.set(cacheKey, result);
      return result;
    }

    // Fallback to Gemini Vision if available
    if (visionModel) {
      const imageData = {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      };
      const result = await callGeminiWithRetry({
        prompt,
        cacheKey,
        modelInstance: visionModel,
        args: [imageData],
      });
      const text = result.response.text() || "";
      aiCache.set(cacheKey, text);
      return text;
    }

    throw new Error("No vision models available for image analysis");
  } catch (error) {
    console.error("Image analysis error:", error);
    throw new Error("Failed to analyze image content");
  }
}

export { analyzeImageContent as analyzeImage };
