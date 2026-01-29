/**
 * Aminy Memory System
 *
 * Comprehensive AI memory management with tier-based limits.
 * Enables the AI to "remember" across conversations and learn from documents.
 *
 * Memory Tiers (MUST match tier-utils.ts):
 * - FREE: 5 messages/day, 0-day memory, no vault learning
 * - STARTER: 20 messages/day, 30-day memory, basic vault (5 docs)
 * - CORE: Unlimited messages, 90-day memory, full vault (25 docs)
 * - PRO: Unlimited messages, unlimited memory, unlimited vault
 * - PROPLUS: Unlimited everything + advanced analytics context
 */

import type { TierType } from './tier-utils';

// ============================================
// TYPES
// ============================================

export interface MemoryFact {
  id: string;
  childId: string;
  category: 'preference' | 'trigger' | 'strength' | 'challenge' | 'milestone' | 'strategy' | 'medical' | 'educational';
  content: string;
  source: 'conversation' | 'onboarding' | 'vault' | 'provider' | 'manual';
  confidence: number; // 0-1
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // For tier-based memory limits
}

export interface VaultDocument {
  id: string;
  childId: string;
  type: 'iep' | 'evaluation' | 'medical' | 'therapy' | 'report' | 'other';
  title: string;
  content: string; // Extracted text
  summary?: string; // AI-generated summary
  keyFacts: string[]; // Extracted facts for context
  uploadedAt: string;
  processedAt?: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
}

export interface ConversationMemory {
  id: string;
  childId: string;
  summary: string;
  keyTopics: string[];
  emotionalContext: 'positive' | 'neutral' | 'stressed' | 'crisis';
  timestamp: string;
}

export interface MemoryUsage {
  messagesUsedToday: number;
  messagesLimit: number;
  documentsCount: number;
  documentsLimit: number;
  memoryDays: number;
  memoryDaysLimit: number;
  factsCount: number;
}

// ============================================
// TIER LIMITS
// ============================================

export const TIER_LIMITS: Record<TierType, {
  messagesPerDay: number;
  memoryDays: number;
  maxDocuments: number;
  maxFacts: number;
  canLearnFromVault: boolean;
  contextTokens: number;
}> = {
  // Free: Discovery tier - risk-free intro, builds habit/trust
  // MUST MATCH tier-utils.ts getAIMessageLimit()
  // NOTE: Free tier MUST have memory to feel personal - otherwise users churn immediately
  free: {
    messagesPerDay: 5,            // 5 messages/day (matches tier-utils.ts)
    memoryDays: 14,               // 14-day memory for personalization (critical for activation)
    maxDocuments: 0,              // No vault access (upgrade incentive)
    maxFacts: 50,                 // More facts for personalization (upgrade hook: "You have 50 memories...")
    canLearnFromVault: false,
    contextTokens: 3000,          // Enough context for helpful responses
  },
  // Starter: Entry Empowerment - $6.99/mo
  // MUST MATCH tier-utils.ts getAIMessageLimit()
  starter: {
    messagesPerDay: 20,           // 20 messages/day (matches tier-utils.ts)
    memoryDays: 30,               // Short context memory
    maxDocuments: 5,              // Basic vault
    maxFacts: 100,
    canLearnFromVault: true,
    contextTokens: 4000,
  },
  // Core: Full Companion - $14.99/mo
  // MUST MATCH tier-utils.ts getAIMessageLimit()
  core: {
    messagesPerDay: Infinity,     // Unlimited (matches tier-utils.ts null)
    memoryDays: 90,               // Full context (multi-session memory)
    maxDocuments: 25,             // Full vault access
    maxFacts: 500,
    canLearnFromVault: true,
    contextTokens: 8000,
  },
  // Pro: Premium Ecosystem - $29.99/mo
  // MUST MATCH tier-utils.ts getAIMessageLimit()
  pro: {
    messagesPerDay: Infinity,     // Unlimited (matches tier-utils.ts null)
    memoryDays: Infinity,         // Unlimited memory
    maxDocuments: Infinity,       // Unlimited vault
    maxFacts: Infinity,
    canLearnFromVault: true,
    contextTokens: 16000,
  },
  // Pro Plus: Enterprise tier - $49.99/mo
  // MUST MATCH tier-utils.ts getAIMessageLimit()
  proplus: {
    messagesPerDay: Infinity,     // Unlimited (matches tier-utils.ts null)
    memoryDays: Infinity,         // Unlimited memory
    maxDocuments: Infinity,       // Unlimited vault
    maxFacts: Infinity,
    canLearnFromVault: true,
    contextTokens: 32000,         // Maximum context for advanced analytics
  },
};

