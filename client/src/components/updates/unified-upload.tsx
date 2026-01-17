import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image, FileIcon, Loader2 } from "lucide-react";
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

  const maxFiles = 5;
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
    ".txt",
  ];

  const validateFile = (file: File): string | null => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return `${file.name}: File size exceeds 50MB.`;
    }
    return null;
  };

  const generateFileId = (): string => {
    return Math.random().toString(36).substr(2, 9);
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
    e.target.value = "";
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!contextText.trim() && uploadedFiles.length === 0) {
      alert("Please provide either context text or upload files.");
      return;
    }
    try {
      await onSubmit({
        contextText: contextText.trim(),
        files: uploadedFiles.map((uf) => uf.file),
      });
      setContextText("");
      setUploadedFiles([]);
    } catch (error) {
      console.error("Upload failed:", error);
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
        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          {/* Context Text Area */}
          <div className="space-y-3">
            <Label htmlFor="contextText" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-2">Context Text (Optional)</Label>
            <Textarea
              id="contextText"
              placeholder="Add any context, instructions, or additional information here..."
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              disabled={disabled || isLoading}
              className="min-h-[120px] resize-none rounded-2xl p-4 font-medium bg-[#f8f9fa] border-transparent focus:bg-white focus:border-[#f54c4c]/20 transition-all text-sm"
            />
            <p className="text-[11px] text-muted-foreground/60 font-medium px-2">
              Provide context to help the AI better categorize your content.
            </p>
          </div>
          {/* File Upload Area */}
          <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-2">Files (Optional)</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300",
                isDragOver
                  ? "border-[#f54c4c] bg-[#f54c4c]/5 scale-[0.99]"
                  : "border-muted-foreground/20 bg-[#f8f9fa] hover:bg-muted/50",
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
              <div className="bg-white w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-[#f54c4c]" />
              </div>
              <p className="text-sm font-black text-foreground">
                Drop files here or click to browse
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                PDF, DOCX, PPT, Images • Max 50MB
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
            type="submit"
            disabled={
              disabled ||
              isLoading ||
              (!contextText.trim() && uploadedFiles.length === 0)
            }
            className="w-full bg-[#f54c4c] hover:bg-[#d43f3f] text-white font-black h-14 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing with AI...</span>
                </div>
            ) : "Create Update"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
