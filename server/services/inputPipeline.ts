import {
  extractTextFromImage,
  extractTextFromPDF,
  extractTextFromDocx,
} from "./documentProcessing";
import { categorizeContent, formatContent } from "./ai";
import path from "path";

export type InputType = "text" | "image" | "pdf" | "docx";

export interface ProcessedAIResult {
  rawText: string;
  category: string;
  confidence: number;
  isUrgent: boolean;
  dueDate?: string;
  tags: string[];
  title: string;
  formattedContent: string;
}

export async function processInput(
  input: string,
  type: InputType
): Promise<ProcessedAIResult> {
  let text = input || "";

  try {
    if (type === "image") {
      text = await extractTextFromImage(input);
    } else if (type === "pdf") {
      text = await extractTextFromPDF(input);
    } else if (type === "docx") {
      text = await extractTextFromDocx(input);
    }
  } catch (error) {
    console.error(`Error processing ${type} input:`, error);
    text = input || ""; // Fallback to original input
  }

  // Ensure text is a string and clean it
  text = String(text || input || "New update");
  text = text
    .replace(/\s+/g, " ")
    .replace(
      /[\u263a-\u2764\u200d\u2640-\u2642\u2600-\u26FF\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDBFF\uDC00-\uDFFF]+/g,
      ""
    )
    .trim();

  // Ensure minimum text for AI processing
  if (text.length < 5) {
    text = "New update with attached files";
  }

  const categoryResult = await categorizeContent(text);
  const formatted = await formatContent(text, categoryResult);

  return {
    rawText: text,
    category: categoryResult.category,
    confidence: categoryResult.confidence,
    isUrgent: categoryResult.isUrgent,
    dueDate: categoryResult.dueDate,
    tags: categoryResult.tags,
    title: formatted.title,
    formattedContent: formatted.content,
  };
}
