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
  const prompt = `You are an AI assistant that categorizes college academic content based on CONTENT, not file type. Analyze the given content carefully and categorize it:

CATEGORIES:
- assignments: homework, projects, tasks to be completed by students, assignment submissions
- notes: lecture notes, study materials, educational content, class notes
- presentations: presentation schedules, seminar announcements, viva notifications, presentation guidelines (includes words like "presentation", "seminar", "viva", "talk")
- general: announcements, schedule changes, general information

IMPORTANT RULES:
1. Categorize based on CONTENT meaning, not file extension
2. For presentations: Include both actual presentation files AND scheduling/announcement content about presentations
3. Look for keywords: "presentation", "seminar", "viva", "talk", "present", "demo" for presentations category
4. Detect urgency from words like "urgent", "immediate", "deadline", "due", "submit by"
5. Extract specific dates in YYYY-MM-DD format when mentioned

Analyze this content and respond with JSON in this exact format:
{
  "category": "assignments|notes|presentations|general",
  "confidence": 0.95,
  "isUrgent": true/false,
  "dueDate": "YYYY-MM-DD" or null,
  "tags": ["tag1", "tag2"]
}

Content to analyze:
${content}`;

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
  let prompt: string;

  if (
    detectedCategory.category === "assignments" ||
    detectedCategory.category === "notes"
  ) {
    // For assignments and notes: Extract title and comprehensive details
    prompt = `You are a data extractor for a class updates system. 
Your task is to extract ONLY the essential details from the given content. 

Rules:
1. Extract the **title** → keep it short, clear, and based on the main task (e.g., "Minor Project", "DBMS Assignment").
2. Extract the **description** → Include key details like:
   - For assignments: deadline, submission format, requirements, instructions, marks
   - For notes: topics covered, chapter/lecture details, key concepts, important points
   - Any dates, requirements, or important information mentioned
3. If no specific details found, provide a brief summary of what the content is about.
4. Output strictly in JSON format:
{
  "title": "string",
  "description": "string"
}

Content to analyze:
${rawContent}`;
  } else if (detectedCategory.category === "presentations") {
    // For presentations: Extract title and comprehensive schedule/details
    prompt = `You are a data extractor for a class updates system. 
Your task is to extract ONLY the essential details from presentation-related content.

Rules:
1. Extract the **title** → keep it short, clear, and based on the presentation topic (e.g., "CG Presentation", "Seminar on AI").
2. Extract the **description** → Include key details like:
   - Date and time of presentation/seminar/viva
   - Venue/location if mentioned
   - Topic or subject details
   - Presenter information or roll numbers
   - Duration, format, or special instructions
3. If no specific details found, provide a brief summary of what the content is about.
4. Output strictly in JSON format:
{
  "title": "string",
  "description": "string"
}

Content to analyze:
${rawContent}`;
  } else {
    // For general updates: Extract title and important details/action items
    prompt = `You are a data extractor for a class updates system. 
Your task is to extract ONLY the essential details from general update content.

Rules:
1. Extract the **title** → keep it short, clear, and based on the main topic (e.g., "Library Closure", "Fee Payment Reminder").
2. Extract the **description** → Include key details like:
   - Important dates, deadlines, or time-sensitive information
   - Action items or things students need to do
   - Contact information, phone numbers, or email addresses
   - Policy changes, announcements, or new procedures
   - Event details, locations, or schedule changes
3. If the content contains multiple points, summarize the most important ones.
4. Output strictly in JSON format:
{
  "title": "string",
  "description": "string"
}

Content to analyze:
${rawContent}`;
  }

  const cacheKey = hashKey(
    "format",
    rawContent,
    JSON.stringify(detectedCategory)
  );

  // Check cache first
  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    console.log(
      `[formatContent] Starting formatContent for category: ${detectedCategory.category}`
    );
    console.log(`[formatContent] Raw content length: ${rawContent.length}`);

    // Enhanced retry logic with multiple attempts
    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[formatContent] Attempt ${attempt}/${maxRetries}`);

        // Try new AI manager first
        const result = await aiManager.generateWithFallback(prompt, "gemini");
        console.log(`[formatContent] AI Manager result:`, {
          success: result.success,
          provider: result.provider,
        });

        if (result.success && result.data) {
          let text = result.data;
          console.log(
            `[formatContent] AI Response for category "${detectedCategory.category}":`,
            text
          );

          // Clean up the response
          text = text.replace(/^```json\s*|^```\s*|```$/gim, "").trim();

          // Validate that we have actual content, not just the original
          if (
            text
              .toLowerCase()
              .includes(rawContent.toLowerCase().substring(0, 50))
          ) {
            console.warn(
              `[formatContent] AI returned similar content to input, retrying...`
            );
            throw new Error("AI returned unprocessed content");
          }

          try {
            const parsedResult = JSON.parse(text);
            console.log(`[formatContent] Parsed JSON:`, parsedResult);

            // Validate the parsed result has meaningful content
            if (!parsedResult.title || !parsedResult.description) {
              throw new Error("AI response missing required fields");
            }

            // Check if description is meaningful (not just original content)
            if (
              parsedResult.description.toLowerCase() ===
              rawContent.toLowerCase()
            ) {
              throw new Error("AI description identical to input");
            }

            const formatResult = {
              title: parsedResult.title || extractTitleFromContent(rawContent),
              content: parsedResult.description || "", // All prompts now use description field
              category: detectedCategory,
            };

            console.log(`[formatContent] Final result:`, formatResult);
            // Cache the result
            aiCache.set(cacheKey, formatResult);
            return formatResult;
          } catch (parseError) {
            console.error(
              `[formatContent] Attempt ${attempt} JSON Parse Error:`,
              parseError
            );
            console.error(
              `[formatContent] Raw text that failed to parse:`,
              text
            );
            lastError = parseError;
            if (attempt === maxRetries) {
              throw parseError;
            }
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        } else {
          console.log(`[formatContent] Attempt ${attempt} - AI Manager failed`);
          lastError = new Error("AI Manager returned no data");
          if (attempt === maxRetries) break;
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      } catch (attemptError) {
        console.error(
          `[formatContent] Attempt ${attempt} failed:`,
          attemptError
        );
        lastError = attemptError;
        if (attempt === maxRetries) break;
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    }

    console.log(
      `[formatContent] All ${maxRetries} attempts failed, trying fallback`
    );
    // Fallback to original implementation if AI manager fails
    if (model) {
      console.log(`[formatContent] Using Gemini fallback`);
      try {
        const fallbackResult = await callGeminiWithRetry({
          prompt,
          cacheKey,
          modelInstance: model,
        });
        let text = fallbackResult.response.text();
        console.log(`[formatContent] Fallback AI response:`, text);
        text = text.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
        const parsedResult = JSON.parse(text);
        console.log(`[formatContent] Fallback parsed result:`, parsedResult);
        return {
          title: parsedResult.title || extractTitleFromContent(rawContent),
          content: parsedResult.description || "", // All prompts now use description field
          category: detectedCategory,
        };
      } catch (fallbackError) {
        console.error(`[formatContent] Fallback also failed:`, fallbackError);
        lastError = fallbackError;
      }
    }

    throw lastError || new Error("No AI providers available");
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
    // Even in fallback, try to provide a better description than raw content
    const fallbackDescription =
      rawContent.length > 100
        ? rawContent.substring(0, 97) + "..."
        : rawContent;

    return {
      title: extractTitleFromContent(rawContent),
      content: fallbackDescription,
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

/**
 * Process combined text and file content for categorization and formatting
 * This is the main function for the new unified upload system
 */
export interface ProcessedContent {
  title: string;
  content: string;
  description: string;
  category: CategoryResult;
  extractedTexts?: Array<{
    fileName: string;
    content: string;
    metadata?: any;
  }>;
}

export async function processContentWithFiles(
  contextText: string,
  extractedTexts: Array<{
    fileName: string;
    content: string;
    metadata?: any;
  }> = []
): Promise<ProcessedContent> {
  // Combine context text with extracted file texts
  let combinedContent = contextText || "";

  if (extractedTexts.length > 0) {
    // Add file contents with headers
    const fileContents = extractedTexts
      .map(
        (extracted) => `\n--- ${extracted.fileName} ---\n${extracted.content}`
      )
      .join("\n");

    combinedContent = contextText
      ? `${contextText}\n\nAttached Files:${fileContents}`
      : `Attached Files:${fileContents}`;
  }

  // If no content at all, throw error
  if (!combinedContent.trim()) {
    throw new Error("No content provided for processing");
  }

  // Categorize the combined content
  const category = await categorizeContent(combinedContent);

  // Format the content based on category
  const formatted = await formatContent(combinedContent, category);

  const result = {
    title: formatted.title,
    content: combinedContent, // Keep original content
    description: formatted.content, // AI-generated description
    category,
    extractedTexts,
  };

  console.log(`[processContentWithFiles] Final result:`, {
    title: result.title,
    content: result.content.substring(0, 100) + "...",
    description: result.description.substring(0, 100) + "...",
    category: result.category.category,
  });

  return result;
}
