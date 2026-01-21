import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  StickyNote,
  Presentation,
  Megaphone,
  Download,
  Eye,
  Bookmark,
  Share,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  X,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { UpdateWithAuthor } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface UpdateCardProps {
  update: UpdateWithAuthor;
  onRefresh: () => void;
}

const categoryConfig = {
  assignments: {
    icon: ClipboardList,
    color: "bg-[#f3e8ff]",
    iconColor: "#a855f7",
    badgeVariant: "exam" as const,
    label: "Exam",
  },
  notes: {
    icon: StickyNote,
    color: "bg-[#e0f2fe]",
    iconColor: "#3b82f6",
    badgeVariant: "notes" as const,
    label: "Notes",
  },
  presentations: {
    icon: Presentation,
    color: "bg-[#fef9c3]",
    iconColor: "#ca8a04",
    badgeVariant: "presentation" as const,
    label: "Presentation",
  },
  general: {
    icon: Megaphone,
    color: "bg-[#fee2e2]",
    iconColor: "#f54c4c",
    badgeVariant: "general" as const,
    label: "General",
  },
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("pdf")) return FileText;
  return File;
};

const formatDeadlineTag = (
  deadlineDate: string | Date | null | undefined
): { text: string; colorClass: string } | null => {
  if (!deadlineDate) return null;

  try {
    const date = new Date(deadlineDate);
    if (!isValid(date)) return null;

    // Calculate days difference from today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0); // Reset time to start of day

    const timeDiff = deadline.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Format as "22nd Sep Monday"
    const day = date.getDate();
    const month = format(date, "MMM");
    const weekday = format(date, "EEEE");

    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (day: number): string => {
      if (day >= 11 && day <= 13) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    const formattedText = `${day}${getOrdinalSuffix(day)} ${month} ${weekday}`;

    // Determine color based on days difference
    // Color progression: Green (far) → Yellow → Orange → Red (near/overdue)
    // 🔴 Past deadline (< 0 days) - Dark red (urgent)
    // � Same day (0 days) - Red (urgent today)
    // 🟠 Tomorrow (1 day) - Orange (urgent soon)
    // � 2-3 days - Yellow (attention needed)
    // � 4-7 days - Green (manageable)
    // 🔵 >7 days - Blue (plenty of time)
    let colorClass = "";
    if (daysDiff < 0) {
      // Past deadline - dark red with strong contrast
      colorClass = "bg-red-600 text-white border-red-700 font-bold";
    } else if (daysDiff === 0) {
      // Same day - red (urgent)
      colorClass = "bg-red-500 text-white border-red-600 font-bold";
    } else if (daysDiff === 1) {
      // Tomorrow - orange (urgent soon)
      colorClass = "bg-orange-500 text-white border-orange-600 font-bold";
    } else if (daysDiff <= 3) {
      // 2-3 days - yellow (attention needed)
      colorClass = "bg-yellow-500 text-black border-yellow-600 font-semibold";
    } else if (daysDiff <= 7) {
      // 4-7 days - green (manageable)
      colorClass = "bg-green-500 text-white border-green-600 font-semibold";
    } else {
      // More than a week - blue (plenty of time)
      colorClass = "bg-blue-500 text-white border-blue-600";
    }

    return { text: formattedText, colorClass };
  } catch (error) {
    console.error("Error formatting deadline date:", error);
    return null;
  }
};

export default function UpdateCard({ update, onRefresh }: UpdateCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    file: any;
    url: string;
    isBlob?: boolean;
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [enhancedDescription, setEnhancedDescription] = useState<string | null>(
    null
  );
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(
    update.hasViewed || false
  );
  const { toast } = useToast();
  const { user } = useAuth();

  const config =
    categoryConfig[update.category as keyof typeof categoryConfig] ||
    categoryConfig.general;
  const Icon = config.icon;

  // Format deadline for display - check both dueDate and deadlineDate
  const deadlineInfo = formatDeadlineTag(update.deadlineDate || update.dueDate);

  // Track view when card becomes visible (Intersection Observer)
  useEffect(() => {
    // Skip if already viewed by this user
    if (hasTrackedView) {
      return;
    }

    const cardElement = document.getElementById(`update-card-${update.id}`);
    if (!cardElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If card is at least 50% visible and hasn't been tracked yet
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Mark as viewed immediately to prevent duplicate calls
            setHasTrackedView(true);

            // Call API to increment view count (only once per user)
            fetch(`/api/updates/${update.id}`, {
              credentials: "include",
            })
              .then((response) => {
                if (response.ok) {
                  onRefresh(); // Refresh to update view count in the UI
                }
              })
              .catch((error) => {
                console.error("Failed to track view:", error);
              });

            // Stop observing after view is tracked
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of card is visible
        rootMargin: "0px", // No margin
      }
    );

    observer.observe(cardElement);

    return () => {
      observer.disconnect();
    };
  }, [update.id, hasTrackedView, onRefresh]);

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/${filename}?download=true`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onRefresh(); // Refresh to update download count

      toast({
        title: "Download started",
        description: `${filename} is being downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? "Bookmark removed" : "Bookmark added",
      description: `Update ${
        isBookmarked ? "removed from" : "added to"
      } your bookmarks.`,
    });
  };

  const handleShare = () => {
    const shareText =
      update.content ||
      `Check out this ${config.label.toLowerCase()}: ${update.title}`;

    if (navigator.share) {
      navigator.share({
        title: update.title,
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Update link copied to clipboard.",
      });
    }
  };

  const handleEnhanceDescription = async () => {
    setIsEnhancing(true);
    try {
      const response = await fetch(`/api/updates/${update.id}/enhance`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to enhance description");
      }

      const result = await response.json();
      setEnhancedDescription(result.enhancedDescription);

      toast({
        title: "Description enhanced",
        description:
          "The description has been improved with better formatting and details.",
      });
    } catch (error) {
      console.error("Error enhancing description:", error);
      toast({
        title: "Enhancement failed",
        description: "Could not enhance the description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this update? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/updates/${update.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete update");
      }

      toast({
        title: "Update deleted",
        description: "The update has been successfully deleted.",
      });

      onRefresh(); // Refresh the list
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Failed to delete update",
        description: "An error occurred while deleting the update.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreview = async (file: any) => {
    try {
      console.log(
        "Attempting to preview file (preview endpoint only):",
        file.filename,
        file.mimeType
      );
      // Always use preview endpoint for preview
      const response = await fetch(`/api/preview/${file.filename}`, {
        credentials: "include",
        headers: {
          Accept: file.mimeType || "*/*",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch file: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const previewUrl = window.URL.createObjectURL(blob);
      console.log("Created blob URL for preview:", previewUrl);
      setPreviewFile({ file, url: previewUrl, isBlob: true });
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Failed to preview file",
        description:
          "Could not load file for preview. Try downloading the file instead.",
        variant: "destructive",
      });
    }
  };

  const closePreview = () => {
    // Clean up blob URL to prevent memory leaks
    if (previewFile?.isBlob && previewFile.url) {
      window.URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking on action buttons
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    setShowDetailsModal(true);
  };

  const renderPreviewContent = () => {
    if (!previewFile) {
      console.log("No preview file available");
      return null;
    }

    const { file, url } = previewFile;
    const mimeType = file.mimeType;

    console.log("Rendering preview content:", {
      filename: file.originalName,
      mimeType,
      url,
    });

    if (mimeType.startsWith("image/")) {
      return (
        <div className="text-center h-full flex flex-col justify-center">
          <img
            src={url}
            alt={file.originalName}
            className="max-w-full max-h-[calc(85vh-140px)] object-contain mx-auto rounded-lg shadow-lg"
            onLoad={() => console.log("Image loaded successfully")}
            onError={(e) => console.error("Image failed to load:", e)}
          />
          <p className="text-sm text-muted-foreground mt-4">
            {file.originalName} • {mimeType}
          </p>
        </div>
      );
    }

    if (mimeType === "application/pdf") {
      console.log("Rendering PDF with blob URL:", url);
      return (
        <div className="h-full">
          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {file.originalName} • PDF Document
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, "_blank")}
                className="text-xs"
              >
                Open in New Tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(file.id, file.filename)}
                className="text-xs"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          <iframe
            src={`${url}#view=FitH`}
            className="w-full h-[calc(85vh-180px)] border rounded-lg bg-white"
            title={file.originalName}
            onLoad={() => console.log("PDF iframe loaded successfully")}
            onError={(e) => {
              console.error("Iframe failed to load:", e);
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      );
    }

    if (mimeType === "text/plain") {
      return (
        <div className="h-full">
          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {file.originalName} • Text Document
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(file.id, file.filename)}
              className="text-xs"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
          <iframe
            src={url}
            className="w-full h-[calc(85vh-180px)] border rounded-lg bg-white"
            title={file.originalName}
            onLoad={() => console.log("Text file iframe loaded successfully")}
            onError={(e) => {
              console.error("Text iframe failed to load:", e);
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      );
    }

    // For Office documents, show info and download option
    if (
      mimeType.includes("word") ||
      mimeType.includes("powerpoint") ||
      mimeType.includes("excel")
    ) {
      const docType = mimeType.includes("word")
        ? "Word Document"
        : mimeType.includes("powerpoint")
        ? "PowerPoint Presentation"
        : "Excel Spreadsheet";
      return (
        <div className="text-center p-8 h-full flex flex-col justify-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-blue-500" />
          <p className="text-lg font-medium mb-2">{file.originalName}</p>
          <p className="text-muted-foreground mb-4">{docType}</p>
          <p className="text-sm text-muted-foreground mb-4">
            Preview not available for this file type. Download to view content.
          </p>
          <Button onClick={() => handleDownload(file.id, file.filename)}>
            <Download className="h-4 w-4 mr-2" />
            Download to view
          </Button>
        </div>
      );
    }

    // For other file types, show download option
    return (
      <div className="text-center p-8 h-full flex flex-col justify-center">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">{file.originalName}</p>
        <p className="text-muted-foreground mb-4">
          Preview not available for this file type
        </p>
        <Button onClick={() => handleDownload(file.id, file.filename)}>
          <Download className="h-4 w-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  };

  return (
    <>
      <Card
        id={`update-card-${update.id}`}
        className="p-3 mb-2 hover:shadow-lg transition-all border border-border/50 shadow-sm rounded-2xl group cursor-pointer"
        data-testid={`update-card-${update.id}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-4">
          {/* Left Icon Box */}
          <div className={`w-10 h-10 ${config.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-4 w-4" style={{ color: config.iconColor }} />
          </div>

          {/* Content Middle */}
          <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge variant={config.badgeVariant} className="text-[9px] px-1.5 py-0 h-4">
                  {config.label}
                </Badge>
                {deadlineInfo && (
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border-none", deadlineInfo.colorClass)}>
                    {deadlineInfo.text}
                  </Badge>
                )}
                <span className="text-[9px] text-muted-foreground font-bold ml-auto">
                  {update.createdAt ? format(new Date(update.createdAt), "MMM d") : ""}
                </span>
              </div>
            <h3 className="text-[13px] font-black text-foreground truncate leading-snug">
              {update.title}
            </h3>
            {update.content && (
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5 line-clamp-2 whitespace-pre-line leading-relaxed">
                  {update.description || update.content}
              </p>
            )}
          </div>

          {/* Right Attachment / Actions */}
          <div className="flex items-center gap-1">
              {update.files.length > 0 && (
                  <div className="p-2">
                      <Download className="h-5 w-5 text-muted-foreground/40" />
                  </div>
              )}
              
              {/* Action buttons - always visible for better UX */}
              <div className="flex items-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleShare}>
                      <Share className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={isDeleting}
                  >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
              </div>
          </div>
        </div>
      </Card>
      {/* File Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={() => closePreview()}>
        <DialogContent className="max-w-5xl w-[90vw] h-[85vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle>
              <span className="truncate">{previewFile?.file.originalName}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              File preview for {previewFile?.file.originalName}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 h-[calc(85vh-80px)] overflow-auto">
            {renderPreviewContent()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span>Update Details</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Complete details for this update
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-auto max-h-[calc(85vh-120px)]">
            {/* Update metadata */}
            <div className="space-y-6">
              {/* Header with badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={config.color}>
                  {config.label}
                </Badge>

                {/* Deadline badge */}
                {deadlineInfo && (
                  <Badge variant="outline" className={deadlineInfo.colorClass}>
                    📅 {deadlineInfo.text}
                  </Badge>
                )}

                {/* Due Soon badge */}
                {deadlineInfo &&
                  (() => {
                    const deadlineValue = update.deadlineDate || update.dueDate;
                    if (!deadlineValue) return null;
                    const deadline = new Date(deadlineValue);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const deadlineDate = new Date(deadline);
                    deadlineDate.setHours(0, 0, 0, 0);
                    const timeDiff = deadlineDate.getTime() - today.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                    return daysDiff <= 2 && daysDiff >= 0 ? (
                      <Badge variant="destructive">⚠️ Due Soon</Badge>
                    ) : null;
                  })()}
              </div>

              {/* Author and date info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {update.author.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{update.author.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Posted{" "}
                      {formatDistanceToNow(new Date(update.createdAt!), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground border border-gray-300 rounded-md px-2 py-1">
                  <span className="text-xs text-gray-500">posted on </span>
                  {format(new Date(update.createdAt!), "MMM dd, yyyy")}
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Description</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnhanceDescription}
                    disabled={isEnhancing}
                    className="text-xs"
                  >
                    {isEnhancing ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    {isEnhancing ? "Enhancing..." : "Enhance"}
                  </Button>
                </div>
                <div className="bg-muted/30 rounded-lg p-6 border border-muted">
                  <div className="prose prose-sm max-w-none">
                    <div className="leading-relaxed text-foreground text-base space-y-2">
                      {/* Use enhanced description if available, then regular description, then fall back to content */}
                      {(
                        enhancedDescription ||
                        update.description ||
                        update.content
                      )
                        .split("\n")
                        .map((line, index) => {
                          const trimmedLine = line.trim();

                          // Empty line
                          if (!trimmedLine) {
                            return <div key={index} className="h-2" />;
                          }

                          // Bullet points
                          if (
                            trimmedLine.startsWith("•") ||
                            trimmedLine.startsWith("-") ||
                            trimmedLine.startsWith("*")
                          ) {
                            return (
                              <div
                                key={index}
                                className="flex items-start space-x-3 my-2"
                              >
                                <span className="text-primary mt-1 flex-shrink-0 font-semibold">
                                  •
                                </span>
                                <span className="flex-1">
                                  {trimmedLine.substring(1).trim()}
                                </span>
                              </div>
                            );
                          }

                          // Numbered lists
                          if (/^\d+\./.test(trimmedLine)) {
                            const match = trimmedLine.match(/^(\d+)\.\s*(.*)$/);
                            if (match) {
                              return (
                                <div
                                  key={index}
                                  className="flex items-start space-x-3 my-2"
                                >
                                  <span className="text-primary mt-1 flex-shrink-0 font-semibold">
                                    {match[1]}.
                                  </span>
                                  <span className="flex-1">{match[2]}</span>
                                </div>
                              );
                            }
                          }

                          // Headers (lines that end with : or are in ALL CAPS)
                          if (
                            trimmedLine.endsWith(":") ||
                            (trimmedLine === trimmedLine.toUpperCase() &&
                              trimmedLine.length > 3)
                          ) {
                            return (
                              <h4
                                key={index}
                                className="font-semibold text-lg mt-4 mb-2 text-foreground"
                              >
                                {trimmedLine}
                              </h4>
                            );
                          }

                          // Regular paragraph
                          return (
                            <p key={index} className="my-2 leading-relaxed">
                              {trimmedLine}
                            </p>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Files section */}
              {update.files && update.files.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">
                    Attached Files ({update.files.length})
                  </h3>
                  <div className="grid gap-3">
                    {update.files.map((file) => {
                      const FileIcon = getFileIcon(file.mimeType);
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{file.originalName}</p>
                              <p className="text-sm text-muted-foreground">
                                {file.mimeType} •{" "}
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(file)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDownload(file.id, file.filename)
                              }
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{update.viewCount || 0} views</span>
                  </span>
                  {update.files && update.files.length > 0 && (
                    <span className="flex items-center space-x-1">
                      <Download className="h-4 w-4" />
                      <span>{update.downloadCount || 0} downloads</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBookmark}
                    className={isBookmarked ? "text-primary" : ""}
                  >
                    <Bookmark
                      className={`h-4 w-4 mr-1 ${
                        isBookmarked ? "fill-current" : ""
                      }`}
                    />
                    {isBookmarked ? "Bookmarked" : "Bookmark"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
