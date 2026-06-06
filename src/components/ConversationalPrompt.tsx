// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Mic, Type } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ConversationalPromptProps {
  prompt: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  micDefaultOn?: boolean;
}

export function ConversationalPrompt({
  prompt,
  placeholder,
  onSubmit,
  micDefaultOn = true
}: ConversationalPromptProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>(micDefaultOn ? 'voice' : 'text');
  const [value, setValue] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    setIsListening(true);
    // Implement voice recognition
    setTimeout(() => {
      setIsListening(false);
      setValue('Voice input result...');
    }, 2000);
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* AI Prompt */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mb-4">
          <Mic className="w-6 h-6 text-accent" />
        </div>
        <p className="text-lg font-medium text-[#3A4A57]">{prompt}</p>
      </div>

      {/* Input Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={inputMode === 'voice' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('voice')}
        >
          <Mic className="w-4 h-4 mr-2" />
          Voice
        </Button>
        <Button
          variant={inputMode === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('text')}
        >
          <Type className="w-4 h-4 mr-2" />
          Type
        </Button>
      </div>

      {/* Voice Input */}
      {inputMode === 'voice' && (
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <button
            onClick={handleVoiceInput}
            className={`
              w-24 h-24 rounded-full bg-accent flex items-center justify-center
              transition-all duration-200 hover:scale-105
              ${isListening ? 'animate-pulse' : ''}
            `}
          >
            <Mic className="w-12 h-12 text-white" />
          </button>
          <p className="text-sm text-muted-foreground">
            {isListening ? 'Listening...' : 'Tap to speak'}
          </p>
        </div>
      )}

      {/* Text Input */}
      {inputMode === 'text' && (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px]"
        />
      )}

      {/* Submit */}
      {value && (
        <Button
          onClick={() => onSubmit(value)}
          className="w-full"
          size="lg"
        >
          Continue
        </Button>
      )}
    </div>
  );
}
