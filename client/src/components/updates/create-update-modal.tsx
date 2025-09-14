import { useState } from 'react';
import { useMutation, queryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Upload, Camera, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FileUpload from './file-upload';

interface CreateUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUpdateModal({ isOpen, onClose, onSuccess }: CreateUpdateModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isUrgent, setIsUrgent] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('text');
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  const { toast } = useToast();

  // AI categorization mutation
  const categorizeMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to categorize');
      return response.json();
    },
    onSuccess: (data) => {
      setAiPreview(data);
      if (!category) setCategory(data.category);
      if (data.isUrgent) setIsUrgent(true);
      if (data.dueDate) setDueDate(data.dueDate);
    },
  });

  // Create update mutation
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/updates', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to create update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/updates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
      onSuccess();
      resetForm();
      toast({
        title: "Update created",
        description: "Your update has been posted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setOriginalContent('');
    setCategory('');
    setPriority('normal');
    setIsUrgent(false);
    setDueDate('');
    setFiles([]);
    setAiPreview(null);
    setActiveTab('text');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleContentChange = (value: string) => {
    setOriginalContent(value);
    
    // Trigger AI categorization if content is substantial
    if (value.trim().length > 20) {
      setIsProcessingAI(true);
      setTimeout(() => {
        categorizeMutation.mutate(value);
        setIsProcessingAI(false);
      }, 1000); // Debounce
    } else {
      setAiPreview(null);
    }
  };

  const handleImageAnalysis = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to analyze image');
      
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
    
    if (!title && !originalContent) {
      toast({
        title: "Missing content",
        description: "Please provide either a title and content, or original content for AI processing.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('originalContent', originalContent);
    formData.append('category', category || 'general');
    formData.append('priority', priority);
    formData.append('isUrgent', isUrgent.toString());
    if (dueDate) formData.append('dueDate', dueDate);
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-update-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">Create New Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Update Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear, descriptive title..."
              data-testid="input-title"
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignments">Assignment</SelectItem>
                <SelectItem value="notes">Notes</SelectItem>
                <SelectItem value="presentations">Presentation</SelectItem>
                <SelectItem value="general">General Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Input Methods */}
          <div>
            <Label>Content Input</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" className="flex items-center space-x-2" data-testid="tab-text">
                  <Edit className="h-4 w-4" />
                  <span>Text</span>
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center space-x-2" data-testid="tab-file">
                  <Upload className="h-4 w-4" />
                  <span>File</span>
                </TabsTrigger>
                <TabsTrigger value="photo" className="flex items-center space-x-2" data-testid="tab-photo">
                  <Camera className="h-4 w-4" />
                  <span>Photo</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <div className="space-y-4">
                  <Textarea
                    value={originalContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Paste teacher's message, assignment details, or any update content here. AI will automatically format and improve readability..."
                    rows={6}
                    className="resize-none"
                    data-testid="textarea-content"
                  />
                  {isProcessingAI && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                      <span>AI is analyzing content...</span>
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
                  onFilesChange={(newFiles) => {
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

          {/* AI Processing Preview */}
          {aiPreview && (
            <Card className="bg-muted/50 border border-border p-4" data-testid="ai-preview">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">AI Processing Preview</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Content will be automatically categorized and formatted
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" data-testid="predicted-category">
                      Predicted: {aiPreview.category}
                    </Badge>
                    {aiPreview.isUrgent && (
                      <Badge variant="destructive" data-testid="urgent-detected">
                        Urgent Detected
                      </Badge>
                    )}
                    {aiPreview.dueDate && (
                      <Badge variant="outline" data-testid="due-date-detected">
                        Due: {aiPreview.dueDate}
                      </Badge>
                    )}
                  </div>
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
                <Label htmlFor="urgent" className="text-sm">Mark as urgent</Label>
              </div>
            </div>
            
            {/* Due Date */}
            {(category === 'assignments' || isUrgent) && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="dueDate" className="text-sm">Due Date:</Label>
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
                  <div key={index} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
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
            <span>{createMutation.isPending ? 'Creating...' : 'Create with AI'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
