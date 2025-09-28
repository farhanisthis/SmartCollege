import { aiManager } from "../../services/aiManager";

export interface ParsedAttendanceEntry {
  enrollNo: string;
  name: string;
  subjects: Record<string, "P" | "A" | "L">; // Present, Absent, Late
}

export interface AttendanceParseResult {
  success: boolean;
  data?: ParsedAttendanceEntry[];
  error?: string;
  rawText?: string;
  confidence?: number;
}

export class AttendanceTextParser {
  /**
   * Parse raw OCR text into structured attendance JSON using AI
   */
  async parseAttendanceText(
    ocrText: string,
    contextHints?: {
      subjects?: string[];
      date?: string;
      className?: string;
    }
  ): Promise<AttendanceParseResult> {
    try {
      console.log(
        `[Attendance Parser] Processing ${ocrText.length} characters of OCR text`
      );

      // Create a detailed prompt for AI to convert OCR text to JSON
      const prompt = this.createParsingPrompt(ocrText, contextHints);

      // Use your existing AI manager to process the text (try all providers)
      const aiResult = await aiManager.generateWithFallback(prompt);

      if (!aiResult.success) {
        console.error(
          `[Attendance Parser] AI processing failed:`,
          aiResult.error
        );
        console.log(
          `[Attendance Parser] Falling back to regex-based parsing...`
        );

        // Fallback to regex-based parsing if AI fails
        const regexFallback = this.parseWithRegexFallback(ocrText);
        if (regexFallback.success) {
          return regexFallback;
        }

        return {
          success: false,
          error: `AI parsing failed: ${aiResult.error}. Regex fallback also failed.`,
          rawText: ocrText,
        };
      }

      // Parse the AI response
      const parsedData = this.parseAIResponse(aiResult.data || "");

      if (!parsedData.success) {
        return {
          success: false,
          error: parsedData.error,
          rawText: ocrText,
        };
      }

      console.log(
        `[Attendance Parser] Successfully parsed ${
          parsedData.data!.length
        } student records`
      );

      return {
        success: true,
        data: parsedData.data,
        rawText: ocrText,
        confidence: this.calculateConfidence(parsedData.data!, ocrText),
      };
    } catch (error) {
      console.error(`[Attendance Parser] Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        rawText: ocrText,
      };
    }
  }

  /**
   * Regex-based fallback parser when AI fails
   */
  private parseWithRegexFallback(ocrText: string): AttendanceParseResult {
    try {
      console.log(`[Regex Parser] Attempting regex-based parsing...`);

      const students: ParsedAttendanceEntry[] = [];

      // Pattern to match enrollment number and name
      const studentPattern = /(\d{11})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/g;
      const lines = ocrText.split("\n");

      for (const line of lines) {
        const match = studentPattern.exec(line);
        if (match) {
          const enrollNo = match[1];
          const name = match[2].trim();

          // Extract attendance markers (P, A, L) from the rest of the line
          const restOfLine = line.substring(match.index! + match[0].length);
          const attendanceMarkers = restOfLine.match(/\b[PAL]\b/g) || [];

          // Create subjects based on markers found
          const subjects: Record<string, "P" | "A" | "L"> = {};
          attendanceMarkers.forEach((marker, index) => {
            subjects[`Subject_${index + 1}`] = marker as "P" | "A" | "L";
          });

          students.push({
            enrollNo,
            name,
            subjects,
          });
        }
      }

      if (students.length > 0) {
        console.log(
          `[Regex Parser] Successfully parsed ${students.length} students`
        );
        return {
          success: true,
          data: students,
          confidence: 70, // Lower confidence for regex parsing
        };
      } else {
        console.log(`[Regex Parser] No valid student records found`);
        return {
          success: false,
          error: "No valid student records found in OCR text",
        };
      }
    } catch (error) {
      console.error(`[Regex Parser] Error:`, error);
      return {
        success: false,
        error: `Regex parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Create a detailed prompt for AI to parse attendance data
   */
  private createParsingPrompt(
    ocrText: string,
    contextHints?: {
      subjects?: string[];
      date?: string;
      className?: string;
    }
  ): string {
    const subjectsList = contextHints?.subjects || ["CC", "CG", "OS", "ML"];
    const dateInfo = contextHints?.date ? `Date: ${contextHints.date}` : "";
    const classInfo = contextHints?.className
      ? `Class: ${contextHints.className}`
      : "";

    return `You are an expert at parsing attendance sheets from OCR text. Convert the following OCR text into a structured JSON array of student attendance records.

IMPORTANT INSTRUCTIONS:
1. Extract enrollment numbers (11-digit numbers starting with 00, 01, etc.)
2. Extract student names (capitalize properly)
3. Parse attendance markers: P = Present, A = Absent, L = Late
4. Common subjects are: ${subjectsList.join(", ")}
5. Handle OCR errors gracefully (missing enrollment numbers, garbled text)
6. For missing enrollment numbers, use "MISSING" as placeholder
7. Return ONLY valid JSON array, no explanations

${dateInfo}
${classInfo}

OCR TEXT TO PARSE:
${ocrText}

Expected JSON format:
[
  {
    "enrollNo": "00124402023",
    "name": "Mohammad Asad",
    "CC": "P",
    "CG": "P"
  },
  {
    "enrollNo": "00224402023", 
    "name": "Shiven Sharma",
    "CC": "P",
    "CG": "A"
  }
]

Return ONLY the JSON array:`;
  }

  /**
   * Parse AI response and extract JSON data
   */
  private parseAIResponse(aiResponse: string): {
    success: boolean;
    data?: ParsedAttendanceEntry[];
    error?: string;
  } {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanResponse = aiResponse.trim();

      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = cleanResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[1].trim();
      }

      // Find JSON array in the response
      const arrayMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        cleanResponse = arrayMatch[0];
      }

      // Parse JSON
      const parsedArray = JSON.parse(cleanResponse);

      if (!Array.isArray(parsedArray)) {
        return {
          success: false,
          error: "AI response is not a JSON array",
        };
      }

      // Convert to our format and validate
      const attendanceEntries: ParsedAttendanceEntry[] = [];

      for (const entry of parsedArray) {
        if (!entry || typeof entry !== "object") {
          console.warn(`[Attendance Parser] Skipping invalid entry:`, entry);
          continue;
        }

        // Extract enrollment number
        const enrollNo = this.extractEnrollmentNumber(entry);

        // Extract name
        const name = this.extractName(entry);

        // Extract subjects
        const subjects = this.extractSubjects(entry);

        if (name && Object.keys(subjects).length > 0) {
          attendanceEntries.push({
            enrollNo,
            name,
            subjects,
          });
        }
      }

      return {
        success: true,
        data: attendanceEntries,
      };
    } catch (error) {
      console.error(`[Attendance Parser] JSON parsing error:`, error);
      return {
        success: false,
        error: `Failed to parse AI response as JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Extract enrollment number from entry
   */
  private extractEnrollmentNumber(entry: any): string {
    const possibleKeys = [
      "enrollNo",
      "Enroll No",
      "enrollment",
      "rollNo",
      "roll_no",
      "id",
      "studentId",
    ];

    for (const key of possibleKeys) {
      if (entry[key]) {
        const value = String(entry[key]).trim();
        // Validate enrollment number format (11 digits)
        if (/^\d{11}$/.test(value)) {
          return value;
        }
      }
    }

    // Check if any value looks like an enrollment number
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value === "string" || typeof value === "number") {
        const strValue = String(value).trim();
        if (/^\d{11}$/.test(strValue)) {
          return strValue;
        }
      }
    }

    return "MISSING"; // Placeholder for missing enrollment numbers
  }

  /**
   * Extract student name from entry
   */
  private extractName(entry: any): string {
    const possibleKeys = [
      "name",
      "Name",
      "student",
      "studentName",
      "student_name",
    ];

    for (const key of possibleKeys) {
      if (entry[key]) {
        const name = String(entry[key]).trim();
        if (name.length > 1) {
          // Clean up the name
          return this.cleanName(name);
        }
      }
    }

    return "Unknown Student";
  }

  /**
   * Extract subjects and attendance from entry
   */
  private extractSubjects(entry: any): Record<string, "P" | "A" | "L"> {
    const subjects: Record<string, "P" | "A" | "L"> = {};
    const knownSubjects = [
      "CC",
      "CG",
      "OS",
      "ML",
      "Computer Graphics",
      "Cloud Computing",
      "Operating Systems",
      "Machine Learning",
    ];

    for (const [key, value] of Object.entries(entry)) {
      // Skip enrollment and name fields
      if (
        [
          "enrollNo",
          "Enroll No",
          "enrollment",
          "rollNo",
          "name",
          "Name",
          "student",
          "studentName",
        ].includes(key)
      ) {
        continue;
      }

      // Check if this looks like a subject
      const isKnownSubject =
        knownSubjects.includes(key) ||
        knownSubjects.some((s) => s.toLowerCase().includes(key.toLowerCase()));

      if (isKnownSubject || key.length <= 3) {
        // Short codes are likely subjects
        const attendance = this.normalizeAttendance(value);
        if (attendance) {
          subjects[key] = attendance;
        }
      }
    }

    return subjects;
  }

  /**
   * Normalize attendance value to P/A/L
   */
  private normalizeAttendance(value: any): "P" | "A" | "L" | null {
    if (!value) return null;

    const strValue = String(value).trim().toUpperCase();

    if (strValue === "P" || strValue === "PRESENT" || strValue === "1") {
      return "P";
    }
    if (strValue === "A" || strValue === "ABSENT" || strValue === "0") {
      return "A";
    }
    if (strValue === "L" || strValue === "LATE" || strValue === "TARDY") {
      return "L";
    }

    return null;
  }

  /**
   * Clean up student name
   */
  private cleanName(name: string): string {
    return name
      .replace(/[^\w\s]/g, " ") // Remove special characters except spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim();
  }

  /**
   * Calculate confidence score for parsed data
   */
  private calculateConfidence(
    data: ParsedAttendanceEntry[],
    rawText: string
  ): number {
    let score = 0;

    // Base score for having data
    if (data.length > 0) {
      score += 30;
    }

    // Score for valid enrollment numbers
    const validEnrollments = data.filter(
      (entry) => entry.enrollNo !== "MISSING" && /^\d{11}$/.test(entry.enrollNo)
    ).length;
    score += Math.min(validEnrollments * 5, 40);

    // Score for meaningful names
    const meaningfulNames = data.filter(
      (entry) => entry.name !== "Unknown Student" && entry.name.length > 3
    ).length;
    score += Math.min(meaningfulNames * 3, 20);

    // Score for subject data
    const totalSubjectEntries = data.reduce(
      (sum, entry) => sum + Object.keys(entry.subjects).length,
      0
    );
    score += Math.min(totalSubjectEntries * 1, 10);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Test the parser with sample data
   */
  async testParser(): Promise<void> {
    const sampleText = `Enroll No Name [4 [9
00124402023 Mohammad Asad [J [3
00224402023 Shiven Sharma [J A
- SHIVANI VI) A [3
00424402023 TANYA SINHA [J [3
00524402023 Madhav Wadhwa [J [3`;

    console.log(`[Attendance Parser] Testing with sample data...`);
    const result = await this.parseAttendanceText(sampleText);

    if (result.success) {
      console.log(`[Attendance Parser] Test successful:`, result.data);
    } else {
      console.log(`[Attendance Parser] Test failed:`, result.error);
    }
  }
}

// Export singleton instance
export const attendanceTextParser = new AttendanceTextParser();
