import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to re-import the module fresh for each test since FeatureFlagManager
// is a singleton that reads localStorage on construction
describe('feature-flags', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('exports a FeatureFlagManager singleton', async () => {
    const mod = await import('../lib/feature-flags');
    expect(mod.featureFlags).toBeDefined();
    expect(typeof mod.featureFlags.isEnabled).toBe('function');
    expect(typeof mod.featureFlags.enable).toBe('function');
    expect(typeof mod.featureFlags.disable).toBe('function');
  });

  it('has default flags with expected shape', async () => {
    const mod = await import('../lib/feature-flags');
    const status = mod.featureFlags.getStatus();

    // Verify core properties exist
    expect(typeof status.enhancedFloatingButton).toBe('boolean');
    expect(typeof status.contextAwareResponses).toBe('boolean');
    expect(typeof status.advancedStreaming).toBe('boolean');
    expect(typeof status.conversationPersistence).toBe('boolean');
    expect(typeof status.analyticsTracking).toBe('boolean');
    expect(typeof status.improvedUI).toBe('boolean');
  });

  it('returns default flag values when no overrides', async () => {
    const mod = await import('../lib/feature-flags');
    const status = mod.featureFlags.getStatus();

    // These should be true by default
    expect(status.enhancedFloatingButton).toBe(true);
    expect(status.contextAwareResponses).toBe(true);
    expect(status.advancedStreaming).toBe(true);
    expect(status.conversationPersistence).toBe(true);
    expect(status.improvedUI).toBe(true);

    // These should be false by default
    expect(status.liveVisionAI).toBe(false);
    expect(status.fileAttachments).toBe(false);
    expect(status.multiLanguage).toBe(false);
  });

  it('isEnabled returns correct boolean for flags', async () => {
    const mod = await import('../lib/feature-flags');
    expect(mod.featureFlags.isEnabled('enhancedFloatingButton')).toBe(true);
    expect(mod.featureFlags.isEnabled('liveVisionAI')).toBe(false);
  });

  it('enable() turns on a flag and persists to localStorage', async () => {
    const mod = await import('../lib/feature-flags');
    mod.featureFlags.enable('liveVisionAI');

    expect(mod.featureFlags.isEnabled('liveVisionAI')).toBe(true);

    // Verify persistence
    const saved = JSON.parse(localStorage.getItem('aminy-feature-flags') || '{}');
    expect(saved.liveVisionAI).toBe(true);
  });

  it('disable() turns off a flag and persists', async () => {
    const mod = await import('../lib/feature-flags');
    mod.featureFlags.disable('enhancedFloatingButton');

    expect(mod.featureFlags.isEnabled('enhancedFloatingButton')).toBe(false);

    const saved = JSON.parse(localStorage.getItem('aminy-feature-flags') || '{}');
    expect(saved.enhancedFloatingButton).toBe(false);
  });

  it('toggle() flips a flag value', async () => {
    const mod = await import('../lib/feature-flags');
    const initial = mod.featureFlags.isEnabled('liveVisionAI');
    mod.featureFlags.toggle('liveVisionAI');
    expect(mod.featureFlags.isEnabled('liveVisionAI')).toBe(!initial);
  });

  it('enableAll() turns on every flag', async () => {
    const mod = await import('../lib/feature-flags');
    mod.featureFlags.enableAll();

    const status = mod.featureFlags.getStatus();
    Object.values(status).forEach((value) => {
      expect(value).toBe(true);
    });
  });

  it('disableAll() resets to defaults', async () => {
    const mod = await import('../lib/feature-flags');
    mod.featureFlags.enableAll();
    mod.featureFlags.disableAll();

    const status = mod.featureFlags.getStatus();
    // After disableAll, liveVisionAI should be back to false (its default)
    expect(status.liveVisionAI).toBe(false);
    // enhancedFloatingButton should still be true (its default)
    expect(status.enhancedFloatingButton).toBe(true);
  });

  it('getStatus() returns a copy, not a reference', async () => {
    const mod = await import('../lib/feature-flags');
    const status1 = mod.featureFlags.getStatus();
    const status2 = mod.featureFlags.getStatus();
    expect(status1).not.toBe(status2);
    expect(status1).toEqual(status2);
  });

  it('loads persisted flags from localStorage on init', async () => {
    // Pre-seed localStorage before importing
    localStorage.setItem(
      'aminy-feature-flags',
      JSON.stringify({ liveVisionAI: true, multiLanguage: true })
    );

    const mod = await import('../lib/feature-flags');
    expect(mod.featureFlags.isEnabled('liveVisionAI')).toBe(true);
    expect(mod.featureFlags.isEnabled('multiLanguage')).toBe(true);
  });

  describe('applyTierConfig', () => {
    it('enables contextDetection for pro tier', async () => {
      const mod = await import('../lib/feature-flags');
      mod.featureFlags.applyTierConfig('pro');
      expect(mod.featureFlags.isEnabled('contextDetection')).toBe(true);
    });

    it('disables contextDetection for non-pro tiers', async () => {
      const mod = await import('../lib/feature-flags');
      // First enable it
      mod.featureFlags.enable('contextDetection');
      // Then apply non-pro tier
      mod.featureFlags.applyTierConfig('starter');
      expect(mod.featureFlags.isEnabled('contextDetection')).toBe(false);
    });

    it('keeps core flags enabled for all tiers', async () => {
      const mod = await import('../lib/feature-flags');
      mod.featureFlags.applyTierConfig('free');

      expect(mod.featureFlags.isEnabled('enhancedFloatingButton')).toBe(true);
      expect(mod.featureFlags.isEnabled('contextAwareResponses')).toBe(true);
      expect(mod.featureFlags.isEnabled('advancedStreaming')).toBe(true);
      expect(mod.featureFlags.isEnabled('conversationPersistence')).toBe(true);
      expect(mod.featureFlags.isEnabled('improvedUI')).toBe(true);
    });
  });

  describe('phase enablement', () => {
    it('enablePhase1 enables floating button and analytics', async () => {
      const mod = await import('../lib/feature-flags');
      mod.featureFlags.disableAll();
      mod.featureFlags.enablePhase1();

      expect(mod.featureFlags.isEnabled('enhancedFloatingButton')).toBe(true);
      expect(mod.featureFlags.isEnabled('analyticsTracking')).toBe(true);
    });

    it('enablePhase2 enables UI and persistence', async () => {
      const mod = await import('../lib/feature-flags');
      mod.featureFlags.disableAll();
      mod.featureFlags.enablePhase2();

      expect(mod.featureFlags.isEnabled('improvedUI')).toBe(true);
      expect(mod.featureFlags.isEnabled('conversationPersistence')).toBe(true);
    });

    it('enablePhase3 enables context-aware responses and streaming', async () => {
      const mod = await import('../lib/feature-flags');
      mod.featureFlags.disableAll();
      mod.featureFlags.enablePhase3();

      expect(mod.featureFlags.isEnabled('contextAwareResponses')).toBe(true);
      expect(mod.featureFlags.isEnabled('advancedStreaming')).toBe(true);
    });

    it('enablePhase4 enables context detection', async () => {
      const mod = await import('../lib/feature-flags');
      mod.featureFlags.disableAll();
      mod.featureFlags.enablePhase4();

      expect(mod.featureFlags.isEnabled('contextDetection')).toBe(true);
    });
  });
});
