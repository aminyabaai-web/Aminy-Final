// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useOpenAI } from '../lib/ai-sparkle-context';

interface AISparkleButtonProps {
  prompt: string;
  label?: string;
  className?: string;
}

export function AISparkleButton({ prompt, label, className = '' }: AISparkleButtonProps) {
  const openAI = useOpenAI();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openAI(prompt); }}
      title={label || 'Ask Aminy AI'}
      className={`group inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all bg-gradient-to-r from-teal-500/10 to-violet-500/10 border border-teal-200/50 dark:border-teal-700/50 hover:from-teal-500/20 hover:to-violet-500/20 hover:border-teal-300 dark:hover:border-teal-600 ${className}`}
    >
      <Sparkles className="w-3 h-3 text-teal-500 group-hover:text-violet-500 transition-colors" />
      {label && <span className="text-teal-700 dark:text-teal-300">{label}</span>}
    </button>
  );
}
