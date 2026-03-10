/**
 * useHapticFeedback
 *
 * Wraps navigator.vibrate() with named pattern presets.
 * - No-op on devices without vibration support
 * - Respects a user preference stored in localStorage
 * - Export triggerHaptic() for imperative use
 */

import { useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HapticType = 'tap' | 'success' | 'error' | 'celebration';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY_HAPTICS_ENABLED = 'aminy-haptics-enabled';

/**
 * Vibration patterns (milliseconds).
 * Single number = single vibration.
 * Array = alternating vibrate/pause pattern.
 */
const PATTERNS: Record<HapticType, number | number[]> = {
  tap: 10,
  success: 50,
  error: [100, 50, 100],
  celebration: [50, 30, 50, 30, 100],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function supportsVibration(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function isHapticsEnabled(): boolean {
  try {
    const stored = localStorage.getItem(LS_KEY_HAPTICS_ENABLED);
    // Default to enabled if no preference set
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Standalone function (for use outside React components)
// ---------------------------------------------------------------------------

/**
 * Trigger a haptic vibration pattern.
 * Safe to call anywhere -- no-ops when unsupported or disabled.
 */
export function triggerHaptic(type: HapticType): void {
  if (!supportsVibration()) return;
  if (!isHapticsEnabled()) return;

  const pattern = PATTERNS[type];
  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration not available in this context (e.g. cross-origin iframe)
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseHapticFeedbackReturn {
  /** Trigger a named haptic pattern */
  triggerHaptic: (type: HapticType) => void;
  /** Whether device supports vibration */
  supported: boolean;
  /** Whether user has haptics enabled */
  enabled: boolean;
  /** Toggle haptics on/off (persisted to localStorage) */
  setEnabled: (value: boolean) => void;
}

export function useHapticFeedback(): UseHapticFeedbackReturn {
  const supported = useMemo(() => supportsVibration(), []);

  const trigger = useCallback((type: HapticType) => {
    triggerHaptic(type);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    try {
      localStorage.setItem(LS_KEY_HAPTICS_ENABLED, String(value));
    } catch {
      /* storage full */
    }
  }, []);

  const enabled = useMemo(() => isHapticsEnabled(), []);

  return {
    triggerHaptic: trigger,
    supported,
    enabled,
    setEnabled,
  };
}

export default useHapticFeedback;
