import { GoogleGenerativeAI } from "@google/generative-ai";
import pLimit from "p-limit";
import crypto from "crypto";
import { aiManager } from "./aiManager.ts";

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
  deadlineDate?: string; // New field for parsed deadline date
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
  fromDate: Date = new Date()
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
    contentLower.includes(keyword)
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
      // Add more date parsing logic here as needed
      break;
    }
  }

  return result;
}

export async function categorizeContent(
  content: string
): Promise<CategoryResult> {
  const currentDate = new Date();
  const currentDateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD format
  const currentDay = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const currentYear = currentDate.getFullYear();

  // Calculate example dates for common day references
  const nextMonday = getNextWeekday("monday", currentDate);
  const nextTuesday = getNextWeekday("tuesday", currentDate);
  const nextWednesday = getNextWeekday("wednesday", currentDate);
  const nextThursday = getNextWeekday("thursday", currentDate);
  const nextFriday = getNextWeekday("friday", currentDate);
  const nextSaturday = getNextWeekday("saturday", currentDate);
  const nextSunday = getNextWeekday("sunday", currentDate);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const prompt = `You are an AI assistant that categorizes college academic content and detects deadlines. 
  
Current date: ${currentDateStr} (${currentDay}) 
Current year: ${currentYear}

CATEGORIES:
- assignments: homework, projects, tasks to be completed by students, assignment submissions
- notes: lecture notes, study materials, educational content, class notes
- presentations: presentation schedules, seminar announcements, viva notifications, presentation guidelines (includes words like "presentation", "seminar", "viva", "talk")
- general: announcements, schedule changes, general information

DEADLINE DETECTION AND CALCULATION:
1. Look for deadline keywords and variations: 
   - "due", "submit", "submit by", "submit it", "submit it by", "submit it before"
   - "deadline", "by", "before", "until", "complete", "complete it", "complete by"
   - "turn in", "hand in", "finish", "finish by", "done by"

2. Look for day references (case-insensitive) and calculate actual dates:
   - "monday", "due monday", "this monday", "coming monday", "next monday" → ${nextMonday}
   - "tuesday", "by tuesday", "this tuesday", "coming tuesday", "next tuesday" → ${nextTuesday}
   - "wednesday", "this wednesday", "coming wednesday", "next wednesday" → ${nextWednesday}
   - "thursday", "this thursday", "coming thursday", "next thursday" → ${nextThursday}
   - "friday", "this friday", "coming friday", "next friday" → ${nextFriday}
   - "saturday", "this saturday", "coming saturday", "next saturday" → ${nextSaturday}
   - "sunday", "this sunday", "coming sunday", "next sunday" → ${nextSunday}
   - "tomorrow" → ${tomorrow}

3. CRITICAL: If you find ANY deadline keyword near ANY day reference, set deadlineDate
4. For explicit dates (like "21st Sep", "September 21"), use dueDate field
5. Examples that MUST be detected:
   - "submit it before coming wednesday" → deadlineDate: "${nextWednesday}"
   - "submit before coming wednesday" → deadlineDate: "${nextWednesday}"
   - "due this friday" → deadlineDate: "${nextFriday}"
   - "submit by 21 sep" → dueDate: "${currentYear}-09-21"
   - "complete it by next monday" → deadlineDate: "${nextMonday}"

DEADLINE FIELDS (provide when deadlines are detected):
- dueDate: Extract explicit dates (e.g., "25th September" → "${currentYear}-09-25")
- deadlineDate: Calculate relative dates using day names above

IMPORTANT DETECTION RULES:
- Be VERY aggressive in detecting deadlines - if there's ANY hint of a deadline, detect it
- Case-insensitive matching for all keywords and day names
- Partial phrase matching (e.g., "submit it before" should match "submit before")
- Even vague references like "get this done by friday" should trigger detection

CRITICAL: You MUST return deadlineDate field when detecting relative dates like "wednesday", "friday", etc.
CRITICAL: You MUST return dueDate field when detecting explicit dates like "21 Sep", "September 25", etc.

RESPONSE FORMAT: Respond with JSON only:
{
  "category": "assignments|notes|presentations|general",
  "confidence": 0.95,
  "isUrgent": true/false,
  "dueDate": "YYYY-MM-DD" or null,
  "deadlineDate": "YYYY-MM-DD" or null,
  "tags": ["tag1", "tag2"]
}

MANDATORY EXAMPLES:
- Input: "submit this assignment on wednesday" → Output: {"category": "assignments", "confidence": 0.95, "isUrgent": true, "dueDate": null, "deadlineDate": "${nextWednesday}", "tags": ["assignment"]}
- Input: "homework due this friday" → Output: {"category": "assignments", "confidence": 0.95, "isUrgent": true, "dueDate": null, "deadlineDate": "${nextFriday}", "tags": ["homework"]}
- Input: "submit by 25 Sep" → Output: {"category": "assignments", "confidence": 0.95, "isUrgent": true, "dueDate": "${currentYear}-09-25", "deadlineDate": null, "tags": ["deadline"]}
{
  "category": "assignments|notes|presentations|general",
  "confidence": 0.95,
  "isUrgent": true/false,
  "dueDate": "YYYY-MM-DD" or null,
  "deadlineDate": "YYYY-MM-DD" or null,
  "tags": ["tag1", "tag2"]
}

Content to analyze:
${content}`;

  const cacheKey = hashKey("categorize", content, currentDateStr);

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
        deadlineDate: parsedResult.deadlineDate || undefined,
        tags: Array.isArray(parsedResult.tags) ? parsedResult.tags : [],
      };

      // Post-processing: If AI failed to detect deadline dates, manually detect them
      if (!categoryResult.deadlineDate && !categoryResult.dueDate) {
        console.log("[AI] Manual deadline detection triggered for:", content);
        const manualDeadline = manuallyDetectDeadline(content, currentDate);
        console.log("[AI] Manual detection result:", manualDeadline);
        if (manualDeadline.deadlineDate) {
          categoryResult.deadlineDate = manualDeadline.deadlineDate;
          console.log("[AI] Added deadlineDate:", manualDeadline.deadlineDate);
        }
        if (manualDeadline.dueDate) {
          categoryResult.dueDate = manualDeadline.dueDate;
          console.log("[AI] Added dueDate:", manualDeadline.dueDate);
        }
      }

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
        deadlineDate: parsedResult.deadlineDate || undefined,
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
      deadlineDate: undefined,
      tags: [],
    };
  }
}

