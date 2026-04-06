// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Multi-Turn Conversation Memory
 *
 * Enables Aminy to maintain context across multiple conversations.
 * "Last time we talked about Johnny's sleep schedule..."
 *
 * This is distinct from:
 *   - conversation-memory.ts (in ai-engine/) — per-conversation fact extraction
 *   - ai-memory-engine.ts — document/fact-level memory
 *   - conversation-store.ts — raw message persistence
 *
 * This module handles CROSS-conversation summarization and memory retrieval,
 * enabling the AI to reference prior conversation context without sending
 * full message histories every time.
 *
 * Architecture:
 *   ConversationMemory class:
 *     - getRecentContext() — fetch summaries of last N conversations
 *     - summarizeConversation() — generate 2-3 sentence summary
 *     - buildMemoryContext() — combine summaries into system prompt block
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// Types
// ============================================================================

export interface ConversationSummary {
  id: string;
  conversationId: string;
  userId: string;
  childId?: string;
  summary: string;
  keyTopics: string[];
  emotionalTone: 'positive' | 'neutral' | 'concerned' | 'crisis';
  actionItems: string[];
  strategiesMentioned: string[];
  createdAt: string;
}

export interface MemoryBlock {
  summaries: ConversationSummary[];
  formattedContext: string;
  topicFrequency: Record<string, number>;
  totalConversations: number;
}

// ============================================================================
// ConversationMemory Class
// ============================================================================

export class ConversationMemory {
  private backendUrl: string;

  constructor() {
    this.backendUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;
  }

