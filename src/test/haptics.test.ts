import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHapticsSupported, triggerHaptic } from '../lib/haptics';

describe('haptics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isHapticsSupported', () => {
    it('returns false when vibrate is not in navigator', () => {
      // jsdom does not have navigator.vibrate by default
      expect(isHapticsSupported()).toBe(false);
    });

    it('returns false when not on iOS device', () => {
      // Even if vibrate exists, need iOS user agent
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });
      // Default jsdom userAgent is not iOS
      expect(isHapticsSupported()).toBe(false);
    });
  });

  describe('triggerHaptic', () => {
    it('does not throw when haptics are not supported', () => {
      // Should gracefully no-op on unsupported platforms
      expect(() => triggerHaptic('light')).not.toThrow();
      expect(() => triggerHaptic('medium')).not.toThrow();
      expect(() => triggerHaptic('heavy')).not.toThrow();
      expect(() => triggerHaptic('success')).not.toThrow();
      expect(() => triggerHaptic('warning')).not.toThrow();
      expect(() => triggerHaptic('error')).not.toThrow();
      expect(() => triggerHaptic('selection')).not.toThrow();
    });

    it('defaults to light haptic when no type specified', () => {
      expect(() => triggerHaptic()).not.toThrow();
    });

    it('calls navigator.vibrate when available on iOS', () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateFn,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        writable: true,
        configurable: true,
      });

      triggerHaptic('light');
      expect(vibrateFn).toHaveBeenCalledWith(10);

      triggerHaptic('medium');
      expect(vibrateFn).toHaveBeenCalledWith(20);

      triggerHaptic('heavy');
      expect(vibrateFn).toHaveBeenCalledWith(30);
    });

    it('uses pattern vibration for notification types on iOS', () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateFn,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        writable: true,
        configurable: true,
      });

      triggerHaptic('success');
      expect(vibrateFn).toHaveBeenCalledWith([10, 50, 10]);

      triggerHaptic('warning');
      expect(vibrateFn).toHaveBeenCalledWith([20, 50, 20]);

      triggerHaptic('error');
      expect(vibrateFn).toHaveBeenCalledWith([30, 100, 30, 100, 30]);

      triggerHaptic('selection');
      expect(vibrateFn).toHaveBeenCalledWith(5);
    });
  });
});
