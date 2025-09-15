import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedUploadProps {
  onSubmit: (data: { contextText: string; files: File[] }) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

export function UnifiedUpload({
  onSubmit,
  isLoading = false,
  disabled = false,
}: UnifiedUploadProps) {
  const [contextText, setContextText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFileTypes = [
    ".pdf",
    ".doc",
    ".docx",
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

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const maxFiles = 10;

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!supportedFileTypes.includes(ext)) {
      return `Unsupported file type: ${ext}. Supported types: ${supportedFileTypes.join(
        ", "
      )}`;
    }

    if (file.size > maxFileSize) {
      return `File too large: ${file.name}. Maximum size is 50MB.`;
    }

    return null;
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      if (uploadedFiles.length + fileArray.length > maxFiles) {
        alert(`Too many files. Maximum ${maxFiles} files allowed.`);
        return;
      }

      const validFiles: UploadedFile[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          const uploadedFile: UploadedFile = {
            file,
            id: generateFileId(),
          };

          // Generate preview for images
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id
                    ? { ...f, preview: e.target?.result as string }
                    : f
                )
              );
            };
            reader.readAsDataURL(file);
          }

          validFiles.push(uploadedFile);
        }
      });

      if (errors.length > 0) {
        alert(`Some files were rejected:\n${errors.join("\n")}`);
      }

      if (validFiles.length > 0) {
        setUploadedFiles((prev) => [...prev, ...validFiles]);
      }
    },
    [uploadedFiles.length]
  );

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!contextText.trim() && uploadedFiles.length === 0) {
      alert("Please provide either context text or upload files.");
      return;
    }

    try {
      await onSubmit({
        contextText: contextText.trim(),
        files: uploadedFiles.map((uf) => uf.file),
      });

      // Clear form on success
      setContextText("");
      setUploadedFiles([]);
    } catch (error) {
      console.error("Upload failed:", error);
      // Don't clear form on error so user can retry
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "bmp", "tiff"].includes(ext || "")) {
      return <Image className="h-4 w-4" />;
    } else if (["pdf", "doc", "docx", "txt"].includes(ext || "")) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <FileIcon className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Context Text Area */}
          <div className="space-y-2">
            <Label htmlFor="contextText">Context Text (Optional)</Label>
            <Textarea
              id="contextText"
              placeholder="Add any context, instructions, or additional information here..."
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              disabled={disabled || isLoading}
              className="min-h-[100px] resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Provide context to help the AI better categorize your content
            </p>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Files (Optional)</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25",
                disabled || isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                !disabled && !isLoading && fileInputRef.current?.click()
              }
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, PPT, Images, TXT • Max 50MB per file • Up to{" "}
                {maxFiles} files
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={supportedFileTypes.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isLoading}
            />
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>
                Uploaded Files ({uploadedFiles.length}/{maxFiles})
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadedFiles.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {uploadedFile.preview ? (
                        <img
                          src={uploadedFile.preview}
                          alt={uploadedFile.file.name}
                          className="h-8 w-8 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(uploadedFile.file.name)
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(uploadedFile.id);
                      }}
                      disabled={disabled || isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={
              disabled ||
              isLoading ||
              (!contextText.trim() && uploadedFiles.length === 0)
            }
            className="w-full"
          >
            {isLoading ? "Processing..." : "Create Update"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
