/**
 * Haptic Feedback Module
 *
 * Provides tactile feedback for touch interactions using the Vibration API.
 * Falls back gracefully on devices that don't support vibration.
 *
 * Feedback levels:
 *   light   — Button taps, toggles, selections (10ms)
 *   medium  — Confirmations, successful actions (25ms)
 *   heavy   — Errors, warnings, destructive actions (50ms)
 *   pattern — Custom patterns for notifications, alerts
 *
 * Sensory mode integration:
 *   - When sensory mode is active, all haptic feedback is disabled
 *   - Respects the global sensory mode CSS classes on <html>
 *
 * Usage:
 *   import { haptic } from './haptic-feedback';
 *
 *   // Simple feedback
 *   haptic.light();    // Button tap
 *   haptic.medium();   // Confirmation
 *   haptic.heavy();    // Error/warning
 *
 *   // Custom patterns
 *   haptic.pattern([100, 50, 100]);  // buzz-pause-buzz
 *   haptic.notification();            // Notification arrival pattern
 *
 *   // Conditional (respects sensory mode automatically)
 *   haptic.impact('medium');
 *
 *   // Check support
 *   if (haptic.isSupported()) { ... }
 */

// ============================================================================
// Types
// ============================================================================

export type HapticIntensity = 'light' | 'medium' | 'heavy';

export interface HapticOptions {
  /** Override the default duration for this feedback (ms) */
  duration?: number;
  /** Force haptic even in sensory mode (not recommended) */
  forceSensoryOverride?: boolean;
}