export async function formatContent(
  rawContent: string,
  detectedCategory: CategoryResult
): Promise<FormattedContent> {
  let prompt: string;

  if (detectedCategory.category === "assignments") {
    // For assignments: Extract title, subject and comprehensive details with bullet points
    prompt = `You are a data extractor for a class updates system specializing in assignment formatting.

COMMON ACADEMIC SUBJECTS TO RECOGNIZE (including abbreviations):
- Data Structures, Algorithm, DSA
- Database Management, DBMS, Database
- Operating System, OS
- Computer Networks, Networking
- Software Engineering, SE
- Web Development, Web Programming
- Machine Learning, ML, AI
- Computer Graphics, CG (ALWAYS expand "CG" to "Computer Graphics")
- Cloud Computing, CC
- Principles of Management, POM
- System Programming
- Object Oriented Programming, OOP
- Python Programming, Python
- Java Programming, Java
- C Programming, C Language
- Mathematics, Maths, Discrete Math
- Statistics, Probability
- Physics, Chemistry, Biology
- Management, Business Studies
- Economics, Accounts

FORMATTING RULES for description:
- Use bullet points (•) for lists of students assigned
- Use bullet points for requirements and deliverables
- Use bullet points for submission guidelines
- Use bullet points for grading criteria
- Keep deadlines and general info as paragraphs
- Format student names: "• Student Name 1\n• Student Name 2"
- Format requirements: "• Requirement 1\n• Requirement 2"

Rules:
1. Extract the **title** → keep it short, clear (e.g., "Data Structures Assignment", "DBMS Project").
2. Extract the **subject** → identify from common subjects above.
3. Extract the **description** → Format with bullet points for lists:
   - Students assigned (if mentioned)
   - Requirements and deliverables
   - Submission details
   - Grading criteria
4. Output strictly in JSON format:
{
  "title": "string",
  "subject": "string", 
  "description": "string"
}

Example:
Input: "Assignment for web development. Students: john, mary, david. Requirements: html validation, css responsiveness, javascript interactivity"
Output: {
  "title": "Web Development Assignment",
  "subject": "Web Development",
  "description": "Students assigned:\n• John\n• Mary\n• David\n\nRequirements:\n• HTML validation\n• CSS responsiveness\n• JavaScript interactivity"
}

Content to analyze:
${rawContent}`;
  } else if (detectedCategory.category === "notes") {
    // For notes: Extract title, subject and comprehensive details with bullet points
    prompt = `You are a data extractor for a class updates system specializing in notes formatting.

COMMON ACADEMIC SUBJECTS TO RECOGNIZE (including abbreviations):
- Data Structures, Algorithm, DSA
- Database Management, DBMS, Database
- Operating System, OS
- Computer Networks, Networking
- Software Engineering, SE
- Web Development, Web Programming
- Machine Learning, ML, AI
- Computer Graphics, CG (ALWAYS expand "CG" to "Computer Graphics")
- Cloud Computing, CC
- Principles of Management, POM
- System Programming
- Object Oriented Programming, OOP
- Python Programming, Python
- Java Programming, Java
- C Programming, C Language
- Mathematics, Maths, Discrete Math
- Statistics, Probability
- Physics, Chemistry, Biology
- Management, Business Studies
- Economics, Accounts

FORMATTING RULES for description:
- Use bullet points (•) for key topics covered
- Use bullet points for important concepts or definitions
- Use bullet points for formulas or theorems
- Use bullet points for examples or case studies
- Keep explanatory text as paragraphs
- Format topics: "• Topic 1: Brief explanation\n• Topic 2: Brief explanation"

Rules:
1. Extract the **title** → keep it short, clear (e.g., "Database Normalization Notes", "Algorithm Analysis").
2. Extract the **subject** → identify from common subjects above.
3. Extract the **description** → Format with bullet points for lists:
   - Topics covered
   - Key concepts
   - Important formulas/theorems
4. Output strictly in JSON format:
{
  "title": "string",
  "subject": "string",
  "description": "string"
}

Example:
Input: "Database normalization notes covering 1NF, 2NF, 3NF, functional dependencies"
Output: {
  "title": "Database Normalization Notes", 
  "subject": "Database Management",
  "description": "Topics covered:\n• 1NF (First Normal Form)\n• 2NF (Second Normal Form)\n• 3NF (Third Normal Form)\n• Functional Dependencies"
}

Content to analyze:
${rawContent}`;
  } else if (detectedCategory.category === "presentations") {
    // For presentations: Extract title, subject and comprehensive schedule/details with bullet points
    prompt = `You are a data extractor for a class updates system specializing in presentation formatting.

COMMON ACADEMIC SUBJECTS TO RECOGNIZE (including abbreviations):
- Data Structures, Algorithm, DSA
- Database Management, DBMS, Database
- Operating System, OS
- Computer Networks, Networking
- Software Engineering, SE
- Web Development, Web Programming
- Machine Learning, ML, AI
- Computer Graphics, CG (ALWAYS expand "CG" to "Computer Graphics")
- System Programming
- Object Oriented Programming, OOP
- Python Programming, Python
- Java Programming, Java
- C Programming, C Language
- Mathematics, Maths, Discrete Math
- Statistics, Probability
- Physics, Chemistry, Biology
- Management, Business Studies
- Economics, Accounts

FORMATTING RULES for description:
- Use bullet points (•) for list of presenters/speakers
- Use bullet points for topics to be covered
- Use bullet points for presentation requirements or guidelines
- Use bullet points for agenda items
- Keep venue, time, and general info as paragraphs
- Format presenters: "• Presenter Name 1\n• Presenter Name 2"
- Format topics: "• Topic A: Description\n• Topic B: Description"

Rules:
1. Extract the **title** → keep it short, clear (e.g., "Machine Learning Presentation", "Database Seminar").
2. Extract the **subject** → identify from common subjects above.
3. Extract the **description** → Format with bullet points for lists:
   - Presenters/speakers
   - Topics to be covered
   - Requirements or guidelines
   - Keep venue, time as paragraphs
4. Output strictly in JSON format:
{
  "title": "string",
  "subject": "string",
  "description": "string"
}

Example:
Input: "ML presentation by john and sarah on supervised learning algorithms, venue auditorium A, time 3pm"
Output: {
  "title": "Machine Learning Presentation",
  "subject": "Machine Learning", 
  "description": "Presenters:\n• John\n• Sarah\n\nTopics:\n• Supervised Learning Algorithms\n\nVenue: Auditorium A\nTime: 3:00 PM"
}

Content to analyze:
${rawContent}`;
  } else {
    // For general updates: Extract title and important details/action items with bullet points
    prompt = `You are a data extractor for a class updates system specializing in general announcements formatting.

FORMATTING RULES for description:
- Use bullet points (•) for lists of affected students, classes, or groups
- Use bullet points for multiple important points or announcements
- Use bullet points for rules or guidelines
- Use bullet points for event details (when multiple items)
- Keep single announcements as paragraphs
- Format affected groups: "• Group 1\n• Group 2\n• Group 3"
- Format rules: "• Rule 1\n• Rule 2\n• Rule 3"

Rules:
1. Extract the **title** → keep it short, clear (e.g., "Library Closure", "Attendance Notice").
2. For **subject** → use "General" as this is a general announcement.
3. Extract the **description** → Format with bullet points for lists:
   - Lists of affected students/groups
   - Multiple important points
   - Rules or guidelines
   - Keep single announcements as paragraphs
4. Output strictly in JSON format:
{
  "title": "string",
  "subject": "General",
  "description": "string"
}

Example:
Input: "Important notice for students: john, mary, david regarding attendance. Must maintain 75% attendance to avoid debarment"
Output: {
  "title": "Attendance Notice",
  "subject": "General",
  "description": "Important notice for students:\n• John\n• Mary\n• David\n\nMust maintain 75% attendance to avoid debarment from exams."
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
              subject: parsedResult.subject || null,
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
      subject: undefined, // No subject extracted in fallback
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
  subject?: string;
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
    subject: formatted.subject,
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
