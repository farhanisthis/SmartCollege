import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { CloudUpload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  acceptedTypes?: 'image' | 'document' | 'all';
  maxFiles?: number;
  maxSize?: number; // in MB
}

const acceptedTypesMap = {
  image: {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  },
  document: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt']
  },
  all: {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt']
  }
};

export default function FileUpload({
  onFilesChange,
  acceptedTypes = 'all',
  maxFiles = 5,
  maxSize = 10
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...uploadedFiles, ...acceptedFiles].slice(0, maxFiles);
    setUploadedFiles(newFiles);
    onFilesChange(newFiles);
  }, [uploadedFiles, maxFiles, onFilesChange]);

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedTypesMap[acceptedTypes],
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
    maxFiles: maxFiles - uploadedFiles.length,
    disabled: uploadedFiles.length >= maxFiles
  });

  const getAcceptedTypesText = () => {
    switch (acceptedTypes) {
      case 'image':
        return 'PNG, JPG, GIF up to 10MB';
      case 'document':
        return 'PDF, DOC, PPT up to 10MB';
      default:
        return 'PDF, DOC, PPT, images up to 10MB';
    }
  };

  return (
    <div className="space-y-4" data-testid="file-upload">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragActive ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50",
          uploadedFiles.length >= maxFiles && "opacity-50 cursor-not-allowed"
        )}
        data-testid="drop-zone"
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <CloudUpload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-foreground">
              {isDragActive
                ? 'Drop files here...'
                : uploadedFiles.length >= maxFiles
                ? 'Maximum files reached'
                : 'Drag and drop files here, or'}
            </p>
            {uploadedFiles.length < maxFiles && (
              <Button type="button" variant="link" className="p-0 h-auto" data-testid="browse-button">
                browse
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {getAcceptedTypesText()}
            </p>
          </div>
        </div>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="space-y-1" data-testid="file-errors">
          {fileRejections.map(({ file, errors }, index) => (
            <p key={index} className="text-xs text-destructive">
              {file.name}: {errors.map(e => e.message).join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2" data-testid="uploaded-files">
          <p className="text-sm font-medium">Uploaded Files:</p>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
              data-testid={`uploaded-file-${index}`}
            >
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                data-testid={`remove-file-${index}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
