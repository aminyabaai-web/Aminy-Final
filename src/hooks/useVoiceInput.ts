/**
 * Voice Input Hook
 *
 * Provides voice-first input capabilities using the Web Speech API.
 * Handles continuous listening, interim results, and graceful fallbacks.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface VoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
}

// Type definitions for SpeechRecognition API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US',
    maxAlternatives = 1,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0,
  });

  const recognitionRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Check browser support
  useEffect(() => {
    const isSupported =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

    setState((prev) => ({ ...prev, isSupported }));

    if (isSupported && !isInitializedRef.current) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = language;
      recognitionRef.current.maxAlternatives = maxAlternatives;

      isInitializedRef.current = true;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, [continuous, interimResults, language, maxAlternatives]);

  // Set up event listeners
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setState((prev) => ({
          ...prev,
          transcript: prev.transcript + finalTranscript,
          interimTranscript: '',
          confidence,
        }));
        onResult?.(finalTranscript, true);
      } else {
        setState((prev) => ({
          ...prev,
          interimTranscript,
          confidence,
        }));
        onResult?.(interimTranscript, false);
      }
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Voice recognition error';

      switch (event.error) {
        case 'no-speech':
          errorMessage = "I didn't hear anything. Try speaking a bit louder.";
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device settings.';
          break;
        case 'not-allowed':
          errorMessage =
            'Microphone access denied. Please enable it in your browser settings.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        case 'aborted':
          // User cancelled - not an error
          errorMessage = '';
          break;
        default:
          errorMessage = `Voice error: ${event.error}`;
      }

      if (errorMessage) {
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isListening: false,
        }));
        onError?.(errorMessage);
      }
    };

    const handleStart = () => {
      setState((prev) => ({
        ...prev,
        isListening: true,
        error: null,
      }));
      onStart?.();
    };

    const handleEnd = () => {
      setState((prev) => ({
        ...prev,
        isListening: false,
      }));
      onEnd?.();
    };

    recognition.addEventListener('result', handleResult as EventListener);
    recognition.addEventListener('error', handleError as EventListener);
    recognition.addEventListener('start', handleStart);
    recognition.addEventListener('end', handleEnd);

    return () => {
      recognition.removeEventListener('result', handleResult as EventListener);
      recognition.removeEventListener('error', handleError as EventListener);
      recognition.removeEventListener('start', handleStart);
      recognition.removeEventListener('end', handleEnd);
    };
  }, [onResult, onError, onStart, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setState((prev) => ({
        ...prev,
        error: "Voice input isn't available on this device",
      }));
      return;
    }

    // Clear previous transcript
    setState((prev) => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
    }));

    try {
      recognitionRef.current.start();
    } catch (error) {
      // Recognition might already be started
      console.warn('Speech recognition error:', error);
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
    }
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
      confidence: 0,
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    clearError,
  };
}

// ============================================================================
// Voice Button Component Helper
// ============================================================================

export interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  className?: string;
}

export function getVoiceButtonLabel(isListening: boolean, isSupported: boolean): string {
  if (!isSupported) return 'Voice not available';
  return isListening ? 'Tap to stop' : 'Tap to speak';
}

// ============================================================================
// Accessibility Labels
// ============================================================================

export const VOICE_A11Y = {
  BUTTON_LABEL: 'Activate voice input',
  LISTENING_STATUS: 'Listening for your voice',
  STOPPED_STATUS: 'Voice input stopped',
  NOT_SUPPORTED: 'Voice input is not supported on this device',
  MICROPHONE_DENIED: 'Microphone access was denied',
} as const;
