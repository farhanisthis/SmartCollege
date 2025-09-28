import fs from "fs";
import path from "path";

export interface OcrSpaceResult {
  success: boolean;
  content: string;
  confidence: number;
  processingTime: number;
  engineUsed: number;
  error?: string;
}

export class OcrSpaceService {
  private apiKey: string;
  private baseUrl = "https://api.ocr.space/parse/image";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Extract text from image using OCR Space API with Base64 encoding
   */
  async extractText(
    filePath: string,
    options: {
      language?: string;
      engine?: 1 | 2;
      isTable?: boolean;
      detectOrientation?: boolean;
      scale?: boolean;
    } = {}
  ): Promise<OcrSpaceResult> {
    const startTime = Date.now();

    try {
      console.log(`[OCR Space] Processing: ${path.basename(filePath)}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      console.log(`[OCR Space] File size: ${stats.size} bytes`);

      // Check file size limit (1MB for free tier)
      if (stats.size > 1024 * 1024) {
        console.warn(
          `[OCR Space] File size exceeds 1MB limit: ${stats.size} bytes`
        );
      }

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const fileExt = path.extname(filePath).toLowerCase();
      let mimeType = "image/jpeg"; // Default

      switch (fileExt) {
        case ".png":
          mimeType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          mimeType = "image/jpeg";
          break;
        case ".gif":
          mimeType = "image/gif";
          break;
        case ".bmp":
          mimeType = "image/bmp";
          break;
        case ".tiff":
        case ".tif":
          mimeType = "image/tiff";
          break;
      }

      const base64Image = `data:${mimeType};base64,${fileBuffer.toString(
        "base64"
      )}`;

      return this.extractTextFromBase64(base64Image, options);
    } catch (error) {
      console.error(`[OCR Space] Error:`, error);
      return {
        success: false,
        content: "",
        confidence: 0,
        processingTime: Date.now() - startTime,
        engineUsed: options.engine || 2,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract text using base64 encoding
   */
  async extractTextFromBase64(
    base64Image: string,
    options: {
      language?: string;
      engine?: 1 | 2;
      isTable?: boolean;
      detectOrientation?: boolean;
      scale?: boolean;
    } = {}
  ): Promise<OcrSpaceResult> {
    const startTime = Date.now();

    try {
      console.log(`[OCR Space] Processing base64 image`);

      // Prepare URL-encoded form data
      const formParams = new URLSearchParams();
      formParams.append("base64Image", base64Image);
      formParams.append("language", options.language || "eng");
      formParams.append("OCREngine", String(options.engine || 2)); // Engine 2 is better for complex images
      formParams.append("isTable", options.isTable ? "true" : "false");
      formParams.append(
        "detectOrientation",
        options.detectOrientation ? "true" : "false"
      );
      formParams.append("scale", options.scale ? "true" : "false");
      formParams.append("isOverlayRequired", "false"); // We don't need overlay for text extraction

      // Make API request
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: this.apiKey,
        },
        body: formParams.toString(),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(
          `OCR Space API error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log(
        `[OCR Space] API Response - Exit Code: ${result.OCRExitCode}`
      );

      return this.parseOcrSpaceResponse(
        result,
        processingTime,
        options.engine || 2
      );
    } catch (error) {
      console.error(`[OCR Space] Base64 Error:`, error);
      return {
        success: false,
        content: "",
        confidence: 0,
        processingTime: Date.now() - startTime,
        engineUsed: options.engine || 2,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse OCR Space API response
   */
  private parseOcrSpaceResponse(
    response: any,
    processingTime: number,
    engineUsed: number
  ): OcrSpaceResult {
    try {
      // Check for API-level errors
      if (response.OCRExitCode === 3 || response.OCRExitCode === 4) {
        return {
          success: false,
          content: "",
          confidence: 0,
          processingTime,
          engineUsed,
          error: response.ErrorMessage || "OCR processing failed",
        };
      }

      // Check if we have parsed results
      if (!response.ParsedResults || response.ParsedResults.length === 0) {
        return {
          success: false,
          content: "",
          confidence: 0,
          processingTime,
          engineUsed,
          error: "No parsed results returned",
        };
      }

      // Get the first parsed result
      const firstResult = response.ParsedResults[0];

      // Check for file-level errors
      if (firstResult.FileParseExitCode !== 1) {
        return {
          success: false,
          content: "",
          confidence: 0,
          processingTime,
          engineUsed,
          error:
            firstResult.ErrorMessage ||
            `Parse error: ${firstResult.FileParseExitCode}`,
        };
      }

      // Extract text content
      const content = firstResult.ParsedText || "";

      // Calculate confidence based on text length and structure
      const confidence = this.calculateConfidence(
        content,
        response.OCRExitCode
      );

      console.log(
        `[OCR Space] Successfully extracted ${content.length} characters`
      );

      return {
        success: true,
        content: content.trim(),
        confidence,
        processingTime,
        engineUsed,
      };
    } catch (error) {
      return {
        success: false,
        content: "",
        confidence: 0,
        processingTime,
        engineUsed,
        error: `Failed to parse OCR response: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Calculate confidence score based on extracted content
   */
  private calculateConfidence(content: string, exitCode: number): number {
    let confidence = 0;

    // Base confidence from exit code
    switch (exitCode) {
      case 1: // Parsed successfully
        confidence = 90;
        break;
      case 2: // Parsed partially
        confidence = 60;
        break;
      default:
        confidence = 30;
    }

    // Adjust based on content quality
    if (content.length > 100) {
      confidence += 5;
    }

    // Check for structured content (numbers and letters)
    const hasNumbers = /\d/.test(content);
    const hasLetters = /[a-zA-Z]/.test(content);
    if (hasNumbers && hasLetters) {
      confidence += 5;
    }

    // Check for attendance-specific patterns
    const enrollmentNumbers = content.match(/\b\d{11}\b/g) || [];
    if (enrollmentNumbers.length > 0) {
      confidence += 10;
    }

    const studentNames =
      content.match(/\b[A-Z][a-z]+(\s+[A-Z][a-z]+)*\b/g) || [];
    if (studentNames.length > 2) {
      confidence += 10;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Test OCR Space API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Use the GET endpoint for quick testing
      const testUrl = `https://api.ocr.space/parse/imageurl?apikey=${this.apiKey}&url=https://dl.a9t9.com/ocr/solarcell.jpg`;

      const response = await fetch(testUrl);

      if (!response.ok) {
        return {
          success: false,
          error: `API test failed: ${response.status} ${response.statusText}`,
        };
      }

      const result = await response.json();

      if (result.OCRExitCode === 1) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.ErrorMessage || "OCR test failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export a singleton instance
export const ocrSpaceService = new OcrSpaceService(
  process.env.OCR_SPACE_API_KEY || ""
);
