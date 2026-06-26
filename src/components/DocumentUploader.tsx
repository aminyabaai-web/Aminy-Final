// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useRef } from 'react';
import { Upload, File, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import {
  uploadMultipleFiles,
  validateFile,
  VaultRecordType,
  VaultDocumentSource,
  UploadResult
} from '../lib/vault-storage';

interface DocumentUploaderProps {
  onUpload: (files: File[], results?: UploadResult[]) => void;
  userId?: string;
  childId?: string;
  recordType?: VaultRecordType;
  source?: VaultDocumentSource;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  /** If true, uses actual Supabase storage. If false, uses mock upload for demo */
  useRealStorage?: boolean;
}

export function DocumentUploader({
  onUpload,
  userId,
  childId,
  recordType = 'uploaded',
  source = 'parent-upload',
  maxSize = 50,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  useRealStorage = true,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Validate each file
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    selectedFiles.forEach(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        invalidFiles.push(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setError(invalidFiles.join('\n'));
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    // Check if we should use real storage
    if (useRealStorage && userId) {
      try {
        const { results, successCount, failureCount } = await uploadMultipleFiles(
          files,
          userId,
          {
            recordType,
            source,
            childId,
            onProgress: (overallProgress, currentFileName) => {
              setProgress(Math.round(overallProgress));
              setCurrentFile(currentFileName);
            },
          }
        );

        setUploading(false);

        if (successCount > 0) {
          toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`);
        }

        if (failureCount > 0) {
          const failedFiles = results
            .filter(r => !r.success)
            .map(r => r.error)
            .join(', ');
          toast.error(`${failureCount} file${failureCount > 1 ? 's' : ''} failed: ${failedFiles}`);
        }

        onUpload(files, results);
        setFiles([]);
        setProgress(0);
        setCurrentFile('');
      } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        setUploading(false);
        toast.error('Upload failed. Please try again.');
      }
    } else {
      // Fallback: Mock upload for demo/development
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploading(false);
            toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
            onUpload(files);
            setFiles([]);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);

    // Validate each file
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    droppedFiles.forEach(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        invalidFiles.push(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setError(invalidFiles.join('\n'));
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-[#E8E4DF] rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-[#8A9BA8]" />
        <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
        <p className="text-sm text-muted-foreground">
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
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[#F6FBFB] rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <File className="w-4 h-4 text-[#5A6B7A]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
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
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {currentFile ? `Uploading ${currentFile}...` : 'Uploading...'}
              </span>
            </div>
            <span className="font-medium">{progress}%</span>
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

      {/* Storage Info */}
      {!useRealStorage && (
        <p className="text-sm text-center text-muted-foreground">
          Demo mode: Files are not persisted. Enable real storage for production.
        </p>
      )}
    </div>
  );
}
