import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import fs from "fs";
import path from "path";

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
  };
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
   * Extract text from images using OCR
   */
  async extractFromImage(filePath: string): Promise<ExtractedText> {
    let worker;
    try {
      worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(filePath);

      return {
        content: text,
        metadata: {
          title: this.extractTitleFromContent(text),
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