export interface HapticFeedback {
  /** Light tap feedback (10ms) — buttons, toggles, selections */
  light: (options?: HapticOptions) => boolean;
  /** Medium feedback (25ms) — confirmations, successful actions */
  medium: (options?: HapticOptions) => boolean;
  /** Heavy feedback (50ms) — errors, warnings, destructive actions */
  heavy: (options?: HapticOptions) => boolean;
  /** Custom vibration pattern (alternating vibrate/pause durations in ms) */
  pattern: (pattern: number[], options?: HapticOptions) => boolean;
  /** Intensity-based feedback (programmatic selection) */
  impact: (intensity: HapticIntensity, options?: HapticOptions) => boolean;
  /** Pre-built notification arrival pattern */
  notification: (options?: HapticOptions) => boolean;
  /** Pre-built success pattern (double tap) */
  success: (options?: HapticOptions) => boolean;
  /** Pre-built error pattern (long buzz) */
  error: (options?: HapticOptions) => boolean;
  /** Pre-built warning pattern (triple short) */
  warning: (options?: HapticOptions) => boolean;
  /** Pre-built selection change pattern (very light) */
  selectionChanged: (options?: HapticOptions) => boolean;
  /** Cancel any ongoing vibration */
  cancel: () => void;
  /** Check if vibration is supported */
  isSupported: () => boolean;
  /** Check if haptic feedback is currently enabled (respects sensory mode) */
  isEnabled: () => boolean;
  /** Manually enable/disable haptic feedback */
  setEnabled: (enabled: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Vibration durations by intensity (ms) */
const INTENSITY_DURATION: Record<HapticIntensity, number> = {
  light: 10,
  medium: 25,
  heavy: 50,
};

/** Pre-built vibration patterns (alternating vibrate/pause in ms) */
const PATTERNS = {
  /** Notification: medium-short pause-short */
  notification: [30, 50, 15],
  /** Success: two quick taps */
  success: [15, 30, 15],
  /** Error: one long buzz */
  error: [75],
  /** Warning: three short pulses */
  warning: [15, 20, 15, 20, 15],
  /** Selection change: very light tap */
  selectionChanged: [5],
} as const;

const STORAGE_KEY = 'aminy-haptic-enabled';

// ============================================================================
// Internal State
// ============================================================================

let _manuallyDisabled = false;

/**
 * Load the manual enable/disable preference from localStorage.
 */
function loadEnabledState(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') return false;
  } catch {
    // localStorage unavailable
  }
  return true;
}

/**
 * Save the manual enable/disable preference.
 */
function saveEnabledState(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // localStorage unavailable
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if the Vibration API is supported.
 */
function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Check if sensory mode is active (any sensory CSS class on <html>).
 */
function isSensoryModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return (
    root.classList.contains('sensory-muted-colors') ||
    root.classList.contains('sensory-enlarge-targets') ||
    root.classList.contains('sensory-reduce-text')
  );
}

/**
 * Check if haptic feedback should fire right now.
 */
function shouldVibrate(options?: HapticOptions): boolean {
  if (!isVibrationSupported()) return false;
  if (_manuallyDisabled && !options?.forceSensoryOverride) return false;
  if (isSensoryModeActive() && !options?.forceSensoryOverride) return false;
  return true;
}

/**
 * Execute a vibration.
 *
 * @returns true if vibration was triggered, false if it was skipped
 */
function vibrate(pattern: number | number[], options?: HapticOptions): boolean {
  if (!shouldVibrate(options)) return false;

  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

// ============================================================================
// Haptic Feedback API
// ============================================================================

export const haptic: HapticFeedback = {
  light(options?: HapticOptions): boolean {
    const duration = options?.duration ?? INTENSITY_DURATION.light;
    return vibrate(duration, options);
  },

  medium(options?: HapticOptions): boolean {
    const duration = options?.duration ?? INTENSITY_DURATION.medium;
    return vibrate(duration, options);
  },

  heavy(options?: HapticOptions): boolean {
    const duration = options?.duration ?? INTENSITY_DURATION.heavy;
    return vibrate(duration, options);
  },

  pattern(pattern: number[], options?: HapticOptions): boolean {
    return vibrate(pattern, options);
  },

  impact(intensity: HapticIntensity, options?: HapticOptions): boolean {
    const duration = options?.duration ?? INTENSITY_DURATION[intensity];
    return vibrate(duration, options);
  },

  notification(options?: HapticOptions): boolean {
    return vibrate([...PATTERNS.notification], options);
  },

  success(options?: HapticOptions): boolean {
    return vibrate([...PATTERNS.success], options);
  },

  error(options?: HapticOptions): boolean {
    return vibrate([...PATTERNS.error], options);
  },

  warning(options?: HapticOptions): boolean {
    return vibrate([...PATTERNS.warning], options);
  },

  selectionChanged(options?: HapticOptions): boolean {
    return vibrate([...PATTERNS.selectionChanged], options);
  },

  cancel(): void {
    if (isVibrationSupported()) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  },

  isSupported(): boolean {
    return isVibrationSupported();
  },

  isEnabled(): boolean {
    if (!isVibrationSupported()) return false;
    if (_manuallyDisabled) return false;
    if (isSensoryModeActive()) return false;
    return true;
  },

  setEnabled(enabled: boolean): void {
    _manuallyDisabled = !enabled;
    saveEnabledState(enabled);
  },
};

// ============================================================================
// Initialize
// ============================================================================

// Load stored preference on module load
if (typeof window !== 'undefined') {
  _manuallyDisabled = !loadEnabledState();
}

// ============================================================================
// React Helper Hook (lightweight, no separate file needed)
// ============================================================================

/**
 * Simple wrapper for use in React components.
 *
 *   import { useHaptic } from './haptic-feedback';
 *   const { tap, confirm, error } = useHaptic();
 *   <button onClick={() => { tap(); doThing(); }}>Click</button>
 */
export function useHaptic() {
  return {
    /** Light tap (buttons, toggles) */
    tap: haptic.light,
    /** Medium feedback (confirmations) */
    confirm: haptic.medium,
    /** Heavy feedback (errors) */
    error: haptic.heavy,
    /** Success pattern */
    success: haptic.success,
    /** Warning pattern */
    warning: haptic.warning,
    /** Notification pattern */
    notification: haptic.notification,
    /** Selection change (very light) */
    selection: haptic.selectionChanged,
    /** Custom pattern */
    pattern: haptic.pattern,
    /** Cancel ongoing vibration */
    cancel: haptic.cancel,
    /** Check if supported */
    isSupported: haptic.isSupported,
    /** Check if currently enabled */
    isEnabled: haptic.isEnabled,
    /** Enable/disable haptic feedback */
    setEnabled: haptic.setEnabled,
  };
}

export default haptic;
