import Tesseract from "tesseract.js";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import fs from "fs";

export async function extractTextFromImage(
  imagePathOrBase64: string
): Promise<string> {
  try {
    // Check if it's a base64 string or file path
    if (
      imagePathOrBase64.length > 500 &&
      !imagePathOrBase64.includes("/") &&
      !imagePathOrBase64.includes("\\")
    ) {
      // Looks like base64 data, create a temporary buffer
      const buffer = Buffer.from(imagePathOrBase64, "base64");
      const result = await Tesseract.recognize(buffer, "eng");
      return result.data.text || "";
    } else {
      // Treat as file path
      if (!fs.existsSync(imagePathOrBase64)) {
        throw new Error(`Image file does not exist: ${imagePathOrBase64}`);
      }
      const result = await Tesseract.recognize(imagePathOrBase64, "eng");
      return result.data.text || "";
    }
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return ""; // Return empty string instead of throwing
  }
}

export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file does not exist: ${pdfPath}`);
    }
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text || "";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return ""; // Return empty string instead of throwing
  }
}

export async function extractTextFromDocx(docxPath: string): Promise<string> {
  try {
    if (!fs.existsSync(docxPath)) {
      throw new Error(`DOCX file does not exist: ${docxPath}`);
    }
    const data = await mammoth.extractRawText({ path: docxPath });
    return data.value || "";
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    return ""; // Return empty string instead of throwing
  }
}
