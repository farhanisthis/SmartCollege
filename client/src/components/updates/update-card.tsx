import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  File
} from 'lucide-react';
import { UpdateWithAuthor } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UpdateCardProps {
  update: UpdateWithAuthor;
  onRefresh: () => void;
}

const categoryConfig = {
  assignments: { icon: ClipboardList, color: 'bg-chart-1/20 text-chart-1', label: 'Assignment' },
  notes: { icon: StickyNote, color: 'bg-chart-2/20 text-chart-2', label: 'Notes' },
  presentations: { icon: Presentation, color: 'bg-chart-3/20 text-chart-3', label: 'Presentation' },
  general: { icon: Megaphone, color: 'bg-chart-5/20 text-chart-5', label: 'General' },
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.includes('pdf')) return FileText;
  return File;
};

export default function UpdateCard({ update, onRefresh }: UpdateCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { toast } = useToast();

  const config = categoryConfig[update.category as keyof typeof categoryConfig] || categoryConfig.general;
  const Icon = config.icon;

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/${filename}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
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
      description: `Update ${isBookmarked ? 'removed from' : 'added to'} your bookmarks.`,
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: update.title,
        text: update.content,
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

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow" data-testid={`update-card-${update.id}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="secondary" className={config.color} data-testid="update-category">
                {config.label}
              </Badge>
              {update.isUrgent && (
                <Badge variant="destructive" data-testid="urgent-badge">
                  Due Soon
                </Badge>
              )}
              <span className="text-xs text-muted-foreground" data-testid="update-time">
                {formatDistanceToNow(new Date(update.createdAt!), { addSuffix: true })}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="update-title">
              {update.title}
            </h3>
            
            <p className="text-muted-foreground mb-4 line-clamp-3" data-testid="update-content">
              {update.content}
            </p>
            
            {/* Files */}
            {update.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4" data-testid="update-files">
                {update.files.map((file) => {
                  const FileIcon = getFileIcon(file.mimeType);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center space-x-2 bg-muted rounded-lg px-3 py-2"
                      data-testid={`file-${file.id}`}
                    >
                      <FileIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{file.originalName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file.id, file.filename)}
                        data-testid={`button-download-${file.id}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Metadata */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src="" alt={update.author.name} />
                  <AvatarFallback data-testid="author-avatar">
                    {update.author.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span data-testid="author-name">
                  {update.author.name} ({update.author.role === 'cr' ? 'CR' : 'Student'})
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1" data-testid="view-count">
                  <Eye className="h-3 w-3" />
                  <span>{update.viewCount} views</span>
                </span>
                {(update.downloadCount || 0) > 0 && (
                  <span className="flex items-center space-x-1" data-testid="download-count">
                    <Download className="h-3 w-3" />
                    <span>{update.downloadCount || 0} downloads</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBookmark}
            className={isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
            data-testid="button-bookmark"
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-share"
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
