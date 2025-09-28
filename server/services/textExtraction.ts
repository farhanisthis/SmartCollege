import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import fs from "fs";
import path from "path";
import { ocrSpaceService, type OcrSpaceResult } from "./ocrSpaceService";
import {
  attendanceTextParser,
  type AttendanceParseResult,
} from "./attendanceTextParser";

export interface ExtractedText {
  content: string;
  pages?: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    ocrStrategy?: string;
    ocrScore?: number;
    extractionType?: string;
  };
  attendanceData?: AttendanceParseResult;
}

export class TextExtractionService {
  /**
   * Extract text from PDF files
   */
  async extractFromPDF(filePath: string): Promise<ExtractedText> {
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);

      return {
        content: data.text,
        pages: data.numpages,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate,
        },
      };
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract text from PDF: ${message}`);
    }
  }

  /**
   * Extract text from DOCX files
   */
  async extractFromDOCX(filePath: string): Promise<ExtractedText> {
    try {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });

      return {
        content: result.value,
        metadata: {
          // mammoth doesn't provide metadata in the same way, but we can try to extract title from content
          title: this.extractTitleFromContent(result.value),
        },
      };
    } catch (error) {
      console.error("Error extracting text from DOCX:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract text from DOCX: ${message}`);
    }
  }

  /**
   * Extract text from images using OCR with multiple strategies for attendance sheets
   */
  async extractFromImage(filePath: string): Promise<ExtractedText> {
    console.log(
      `[OCR] Starting text extraction from: ${path.basename(filePath)}`
    );

    // Check if this looks like an attendance sheet
    const isAttendanceSheet = this.isAttendanceSheet(filePath);

    if (isAttendanceSheet) {
      return this.extractFromAttendanceSheet(filePath);
    } else {
      return this.extractFromGeneralImage(filePath);
    }
  }

  /**
   * Enhanced OCR extraction specifically for attendance sheets
   * MEMORY OPTIMIZED: Reduced from 6 strategies to 2 most effective ones
   */
  private async extractFromAttendanceSheet(
    filePath: string
  ): Promise<ExtractedText> {
    console.log(
      `[OCR] Using attendance-optimized extraction (memory optimized) for: ${path.basename(
        filePath
      )}`
    );

    // MEMORY OPTIMIZATION: Use only 2 most effective strategies instead of 6
    // This reduces memory usage by ~200MB per extraction
    const strategies = [
      {
        name: "OCR Space Engine 1",
        type: "ocrspace",
        config: {
          engine: 1 as const,
          isTable: true,
          detectOrientation: true,
          scale: true,
        },
      },
      {
        name: "Table Optimized",
        type: "tesseract",
        config: {
          logger: (_m: any) => {}, // Suppress tesseract logs
          psm: 6, // Single uniform block of vertically aligned text
          preserve_interword_spaces: "1",
          tessjs_create_pdf: "0",
          tessjs_create_hocr: "0",
        },
      },
    ];

    let bestResult = "";
    let bestScore = 0;
    let bestStrategy = "Unknown";

    for (const strategy of strategies) {
      try {
        console.log(`[OCR] Trying ${strategy.name} strategy...`);
        let text = "";

        if (strategy.type === "ocrspace") {
          // Use OCR Space API
          const result: OcrSpaceResult = await ocrSpaceService.extractText(
            filePath,
            strategy.config
          );
          if (result.success) {
            text = result.content;
            console.log(
              `[OCR] ${strategy.name}: ${text.length} chars, confidence: ${result.confidence}%`
            );
          } else {
            console.error(`[OCR] ${strategy.name} failed: ${result.error}`);
            continue;
          }
        } else {
          // Use Tesseract.js with memory optimization
          let worker;
          try {
            worker = await createWorker("eng");
            await worker.setParameters(strategy.config);

            const {
              data: { text: tesseractText },
            } = await worker.recognize(filePath);
            text = tesseractText;
          } finally {
            // MEMORY OPTIMIZATION: Always terminate worker immediately
            if (worker) {
              await worker.terminate();
              worker = null; // Help GC
            }
            // Force garbage collection if available
            if (global.gc) {
              global.gc();
            }
          }
        }

        // Score the result based on attendance sheet characteristics
        const score = this.scoreAttendanceText(text);
        console.log(
          `[OCR] ${strategy.name}: ${text.length} chars, score: ${score}`
        );

        if (
          score > bestScore ||
          (score === bestScore && text.length > bestResult.length)
        ) {
          bestResult = text;
          bestScore = score;
          bestStrategy = strategy.name;
        }
      } catch (error) {
        console.error(`[OCR] ${strategy.name} strategy failed:`, error);
      }
    }

    console.log(
      `[OCR] Best result from ${bestStrategy} strategy: ${bestResult.length} characters, score: ${bestScore}`
    );

    if (!bestResult || bestResult.trim().length === 0) {
      throw new Error("No text could be extracted from the attendance sheet");
    }

    // Parse the OCR text into structured attendance data using AI
    let attendanceData: AttendanceParseResult | undefined;
    try {
      console.log(`[AI] Parsing OCR text into structured attendance data...`);
      attendanceData = await attendanceTextParser.parseAttendanceText(
        bestResult
      );
      console.log(
        `[AI] Successfully parsed attendance data: ${
          attendanceData.success ? attendanceData.data?.length || 0 : 0
        } students found`
      );
    } catch (error) {
      console.error(`[AI] Failed to parse attendance data:`, error);
      // Continue without parsed data - raw OCR text is still available
    }

    return {
      content: bestResult,
      attendanceData,
      metadata: {
        title: this.extractTitleFromContent(bestResult),
        ocrStrategy: bestStrategy,
        ocrScore: bestScore,
        extractionType: "attendance-optimized",
      },
    };
  }

  /**
   * Standard OCR extraction for general images
   */
  private async extractFromGeneralImage(
    filePath: string
  ): Promise<ExtractedText> {
    let worker;
    try {
      console.log(
        `[OCR] Using general image extraction for: ${path.basename(filePath)}`
      );
      worker = await createWorker("eng");

      const {
        data: { text },
      } = await worker.recognize(filePath);

      return {
        content: text,
        metadata: {
          title: this.extractTitleFromContent(text),
          extractionType: "general",
        },
      };
    } catch (error) {
      console.error("Error extracting text from image:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract text from image: ${message}`);
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  }

  /**
   * Determine if an image is likely an attendance sheet
   */
  private isAttendanceSheet(filePath: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    const attendanceKeywords = [
      "attendance",
      "present",
      "absent",
      "roll",
      "student",
      "class",
      "roster",
      "register",
      "enroll",
      "screenshot",
    ];

    return attendanceKeywords.some((keyword) => fileName.includes(keyword));
  }

  /**
   * Score extracted text based on attendance sheet characteristics
   */
  private scoreAttendanceText(text: string): number {
    let score = 0;

    // Look for enrollment numbers (11 digits)
    const enrollmentNumbers = text.match(/\b\d{11}\b/g) || [];
    score += enrollmentNumbers.length * 10; // High weight for enrollment numbers

    // Look for student names (capitalized words)
    const capitalizedWords =
      text.match(/\b[A-Z][a-z]+(\s+[A-Z][a-z]+)*\b/g) || [];
    score += Math.min(capitalizedWords.length, 20) * 2; // Cap at 20 names

    // Look for attendance markers
    const attendanceMarkers = text.match(/\b[PAL]\b/g) || []; // Present, Absent, Late
    score += attendanceMarkers.length * 1;

    // Look for common attendance sheet headers
    const headers = ["name", "enroll", "roll", "student", "present", "absent"];
    headers.forEach((header) => {
      if (text.toLowerCase().includes(header)) {
        score += 5;
      }
    });

    // Penalty for very short text (likely failed extraction)
    if (text.length < 50) {
      score *= 0.5;
    }

    // Bonus for structured text (contains numbers and letters)
    const hasNumbers = /\d/.test(text);
    const hasLetters = /[a-zA-Z]/.test(text);
    if (hasNumbers && hasLetters) {
      score += 10;
    }

    return Math.round(score);
  }

  /**
   * Extract text from PowerPoint files (PPT/PPTX)
   * Note: For now, we'll treat PPT files as binary and try to extract what we can
   * A more robust solution would use a dedicated PPT parser
   */
  async extractFromPPT(filePath: string): Promise<ExtractedText> {
    try {
      // For PPT files, we'll return basic info and let the AI categorize based on filename
      const fileName = path.basename(filePath, path.extname(filePath));

      return {
        content: `PowerPoint presentation: ${fileName}`,
        metadata: {
          title: fileName,
        },
      };
    } catch (error) {
      console.error("Error processing PPT file:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process PPT file: ${message}`);
    }
  }

  /**
   * Main extraction method that determines file type and calls appropriate extractor
   */
  async extractText(filePath: string): Promise<ExtractedText> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".pdf":
        return this.extractFromPDF(filePath);
      case ".docx":
        return this.extractFromDOCX(filePath);
      case ".doc":
        // For older .doc files, we'll try DOCX extractor (may not work perfectly)
        return this.extractFromDOCX(filePath);
      case ".ppt":
      case ".pptx":
        return this.extractFromPPT(filePath);
      case ".jpg":
      case ".jpeg":
      case ".png":
      case ".bmp":
      case ".tiff":
      case ".gif":
        return this.extractFromImage(filePath);
      case ".txt":
        return this.extractFromText(filePath);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(filePath: string): Promise<ExtractedText> {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      return {
        content,
        metadata: {
          title: this.extractTitleFromContent(content),
        },
      };
    } catch (error) {
      console.error("Error reading text file:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read text file: ${message}`);
    }
  }

  /**
   * Attempt to extract a title from the content
   */
  private extractTitleFromContent(content: string): string {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    if (lines.length > 0) {
      // Take the first non-empty line as potential title
      const firstLine = lines[0].trim();

      // If it's reasonable length and not too long, use it as title
      if (firstLine.length > 3 && firstLine.length < 100) {
        return firstLine;
      }
    }

    return "Untitled Document";
  }

  /**
   * Extract text from multiple files and combine them
   */
  async extractFromMultipleFiles(filePaths: string[]): Promise<{
    combinedText: string;
    extractedTexts: Array<
      ExtractedText & { filePath: string; fileName: string }
    >;
  }> {
    const extractedTexts = [];
    let combinedText = "";

    for (const filePath of filePaths) {
      try {
        const extracted = await this.extractText(filePath);
        const fileName = path.basename(filePath);

        extractedTexts.push({
          ...extracted,
          filePath,
          fileName,
        });

        // Combine text with file name as header
        combinedText += `\n--- ${fileName} ---\n${extracted.content}\n`;
      } catch (error) {
        console.error(`Failed to extract text from ${filePath}:`, error);
        // Continue with other files even if one fails
        extractedTexts.push({
          content: `Failed to extract text from ${path.basename(filePath)}`,
          filePath,
          fileName: path.basename(filePath),
        });
      }
    }

    return {
      combinedText: combinedText.trim(),
      extractedTexts,
    };
  }

  /**
   * Check if a file type is supported for text extraction
   */
  static isSupportedFileType(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    const supportedTypes = [
      ".pdf",
      ".docx",
      ".doc",
      ".ppt",
      ".pptx",
      ".jpg",
      ".jpeg",
      ".png",
      ".bmp",
      ".tiff",
      ".gif",
      ".txt",
    ];
    return supportedTypes.includes(ext);
  }
}

// Create a singleton instance
export const textExtractionService = new TextExtractionService();
