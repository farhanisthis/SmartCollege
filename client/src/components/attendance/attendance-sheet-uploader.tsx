import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Type,
} from "lucide-react";

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    attendanceId: string;
    date: string;
    studentsProcessed: number;
    studentsMatched: number;
    studentsUnmatched: number;
    subjectsFound: string[];
    processingNotes: string[];
  };
  warnings?: string[];
  unmatchedStudents?: Array<{
    name: string;
    rollNumber?: string;
  }>;
  error?: string;
}

interface AttendanceSheetUploaderProps {
  onUploadComplete?: (result: UploadResponse) => void;
}

export const AttendanceSheetUploader: React.FC<
  AttendanceSheetUploaderProps
> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attendanceText, setAttendanceText] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inputMethod, setInputMethod] = useState<"file" | "text">("file");

  // Supported file types
  const supportedTypes = [
    ".jpg",
    ".jpeg",
    ".png", // Images
    ".pdf", // PDF
    ".xlsx",
    ".xls", // Excel
    ".csv", // CSV
    ".docx", // Word
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleUpload = async () => {
    if (inputMethod === "file" && !selectedFile) {
      alert("Please select an attendance sheet file first");
      return;
    }

    if (inputMethod === "text" && !attendanceText.trim()) {
      alert("Please paste attendance text");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      let response: Response;

      if (inputMethod === "file" && selectedFile) {
        // File upload method
        const formData = new FormData();
        formData.append("attendanceSheet", selectedFile);
        formData.append("overrideDate", selectedDate);

        response = await fetch("/api/attendance/upload-sheet", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      } else {
        // Text input method
        response = await fetch("/api/attendance/upload-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attendanceText: attendanceText.trim(),
            overrideDate: selectedDate,
          }),
          credentials: "include",
        });
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const result: UploadResponse = await response.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadResult(result);

      if (result.success && onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadResult({
        success: false,
        message: "Upload failed",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setAttendanceText("");
    setUploadResult(null);
    setUploadProgress(0);

    // Reset file input
    const fileInput = document.getElementById(
      "attendance-file"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          AI Attendance Sheet Processor
        </CardTitle>
        <CardDescription>
          Upload attendance sheet (Excel, CSV, PDF, Image, or Word) and AI will
          automatically extract attendance and save it to the database
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label htmlFor="attendance-date">Attendance Date</Label>
          <Input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="max-w-xs"
          />
        </div>

        {/* Input Method Tabs */}
        <Tabs
          defaultValue="file"
          value={inputMethod}
          onValueChange={(value) => {
            setInputMethod(value as "file" | "text");
            setUploadResult(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Choose File
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attendance-file">Attendance Sheet File</Label>
              <Input
                id="attendance-file"
                type="file"
                onChange={handleFileSelect}
                accept={supportedTypes.join(",")}
                disabled={isUploading}
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: {supportedTypes.join(", ")}
              </p>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Size: {formatFileSize(selectedFile.size)}</p>
                    <p>Type: {selectedFile.type || "Unknown"}</p>
                    <p>Date: {selectedDate}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Text Input Tab */}
          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attendance-text">
                Attendance Data (Paste Text)
              </Label>
              <Textarea
                id="attendance-text"
                value={attendanceText}
                onChange={(e) => setAttendanceText(e.target.value)}
                placeholder="Paste your attendance text here...&#10;&#10;Example format:&#10;00124402023 Mohammad Asad CC: P, CG: P&#10;00224402023 Shiven Sharma CC: P, CG: A&#10;00324402023 Shivam Vij CC: A, CG: P"
                className="min-h-[200px] font-mono text-sm"
                disabled={isUploading}
              />
              <p className="text-sm text-muted-foreground">
                Paste attendance text containing student names, enrollment
                numbers, and attendance status
              </p>
            </div>

            {/* Text Info */}
            {attendanceText.trim() && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Type className="h-4 w-4" />
                    <span className="font-medium">Text Input Preview</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Characters: {attendanceText.length}</p>
                    <p>
                      Lines:{" "}
                      {
                        attendanceText.split("\n").filter((line) => line.trim())
                          .length
                      }
                    </p>
                    <p>Date: {selectedDate}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing attendance sheet...</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              AI is extracting and processing attendance data...
            </p>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert
            className={
              uploadResult.success
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }
          >
            <div className="flex items-center gap-2">
              {uploadResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="font-medium">
                {uploadResult.message}
              </AlertDescription>
            </div>

            {/* Success Details */}
            {uploadResult.success && uploadResult.data && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {uploadResult.data.date}
                  </div>
                  <div>
                    <span className="font-medium">Students:</span>{" "}
                    {uploadResult.data.studentsMatched}/
                    {uploadResult.data.studentsProcessed}
                  </div>
                </div>

                {uploadResult.data.subjectsFound.length > 0 && (
                  <div>
                    <span className="font-medium text-sm">Subjects Found:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {uploadResult.data.subjectsFound.map((subject, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResult.data.processingNotes.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <details>
                      <summary className="cursor-pointer">
                        Processing Notes
                      </summary>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {uploadResult.data.processingNotes.map(
                          (note, index) => (
                            <li key={index}>{note}</li>
                          )
                        )}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            )}

            {/* Warnings */}
            {uploadResult.warnings && uploadResult.warnings.length > 0 && (
              <div className="mt-3">
                <span className="font-medium text-sm text-amber-600">
                  Warnings:
                </span>
                <ul className="text-sm text-amber-700 list-disc list-inside mt-1">
                  {uploadResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unmatched Students */}
            {uploadResult.unmatchedStudents &&
              uploadResult.unmatchedStudents.length > 0 && (
                <div className="mt-3">
                  <span className="font-medium text-sm text-amber-600">
                    Unmatched Students ({uploadResult.unmatchedStudents.length}
                    ):
                  </span>
                  <div className="text-sm text-amber-700 mt-1">
                    {uploadResult.unmatchedStudents
                      .slice(0, 5)
                      .map((student, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span>{student.name}</span>
                          {student.rollNumber && (
                            <Badge variant="outline" className="text-xs">
                              {student.rollNumber}
                            </Badge>
                          )}
                        </div>
                      ))}
                    {uploadResult.unmatchedStudents.length > 5 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        and {uploadResult.unmatchedStudents.length - 5}{" "}
                        students...
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Error Details */}
            {!uploadResult.success && uploadResult.error && (
              <div className="mt-3 text-sm text-red-700">
                <span className="font-medium">Error:</span> {uploadResult.error}
              </div>
            )}
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleUpload}
            disabled={
              (inputMethod === "file" && !selectedFile) ||
              (inputMethod === "text" && !attendanceText.trim()) ||
              isUploading
            }
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {inputMethod === "file" ? (
                  <Upload className="mr-2 h-4 w-4" />
                ) : (
                  <Type className="mr-2 h-4 w-4" />
                )}
                Process Attendance {inputMethod === "file" ? "Sheet" : "Text"}
              </>
            )}
          </Button>

          {((inputMethod === "file" && selectedFile) ||
            (inputMethod === "text" && attendanceText.trim()) ||
            uploadResult) && (
            <Button
              variant="outline"
              onClick={resetUpload}
              disabled={isUploading}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
            {inputMethod === "file" ? (
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  Student names and attendance status must be clearly visible in
                  the uploaded attendance sheet
                </li>
                <li>
                  AI will automatically detect student names, subjects, and
                  present/absent status
                </li>
                <li>Students will be automatically matched with the database</li>
                <li>
                  Supported formats: Excel (.xlsx, .xls), CSV, PDF, Images (JPG,
                  PNG), Word (.docx)
                </li>
                <li>
                  Processing may take 1-2 minutes depending on file size
                </li>
              </ul>
            ) : (
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  Paste attendance text containing student names, enrollment
                  numbers, and status
                </li>
                <li>
                  Format examples: "00124402023 Mohammad Asad CC: P, CG: P" or
                  "Mohammad Asad - Present" or table format
                </li>
                <li>
                  AI will automatically parse student names, enrollment numbers,
                  subjects, and attendance status
                </li>
                <li>Use P/Present for present and A/Absent for absent</li>
                <li>
                  Multiple subjects can be specified: "CC: P, CG: A, OS: P"
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
