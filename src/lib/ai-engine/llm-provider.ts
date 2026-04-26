// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * LLM Provider Abstraction Layer
 *
 * Decouples Aminy from any single LLM provider (Claude, OpenAI, etc.).
 * Routes different tasks to appropriate models based on cost/quality tradeoffs.
 *
 * Current routing:
 * - Primary chat (Ask Aminy): Claude Sonnet via Supabase Edge Function
 * - Fallback: Pattern-based local engine (no API needed)
 * - Future: OpenAI GPT-4o, local models, etc.
 *
 * Why this matters for exit:
 * - Acquirers won't accept single-vendor LLM dependency
 * - Enables cost optimization (cheap model for intent detection, premium for chat)
 * - Enables offline/degraded mode
 */

// ─── Provider Registry ──────────────────────────────────────────────

export type LLMProvider = 'claude' | 'openai' | 'local-fallback';

export type TaskType =
  | 'chat'              // Primary conversational AI (requires best model)
  | 'intent-detection'  // Classify user intent from search query (can use cheap model)
  | 'note-generation'   // Generate SOAP notes (currently template-based, no LLM)
  | 'memory-extraction' // Extract facts from conversation (can use cheap model)
  | 'translation'       // Translate clinical→parent language (currently rule-based)
  | 'summarization'     // Summarize session/week (medium model)
  | 'crisis-detection'; // Detect crisis language (must be fast + reliable)

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  endpoint: string;
  apiKeyEnvVar: string;
  maxTokens: number;
  costPer1kTokens: number; // USD
  isAvailable: boolean;
}

export interface TaskRouting {
  primary: LLMProvider;
  fallback: LLMProvider;
  maxLatencyMs: number;
  requiresStreaming: boolean;
}

// ─── Provider Configurations ────────────────────────────────────────

const PROVIDERS: Record<LLMProvider, LLMConfig> = {
  claude: {
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    endpoint: '', // Routed through Supabase Edge Function
    apiKeyEnvVar: 'ANTHROPIC_API_KEY', // Server-side only
    maxTokens: 4096,
    costPer1kTokens: 0.003,
    isAvailable: true,
  },
  openai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    maxTokens: 4096,
    costPer1kTokens: 0.00015,
    isAvailable: false, // Enable when OpenAI key is configured
  },
  'local-fallback': {
    provider: 'local-fallback',
    model: 'pattern-engine',
    endpoint: '', // No API — runs locally
    apiKeyEnvVar: '',
    maxTokens: 1000,
    costPer1kTokens: 0,
    isAvailable: true, // Always available
  },
};

// ─── Task Routing Table ─────────────────────────────────────────────

const TASK_ROUTING: Record<TaskType, TaskRouting> = {
  chat: {
    primary: 'claude',
    fallback: 'local-fallback',
    maxLatencyMs: 30000,
    requiresStreaming: true,
  },
  'intent-detection': {
    primary: 'claude',
    fallback: 'local-fallback', // Keyword-based fallback works fine
    maxLatencyMs: 5000,
    requiresStreaming: false,
  },
  'note-generation': {
    primary: 'local-fallback', // Template-based, no API needed
    fallback: 'local-fallback',
    maxLatencyMs: 1000,
    requiresStreaming: false,
  },
  'memory-extraction': {
    primary: 'claude',
    fallback: 'local-fallback', // Pattern-based fallback
    maxLatencyMs: 10000,
    requiresStreaming: false,
  },
  translation: {
    primary: 'local-fallback', // Rule-based, no API needed
    fallback: 'local-fallback',
    maxLatencyMs: 500,
    requiresStreaming: false,
  },
  summarization: {
    primary: 'claude',
    fallback: 'local-fallback',
    maxLatencyMs: 15000,
    requiresStreaming: false,
  },
  'crisis-detection': {
    primary: 'local-fallback', // Must be instant, keyword-based
    fallback: 'local-fallback',
    maxLatencyMs: 100, // Must be fast
    requiresStreaming: false,
  },
};

// ─── Provider Selection Logic ───────────────────────────────────────

/**
 * Get the best available provider for a given task.
 * Falls back automatically if primary is unavailable.
 */
export function getProviderForTask(task: TaskType): LLMConfig {
  const routing = TASK_ROUTING[task];
  const primary = PROVIDERS[routing.primary];

  if (primary.isAvailable) {
    return primary;
  }

  const fallback = PROVIDERS[routing.fallback];
  return fallback;
}

/**
 * Check if a provider is currently available.
 * In the future, this could ping the provider's health endpoint.
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  return PROVIDERS[provider].isAvailable;
}

/**
 * Get routing config for a task type.
 */
export function getTaskRouting(task: TaskType): TaskRouting {
  return TASK_ROUTING[task];
}

/**
 * Get estimated cost for a task based on expected token count.
 */
export function estimateTaskCost(task: TaskType, estimatedTokens: number): {
  provider: LLMProvider;
  estimatedCostUSD: number;
} {
  const config = getProviderForTask(task);
  return {
    provider: config.provider,
    estimatedCostUSD: (estimatedTokens / 1000) * config.costPer1kTokens,
  };
}

// ─── Cost Tracking ──────────────────────────────────────────────────

let sessionTokenCount = 0;
let sessionCostUSD = 0;

export function trackAPIUsage(tokens: number, costPer1k: number): void {
  sessionTokenCount += tokens;
  sessionCostUSD += (tokens / 1000) * costPer1k;
}

export function getSessionUsage(): { tokens: number; costUSD: number } {
  return { tokens: sessionTokenCount, costUSD: sessionCostUSD };
}

// ─── Exports ────────────────────────────────────────────────────────

export { PROVIDERS, TASK_ROUTING };