// ============================================
// MEMORY MANAGER CLASS
// ============================================

class MemoryManager {
  private facts: Map<string, MemoryFact[]> = new Map();
  private documents: Map<string, VaultDocument[]> = new Map();
  private conversationSummaries: Map<string, ConversationMemory[]> = new Map();
  private dailyUsage: Map<string, number> = new Map(); // childId -> messages today
  private lastResetDate: string = new Date().toDateString();

  constructor() {
    this.loadFromStorage();
    this.resetDailyUsageIfNeeded();
  }

  // ============================================
  // STORAGE
  // ============================================

  private loadFromStorage() {
    try {
      const factsData = localStorage.getItem('aminy-memory-facts');
      const docsData = localStorage.getItem('aminy-memory-docs');
      const summariesData = localStorage.getItem('aminy-memory-summaries');
      const usageData = localStorage.getItem('aminy-memory-usage');

      if (factsData) {
        const parsed = JSON.parse(factsData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.facts.set(key, value as MemoryFact[]);
        });
      }
      if (docsData) {
        const parsed = JSON.parse(docsData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.documents.set(key, value as VaultDocument[]);
        });
      }
      if (summariesData) {
        const parsed = JSON.parse(summariesData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.conversationSummaries.set(key, value as ConversationMemory[]);
        });
      }
      if (usageData) {
        const parsed = JSON.parse(usageData);
        this.dailyUsage = new Map(Object.entries(parsed.usage || {}));
        this.lastResetDate = parsed.lastResetDate || new Date().toDateString();
      }
    } catch (e) {
      console.error('Failed to load memory from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      const factsObj: Record<string, MemoryFact[]> = {};
      this.facts.forEach((value, key) => { factsObj[key] = value; });
      localStorage.setItem('aminy-memory-facts', JSON.stringify(factsObj));

      const docsObj: Record<string, VaultDocument[]> = {};
      this.documents.forEach((value, key) => { docsObj[key] = value; });
      localStorage.setItem('aminy-memory-docs', JSON.stringify(docsObj));

      const summariesObj: Record<string, ConversationMemory[]> = {};
      this.conversationSummaries.forEach((value, key) => { summariesObj[key] = value; });
      localStorage.setItem('aminy-memory-summaries', JSON.stringify(summariesObj));

      const usageObj: Record<string, number> = {};
      this.dailyUsage.forEach((value, key) => { usageObj[key] = value; });
      localStorage.setItem('aminy-memory-usage', JSON.stringify({
        usage: usageObj,
        lastResetDate: this.lastResetDate
      }));
    } catch (e) {
      console.error('Failed to save memory to storage:', e);
    }
  }

  private resetDailyUsageIfNeeded() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyUsage.clear();
      this.lastResetDate = today;
      this.saveToStorage();
    }
  }

  // ============================================
  // USAGE TRACKING
  // ============================================

  getUsage(childId: string, tier: TierType): MemoryUsage {
    this.resetDailyUsageIfNeeded();
    const limits = TIER_LIMITS[tier];
    const facts = this.facts.get(childId) || [];
    const docs = this.documents.get(childId) || [];

    return {
      messagesUsedToday: this.dailyUsage.get(childId) || 0,
      messagesLimit: limits.messagesPerDay,
      documentsCount: docs.length,
      documentsLimit: limits.maxDocuments,
      memoryDays: limits.memoryDays,
      memoryDaysLimit: limits.memoryDays,
      factsCount: facts.length,
    };
  }

  canSendMessage(childId: string, tier: TierType): boolean {
    this.resetDailyUsageIfNeeded();
    const limits = TIER_LIMITS[tier];
    const used = this.dailyUsage.get(childId) || 0;
    return used < limits.messagesPerDay;
  }

  recordMessageSent(childId: string) {
    this.resetDailyUsageIfNeeded();
    const current = this.dailyUsage.get(childId) || 0;
    this.dailyUsage.set(childId, current + 1);
    this.saveToStorage();
  }

  getMessagesRemaining(childId: string, tier: TierType): number {
    const limits = TIER_LIMITS[tier];
    const used = this.dailyUsage.get(childId) || 0;
    return Math.max(0, limits.messagesPerDay - used);
  }

  /**
   * Get time until daily message reset (midnight local time)
   * Returns an object with hours, minutes, and a formatted string
   */
  getTimeUntilReset(): { hours: number; minutes: number; formatted: string } {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const msUntilReset = midnight.getTime() - now.getTime();
    const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    let formatted: string;
    if (hours > 0) {
      formatted = `${hours}h ${minutes}m`;
    } else {
      formatted = `${minutes}m`;
    }

    return { hours, minutes, formatted };
  }

  // ============================================
  // FACT MANAGEMENT
  // ============================================

  addFact(fact: Omit<MemoryFact, 'id' | 'createdAt' | 'updatedAt'>): MemoryFact {
    const newFact: MemoryFact = {
      ...fact,
      id: `fact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const childFacts = this.facts.get(fact.childId) || [];
    childFacts.push(newFact);
    this.facts.set(fact.childId, childFacts);
    this.saveToStorage();

    return newFact;
  }

  getFacts(childId: string, tier: TierType): MemoryFact[] {
    const limits = TIER_LIMITS[tier];
    const allFacts = this.facts.get(childId) || [];

    // Filter by memory days limit
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limits.memoryDays);

    return allFacts
      .filter(f => new Date(f.createdAt) >= cutoffDate)
      .slice(-limits.maxFacts);
  }

  getFactsByCategory(childId: string, category: MemoryFact['category'], tier: TierType): MemoryFact[] {
    return this.getFacts(childId, tier).filter(f => f.category === category);
  }

  // ============================================
  // DOCUMENT MANAGEMENT
  // ============================================

  canUploadDocument(childId: string, tier: TierType): boolean {
    const limits = TIER_LIMITS[tier];
    if (!limits.canLearnFromVault) return false;
    const docs = this.documents.get(childId) || [];
    return docs.length < limits.maxDocuments;
  }

  addDocument(doc: Omit<VaultDocument, 'id' | 'uploadedAt' | 'status'>): VaultDocument {
    const newDoc: VaultDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uploadedAt: new Date().toISOString(),
      status: 'pending',
    };

    const childDocs = this.documents.get(doc.childId) || [];
    childDocs.push(newDoc);
    this.documents.set(doc.childId, childDocs);
    this.saveToStorage();

    return newDoc;
  }

  getDocuments(childId: string): VaultDocument[] {
    return this.documents.get(childId) || [];
  }

  updateDocumentStatus(docId: string, childId: string, status: VaultDocument['status'], summary?: string, keyFacts?: string[]) {
    const docs = this.documents.get(childId) || [];
    const docIndex = docs.findIndex(d => d.id === docId);
    if (docIndex >= 0) {
      docs[docIndex].status = status;
      docs[docIndex].processedAt = new Date().toISOString();
      if (summary) docs[docIndex].summary = summary;
      if (keyFacts) docs[docIndex].keyFacts = keyFacts;
      this.saveToStorage();
    }
  }

  // ============================================
  // CONVERSATION SUMMARIES
  // ============================================

  addConversationSummary(summary: Omit<ConversationMemory, 'id'>): ConversationMemory {
    const newSummary: ConversationMemory = {
      ...summary,
      id: `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const childSummaries = this.conversationSummaries.get(summary.childId) || [];
    childSummaries.push(newSummary);
    this.conversationSummaries.set(summary.childId, childSummaries);
    this.saveToStorage();

    return newSummary;
  }

  getRecentSummaries(childId: string, tier: TierType, limit: number = 10): ConversationMemory[] {
    const limits = TIER_LIMITS[tier];
    const allSummaries = this.conversationSummaries.get(childId) || [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limits.memoryDays);

    return allSummaries
      .filter(s => new Date(s.timestamp) >= cutoffDate)
      .slice(-limit);
  }

  // ============================================
  // CONTEXT GENERATION
  // ============================================

  /**
   * Generate AI context from memory - the "magic" that makes AI feel like it remembers
   */
  generateAIContext(childId: string, tier: TierType): string {
    const limits = TIER_LIMITS[tier];
    const facts = this.getFacts(childId, tier);
    const docs = this.getDocuments(childId);
    const summaries = this.getRecentSummaries(childId, tier, 5);

    let context = '';

    // Add child profile facts
    const preferences = facts.filter(f => f.category === 'preference');
    const triggers = facts.filter(f => f.category === 'trigger');
    const strengths = facts.filter(f => f.category === 'strength');
    const challenges = facts.filter(f => f.category === 'challenge');
    const strategies = facts.filter(f => f.category === 'strategy');

    if (preferences.length > 0) {
      context += `\n**What they love:** ${preferences.map(f => f.content).join(', ')}`;
    }
    if (triggers.length > 0) {
      context += `\n**Triggers to avoid:** ${triggers.map(f => f.content).join(', ')}`;
    }
    if (strengths.length > 0) {
      context += `\n**Strengths:** ${strengths.map(f => f.content).join(', ')}`;
    }
    if (challenges.length > 0) {
      context += `\n**Working on:** ${challenges.map(f => f.content).join(', ')}`;
    }
    if (strategies.length > 0) {
      context += `\n**What helps:** ${strategies.map(f => f.content).join(', ')}`;
    }

    // Add document insights (if tier allows)
    if (limits.canLearnFromVault && docs.length > 0) {
      const readyDocs = docs.filter(d => d.status === 'ready');
      if (readyDocs.length > 0) {
        context += '\n\n**From uploaded documents:**';
        readyDocs.forEach(doc => {
          if (doc.summary) {
            context += `\n- ${doc.type.toUpperCase()}: ${doc.summary}`;
          }
          if (doc.keyFacts && doc.keyFacts.length > 0) {
            context += ` Key points: ${doc.keyFacts.slice(0, 3).join('; ')}`;
          }
        });
      }
    }

    // Add recent conversation context
    if (summaries.length > 0) {
      context += '\n\n**Recent conversations:**';
      summaries.slice(-3).forEach(s => {
        context += `\n- ${s.summary} (${s.emotionalContext})`;
      });
    }

    // Truncate to tier limit
    if (context.length > limits.contextTokens * 4) {
      context = context.substring(0, limits.contextTokens * 4) + '...';
    }

    return context;
  }

  /**
   * Extract facts from a conversation to build long-term memory
   */
  extractFactsFromConversation(
    childId: string,
    messages: Array<{ author: string; content: string }>,
    tier: TierType
  ): MemoryFact[] {
    const newFacts: MemoryFact[] = [];

    // Simple keyword-based extraction (in production, use AI)
    const parentMessages = messages.filter(m => m.author === 'parent');

    parentMessages.forEach(msg => {
      const content = msg.content.toLowerCase();

      // Detect preferences
      if (content.includes('loves') || content.includes('favorite') || content.includes('enjoys')) {
        const match = content.match(/(?:loves?|favorite|enjoys?)\s+([^.!?]+)/i);
        if (match) {
          newFacts.push(this.addFact({
            childId,
            category: 'preference',
            content: match[1].trim(),
            source: 'conversation',
            confidence: 0.7,
          }));
        }
      }

      // Detect triggers
      if (content.includes('trigger') || content.includes('meltdown') || content.includes('upset')) {
        const match = content.match(/(?:triggers?|meltdowns?|upset by)\s+([^.!?]+)/i);
        if (match) {
          newFacts.push(this.addFact({
            childId,
            category: 'trigger',
            content: match[1].trim(),
            source: 'conversation',
            confidence: 0.7,
          }));
        }
      }

      // Detect strategies that work
      if (content.includes('helps') || content.includes('works') || content.includes('calms')) {
        const match = content.match(/(?:helps?|works?|calms?)\s+([^.!?]+)/i);
        if (match) {
          newFacts.push(this.addFact({
            childId,
            category: 'strategy',
            content: match[1].trim(),
            source: 'conversation',
            confidence: 0.7,
          }));
        }
      }
    });

    return newFacts;
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Clean up expired memories based on tier limits
   */
  cleanupExpiredMemories(childId: string, tier: TierType) {
    const limits = TIER_LIMITS[tier];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limits.memoryDays);

    // Clean facts
    const facts = this.facts.get(childId) || [];
    const validFacts = facts.filter(f => new Date(f.createdAt) >= cutoffDate);
    this.facts.set(childId, validFacts.slice(-limits.maxFacts));

    // Clean summaries
    const summaries = this.conversationSummaries.get(childId) || [];
    const validSummaries = summaries.filter(s => new Date(s.timestamp) >= cutoffDate);
    this.conversationSummaries.set(childId, validSummaries);

    this.saveToStorage();
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const memoryManager = new MemoryManager();

// ============================================
// HOOKS
// ============================================

export function useMemoryUsage(childId: string, tier: TierType) {
  return memoryManager.getUsage(childId, tier);
}

export function useCanSendMessage(childId: string, tier: TierType) {
  return memoryManager.canSendMessage(childId, tier);
}

export function useMessagesRemaining(childId: string, tier: TierType) {
  return memoryManager.getMessagesRemaining(childId, tier);
}

export function useTimeUntilReset() {
  return memoryManager.getTimeUntilReset();
}
