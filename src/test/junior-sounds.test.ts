import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSoundEnabled,
  setSoundEnabled,
  playTap,
  playPop,
  playComplete,
  haptic,
} from '../components/junior/activities/sounds';

describe('junior activities/sounds', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('reduced-motion');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // reset to default enabled state between tests
    setSoundEnabled(true);
    localStorage.clear();
  });

  describe('sound mute toggle', () => {
    it('is enabled by default', () => {
      expect(isSoundEnabled()).toBe(true);
    });

    it('persists the disabled state to localStorage', () => {
      setSoundEnabled(false);
      expect(isSoundEnabled()).toBe(false);
      expect(localStorage.getItem('aminy-junior-sound')).toBe('off');

      setSoundEnabled(true);
      expect(isSoundEnabled()).toBe(true);
      expect(localStorage.getItem('aminy-junior-sound')).toBe('on');
    });
  });

  describe('play* effects', () => {
    it('never throw even without a real AudioContext (jsdom)', () => {
      expect(() => playTap()).not.toThrow();
      expect(() => playPop()).not.toThrow();
      expect(() => playComplete()).not.toThrow();
    });

    it('short-circuit when muted', () => {
      setSoundEnabled(false);
      // Nothing to assert audibly in jsdom, but it must remain a safe no-op.
      expect(() => playTap()).not.toThrow();
      expect(() => playPop()).not.toThrow();
    });
  });

  describe('haptic gating', () => {
    it('fires the Vibration API by default', async () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrateFn, writable: true, configurable: true });

      // (Capacitor's web shim may remap the exact duration, so assert it fired.)
      await haptic(30);
      expect(vibrateFn).toHaveBeenCalled();
    });

    it('is suppressed when reduced-motion is active', async () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrateFn, writable: true, configurable: true });
      document.documentElement.classList.add('reduced-motion');

      await haptic(30);
      expect(vibrateFn).not.toHaveBeenCalled();
    });

    it('is suppressed when haptics are disabled globally', async () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrateFn, writable: true, configurable: true });
      localStorage.setItem('aminy-haptic-enabled', 'false');

      await haptic(30);
      expect(vibrateFn).not.toHaveBeenCalled();
    });
  });
});
