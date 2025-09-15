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
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UnifiedUpload } from "./unified-upload";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [initialFiles, setInitialFiles] = useState<File[]>([]);

  const { toast } = useToast();

  // Handle preloaded files from drag and drop
  useEffect(() => {
    if (preloadedFiles.length > 0) {
      setInitialFiles(preloadedFiles);
    }
  }, [preloadedFiles]);

  // Create update mutation using the new unified endpoint
  const createMutation = useMutation({
    mutationFn: async (data: { contextText: string; files: File[] }) => {
      const formData = new FormData();
      formData.append("contextText", data.contextText);

      data.files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/updates/unified", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create update");
      }

      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      onSuccess();

      toast({
        title: "Update created successfully",
        description: `Categorized as: ${
          result.processing?.category?.category || "Unknown"
        }`,
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
      } else if (error.message?.includes("AI processing failed")) {
        errorMessage =
          "AI processing failed. Please try again or contact support.";
      }

      toast({
        title: "Failed to create update",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (data: { contextText: string; files: File[] }) => {
    setIsProcessing(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing && !createMutation.isPending) {
      setInitialFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="create-update-modal"
      >
        <DialogHeader>
          <DialogTitle
            data-testid="modal-title"
            className="flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Create New Update with AI
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload files and/or add context text. AI will automatically
            categorize content based on meaning, extract titles and deadlines,
            and organize everything properly.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <UnifiedUpload
            onSubmit={handleUpload}
            isLoading={isProcessing || createMutation.isPending}
            disabled={isProcessing || createMutation.isPending}
          />

          {(isProcessing || createMutation.isPending) && (
            <div className="bg-muted/50 border border-border p-4 rounded-lg">
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
                    {isProcessing
                      ? "Extracting text from files and analyzing content..."
                      : "Categorizing content and generating update..."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isProcessing || createMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
