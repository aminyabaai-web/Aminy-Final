/**
 * Voice Input Button Component
 *
 * A reusable voice input button with visual feedback, animations,
 * and accessibility support for voice-first onboarding.
 */

import React, { useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useVoiceInput, VOICE_A11Y } from '../hooks/useVoiceInput';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// ============================================================================
// Types
// ============================================================================

interface VoiceInputButtonProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'minimal' | 'floating';
  size?: 'sm' | 'md' | 'lg';
  showTranscript?: boolean;
  placeholder?: string;
  continuous?: boolean;
  autoStop?: boolean;
  autoStopDelay?: number;
}

// ============================================================================
// Component
// ============================================================================

export function VoiceInputButton({
  onTranscript,
  onError,
  disabled = false,
  className,
  variant = 'default',
  size = 'md',
  showTranscript = true,
  placeholder = 'Tap to speak...',
  continuous = false,
  autoStop = true,
  autoStopDelay = 2000,
}: VoiceInputButtonProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    confidence,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    clearError,
  } = useVoiceInput({
    continuous,
    interimResults: true,
    onResult: onTranscript,
    onError,
  });

  // Auto-stop after silence (for non-continuous mode)
  useEffect(() => {
    if (!isListening || continuous || !autoStop) return;

    let silenceTimer: ReturnType<typeof setTimeout>;

    if (transcript || interimTranscript) {
      silenceTimer = setTimeout(() => {
        if (isListening) {
          stopListening();
        }
      }, autoStopDelay);
    }

    return () => clearTimeout(silenceTimer);
  }, [
    isListening,
    transcript,
    interimTranscript,
    continuous,
    autoStop,
    autoStopDelay,
    stopListening,
  ]);

  // Clear error after display
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleClick = useCallback(() => {
    if (!isSupported) {
      onError?.("Voice input isn't available on this device");
      return;
    }
    resetTranscript();
    toggleListening();
  }, [isSupported, onError, resetTranscript, toggleListening]);

  // Size classes
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Render based on variant
  if (variant === 'floating') {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        {/* Main button */}
        <motion.button
          onClick={handleClick}
          disabled={disabled || !isSupported}
          className={cn(
            'relative rounded-full flex items-center justify-center transition-all shadow-lg',
            sizeClasses[size],
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gradient-to-br from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white',
            disabled && 'opacity-50 cursor-not-allowed',
            !isSupported && 'bg-gray-300 cursor-not-allowed'
          )}
          whileTap={{ scale: 0.95 }}
          aria-label={
            isListening
              ? VOICE_A11Y.LISTENING_STATUS
              : isSupported
                ? VOICE_A11Y.BUTTON_LABEL
                : VOICE_A11Y.NOT_SUPPORTED
          }
        >
          {/* Pulsing ring when listening */}
          <AnimatePresence>
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-400"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-400"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Icon */}
          {isListening ? (
            <MicOff className={iconSizes[size]} />
          ) : (
            <Mic className={iconSizes[size]} />
          )}
        </motion.button>

        {/* Status text */}
        <p className="text-sm text-muted-foreground">
          {isListening ? 'Listening... tap to stop' : isSupported ? placeholder : 'Voice not available'}
        </p>

        {/* Transcript preview */}
        {showTranscript && (interimTranscript || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xs text-center p-3 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-700">
              {interimTranscript || transcript}
              {interimTranscript && (
                <span className="inline-block w-1 h-4 ml-1 bg-teal-500 animate-pulse" />
              )}
            </p>
            {confidence > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Confidence: {Math.round(confidence * 100)}%
              </p>
            )}
          </motion.div>
        )}

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={disabled || !isSupported}
        className={cn(
          isListening && 'bg-red-100 text-red-600 hover:bg-red-200',
          className
        )}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
    );
  }

  // Default variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant={isListening ? 'destructive' : 'outline'}
        onClick={handleClick}
        disabled={disabled || !isSupported}
        className={cn(
          'relative',
          isListening && 'animate-pulse'
        )}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Stop
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Speak
          </>
        )}
      </Button>

      {showTranscript && interimTranscript && (
        <span className="text-sm text-muted-foreground italic">
          {interimTranscript}
          <Loader2 className="w-3 h-3 inline ml-1 animate-spin" />
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Inline Voice Input (for text areas)
// ============================================================================

interface VoiceTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export function VoiceTextInput({
  value,
  onChange,
  placeholder = 'Type or tap the microphone to speak...',
  className,
  rows = 3,
  disabled = false,
}: VoiceTextInputProps) {
  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal) {
        onChange(value + (value ? ' ' : '') + transcript);
      }
    },
    [value, onChange]
  );

  return (
    <div className={cn('relative', className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-4 py-3 pr-14 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
      />
      <div className="absolute right-2 bottom-2">
        <VoiceInputButton
          variant="minimal"
          onTranscript={handleTranscript}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Voice-First Prompt Component
// ============================================================================

interface VoicePromptProps {
  prompt: string;
  subtext?: string;
  onResponse: (response: string) => void;
  onSkip?: () => void;
  skipLabel?: string;
  className?: string;
}

export function VoicePrompt({
  prompt,
  subtext,
  onResponse,
  onSkip,
  skipLabel = 'Type instead',
  className,
}: VoicePromptProps) {
  const [showTextInput, setShowTextInput] = React.useState(false);
  const [textValue, setTextValue] = React.useState('');

  const handleVoiceTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal && transcript.trim()) {
        onResponse(transcript.trim());
      }
    },
    [onResponse]
  );

  const handleTextSubmit = useCallback(() => {
    if (textValue.trim()) {
      onResponse(textValue.trim());
    }
  }, [textValue, onResponse]);

  return (
    <div className={cn('flex flex-col items-center text-center space-y-6', className)}>
      {/* Prompt */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{prompt}</h2>
        {subtext && <p className="text-muted-foreground mt-2">{subtext}</p>}
      </div>

      {/* Voice or Text Input */}
      {!showTextInput ? (
        <>
          <VoiceInputButton
            variant="floating"
            size="lg"
            onTranscript={handleVoiceTranscript}
            placeholder="Tap and speak your answer"
          />

          {onSkip && (
            <button
              onClick={() => setShowTextInput(true)}
              className="text-sm text-teal-600 hover:text-teal-700 underline"
            >
              {skipLabel}
            </button>
          )}
        </>
      ) : (
        <div className="w-full max-w-md space-y-3">
          <VoiceTextInput
            value={textValue}
            onChange={setTextValue}
            placeholder="Type your answer..."
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTextInput(false)}
              className="flex-1"
            >
              Use voice
            </Button>
            <Button onClick={handleTextSubmit} disabled={!textValue.trim()} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
