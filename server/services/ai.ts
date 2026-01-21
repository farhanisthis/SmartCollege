import crypto from "crypto";
import { aiManager } from "./aiManager";

// Simple in-memory cache for categorize/format
const aiCache = new Map<string, any>();

function hashKey(...args: string[]): string {
  return crypto
    .createHash("sha256")
    .update(args.join("|"), "utf8")
    .digest("hex");
}

export interface CategoryResult {
  category: "assignments" | "notes" | "presentations" | "general";
  confidence: number;
  isUrgent: boolean;
  dueDate?: string;
  deadlineDate?: string;
  tags: string[];
}

export interface FormattedContent {
  title: string;
  subject?: string;
  content: string;
  category: CategoryResult;
}

// Helper function to calculate the next occurrence of a weekday
function getNextWeekday(
  targetDay: string,
  fromDate: Date = new Date(),
): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const targetIndex = days.indexOf(targetDay.toLowerCase());

  if (targetIndex === -1) return "";

  const currentDay = fromDate.getDay();
  let daysToAdd = targetIndex - currentDay;

  // If it's the same day or past, get next week's occurrence
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);

  return nextDate.toISOString().split("T")[0];
}

// Manual deadline detection function
function manuallyDetectDeadline(content: string, currentDate: Date) {
  const result = {
    deadlineDate: undefined as string | undefined,
    dueDate: undefined as string | undefined,
  };
  const contentLower = content.toLowerCase();

  // Check for day names with deadline keywords
  const dayKeywords = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const deadlineKeywords = [
    "submit",
    "due",
    "deadline",
    "by",
    "before",
    "until",
    "complete",
  ];

  // Check if content contains both deadline keywords and day names
  const hasDeadlineKeyword = deadlineKeywords.some((keyword) =>
    contentLower.includes(keyword),
  );

  if (hasDeadlineKeyword) {
    for (const day of dayKeywords) {
      if (contentLower.includes(day)) {
        result.deadlineDate = getNextWeekday(day, currentDate);
        break;
      }
    }
  }

  // Check for explicit dates (basic patterns)
  const datePatterns = [
    /(\d{1,2})\s*(st|nd|rd|th)?\s*(sep|september|oct|october|nov|november|dec|december)/i,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(september|october|november|december)\s*(\d{1,2})/i,
  ];

  for (const pattern of datePatterns) {
    const match = contentLower.match(pattern);
    if (match && hasDeadlineKeyword) {
      // Basic date parsing - this could be improved
      const currentYear = currentDate.getFullYear();
      if (match[0].includes("sep") || match[0].includes("september")) {
        const day = match[1] || match[2];
        result.dueDate = `${currentYear}-09-${day.padStart(2, "0")}`;
      }
      break;
    }
  }

  return result;
}

