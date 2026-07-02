/**
 * Memory System Tests
 *
 * Exercises the REAL memory-system module (no local copies) so tier-limit
 * drift between memory-system.ts and tier-utils.ts fails loudly here.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  TIER_LIMITS,
  memoryManager,
  normalizeFactContent,
} from '../lib/memory-system';
import {
  getTierLimits,
  getEnforcedAIMessageLimit,
  FAIR_USE_AI_DAILY_CAP,
  type TierType,
} from '../lib/tier-utils';
import {
  saveConversation,
  loadRecentConversations,
  dedupeConversationSnapshots,
} from '../lib/ai-engine/conversation-memory';

const ALL_TIERS: TierType[] = ['free', 'starter', 'core', 'pro', 'proplus'];
const PAID_TIERS: TierType[] = ['starter', 'core', 'pro', 'proplus'];

// ============================================================================
// (a) Drift guard — TIER_LIMITS must match tier-utils
// ============================================================================

describe('TIER_LIMITS ↔ tier-utils drift guard', () => {
  it('defines limits for every tier', () => {
    for (const tier of ALL_TIERS) {
      expect(TIER_LIMITS[tier]).toBeDefined();
      expect(TIER_LIMITS[tier].messagesPerDay).toBeGreaterThan(0);
      expect(TIER_LIMITS[tier].contextTokens).toBeGreaterThan(0);
    }
  });

  it('free messagesPerDay matches getEnforcedAIMessageLimit (canonical 3/day)', () => {
    expect(TIER_LIMITS.free.messagesPerDay).toBe(getEnforcedAIMessageLimit('free'));
  });

  it('paid tiers messagesPerDay match the enforcement-side fair-use cap', () => {
    for (const tier of PAID_TIERS) {
      expect(TIER_LIMITS[tier].messagesPerDay).toBe(getEnforcedAIMessageLimit(tier));
      expect(TIER_LIMITS[tier].messagesPerDay).toBe(FAIR_USE_AI_DAILY_CAP);
    }
  });

  it('maxFacts matches getTierLimits().memoryFacts (null ↔ Infinity)', () => {
    for (const tier of ALL_TIERS) {
      const expected = getTierLimits(tier).memoryFacts ?? Infinity;
      expect(TIER_LIMITS[tier].maxFacts, `maxFacts drift for tier "${tier}"`).toBe(expected);
    }
  });

  it('context tokens scale up with tier', () => {
    expect(TIER_LIMITS.starter.contextTokens).toBeGreaterThan(TIER_LIMITS.free.contextTokens);
    expect(TIER_LIMITS.core.contextTokens).toBeGreaterThan(TIER_LIMITS.starter.contextTokens);
    expect(TIER_LIMITS.pro.contextTokens).toBeGreaterThan(TIER_LIMITS.core.contextTokens);
    expect(TIER_LIMITS.proplus.contextTokens).toBeGreaterThan(TIER_LIMITS.pro.contextTokens);
  });

  it('free tier has no vault learning; all paid tiers do', () => {
    expect(TIER_LIMITS.free.canLearnFromVault).toBe(false);
    expect(TIER_LIMITS.free.maxDocuments).toBe(0);
    for (const tier of PAID_TIERS) {
      expect(TIER_LIMITS[tier].canLearnFromVault).toBe(true);
    }
  });
});

// ============================================================================
// (b) memoryManager.getFacts respects the maxFacts slice
// ============================================================================

describe('memoryManager fact caps', () => {
  it('getFacts slices to the tier maxFacts cap, keeping the most recent', () => {
    const childId = `cap-test-${Date.now()}`;
    try {
      const cap = TIER_LIMITS.free.maxFacts;
      expect(Number.isFinite(cap)).toBe(true);

      const overshoot = 10;
      for (let i = 0; i < cap + overshoot; i++) {
        memoryManager.addFact({
          childId,
          category: 'preference',
          content: `unique fact number ${i}`,
          source: 'conversation',
          confidence: 0.8,
        });
      }

      const facts = memoryManager.getFacts(childId, 'free');
      expect(facts.length).toBe(cap);
      // The slice keeps the newest facts (oldest overflow dropped)
      expect(facts[facts.length - 1].content).toBe(`unique fact number ${cap + overshoot - 1}`);
      expect(facts[0].content).toBe(`unique fact number ${overshoot}`);
    } finally {
      memoryManager.clearFactsForChild(childId);
    }
  });

  it('unlimited tiers do not slice', () => {
    const childId = `nocap-test-${Date.now()}`;
    try {
      for (let i = 0; i < 20; i++) {
        memoryManager.addFact({
          childId,
          category: 'strategy',
          content: `strategy fact ${i}`,
          source: 'conversation',
          confidence: 0.8,
        });
      }
      expect(memoryManager.getFacts(childId, 'proplus').length).toBe(20);
    } finally {
      memoryManager.clearFactsForChild(childId);
    }
  });
});

// ============================================================================
// (c) Fact dedup (client-visible mirror of the /memory/store server dedup)
// ============================================================================

describe('fact dedup', () => {
  it('normalizeFactContent is case- and whitespace-insensitive', () => {
    expect(normalizeFactContent('  Loud   NOISES ')).toBe('loud noises');
    expect(normalizeFactContent('loud noises')).toBe(normalizeFactContent('LOUD\n\tnoises'));
  });

  it('addFact updates the existing fact instead of duplicating same category+content', () => {
    const childId = `dedup-test-${Date.now()}`;
    try {
      const first = memoryManager.addFact({
        childId,
        category: 'trigger',
        content: 'Loud  Sudden Noises',
        source: 'conversation',
        confidence: 0.6,
      });
      const second = memoryManager.addFact({
        childId,
        category: 'trigger',
        content: 'loud sudden noises',
        source: 'conversation',
        confidence: 0.9,
      });

      expect(second.id).toBe(first.id);
      const facts = memoryManager.getFacts(childId, 'proplus');
      expect(facts).toHaveLength(1);
      // Higher confidence wins on merge
      expect(facts[0].confidence).toBe(0.9);
    } finally {
      memoryManager.clearFactsForChild(childId);
    }
  });

  it('same content in a DIFFERENT category is not deduped', () => {
    const childId = `dedup-cat-test-${Date.now()}`;
    try {
      memoryManager.addFact({
        childId, category: 'trigger', content: 'water play',
        source: 'conversation', confidence: 0.8,
      });
      memoryManager.addFact({
        childId, category: 'preference', content: 'water play',
        source: 'conversation', confidence: 0.8,
      });
      expect(memoryManager.getFacts(childId, 'proplus')).toHaveLength(2);
    } finally {
      memoryManager.clearFactsForChild(childId);
    }
  });
});

// ============================================================================
// (d) Conversation save/load contract (M5 — shapes match new-routes.tsx)
// ============================================================================

describe('conversation save/load contract (M5)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('saveConversation POSTs { userId, threadKey, message } to /conversation/save', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const id = await saveConversation('user-1', 'child-1', {
      id: 'conv-1',
      title: 'Bedtime routine',
      messages: [],
      topics: ['sleep'],
    });

    expect(id).toBe('conv-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/conversation/save');

    // Route contract: { userId, threadKey, message } — message is the snapshot
    const body = JSON.parse(String(init.body));
    expect(body.userId).toBe('user-1');
    expect(body.threadKey).toBe('conversations:user-1');
    expect(body.message).toMatchObject({
      id: 'conv-1',
      userId: 'user-1',
      childId: 'child-1',
      title: 'Bedtime routine',
      topics: ['sleep'],
    });
    expect(typeof body.message.updatedAt).toBe('string');
  });

  it('loadRecentConversations POSTs { userId, threadKey } and parses { messages }', async () => {
    const snapshots = [
      { id: 'c1', userId: 'u', childId: 'k', title: 'old snapshot', messages: [], topics: [], updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'c2', userId: 'u', childId: 'k', title: 'other convo', messages: [], topics: [], updatedAt: '2026-01-02T00:00:00Z' },
      { id: 'c1', userId: 'u', childId: 'k', title: 'newest snapshot', messages: [], topics: [], updatedAt: '2026-01-03T00:00:00Z' },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: snapshots }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const conversations = await loadRecentConversations('user-1', 10);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      userId: 'user-1',
      threadKey: 'conversations:user-1',
    });

    // Snapshots deduped by id, newest snapshot wins, most recent first
    expect(conversations).toHaveLength(2);
    expect(conversations[0].id).toBe('c1');
    expect(conversations[0].title).toBe('newest snapshot');
    expect(conversations[1].id).toBe('c2');
  });

  it('loadRecentConversations returns [] on non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    expect(await loadRecentConversations('user-1', 5)).toEqual([]);
  });

  it('dedupeConversationSnapshots keeps the last snapshot per id and fills defaults', () => {
    const result = dedupeConversationSnapshots([
      { id: 'a', updatedAt: '2026-01-01T00:00:00Z', title: 'v1' },
      { id: 'a', updatedAt: '2026-02-01T00:00:00Z', title: 'v2' },
      { id: 'b', updatedAt: '2026-01-15T00:00:00Z' },
      { updatedAt: '2026-03-01T00:00:00Z' }, // no id — dropped
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a'); // 2026-02-01 > 2026-01-15
    expect(result[0].title).toBe('v2');
    expect(result[1].id).toBe('b');
    expect(result[1].messages).toEqual([]);
    expect(result[1].topics).toEqual([]);
  });
});
