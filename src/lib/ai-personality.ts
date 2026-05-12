// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * AI Personality System — Bevel Intelligence-style
 *
 * Parents choose how Aminy AI communicates with them.
 * The personality modifies the system prompt tone, not the clinical accuracy.
 */

export type AIPersonality = 'friend' | 'coach' | 'advocate' | 'clinical';

export interface PersonalityConfig {
  id: AIPersonality;
  name: string;
  tagline: string;
  description: string;
  traits: string[];
  traitEmojis: string[];
  sampleMessage: string;
  systemPromptModifier: string;
  color: string;
}

export const AI_PERSONALITIES: Record<AIPersonality, PersonalityConfig> = {
  friend: {
    id: 'friend',
    name: 'Friend',
    tagline: "You're doing great. Small steps really add up.",
    description: 'Warm, validating, celebrates small wins. Focuses on how you\'re feeling and helps you stay balanced without pressure.',
    traits: ['Supportive', 'Positive', 'Caring'],
    traitEmojis: ['❤️', '✨', '😊'],
    sampleMessage: "That sounds really hard. I want you to know — the fact that you're thinking about this means you're already doing better than you think.",
    systemPromptModifier: 'Respond with warmth and validation. Celebrate effort, not just outcomes. Use encouraging language. Acknowledge the parent\'s emotions before giving advice. Keep suggestions gentle and optional.',
    color: '#7BA7BC',
  },
  coach: {
    id: 'coach',
    name: 'Coach',
    tagline: "Here's exactly what to try tonight.",
    description: 'Direct, actionable, evidence-based. Cuts to what matters and gives clear, specific guidance you can use immediately.',
    traits: ['Focused', 'Decisive', 'Action-Driven'],
    traitEmojis: ['⚡', '🔥', '😤'],
    sampleMessage: "Here's your game plan for tonight: Start the bedtime runway at 7:30. Dim lights, no screens, same 3 steps in the same order. Give a 5-minute warning before each transition.",
    systemPromptModifier: 'Be direct and actionable. Lead with specific steps the parent can take right now. Use confident, coaching language. Prioritize clarity over comfort. Give numbered action items when possible.',
    color: '#E07A5F',
  },
  advocate: {
    id: 'advocate',
    name: 'Advocate',
    tagline: "Let me help you fight for what your child needs.",
    description: 'Protective, thorough, fights for your child. Helps you navigate systems, push back on denials, and get what your family deserves.',
    traits: ['Protective', 'Thorough', 'Persistent'],
    traitEmojis: ['💖', '📋', '💪'],
    sampleMessage: "That denial doesn't look right. Here's exactly what to say when you call back: ask for the clinical review criteria they used, and request the denial in writing within 48 hours. I'll help you draft the appeal.",
    systemPromptModifier: 'Be thorough and protective. Help the parent navigate complex systems (insurance, school, providers). Provide specific scripts, templates, and action steps. Be persistent on their behalf. Reference rights and regulations when relevant.',
    color: '#6B9080',
  },
  clinical: {
    id: 'clinical',
    name: 'Clinical',
    tagline: "Based on the data, here's what I'm seeing.",
    description: 'Data-driven, analytical, pattern-focused. Looks at trends in your child\'s data and explains what\'s happening in clear, evidence-based terms.',
    traits: ['Analytical', 'Insightful', 'Evidence-Based'],
    traitEmojis: ['🧐', '🔍', '🧠'],
    sampleMessage: "Looking at the last 14 days: transition meltdowns are down 23%, but sensory-seeking behavior increased by 15% in the afternoons. This pattern often means the morning regulation strategies are working, but the sensory diet needs adjustment after lunch.",
    systemPromptModifier: 'Be analytical and data-driven. Reference specific patterns, percentages, and trends from the child\'s data. Explain the clinical reasoning behind recommendations. Use professional but accessible language. Connect observations to evidence-based practices.',
    color: '#577590',
  },
};

export const DEFAULT_PERSONALITY: AIPersonality = 'friend';

export function getPersonalitySystemPrompt(personality: AIPersonality): string {
  return AI_PERSONALITIES[personality]?.systemPromptModifier || AI_PERSONALITIES.friend.systemPromptModifier;
}

// ─── Usage Limits ───────────────────────────────────────────────────

export interface UsageLimits {
  tier: 'free' | 'core' | 'pro' | 'proplus';
  messagesPerWeek: number;
  messagesUsedThisWeek: number;
  percentUsed: number;
  resetsAt: string;
  isUnlimited: boolean;
}

export function getUsageLimits(tier: string, messagesUsed: number): UsageLimits {
  const limits: Record<string, number> = {
    free: 15,
    core: 100,
    pro: 500,
    proplus: -1, // unlimited
  };

  const weeklyLimit = limits[tier] ?? 15;
  const isUnlimited = weeklyLimit === -1;
  const percentUsed = isUnlimited ? 0 : Math.min(100, Math.round((messagesUsed / weeklyLimit) * 100));

  // Calculate next Sunday 5PM reset
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextReset = new Date(now);
  nextReset.setDate(now.getDate() + daysUntilSunday);
  nextReset.setHours(17, 0, 0, 0);

  return {
    tier: tier as UsageLimits['tier'],
    messagesPerWeek: weeklyLimit,
    messagesUsedThisWeek: messagesUsed,
    percentUsed,
    resetsAt: nextReset.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }),
    isUnlimited,
  };
}

// ─── AI Settings Preferences ────────────────────────────────────────

export interface AminyAISettings {
  personality: AIPersonality;
  showThinkingSteps: boolean;
  showFollowUpSuggestions: boolean;
  shareDataWithProvider: boolean;
  memoryEnabled: boolean;
}

export const DEFAULT_AI_SETTINGS: AminyAISettings = {
  personality: 'friend',
  showThinkingSteps: true,
  showFollowUpSuggestions: true,
  shareDataWithProvider: true,
  memoryEnabled: true,
};

export function loadAISettings(): AminyAISettings {
  try {
    const stored = localStorage.getItem('aminy-ai-settings');
    if (stored) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_AI_SETTINGS;
}

export function saveAISettings(settings: AminyAISettings): void {
  try {
    localStorage.setItem('aminy-ai-settings', JSON.stringify(settings));
  } catch { /* ignore */ }
}
