// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useOpenAI } from '../lib/ai-sparkle-context';

interface AISparkleButtonProps {
  prompt: string;
  label?: string;
  className?: string;
  /** When true, asks the AI to include a visual chart in its response (like Bevel/Monarch). */
  visual?: boolean;
}

export function AISparkleButton({ prompt, label, className = '', visual = false }: AISparkleButtonProps) {
  const openAI = useOpenAI();

  // When `visual` is set, append a chart-request hint so Claude embeds a
  // [CHART:...] block — parseAIResponseParts in BevelChatOverlay renders it inline.
  const fullPrompt = visual
    ? `${prompt}\n\nPlease include a visual chart (bar, line, or pie) inline in your response that summarizes the data clearly. Format: [CHART:{"type":"bar","title":"…","data":[{"x":"…","y":1}],"xKey":"x","yKey":"y"}]`
    : prompt;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); openAI(fullPrompt); }}
      title={label || 'Ask Aminy AI'}
      className={`group inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all bg-gradient-to-r from-teal-500/10 to-violet-500/10 border border-[#6B9080]/20/50 dark:border-teal-700/50 hover:from-teal-500/20 hover:to-violet-500/20 hover:border-[#6B9080]/30 dark:hover:border-[#6B9080] min-h-[32px] ${className}`}
    >
      <Sparkles className="w-3 h-3 text-primary group-hover:text-violet-500 transition-colors shrink-0" />
      {label && <span className="text-[#6B9080] dark:text-[#7BA7BC]">{label}</span>}
    </button>
  );
}
