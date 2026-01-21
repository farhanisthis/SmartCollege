import { aiManager } from "./aiManager";
import { UserModel } from "../models/mongodb";
import { parseAttendanceSheetBasic } from "./basicAttendanceParser";

export interface StudentAttendanceEntry {
  studentName: string;
  studentId?: string;
  rollNumber?: string;
  subjects: {
    [subjectName: string]: "present" | "absent" | "late";
  };
}

export interface ParsedAttendanceSheet {
  date: string;
  classSection: string;
  students: StudentAttendanceEntry[];
  subjects: string[];
  markedBy?: string;
  metadata?: {
    originalFileName: string;
    extractedText: string;
    processingNotes: string[];
  };
}

export interface ProcessingResult {
  success: boolean;
  data?: ParsedAttendanceSheet;
  error?: string;
  warnings?: string[];
}

/**
 * Convert Gemini-style attendance format to our expected format
 */
function convertAttendanceFormat(data: any): any {
  // Check if data has attendance_records (new format)
  if (data.attendance_records && Array.isArray(data.attendance_records)) {
    console.log(
      `[AttendanceProcessor] Converting from Gemini format with ${data.attendance_records.length} records`
    );

    const subjects = ["Cloud Computing", "Computer Graphics"]; // Default subjects for CC and CG

    const students = data.attendance_records.map((record: any) => {
      const studentSubjects: Record<string, string> = {};

      // Convert CC attendance
      if (record.cc_attendance) {
        studentSubjects["Cloud Computing"] =
          record.cc_attendance === "P" ? "present" : "absent";
      }

      // Convert CG attendance
      if (record.cg_attendance) {
        studentSubjects["Computer Graphics"] =
          record.cg_attendance === "P" ? "present" : "absent";
      }

      return {
        studentName: record.name || "Unknown Student",
        rollNumber:
          record.enroll_no && record.enroll_no !== "—"
            ? record.enroll_no
            : undefined,
        studentId:
          record.enroll_no && record.enroll_no !== "—"
            ? record.enroll_no
            : undefined,
        subjects: studentSubjects,
      };
    });

    return {
      date: new Date().toISOString().split("T")[0], // Current date
      classSection: "E1", // Default section
      subjects: subjects,
      students: students,
      processingNotes: ["Converted from Gemini attendance_records format"],
    };
  }

  // Return as-is if already in expected format
  return data;
}

/**
 * Process attendance sheet using AI to extract structured data
 */
