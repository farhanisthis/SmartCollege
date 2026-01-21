
import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";

const IMAGE_PATH = "C:/Users/Farhan/.gemini/antigravity/brain/c1d1ecfc-0948-422e-88fb-6b8c0fcadcdd/uploaded_image_1768978666674.png";

async function extractData() {
  try {
    console.log(`Reading image from: ${IMAGE_PATH}`);
    if (!fs.existsSync(IMAGE_PATH)) {
        throw new Error("Image file not found");
    }

    console.log("Starting Tesseract OCR...");
    const result = await Tesseract.recognize(
      IMAGE_PATH,
      'eng',
      { logger: m => console.log(m.status + ' ' + (m.progress * 100).toFixed(0) + '%') }
    );

    const text = result.data.text;
    console.log("Extracted Raw Text:");
    console.log(text);

    // Parse the text
    // Looking for patterns like "Name Enrollment" or similar
    // Based on the image description, it's a list.
    // We'll try to find lines with 11 digit numbers.
    
    // Save raw text to file for debugging
    const rawTextPath = path.join(path.dirname(IMAGE_PATH), "raw_ocr_text.txt");
    fs.writeFileSync(rawTextPath, text);
    console.log(`Saved raw text to ${rawTextPath}`);

    const lines = text.split('\n');
    const students = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Regex for enrollment number (11 digits)
        const enrollmentMatch = trimmed.match(/\b\d{11}\b/);
        if (enrollmentMatch) {
            const enrollment = enrollmentMatch[0];
            // Name is usually the rest of the string, need to be careful
            // Example: "John Doe 00124402023" or "00124402023 John Doe"
            
            let name = trimmed.replace(enrollment, "").trim();
            
            // Clean up name (remove special chars, extra spaces)
            name = name.replace(/[^\w\s.]/g, "").trim();
            
            if (name.length > 2) {
                students.push({
                    name: name,
                    enrollment: enrollment
                });
            }
        }
    }

    console.log("Parsed Students:");
    console.log(JSON.stringify(students, null, 2));
    
    // Save to a temp file for the seed script to read
    const outputPath = path.join(path.dirname(IMAGE_PATH), "extracted_students.json");
    fs.writeFileSync(outputPath, JSON.stringify(students, null, 2));
    console.log(`Saved extracted data to ${outputPath}`);

  } catch (error) {
    console.error("Error extracting data:", error);
  }
}

extractData();