export async function categorizeContent(
  content: string,
): Promise<CategoryResult> {
  const currentDate = new Date();
  const currentDateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD format
  const currentDay = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const currentYear = currentDate.getFullYear();

  // Calculate example dates for common day references for the prompt context
  const nextWednesday = getNextWeekday("wednesday", currentDate);
  const nextFriday = getNextWeekday("friday", currentDate);
  const nextMonday = getNextWeekday("monday", currentDate);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const fullPrompt =
    "You are an AI assistant that categorizes college academic content and detects deadlines.\n\n" +
    "Current date: " +
    currentDateStr +
    " (" +
    currentDay +
    ")\n" +
    "Current year: " +
    currentYear +
    "\n\n" +
    "CATEGORIES:\n" +
    "- assignments: homework, tasks, submissions, projects\n" +
    "- notes: lecture notes, study materials, chapter summaries\n" +
    "- presentations: seminars, vivas, presentation schedules\n" +
    "- general: announcements, notices\n\n" +
    "CURRENT SUBJECTS (BCA-VI E1, Academic Session 2025-2026):\n" +
    "- DWDM (Data Warehousing & Data Mining)\n" +
    "- e-com, e-Commerce (e-Commerce)\n" +
    "- IOT (Internet of Things)\n" +
    "- DVA (Data Visualization & Analytics)\n" +
    "- DL (Deep Learning with Python)\n" +
    "- MP (Major Project)\n" +
    "- DVA Lab, DL Lab, IOT Lab, MP Lab (Lab sessions)\n\n" +
    "DEADLINE DETECTION:\n" +
    "- Look for keywords: due, submit, deadline, by, before, until, complete\n" +
    "- Detect day names: monday, tuesday, wednesday, thursday, friday, saturday, sunday, tomorrow\n" +
    "- Calculate actual dates based on current date\n" +
    "- Use 'deadlineDate' for relative dates (e.g., 'next Friday')\n" +
    "- Use 'dueDate' for explicit dates (e.g., '25th January')\n\n" +
    "RESPONSE FORMAT: JSON only\n" +
    "{\n" +
    '  "category": "assignments|notes|presentations|general",\n' +
    '  "confidence": 0.95,\n' +
    '  "isUrgent": true/false,\n' +
    '  "dueDate": "YYYY-MM-DD" or null,\n' +
    '  "deadlineDate": "YYYY-MM-DD" or null,\n' +
    '  "tags": ["tag1", "tag2"]\n' +
    "}\n\n" +
    "Content to analyze:\n" +
    content;

  const cacheKey = hashKey("categorize", content, currentDateStr);

  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    const result = await aiManager.generateWithFallback(fullPrompt);

    if (result.success && result.data) {
      let text = result.data;
      text = text.replace(/^```json\s*|^```\s*|```$/gim, "").trim();

      const parsedResult = JSON.parse(text);

      const categoryResult = {
        category: parsedResult.category || "general",
        confidence: Math.max(0, Math.min(1, parsedResult.confidence || 0.8)),
        isUrgent: parsedResult.isUrgent || false,
        dueDate: parsedResult.dueDate || undefined,
        deadlineDate: parsedResult.deadlineDate || undefined,
        tags: Array.isArray(parsedResult.tags) ? parsedResult.tags : [],
      };

      // Manual deadline detection fallback
      if (!categoryResult.deadlineDate && !categoryResult.dueDate) {
        const manualDeadline = manuallyDetectDeadline(content, currentDate);
        if (manualDeadline.deadlineDate)
          categoryResult.deadlineDate = manualDeadline.deadlineDate;
        if (manualDeadline.dueDate)
          categoryResult.dueDate = manualDeadline.dueDate;
      }

      aiCache.set(cacheKey, categoryResult);
      return categoryResult;
    }

    throw new Error(result.error || "AI failed");
  } catch (error) {
    console.error("AI categorization error:", error);
    console.log("[AI] Falling back to manual categorization");

    // Manual fallback
    const text = content.toLowerCase();
    let category: CategoryResult["category"] = "general";
    let tags: string[] = [];

    if (text.includes("present") || text.includes("seminar")) {
      category = "presentations";
      tags.push("presentation");
    } else if (
      text.includes("assign") ||
      text.includes("homework") ||
      text.includes("due")
    ) {
      category = "assignments";
      tags.push("assignment");
    } else if (text.includes("note") || text.includes("chapter")) {
      category = "notes";
      tags.push("notes");
    }

    const manualDeadline = manuallyDetectDeadline(content, new Date());

    return {
      category,
      confidence: 0.6,
      isUrgent: !!manualDeadline.deadlineDate || !!manualDeadline.dueDate,
      dueDate: manualDeadline.dueDate,
      deadlineDate: manualDeadline.deadlineDate,
      tags,
    };
  }
}

export async function formatContent(
  rawContent: string,
  detectedCategory: CategoryResult,
): Promise<FormattedContent> {
  const prompt =
    "Extract title, subject, and description from this academic update.\n\n" +
    "CURRENT SUBJECTS (BCA-VI E1, Academic Session 2025-2026):\n" +
    "- DWDM (Data Warehousing & Data Mining)\n" +
    "- e-com, e-Commerce (e-Commerce)\n" +
    "- IOT (Internet of Things)\n" +
    "- DVA (Data Visualization & Analytics)\n" +
    "- DL (Deep Learning with Python)\n" +
    "- MP (Major Project)\n" +
    "- DVA Lab, DL Lab, IOT Lab, MP Lab (Lab sessions)\n\n" +
    "FORMATTING RULES:\n" +
    "- Use bullet points (•) for lists\n" +
    "- Fix typos and grammar\n" +
    "- Expand abbreviations to full subject names\n" +
    "- Make content professional and clear\n\n" +
    "Category: " +
    detectedCategory.category +
    "\n\n" +
    'Output JSON: { "title": "...", "subject": "...", "description": "..." }\n\n' +
    "Content to format:\n" +
    rawContent;

  const cacheKey = hashKey(
    "format",
    rawContent,
    JSON.stringify(detectedCategory),
  );

  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    const result = await aiManager.generateWithFallback(prompt);

    if (result.success && result.data) {
      let text = result.data.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
      const parsedResult = JSON.parse(text);

      // Handle arrays for description/content - convert to string with bullet points
      let description = parsedResult.description || "";
      if (Array.isArray(description)) {
        description = description.map((item) => `• ${item}`).join("\n");
      }

      const formatResult = {
        title: parsedResult.title || extractTitleFromContent(rawContent),
        subject: parsedResult.subject || null,
        content: description,
        category: detectedCategory,
      };

      aiCache.set(cacheKey, formatResult);
      return formatResult;
    }

    throw new Error(result.error || "AI formatting failed");
  } catch (error) {
    console.error("AI formatting error:", error);

    // Manual fallback
    return {
      title: extractTitleFromContent(rawContent),
      subject: undefined,
      content: rawContent,
      category: detectedCategory,
    };
  }
}

function extractTitleFromContent(content: string): string {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    return firstLine.length > 80
      ? firstLine.substring(0, 77) + "..."
      : firstLine;
  }
  return "Untitled";
}

export async function analyzeImage(base64Image: string): Promise<string> {
  // Basic implementation for now
  return "";
}

// Helper to combine text and file content
export async function processContentWithFiles(
  content: string,
  fileTexts: string[],
): Promise<FormattedContent & { description?: string }> {
  let combinedContent = content;

  if (fileTexts && fileTexts.length > 0) {
    combinedContent +=
      "\n\n--- Extracted Content from Files ---\n" + fileTexts.join("\n\n");
  }

  // 1. Categorize
  const category = await categorizeContent(combinedContent);

  // 2. Format
  const formatted = await formatContent(combinedContent, category);

  // Return with description alias to satisfy potential consumers expecting it
  return {
    ...formatted,
    description: formatted.content,
  };
}