export async function processAttendanceSheet(
  extractedText: string,
  fileName: string,
  date?: string
): Promise<ProcessingResult> {
  try {
    console.log(`[AttendanceProcessor] Processing sheet: ${fileName}`);
    console.log(`[AttendanceProcessor] Text length: ${extractedText.length}`);
    console.log(
      `[AttendanceProcessor] Extracted text preview: ${extractedText.substring(
        0,
        500
      )}...`
    );

    if (!extractedText || extractedText.trim().length < 10) {
      return {
        success: false,
        error: "Insufficient text content extracted from the attendance sheet",
      };
    }

    // Create AI prompt for attendance parsing (optimized for HuggingFace API)
    const prompt = `Extract attendance data from this text and return ONLY JSON in this exact format:

ATTENDANCE TEXT:
${extractedText}

REQUIRED JSON OUTPUT (no other text):
{
  "attendance_records": [
    {
      "enroll_no": "student enrollment number",
      "name": "student full name", 
      "cc_attendance": "P or A",
      "cg_attendance": "P or A"
    }
  ]
}

RULES:
- Find enrollment numbers (like 00124402023, 00224402023, etc.)
- Extract student names exactly as written
- Find CC (Cloud Computing) attendance: P=Present, A=Absent
- Find CG (Computer Graphics) attendance: P=Present, A=Absent  
- If enrollment number is unclear, use "—"
- If attendance is unclear, mark as "A"
- Return ONLY the JSON, no explanation text

ATTENDANCE SHEET TEXT TO PARSE:
${extractedText}`;

    // Get AI response (prefer Gemini since it works well for structured output)
    const aiResult = await aiManager.generateWithFallback(prompt, "gemini");

    if (!aiResult.success || !aiResult.data) {
      console.log(
        `[AttendanceProcessor] AI failed, using basic parser fallback`
      );

      // Use basic parser as fallback
      const basicResult = parseAttendanceSheetBasic(extractedText, fileName);

      return {
        success: true,
        data: basicResult,
        warnings: [
          `AI processing failed: ${aiResult.error || "No response data"}`,
          "Used basic parser as fallback",
        ],
      };
    }

    const aiResponse = aiResult.data;
    console.log(
      `[AttendanceProcessor] AI Response: ${aiResponse.substring(0, 200)}...`
    );

    // Parse AI response as JSON
    let parsedData;
    try {
      // Clean the response to extract JSON
      const cleanedResponse = aiResponse.trim();
      const jsonStart = cleanedResponse.indexOf("{");
      const jsonEnd = cleanedResponse.lastIndexOf("}") + 1;

      if (jsonStart === -1 || jsonEnd <= jsonStart) {
        throw new Error("No JSON found in AI response");
      }

      const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
      const rawParsedData = JSON.parse(jsonString);

      // Convert new Gemini-style format to our expected format
      parsedData = convertAttendanceFormat(rawParsedData);

      console.log(`[AttendanceProcessor] Parsed data:`, {
        studentsCount: parsedData.students?.length || 0,
        subjectsCount: parsedData.subjects?.length || 0,
        date: parsedData.date,
      });
    } catch (parseError) {
      console.error(`[AttendanceProcessor] JSON Parse Error:`, parseError);
      console.log(
        `[AttendanceProcessor] AI response parsing failed, using basic parser fallback`
      );

      // Use basic parser as fallback when JSON parsing fails
      const basicResult = parseAttendanceSheetBasic(extractedText, fileName);

      return {
        success: true,
        data: basicResult,
        warnings: [
          `Failed to parse AI response: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`,
          "Used basic parser as fallback",
        ],
      };
    }

    // Validate parsed data
    const validation = validateParsedData(parsedData);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid parsed data: ${validation.errors.join(", ")}`,
      };
    }

    // Apply data normalization and cleanup
    const normalizedData = normalizeAttendanceData(parsedData, date);

    const result: ParsedAttendanceSheet = {
      date: normalizedData.date,
      classSection: normalizedData.classSection || "E1",
      subjects: normalizedData.subjects || [],
      students: normalizedData.students || [],
      metadata: {
        originalFileName: fileName,
        extractedText: extractedText.substring(0, 1000), // First 1000 chars for reference
        processingNotes: normalizedData.processingNotes || [],
      },
    };

    return {
      success: true,
      data: result,
      warnings: validation.warnings,
    };
  } catch (error) {
    console.error(`[AttendanceProcessor] Processing failed:`, error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown processing error",
    };
  }
}

/**
 * Validate parsed attendance data structure
 */
function validateParsedData(data: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Data must be an object");
    return { isValid: false, errors, warnings };
  }

  // Check required fields
  if (!data.students || !Array.isArray(data.students)) {
    errors.push("Students array is required");
  } else if (data.students.length === 0) {
    warnings.push("No students found in attendance sheet");
  }

  if (!data.subjects || !Array.isArray(data.subjects)) {
    errors.push("Subjects array is required");
  } else if (data.subjects.length === 0) {
    warnings.push("No subjects found in attendance sheet");
  }

  if (!data.date || typeof data.date !== "string") {
    warnings.push("Date not found, will use current date");
  }

  // Validate students structure
  if (data.students && Array.isArray(data.students)) {
    data.students.forEach((student: any, index: number) => {
      if (!student.studentName || typeof student.studentName !== "string") {
        errors.push(`Student ${index + 1}: Missing or invalid student name`);
      }

      if (!student.subjects || typeof student.subjects !== "object") {
        errors.push(`Student ${index + 1}: Missing subjects data`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Normalize and clean parsed attendance data
 */
function normalizeAttendanceData(data: any, dateOverride?: string): any {
  const normalized = { ...data };
  const processingNotes: string[] = [...(data.processingNotes || [])];

  // Normalize date
  if (dateOverride) {
    normalized.date = dateOverride;
    processingNotes.push(`Date override applied: ${dateOverride}`);
  } else if (!data.date) {
    normalized.date = new Date().toISOString().split("T")[0];
    processingNotes.push("Date not found in sheet, using current date");
  }

  // Normalize class section
  if (!normalized.classSection) {
    normalized.classSection = "E1";
    processingNotes.push("Class section defaulted to E1");
  }

  // Subject name mapping
  const subjectMapping: Record<string, string> = {
    CG: "Computer Graphics",
    OS: "Operating Systems",
    CC: "Cloud Computing",
    ML: "Machine Learning",
    LINUX: "Linux Lab 4",
    CGLAB: "CG Lab 4",
    MLLAB: "ML Lab 4",
  };

  // Normalize subjects
  if (normalized.subjects) {
    normalized.subjects = normalized.subjects.map((subject: string) => {
      const upperSubject = subject.toUpperCase().replace(/\s+/g, "");
      return subjectMapping[upperSubject] || subject;
    });
  }

  // Normalize students
  if (normalized.students) {
    normalized.students = normalized.students.map((student: any) => {
      const normalizedStudent = { ...student };

      // Clean student name
      if (normalizedStudent.studentName) {
        normalizedStudent.studentName = normalizedStudent.studentName.trim();
      }

      // Normalize attendance statuses
      if (normalizedStudent.subjects) {
        const normalizedSubjects: Record<string, string> = {};

        Object.entries(normalizedStudent.subjects).forEach(
          ([subject, status]: [string, any]) => {
            const normalizedSubject =
              subjectMapping[subject.toUpperCase().replace(/\s+/g, "")] ||
              subject;
            let normalizedStatus = "absent"; // default

            if (typeof status === "string") {
              const statusLower = status.toLowerCase().trim();
              if (
                statusLower === "present" ||
                statusLower === "p" ||
                statusLower === "✓" ||
                statusLower === "1"
              ) {
                normalizedStatus = "present";
              } else if (statusLower === "late" || statusLower === "l") {
                normalizedStatus = "late";
              } else if (
                statusLower === "absent" ||
                statusLower === "a" ||
                statusLower === "✗" ||
                statusLower === "0"
              ) {
                normalizedStatus = "absent";
              }
            }

            normalizedSubjects[normalizedSubject] = normalizedStatus;
          }
        );

        normalizedStudent.subjects = normalizedSubjects;
      }

      return normalizedStudent;
    });
  }

  normalized.processingNotes = processingNotes;
  return normalized;
}

/**
 * Match student names to existing database records
 */
export async function matchStudentsToDatabase(
  students: StudentAttendanceEntry[]
): Promise<StudentAttendanceEntry[]> {
  try {
    // Get all students from database
    const dbStudents = await UserModel.find({
      role: "student",
      class: "E1",
    }).select("_id name username");

    console.log(
      `[AttendanceProcessor] Found ${dbStudents.length} students in database`
    );

    const matchedStudents = students.map((student) => {
      // Try to find matching student in database
      const match = dbStudents.find((dbStudent) => {
        const studentNameLower = student.studentName.toLowerCase().trim();
        const dbNameLower = dbStudent.name.toLowerCase().trim();

        // Check exact name match
        if (studentNameLower === dbNameLower) {
          return true;
        }

        // Check if roll number matches username
        if (
          student.rollNumber &&
          dbStudent.username.includes(student.rollNumber)
        ) {
          return true;
        }

        // Check partial name match (useful for "Last, First" vs "First Last" formats)
        const studentNameParts = studentNameLower
          .split(/[,\s]+/)
          .filter((p) => p.length > 1);
        const dbNameParts = dbNameLower
          .split(/\s+/)
          .filter((p) => p.length > 1);

        if (studentNameParts.length >= 2 && dbNameParts.length >= 2) {
          const commonParts = studentNameParts.filter((part) =>
            dbNameParts.some(
              (dbPart) => dbPart.includes(part) || part.includes(dbPart)
            )
          );
          if (commonParts.length >= 2) {
            return true;
          }
        }

        return false;
      });

      if (match) {
        console.log(
          `[AttendanceProcessor] Matched "${student.studentName}" to DB student "${match.name}" (${match._id})`
        );
        return {
          ...student,
          studentId: match._id,
          studentName: match.name, // Use DB name for consistency
        };
      } else {
        console.log(
          `[AttendanceProcessor] No match found for "${student.studentName}"`
        );
        return student;
      }
    });

    return matchedStudents;
  } catch (error) {
    console.error(`[AttendanceProcessor] Database matching failed:`, error);
    return students; // Return original data if matching fails
  }
}
