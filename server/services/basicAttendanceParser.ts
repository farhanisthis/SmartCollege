import {
  ParsedAttendanceSheet,
  StudentAttendanceEntry,
} from "./attendanceProcessor";

// Simple fallback parser when AI is not available
export function parseAttendanceSheetBasic(
  extractedText: string,
  fileName: string
): ParsedAttendanceSheet {
  const lines = extractedText
    .split("\n")
    .filter((line) => line.trim().length > 0);

  const students: StudentAttendanceEntry[] = [];
  const detectedSubjects: string[] = [];

  // Common patterns to look for:
  // - Lines with enrollment numbers (like 001244...)
  // - Names followed by P/A or Present/Absent
  // - Roll number patterns

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip header lines
    if (
      trimmedLine.toLowerCase().includes("institute") ||
      trimmedLine.toLowerCase().includes("attendance") ||
      trimmedLine.toLowerCase().includes("subject") ||
      trimmedLine.length < 3
    ) {
      continue;
    }

    // Pattern 1: Enrollment number + Name + Status (like "00124402023 Mohammad Asad P A")
    const enrollmentPattern =
      /^(\d{8,15})\s+([A-Za-z\s\.]+?)\s*([PA]|Present|Absent)?\s*([PA]|Present|Absent)?\s*$/i;
    const enrollmentMatch = trimmedLine.match(enrollmentPattern);

    if (enrollmentMatch) {
      const [, enrollment, name, status1, status2] = enrollmentMatch;

      // For now, assume first subject found or default
      const defaultSubject = detectedSubjects[0] || "General";
      const studentStatus =
        status1?.toUpperCase().startsWith("P") ||
        status1?.toLowerCase() === "present"
          ? "present"
          : "absent";

      students.push({
        studentName: name.trim(),
        studentId: enrollment,
        rollNumber: enrollment,
        subjects: {
          [defaultSubject]: studentStatus,
        },
      });
      continue;
    }

    // Pattern 2: Name followed by status indicators
    const nameStatusPattern =
      /^([A-Za-z\s\.]{3,})\s*([PA]|Present|Absent)\s*([PA]|Present|Absent)?\s*$/i;
    const nameStatusMatch = trimmedLine.match(nameStatusPattern);

    if (nameStatusMatch) {
      const [, name, status1, status2] = nameStatusMatch;

      const defaultSubject = detectedSubjects[0] || "General";
      const studentStatus =
        status1.toUpperCase().startsWith("P") ||
        status1.toLowerCase() === "present"
          ? "present"
          : "absent";

      students.push({
        studentName: name.trim(),
        subjects: {
          [defaultSubject]: studentStatus,
        },
      });
      continue;
    }

    // Pattern 3: Just names with implicit presence (if no status specified, assume present)
    const nameOnlyPattern = /^[A-Za-z\s\.]{3,30}$/;
    if (nameOnlyPattern.test(trimmedLine)) {
      // Only add if it looks like a proper name (not random text)
      const words = trimmedLine.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        // 2-4 words is reasonable for a name
        const defaultSubject = detectedSubjects[0] || "General";

        students.push({
          studentName: trimmedLine,
          subjects: {
            [defaultSubject]: "present", // Default to present if no status specified
          },
        });
      }
    }
  }

  // Try to detect date from text
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const dateMatch = extractedText.match(datePattern);
  let detectedDate = new Date().toISOString().split("T")[0]; // Default to today

  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    detectedDate = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(
      2,
      "0"
    )}`;
  }

  // Try to detect subject from text
  const subjects = [
    "computer graphics",
    "operating system",
    "machine learning",
    "cloud computing",
    "database",
    "software engineering",
  ];

  const lowerText = extractedText.toLowerCase();
  for (const subject of subjects) {
    if (lowerText.includes(subject)) {
      const formattedSubject = subject
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      if (!detectedSubjects.includes(formattedSubject)) {
        detectedSubjects.push(formattedSubject);
      }
    }
  }

  // If no subjects detected, add a default one
  if (detectedSubjects.length === 0) {
    detectedSubjects.push("General");
  }

  return {
    date: detectedDate,
    classSection: "Unknown",
    students,
    subjects: detectedSubjects,
    metadata: {
      originalFileName: fileName,
      extractedText:
        extractedText.substring(0, 500) +
        (extractedText.length > 500 ? "..." : ""),
      processingNotes: [
        `Processed ${students.length} students using basic parser`,
        `Confidence: ${students.length > 0 ? "Medium" : "Low"}`,
      ],
    },
  };
}