  /**
   * Get summaries of the most recent conversations for a user.
   * These summaries provide cross-conversation context to the AI.
   */
  async getRecentContext(
    userId: string,
    childId?: string,
    maxConversations: number = 5
  ): Promise<ConversationSummary[]> {
    try {
      let query = supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(maxConversations);

      if (childId) {
        query = query.eq('child_id', childId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapDbSummary);
    } catch (err) {
      console.error('[MultiTurnMemory] Failed to load recent context:', err);

      // Fallback: try localStorage
      return this.getRecentContextLocal(userId, maxConversations);
    }
  }

  /**
   * Generate a 2-3 sentence summary of a conversation.
   * Uses AI for high-quality summaries, with a regex/heuristic fallback.
   */
  async summarizeConversation(
    conversationId: string,
    messages: Array<{ role: string; content: string }>,
    userId: string,
    childId?: string
  ): Promise<ConversationSummary> {
    const now = new Date().toISOString();

    // Extract metadata from messages
    const keyTopics = this.extractTopics(messages);
    const emotionalTone = this.detectEmotionalTone(messages);
    const actionItems = this.extractActionItems(messages);
    const strategiesMentioned = this.extractStrategies(messages);

    // Try AI-powered summarization
    let summary: string;
    try {
      summary = await this.generateAISummary(messages);
    } catch {
      // Fallback to heuristic summary
      summary = this.generateHeuristicSummary(messages, keyTopics);
    }

    const record: ConversationSummary = {
      id: `summary-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      userId,
      childId,
      summary,
      keyTopics,
      emotionalTone,
      actionItems,
      strategiesMentioned,
      createdAt: now,
    };

    // Store the summary
    await this.storeSummary(record);

    return record;
  }

  /**
   * Build a formatted memory context block for injection into AI system prompts.
   * Combines recent conversation summaries into a coherent memory block.
   */
  async buildMemoryContext(
    userId: string,
    childId?: string,
    maxConversations: number = 5
  ): Promise<MemoryBlock> {
    const summaries = await this.getRecentContext(userId, childId, maxConversations);

    if (summaries.length === 0) {
      return {
        summaries: [],
        formattedContext: '',
        topicFrequency: {},
        totalConversations: 0,
      };
    }

    // Build topic frequency map
    const topicFrequency: Record<string, number> = {};
    for (const summary of summaries) {
      for (const topic of summary.keyTopics) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      }
    }

    // Format for prompt injection
    const formattedContext = this.formatMemoryBlock(summaries, topicFrequency);

    return {
      summaries,
      formattedContext,
      topicFrequency,
      totalConversations: summaries.length,
    };
  }

  // ============================================================================
  // Private: AI Summarization
  // ============================================================================

  private async generateAISummary(
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    const conversationText = messages
      .slice(-20) // Last 20 messages
      .map(m => `${m.role === 'user' ? 'Parent' : 'Aminy'}: ${m.content}`)
      .join('\n');

    const response = await fetch(`${this.backendUrl}/ai/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `Summarize this conversation between a parent and Aminy (an AI companion for parents of neurodivergent children) in 2-3 sentences. Focus on: what was discussed, any strategies suggested, and the emotional state of the parent. Be specific — use the child's name if mentioned.`,
          },
          {
            role: 'user',
            content: conversationText,
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Summarization failed: ${response.status}`);
    }

    const data = await response.json();
    return data.summary || data.message || data.content || '';
  }

  private generateHeuristicSummary(
    messages: Array<{ role: string; content: string }>,
    topics: string[]
  ): string {
    const userMessages = messages.filter(m => m.role === 'user');
    const messageCount = messages.length;

    // Build summary from first user message + topics
    const firstQuestion = userMessages[0]?.content?.slice(0, 80) || 'general support';
    const topicStr = topics.length > 0
      ? `Topics discussed: ${topics.slice(0, 3).join(', ')}.`
      : '';

    return `Conversation with ${messageCount} messages. Started with: "${firstQuestion}". ${topicStr}`.trim();
  }

  // ============================================================================
  // Private: Extraction Helpers
  // ============================================================================

  private extractTopics(messages: Array<{ role: string; content: string }>): string[] {
    const combined = messages.map(m => m.content).join(' ').toLowerCase();
    const topics: string[] = [];

    const topicMap: Array<{ pattern: RegExp; topic: string }> = [
      { pattern: /routine|schedule|transition/i, topic: 'routines' },
      { pattern: /behavior|meltdown|tantrum|aggress/i, topic: 'behavior' },
      { pattern: /speech|communication|talk|words|language/i, topic: 'communication' },
      { pattern: /school|iep|teacher|classroom|education/i, topic: 'school' },
      { pattern: /sensory|overwhelm|loud|texture|stim/i, topic: 'sensory' },
      { pattern: /sleep|bedtime|wake|night/i, topic: 'sleep' },
      { pattern: /eat|food|meal|picky|feeding/i, topic: 'feeding' },
      { pattern: /anxious|anxiety|worry|fear|scared/i, topic: 'anxiety' },
      { pattern: /social|friends|play|peer|sharing/i, topic: 'social' },
      { pattern: /therapy|aba|ot|pt|bcba|speech therapy/i, topic: 'therapy' },
      { pattern: /insurance|coverage|benefits|medicaid|waiver/i, topic: 'benefits' },
      { pattern: /caregiver|self[- ]care|burnout|exhaust/i, topic: 'caregiver-wellness' },
      { pattern: /medication|med|prescription|dosage/i, topic: 'medication' },
      { pattern: /diagnos|evaluation|assess/i, topic: 'diagnosis' },
      { pattern: /potty|toilet|train/i, topic: 'toilet-training' },
    ];

    for (const { pattern, topic } of topicMap) {
      if (pattern.test(combined)) {
        topics.push(topic);
      }
    }

    return topics.slice(0, 5);
  }

  private detectEmotionalTone(
    messages: Array<{ role: string; content: string }>
  ): ConversationSummary['emotionalTone'] {
    const userText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ')
      .toLowerCase();

    const crisisKeywords = ['suicide', 'kill myself', 'end it', 'want to die', 'crisis', '988'];
    const concernedKeywords = ['worried', 'struggling', 'frustrated', 'hard time', 'meltdown', 'overwhelmed', 'exhausted', 'can\'t'];
    const positiveKeywords = ['progress', 'improvement', 'worked', 'success', 'proud', 'better', 'amazing', 'milestone'];

    if (crisisKeywords.some(k => userText.includes(k))) return 'crisis';
    if (concernedKeywords.filter(k => userText.includes(k)).length >= 2) return 'concerned';
    if (positiveKeywords.filter(k => userText.includes(k)).length >= 2) return 'positive';
    return 'neutral';
  }

  private extractActionItems(messages: Array<{ role: string; content: string }>): string[] {
    const aiMessages = messages.filter(m => m.role === 'assistant');
    const items: string[] = [];

    for (const msg of aiMessages) {
      // Look for numbered or bulleted action items
      const bullets = msg.content.match(/(?:^|\n)\s*(?:\d+\.|[-*•])\s+(.+)/g);
      if (bullets) {
        for (const bullet of bullets.slice(0, 3)) {
          const cleaned = bullet.replace(/^\s*(?:\d+\.|[-*•])\s+/, '').trim();
          if (cleaned.length > 10 && cleaned.length < 200) {
            items.push(cleaned);
          }
        }
      }
    }

    return items.slice(0, 5);
  }

  private extractStrategies(messages: Array<{ role: string; content: string }>): string[] {
    const combined = messages.map(m => m.content).join(' ');
    const strategies: string[] = [];

    const strategyPatterns = [
      /visual\s+schedule/i,
      /first[- ]then/i,
      /social\s+stor(?:y|ies)/i,
      /timer/i,
      /deep\s+breath/i,
      /sensory\s+break/i,
      /token\s+economy/i,
      /positive\s+reinforcement/i,
      /visual\s+support/i,
      /calm[- ]down\s+corner/i,
      /quiet\s+space/i,
      /fidget/i,
      /weighted\s+blanket/i,
      /noise[- ]cancel/i,
      /communication\s+board/i,
    ];

    for (const pattern of strategyPatterns) {
      const match = combined.match(pattern);
      if (match) {
        strategies.push(match[0]);
      }
    }

    return strategies;
  }

  // ============================================================================
  // Private: Storage
  // ============================================================================

  private async storeSummary(summary: ConversationSummary): Promise<void> {
    // Save to localStorage
    try {
      const key = `aminy_conv_summary_${summary.conversationId}`;
      localStorage.setItem(key, JSON.stringify(summary));
    } catch { /* non-critical */ }

    // Save to Supabase
    try {
      await supabase.from('conversation_summaries').upsert({
        id: summary.id,
        conversation_id: summary.conversationId,
        user_id: summary.userId,
        child_id: summary.childId || null,
        summary: summary.summary,
        key_topics: summary.keyTopics,
        emotional_tone: summary.emotionalTone,
        action_items: summary.actionItems,
        strategies_mentioned: summary.strategiesMentioned,
        created_at: summary.createdAt,
      }, { onConflict: 'conversation_id' });
    } catch (err) {
      console.error('[MultiTurnMemory] Failed to store summary:', err);
    }
  }

  private getRecentContextLocal(
    userId: string,
    max: number
  ): ConversationSummary[] {
    const summaries: ConversationSummary[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('aminy_conv_summary_')) continue;
        const data = JSON.parse(localStorage.getItem(key) || '');
        if (data.userId === userId) {
          summaries.push(data);
        }
      }
    } catch { /* non-critical */ }

    return summaries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, max);
  }

  // ============================================================================
  // Private: Formatting
  // ============================================================================

  private formatMemoryBlock(
    summaries: ConversationSummary[],
    topicFrequency: Record<string, number>
  ): string {
    const lines: string[] = [];

    // Recurring topics (mentioned in 2+ conversations)
    const recurringTopics = Object.entries(topicFrequency)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .map(([topic]) => topic);

    if (recurringTopics.length > 0) {
      lines.push(`RECURRING THEMES: ${recurringTopics.join(', ')}`);
    }

    // Recent conversation summaries
    lines.push('\nRECENT CONVERSATIONS:');
    for (const summary of summaries.slice(0, 5)) {
      const date = new Date(summary.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const toneEmoji = summary.emotionalTone === 'positive' ? '(positive)'
        : summary.emotionalTone === 'concerned' ? '(concerned)'
        : '';

      lines.push(`• ${date} ${toneEmoji}: ${summary.summary}`);

      if (summary.strategiesMentioned.length > 0) {
        lines.push(`  Strategies discussed: ${summary.strategiesMentioned.join(', ')}`);
      }
    }

    // Strategies that keep coming up (helpful for continuity)
    const allStrategies = summaries.flatMap(s => s.strategiesMentioned);
    const strategyCount = new Map<string, number>();
    for (const s of allStrategies) {
      strategyCount.set(s.toLowerCase(), (strategyCount.get(s.toLowerCase()) || 0) + 1);
    }
    const topStrategies = Array.from(strategyCount.entries())
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([strategy]) => strategy);

    if (topStrategies.length > 0) {
      lines.push(`\nFREQUENTLY USED STRATEGIES: ${topStrategies.join(', ')}`);
    }

    return lines.join('\n');
  }
}

// ============================================================================
// DB Mapping
// ============================================================================

function mapDbSummary(row: Record<string, unknown>): ConversationSummary {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    userId: row.user_id as string,
    childId: row.child_id as string | undefined,
    summary: row.summary as string,
    keyTopics: (row.key_topics || []) as string[],
    emotionalTone: (row.emotional_tone || 'neutral') as ConversationSummary['emotionalTone'],
    actionItems: (row.action_items || []) as string[],
    strategiesMentioned: (row.strategies_mentioned || []) as string[],
    createdAt: row.created_at as string,
  };
}

// ============================================================================
// Singleton & Convenience
// ============================================================================

let _instance: ConversationMemory | null = null;

export function getConversationMemory(): ConversationMemory {
  if (!_instance) _instance = new ConversationMemory();
  return _instance;
}

/**
 * Quick helper: build memory context for the current user.
 */
export async function buildMultiTurnMemoryContext(
  userId: string,
  childId?: string
): Promise<string> {
  const memory = getConversationMemory();
  const block = await memory.buildMemoryContext(userId, childId);
  return block.formattedContext;
}

export default ConversationMemory;
