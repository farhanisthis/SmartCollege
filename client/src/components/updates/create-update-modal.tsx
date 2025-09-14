import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Upload, Camera, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "./file-upload";

interface CreateUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preloadedFiles?: File[];
}

export default function CreateUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  preloadedFiles = [],
}: CreateUpdateModalProps) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isUrgent, setIsUrgent] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState("text");
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const { toast } = useToast();

  // Handle preloaded files from drag and drop
  useEffect(() => {
    if (preloadedFiles.length > 0) {
      setFiles(preloadedFiles);
      setActiveTab("upload");
    }
  }, [preloadedFiles]);

  // Create update mutation
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/updates", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      onSuccess();
      resetForm();
      toast({
        title: "Update created",
        description: "Your update has been posted successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Create update error:", error);

      let errorMessage = "An unexpected error occurred";

      if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific error cases
      if (error.message?.includes("File too large")) {
        errorMessage =
          "One or more files are too large. Maximum file size is 50MB per file.";
      } else if (error.message?.includes("Too many files")) {
        errorMessage = "Too many files selected. Maximum 10 files allowed.";
      } else if (error.message?.includes("File type")) {
        errorMessage =
          "Unsupported file type. Please use PDF, DOCX, PPT, images, or text files.";
      }

      toast({
        title: "Failed to create update",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setContent("");
    setOriginalContent("");
    setPriority("normal");
    setIsUrgent(false);
    setDueDate("");
    setFiles([]);
    setActiveTab("text");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleContentChange = (value: string) => {
    setOriginalContent(value);
    // AI categorization is now only triggered on form submit
  };

  const handleImageAnalysis = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/ai/analyze-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to analyze image");

      const result = await response.json();
      setOriginalContent(result.extractedText);
      handleContentChange(result.extractedText);

      toast({
        title: "Image analyzed",
        description: "Text extracted from image successfully.",
      });
    } catch (error) {
      toast({
        title: "Image analysis failed",
        description: "Please try again or enter text manually.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originalContent.trim() && files.length === 0) {
      toast({
        title: "Missing content",
        description: "Please provide content or upload a file for the update.",
        variant: "destructive",
      });
      return;
    }

    // Show AI processing indicator
    setIsProcessingAI(true);

    try {
      // Create the update - let the backend handle AI processing
      const formData = new FormData();
      formData.append("originalContent", originalContent);
      formData.append("priority", priority);
      formData.append("isUrgent", isUrgent.toString());
      if (dueDate) formData.append("dueDate", dueDate);

      files.forEach((file) => {
        formData.append("files", file);
      });

      await createMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Create update error:", error);
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="create-update-modal"
      >
        <DialogHeader>
          <DialogTitle data-testid="modal-title">Create New Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Input Methods */}
          <div>
            <Label>Content Input</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="text"
                  className="flex items-center space-x-2"
                  data-testid="tab-text"
                >
                  <Edit className="h-4 w-4" />
                  <span>Text</span>
                </TabsTrigger>
                <TabsTrigger
                  value="file"
                  className="flex items-center space-x-2"
                  data-testid="tab-file"
                >
                  <Upload className="h-4 w-4" />
                  <span>File</span>
                </TabsTrigger>
                <TabsTrigger
                  value="photo"
                  className="flex items-center space-x-2"
                  data-testid="tab-photo"
                >
                  <Camera className="h-4 w-4" />
                  <span>Photo</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <div className="space-y-4">
                  <Textarea
                    value={originalContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Paste teacher's message, assignment details, or any update content here. You can also upload files instead of typing text. AI will automatically categorize, format, and generate a title when you click 'Create Update'..."
                    rows={6}
                    className="resize-none"
                    data-testid="textarea-content"
                  />
                  {isProcessingAI && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                      <span>AI is processing content...</span>
                    </div>
                  )}
                  {!originalContent.trim() && files.length > 0 && (
                    <div className="flex items-center text-xs text-green-600">
                      <span>✓ Files uploaded - ready to create update</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="file" className="mt-4">
                <FileUpload
                  onFilesChange={setFiles}
                  acceptedTypes="document"
                  maxFiles={5}
                />
              </TabsContent>

              <TabsContent value="photo" className="mt-4">
                <FileUpload
                  onFilesChange={(newFiles: File[]) => {
                    setFiles(newFiles);
                    if (newFiles.length > 0) {
                      handleImageAnalysis(newFiles[0]);
                    }
                  }}
                  acceptedTypes="image"
                  maxFiles={1}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* AI Processing Preview - Only shown during actual processing */}
          {isProcessingAI && (
            <Card
              className="bg-muted/50 border border-border p-4"
              data-testid="ai-preview"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    AI Processing
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analyzing content, generating title, and determining
                    category...
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Additional Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="urgent"
                  checked={isUrgent}
                  onCheckedChange={(checked) => setIsUrgent(checked === true)}
                  data-testid="checkbox-urgent"
                />
                <Label htmlFor="urgent" className="text-sm">
                  Mark as urgent
                </Label>
              </div>
            </div>

            {/* Due Date */}
            {isUrgent && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="dueDate" className="text-sm">
                  Due Date:
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-due-date"
                />
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div>
              <Label>Attached Files</Label>
              <div className="space-y-2 mt-2" data-testid="file-list">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
                  >
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFiles(files.filter((_, i) => i !== index))
                      }
                      data-testid={`remove-file-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex items-center space-x-2"
            data-testid="button-create"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {createMutation.isPending ? "Creating..." : "Create with AI"}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
