import React, { useState, useRef } from 'react';
import { Upload, File, X, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface DocumentUploaderProps {
  onUpload: (files: File[]) => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export function DocumentUploader({ 
  onUpload, 
  maxSize = 10,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file sizes
    const invalidFiles = selectedFiles.filter(f => f.size > maxSize * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setError(`Some files exceed ${maxSize}MB limit`);
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
    setError(null);
  };

  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          onUpload(files);
          setFiles([]);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground">
          {acceptedTypes.join(', ')} (max {maxSize}MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <File className="w-4 h-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && !uploading && (
        <Button onClick={handleUpload} className="w-full">
          <Check className="w-4 h-4 mr-2" />
          Upload {files.length} {files.length === 1 ? 'file' : 'files'}
        </Button>
      )}
    </div>
  );
}
