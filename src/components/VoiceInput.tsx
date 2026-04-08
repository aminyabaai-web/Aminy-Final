// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Voice Input Component
 *
 * Provides speech-to-text functionality using Web Speech API:
 * - Permission request dialog (like OneMedical IMG_1583/1584)
 * - Visual recording indicator with pulsing animation
 * - Real-time transcription
 * - Privacy-focused: converts speech locally on device
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

// Type for SpeechRecognition instance (not fully typed in all browsers)
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    isFinal: boolean;
    [index: number]: { transcript: string };
  };
}

// Check for browser support
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
const SpeechRecognition: SpeechRecognitionConstructor | null = typeof window !== 'undefined'
  ? ((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as SpeechRecognitionConstructor | null
  : null;

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  className?: string;
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export function VoiceInput({
  onTranscript,
  onListeningChange,
  className
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    if (!SpeechRecognition) {
      setPermissionState('unsupported');
      return;
    }

    // Check microphone permission status if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then((result) => {
          setPermissionState(result.state as PermissionState);
          result.onchange = () => {
            setPermissionState(result.state as PermissionState);
          };
        })
        .catch(() => {
          // Permission API not supported for microphone, assume prompt
          setPermissionState('prompt');
        });
    }
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onListeningChange?.(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      onListeningChange?.(false);

      if (event.error === 'not-allowed') {
        setPermissionState('denied');
        setError('Microphone access was denied');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    };

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      setTranscript(fullTranscript);

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    return recognition;
  }, [onTranscript, onListeningChange]);

  // Handle microphone button click
  const handleMicClick = async () => {
    if (permissionState === 'unsupported') {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    if (permissionState === 'denied') {
      setShowPermissionDialog(true);
      return;
    }

    if (permissionState === 'prompt') {
      setShowPermissionDialog(true);
      return;
    }

    // Permission granted - toggle recording
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Start listening
  const startListening = () => {
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Handle permission dialog allow
  const handleAllowPermission = async () => {
    setShowPermissionDialog(false);

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState('granted');
      startListening();
    } catch (err) {
      setPermissionState('denied');
      setError('Microphone access was denied');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      {/* Microphone Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMicClick}
        disabled={permissionState === 'unsupported'}
        className={cn(
          'relative rounded-full transition-all',
          isListening && 'bg-red-100 dark:bg-red-900/30 text-red-600'
        )}
        title={
          permissionState === 'unsupported'
            ? 'Voice input not supported'
            : isListening
            ? 'Stop recording'
            : 'Start voice input'
        }
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5" />
            {/* Pulsing indicator */}
            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          </>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </Button>

      {/* Permission Dialog */}
      {showPermissionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <Mic className="w-8 h-8 text-accent" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
              "Aminy" would like to access the Microphone
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
              Your microphone is used to record or transmit your speech when needed.
            </p>

            {/* Privacy note */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 mb-4 sm:mb-6">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                <strong>From Aminy:</strong> For this app, your voice and speech data will not be sent to external servers. We will convert your speech to text directly on your device to protect your information.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPermissionDialog(false)}
              >
                Don't Allow
              </Button>
              <Button
                className="flex-1 bg-accent hover:bg-accent/90"
                onClick={handleAllowPermission}
              >
                Allow
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Recording Overlay */}
      {isListening && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
          <Card className="px-4 py-3 bg-white dark:bg-slate-900 shadow-lg rounded-full flex items-center gap-3">
            {/* Recording indicator */}
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Listening...
            </span>
            {transcript && (
              <span className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                {transcript}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={stopListening}
              className="w-8 h-8 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      )}

      {/* Error message */}
      {error && !showPermissionDialog && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
          <Card className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 shadow-lg rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setError(null)}
              className="w-6 h-6 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

export default VoiceInput;
