/**
 * Attachment Picker Component
 *
 * Provides a mobile-friendly bottom sheet for selecting attachments:
 * - Take a photo (camera)
 * - Select from library (photo picker)
 * - Attach a PDF (document picker)
 *
 * Matches OneMedical IMG_1582 style
 */

import React, { useRef, useState } from 'react';
import { Camera, Image, FileText, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface AttachmentPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachmentSelected: (file: File, type: 'photo' | 'image' | 'pdf') => void;
  className?: string;
}

export function AttachmentPicker({
  isOpen,
  onClose,
  onAttachmentSelected,
  className
}: AttachmentPickerProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Handle camera capture
  const handleTakePhoto = async () => {
    // Check if camera is available
    if (!navigator.mediaDevices?.getUserMedia) {
      // Fallback to file input with capture attribute
      cameraInputRef.current?.click();
      return;
    }

    cameraInputRef.current?.click();
  };

  // Handle photo library selection
  const handleSelectFromLibrary = () => {
    fileInputRef.current?.click();
  };

  // Handle PDF selection
  const handleAttachPdf = () => {
    pdfInputRef.current?.click();
  };

  // Process selected file
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'photo' | 'image' | 'pdf'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Please select a file smaller than 10MB'
      });
      return;
    }

    // Validate file type
    if (type === 'pdf' && file.type !== 'application/pdf') {
      toast.error('Invalid file type', {
        description: 'Please select a PDF file'
      });
      return;
    }

    if ((type === 'photo' || type === 'image') && !file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please select an image file'
      });
      return;
    }

    onAttachmentSelected(file, type);
    onClose();

    // Reset input
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-xl',
          'transform transition-transform duration-300 ease-out',
          'safe-area-bottom',
          className
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Attachment
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Options */}
        <div className="px-4 pb-8 space-y-2">
          {/* Take a Photo */}
          <button
            onClick={handleTakePhoto}
            className="w-full flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Camera className="w-6 h-6 text-accent" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Take a photo</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use your camera to capture an image
              </p>
            </div>
          </button>

          {/* Select from Library */}
          <button
            onClick={handleSelectFromLibrary}
            className="w-full flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Image className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Select from library</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose an existing photo or image
              </p>
            </div>
          </button>

          {/* Attach a PDF */}
          <button
            onClick={handleAttachPdf}
            className="w-full flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Attach a PDF</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Share a document or report
              </p>
            </div>
          </button>
        </div>

        {/* Cancel button */}
        <div className="px-4 pb-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'photo')}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'image')}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'pdf')}
        />
      </div>
    </>
  );
}

export default AttachmentPicker;
