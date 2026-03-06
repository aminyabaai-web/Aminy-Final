/**
 * EnhancedChatInput - Full-featured chat input with mic/camera/upload
 *
 * Features:
 * - Voice input with Web Speech API transcription
 * - Camera capture for photos
 * - File upload with preview (images, PDFs, documents)
 * - Auto-resize textarea
 * - Attachment previews with remove option
 * - Upload to Supabase Storage
 * - Accessibility compliant
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Mic,
  MicOff,
  Camera,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
  AlertCircle,
  Volume2,
  StopCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

// Types
export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'audio';
  name: string;
  url: string;
  localUrl?: string; // For preview before upload
  size: number;
  mimeType: string;
  status: 'uploading' | 'uploaded' | 'error';
}

interface EnhancedChatInputProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxAttachments?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in MB
  className?: string;
}

// Check if browser supports Speech Recognition
const SpeechRecognitionCtor = typeof globalThis.SpeechRecognition !== 'undefined' ? globalThis.SpeechRecognition : typeof globalThis.webkitSpeechRecognition !== 'undefined' ? globalThis.webkitSpeechRecognition : null;

export function EnhancedChatInput({
  onSend,
  placeholder = "Ask Aminy anything...",
  disabled = false,
  isLoading = false,
  maxAttachments = 5,
  allowedFileTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  maxFileSize = 10, // 10MB default
  className = ''
}: EnhancedChatInputProps) {
  // State
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Initialize speech recognition
  useEffect(() => {
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setMessage(prev => prev + (prev ? ' ' : '') + finalTranscript);
          setTranscript('');
        } else {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable in browser settings.');
        } else if (event.error !== 'aborted') {
          toast.error('Speech recognition error. Please try again.');
        }
        stopRecording();
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // Restart if still recording (handles browser auto-stop)
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Start voice recording
  const startRecording = async () => {
    if (!SpeechRecognitionCtor) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      setIsRecording(true);
      setRecordingTime(0);
      setTranscript('');

      recognitionRef.current?.start();

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Listening... Speak now');
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    setIsRecording(false);
    setIsTranscribing(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      recognitionRef.current?.stop();
    } catch (e) {
      // Ignore
    }

    // Add any remaining transcript
    if (transcript) {
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
      setTranscript('');
    }
  };

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > maxAttachments) {
      toast.error(`Maximum ${maxAttachments} attachments allowed`);
      return;
    }

    for (const file of Array.from(files)) {
      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is ${maxFileSize}MB`);
        continue;
      }

      // Create attachment object
      const attachment: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        name: file.name,
        url: '',
        localUrl: URL.createObjectURL(file),
        size: file.size,
        mimeType: file.type,
        status: 'uploading'
      };

      setAttachments(prev => [...prev, attachment]);

      // Upload to Supabase Storage
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${attachment.id}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        setAttachments(prev => prev.map(a =>
          a.id === attachment.id
            ? { ...a, url: publicUrl, status: 'uploaded' }
            : a
        ));
      } catch (error) {
        console.error('Upload error:', error);
        setAttachments(prev => prev.map(a =>
          a.id === attachment.id
            ? { ...a, status: 'error' }
            : a
        ));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle camera capture
  const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const attachment: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      name: `photo-${new Date().toISOString().split('T')[0]}.jpg`,
      url: '',
      localUrl: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      status: 'uploading'
    };

    setAttachments(prev => [...prev, attachment]);

    // Upload
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${attachment.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      setAttachments(prev => prev.map(a =>
        a.id === attachment.id
          ? { ...a, url: publicUrl, status: 'uploaded' }
          : a
      ));

      toast.success('Photo captured!');
    } catch (error) {
      console.error('Upload error:', error);
      setAttachments(prev => prev.map(a =>
        a.id === attachment.id
          ? { ...a, status: 'error' }
          : a
      ));
      toast.error('Failed to upload photo');
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    if (attachment?.localUrl) {
      URL.revokeObjectURL(attachment.localUrl);
    }
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Handle send
  const handleSend = () => {
    const trimmedMessage = message.trim();

    // Check if there's content to send
    if (!trimmedMessage && attachments.length === 0) {
      return;
    }

    // Check if any attachments are still uploading
    const stillUploading = attachments.some(a => a.status === 'uploading');
    if (stillUploading) {
      toast.error('Please wait for attachments to finish uploading');
      return;
    }

    // Filter out error attachments
    const validAttachments = attachments.filter(a => a.status === 'uploaded');

    onSend(trimmedMessage, validAttachments);

    // Reset
    setMessage('');
    setAttachments([]);
    setTranscript('');

    // Focus textarea
    textareaRef.current?.focus();
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSend = (message.trim() || attachments.length > 0) && !disabled && !isLoading;
  const hasUploading = attachments.some(a => a.status === 'uploading');

  return (
    <div className={`bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Attachment previews */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-3 overflow-hidden"
          >
            <div className="flex gap-2 flex-wrap">
              {attachments.map(attachment => (
                <motion.div
                  key={attachment.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative group"
                >
                  {attachment.type === 'image' ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
                      <img
                        src={attachment.localUrl || attachment.url}
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex flex-col items-center justify-center p-1">
                      <FileText className="w-6 h-6 text-gray-400" />
                      <span className="text-[10px] text-gray-500 truncate w-full text-center mt-1">
                        {attachment.name.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Status overlay */}
                  {attachment.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}

                  {attachment.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/50 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                  )}

                  {attachment.status === 'uploaded' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice transcript preview */}
      <AnimatePresence>
        {(isRecording || transcript) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-2"
          >
            <div className="flex items-center gap-2 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-teal-700 dark:text-teal-300 flex-1">
                {transcript || 'Listening...'}
              </span>
              <span className="text-xs text-teal-600 dark:text-teal-400">
                {formatTime(recordingTime)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input area */}
      <div className="p-3 flex items-end gap-2">
        {/* Attachment buttons */}
        <div className="flex gap-1">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedFileTypes.join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || attachments.length >= maxAttachments}
            className="h-10 w-10 rounded-full text-gray-500 hover:text-teal-600 hover:bg-teal-50"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Camera capture */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || attachments.length >= maxAttachments}
            className="h-10 w-10 rounded-full text-gray-500 hover:text-teal-600 hover:bg-teal-50"
            title="Take photo"
          >
            <Camera className="w-5 h-5" />
          </Button>

          {/* Voice input */}
          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={`h-10 w-10 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
            }`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isRecording ? (
              <StopCircle className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Speak now or type...' : placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '150px' }}
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend || hasUploading}
          className={`h-10 w-10 rounded-full transition-all ${
            canSend && !hasUploading
              ? 'bg-teal-500 hover:bg-teal-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading || hasUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Attachment count hint */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500">
            {attachments.length} of {maxAttachments} attachments • {formatSize(attachments.reduce((sum, a) => sum + a.size, 0))}
          </p>
        </div>
      )}
    </div>
  );
}

export default EnhancedChatInput;
