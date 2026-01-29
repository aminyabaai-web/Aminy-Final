/**
 * Memory System Tests
 * Tests for AI memory management with tier-based limits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types matching the actual implementation
type TierType = 'free' | 'starter' | 'core' | 'pro' | 'proplus';

interface MemoryFact {
  id: string;
  childId: string;
  category: 'preference' | 'trigger' | 'strength' | 'challenge' | 'milestone' | 'strategy' | 'medical' | 'educational';
  content: string;
  source: 'conversation' | 'onboarding' | 'vault' | 'provider' | 'manual';
  confidence: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

interface MemoryUsage {
  messagesUsedToday: number;
  messagesLimit: number;
  documentsCount: number;
  documentsLimit: number;
  memoryDays: number;
  memoryDaysLimit: number;
  factsCount: number;
}

// Tier limits matching memory-system.ts
const TIER_LIMITS: Record<TierType, {
  messagesPerDay: number;
  memoryDays: number;
  maxDocuments: number;
  maxFacts: number;
  canLearnFromVault: boolean;
  contextTokens: number;
}> = {
  free: {
    messagesPerDay: 5,
    memoryDays: 14,
    maxDocuments: 0,
    maxFacts: 50,
    canLearnFromVault: false,
    contextTokens: 3000,
  },
  starter: {
    messagesPerDay: 20,
    memoryDays: 30,
    maxDocuments: 5,
    maxFacts: 100,
    canLearnFromVault: true,
    contextTokens: 4000,
  },
  core: {
    messagesPerDay: Infinity,
    memoryDays: 90,
    maxDocuments: 25,
    maxFacts: 500,
    canLearnFromVault: true,
    contextTokens: 8000,
  },
  pro: {
    messagesPerDay: Infinity,
    memoryDays: Infinity,
    maxDocuments: Infinity,
    maxFacts: Infinity,
    canLearnFromVault: true,
    contextTokens: 16000,
  },
  proplus: {
    messagesPerDay: Infinity,
    memoryDays: Infinity,
    maxDocuments: Infinity,
    maxFacts: Infinity,
    canLearnFromVault: true,
    contextTokens: 32000,
  },
};

// Helper functions
function getTierLimits(tier: TierType) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

function canSendMessage(tier: TierType, messagesUsedToday: number): boolean {
  const limits = getTierLimits(tier);
  return messagesUsedToday < limits.messagesPerDay;
}

function canUploadDocument(tier: TierType, currentDocuments: number): boolean {
  const limits = getTierLimits(tier);
  return currentDocuments < limits.maxDocuments;
}

function canLearnFromVault(tier: TierType): boolean {
  const limits = getTierLimits(tier);
  return limits.canLearnFromVault;
}

function isFactExpired(fact: MemoryFact, tier: TierType): boolean {
  if (!fact.expiresAt) return false;
  const limits = getTierLimits(tier);
  if (limits.memoryDays === Infinity) return false;
  return new Date(fact.expiresAt) < new Date();
}

function createFact(overrides: Partial<MemoryFact> = {}): MemoryFact {
  return {
    id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    childId: 'child-123',
    category: 'preference',
    content: 'Test fact content',
    source: 'conversation',
    confidence: 0.8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function calculateMemoryExpiry(tier: TierType): Date | null {
  const limits = getTierLimits(tier);
  if (limits.memoryDays === Infinity) return null;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + limits.memoryDays);
  return expiryDate;
}

describe('Memory System Tier Limits', () => {
  describe('Free Tier', () => {
    const tier: TierType = 'free';

    it('should allow 5 messages per day', () => {
      expect(getTierLimits(tier).messagesPerDay).toBe(5);
    });

    it('should have 14-day memory retention', () => {
      expect(getTierLimits(tier).memoryDays).toBe(14);
    });

    it('should not allow vault access', () => {
      expect(getTierLimits(tier).maxDocuments).toBe(0);
      expect(canUploadDocument(tier, 0)).toBe(false);
    });

    it('should not allow learning from vault', () => {
      expect(canLearnFromVault(tier)).toBe(false);
    });

    it('should allow 50 facts', () => {
      expect(getTierLimits(tier).maxFacts).toBe(50);
    });

    it('should have 3000 context tokens', () => {
      expect(getTierLimits(tier).contextTokens).toBe(3000);
    });
  });

  describe('Starter Tier', () => {
    const tier: TierType = 'starter';

    it('should allow 20 messages per day', () => {
      expect(getTierLimits(tier).messagesPerDay).toBe(20);
    });

    it('should have 30-day memory retention', () => {
      expect(getTierLimits(tier).memoryDays).toBe(30);
    });

    it('should allow 5 documents', () => {
      expect(getTierLimits(tier).maxDocuments).toBe(5);
      expect(canUploadDocument(tier, 3)).toBe(true);
      expect(canUploadDocument(tier, 5)).toBe(false);
    });

    it('should allow learning from vault', () => {
      expect(canLearnFromVault(tier)).toBe(true);
    });
  });

  describe('Core Tier', () => {
    const tier: TierType = 'core';

    it('should allow unlimited messages', () => {
      expect(getTierLimits(tier).messagesPerDay).toBe(Infinity);
      expect(canSendMessage(tier, 1000)).toBe(true);
    });

    it('should have 90-day memory retention', () => {
      expect(getTierLimits(tier).memoryDays).toBe(90);
    });

    it('should allow 25 documents', () => {
      expect(getTierLimits(tier).maxDocuments).toBe(25);
    });

    it('should allow 500 facts', () => {
      expect(getTierLimits(tier).maxFacts).toBe(500);
    });

    it('should have 8000 context tokens', () => {
      expect(getTierLimits(tier).contextTokens).toBe(8000);
    });
  });

  describe('Pro Tier', () => {
    const tier: TierType = 'pro';

    it('should allow unlimited everything', () => {
      const limits = getTierLimits(tier);
      expect(limits.messagesPerDay).toBe(Infinity);
      expect(limits.memoryDays).toBe(Infinity);
      expect(limits.maxDocuments).toBe(Infinity);
      expect(limits.maxFacts).toBe(Infinity);
    });

    it('should have 16000 context tokens', () => {
      expect(getTierLimits(tier).contextTokens).toBe(16000);
    });
  });

  describe('ProPlus Tier', () => {
    const tier: TierType = 'proplus';

    it('should have highest context tokens (32000)', () => {
      expect(getTierLimits(tier).contextTokens).toBe(32000);
    });

    it('should allow unlimited everything', () => {
      const limits = getTierLimits(tier);
      expect(limits.messagesPerDay).toBe(Infinity);
      expect(limits.memoryDays).toBe(Infinity);
      expect(limits.maxDocuments).toBe(Infinity);
      expect(limits.maxFacts).toBe(Infinity);
    });
  });
});

describe('Message Rate Limiting', () => {
  it('should allow messages when under limit', () => {
    expect(canSendMessage('free', 0)).toBe(true);
    expect(canSendMessage('free', 4)).toBe(true);
    expect(canSendMessage('starter', 15)).toBe(true);
  });

  it('should block messages at limit', () => {
    expect(canSendMessage('free', 5)).toBe(false);
    expect(canSendMessage('free', 10)).toBe(false);
    expect(canSendMessage('starter', 20)).toBe(false);
  });

  it('should never block unlimited tiers', () => {
    expect(canSendMessage('core', 1000)).toBe(true);
    expect(canSendMessage('pro', 10000)).toBe(true);
    expect(canSendMessage('proplus', 100000)).toBe(true);
  });
});

describe('Memory Fact Management', () => {
  it('should create fact with required fields', () => {
    const fact = createFact();
    expect(fact.id).toBeDefined();
    expect(fact.childId).toBe('child-123');
    expect(fact.category).toBe('preference');
    expect(fact.content).toBeDefined();
    expect(fact.confidence).toBeGreaterThanOrEqual(0);
    expect(fact.confidence).toBeLessThanOrEqual(1);
  });

  it('should allow custom overrides', () => {
    const fact = createFact({
      category: 'medical',
      content: 'Custom medical fact',
      confidence: 0.95,
    });
    expect(fact.category).toBe('medical');
    expect(fact.content).toBe('Custom medical fact');
    expect(fact.confidence).toBe(0.95);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createFact().id);
    }
    expect(ids.size).toBe(100);
  });
});

describe('Memory Expiry', () => {
  it('should calculate correct expiry for free tier (14 days)', () => {
    const expiry = calculateMemoryExpiry('free');
    expect(expiry).not.toBeNull();
    const daysUntilExpiry = Math.round((expiry!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(daysUntilExpiry).toBe(14);
  });

  it('should calculate correct expiry for starter tier (30 days)', () => {
    const expiry = calculateMemoryExpiry('starter');
    expect(expiry).not.toBeNull();
    const daysUntilExpiry = Math.round((expiry!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(daysUntilExpiry).toBe(30);
  });

  it('should calculate correct expiry for core tier (90 days)', () => {
    const expiry = calculateMemoryExpiry('core');
    expect(expiry).not.toBeNull();
    const daysUntilExpiry = Math.round((expiry!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(daysUntilExpiry).toBe(90);
  });

  it('should return null (no expiry) for pro tier', () => {
    const expiry = calculateMemoryExpiry('pro');
    expect(expiry).toBeNull();
  });

  it('should return null (no expiry) for proplus tier', () => {
    const expiry = calculateMemoryExpiry('proplus');
    expect(expiry).toBeNull();
  });

  it('should mark expired facts correctly', () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

    const expiredFact = createFact({
      expiresAt: expiredDate.toISOString(),
    });

    expect(isFactExpired(expiredFact, 'free')).toBe(true);
    expect(isFactExpired(expiredFact, 'starter')).toBe(true);
  });

  it('should not mark unexpired facts as expired', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const validFact = createFact({
      expiresAt: futureDate.toISOString(),
    });

    expect(isFactExpired(validFact, 'free')).toBe(false);
  });

  it('should never expire facts for pro/proplus regardless of expiresAt', () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 100);

    const oldFact = createFact({
      expiresAt: expiredDate.toISOString(),
    });

    expect(isFactExpired(oldFact, 'pro')).toBe(false);
    expect(isFactExpired(oldFact, 'proplus')).toBe(false);
  });
});

describe('Document Upload Limits', () => {
  it('should never allow free tier document uploads', () => {
    expect(canUploadDocument('free', 0)).toBe(false);
  });

  it('should allow starter tier up to 5 documents', () => {
    expect(canUploadDocument('starter', 0)).toBe(true);
    expect(canUploadDocument('starter', 4)).toBe(true);
    expect(canUploadDocument('starter', 5)).toBe(false);
  });

  it('should allow core tier up to 25 documents', () => {
    expect(canUploadDocument('core', 0)).toBe(true);
    expect(canUploadDocument('core', 24)).toBe(true);
    expect(canUploadDocument('core', 25)).toBe(false);
  });

  it('should allow unlimited documents for pro/proplus', () => {
    expect(canUploadDocument('pro', 1000)).toBe(true);
    expect(canUploadDocument('proplus', 10000)).toBe(true);
  });
});

describe('Fact Categories', () => {
  const validCategories: MemoryFact['category'][] = [
    'preference',
    'trigger',
    'strength',
    'challenge',
    'milestone',
    'strategy',
    'medical',
    'educational',
  ];

  it('should support all valid categories', () => {
    validCategories.forEach(category => {
      const fact = createFact({ category });
      expect(fact.category).toBe(category);
    });
  });
});

describe('Fact Sources', () => {
  const validSources: MemoryFact['source'][] = [
    'conversation',
    'onboarding',
    'vault',
    'provider',
    'manual',
  ];

  it('should support all valid sources', () => {
    validSources.forEach(source => {
      const fact = createFact({ source });
      expect(fact.source).toBe(source);
    });
  });
});

describe('Memory Usage Tracking', () => {
  function getMemoryUsage(
    tier: TierType,
    messagesUsedToday: number,
    documentsCount: number,
    factsCount: number
  ): MemoryUsage {
    const limits = getTierLimits(tier);
    return {
      messagesUsedToday,
      messagesLimit: limits.messagesPerDay,
      documentsCount,
      documentsLimit: limits.maxDocuments,
      memoryDays: Math.min(factsCount, limits.memoryDays),
      memoryDaysLimit: limits.memoryDays,
      factsCount,
    };
  }

  it('should track message usage correctly', () => {
    const usage = getMemoryUsage('free', 3, 0, 10);
    expect(usage.messagesUsedToday).toBe(3);
    expect(usage.messagesLimit).toBe(5);
  });

  it('should track document usage correctly', () => {
    const usage = getMemoryUsage('core', 10, 15, 100);
    expect(usage.documentsCount).toBe(15);
    expect(usage.documentsLimit).toBe(25);
  });

  it('should show Infinity for unlimited tiers', () => {
    const usage = getMemoryUsage('pro', 1000, 50, 1000);
    expect(usage.messagesLimit).toBe(Infinity);
    expect(usage.documentsLimit).toBe(Infinity);
    expect(usage.memoryDaysLimit).toBe(Infinity);
  });
});

describe('Context Token Budget', () => {
  it('should allocate appropriate tokens per tier', () => {
    // Free users need enough for helpful responses
    expect(getTierLimits('free').contextTokens).toBeGreaterThanOrEqual(3000);

    // Higher tiers should get progressively more
    expect(getTierLimits('starter').contextTokens).toBeGreaterThan(
      getTierLimits('free').contextTokens
    );
    expect(getTierLimits('core').contextTokens).toBeGreaterThan(
      getTierLimits('starter').contextTokens
    );
    expect(getTierLimits('pro').contextTokens).toBeGreaterThan(
      getTierLimits('core').contextTokens
    );
    expect(getTierLimits('proplus').contextTokens).toBeGreaterThan(
      getTierLimits('pro').contextTokens
    );
  });
});

describe('Tier Upgrade Value Proposition', () => {
  it('free to starter should unlock vault access', () => {
    expect(getTierLimits('free').maxDocuments).toBe(0);
    expect(getTierLimits('starter').maxDocuments).toBeGreaterThan(0);
  });

  it('starter to core should unlock unlimited messages', () => {
    expect(getTierLimits('starter').messagesPerDay).toBeLessThan(Infinity);
    expect(getTierLimits('core').messagesPerDay).toBe(Infinity);
  });

  it('core to pro should unlock unlimited memory retention', () => {
    expect(getTierLimits('core').memoryDays).toBeLessThan(Infinity);
    expect(getTierLimits('pro').memoryDays).toBe(Infinity);
  });
});
