// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Sensory Mode Hook — Global Sensory Toggle for Junior
 *
 * Provides a comprehensive sensory accommodation system that:
 *   - Reduces motion (delegates to existing useReducedMotion hook)
 *   - Mutes color palette to softer tones (via CSS class)
 *   - Increases touch target sizes by 25% (via CSS class)
 *   - Reduces audio volume (via state + event)
 *   - Adds visual timers for transitions (via state)
 *   - Reduces on-screen text density (via CSS class)
 *   - Per-child configuration: "William needs low sensory, Eddie is fine with standard"
 *
 * Architecture:
 *   - Reads per-child SensoryLimits from ParentFocusBridge (localStorage + Supabase)
 *   - Applies CSS classes to <html> for global visual effects
 *   - Exposes helpers for components to query current sensory state
 *   - Fires custom events when sensory mode changes (for non-React listeners)
 *
 * CSS Classes applied to <html>:
 *   .sensory-muted-colors    — activates muted color palette
 *   .sensory-enlarge-targets  — scales interactive elements by 1.25x
 *   .sensory-reduce-text      — reduces text density, increases spacing
 *   .sensory-visual-timers    — enables transition countdown indicators
 *   .reduced-motion           — handled by useReducedMotion (already exists)
 *
 * Usage:
 *   const sensory = useSensoryMode(childId);
 *
 *   // Quick preset
 *   sensory.applyPreset('low');
 *
 *   // Per-setting toggle
 *   sensory.toggleMutedColors();
 *
 *   // Component-level query
 *   const targetScale = sensory.targetScale; // 1.0 or 1.25
 *   const audioVolume = sensory.audioVolume; // 0.0-1.0
 *
 * WCAG 2.1 compliance:
 *   - 1.4.12: Text Spacing (text density reduction)
 *   - 2.3.3: Animation from Interactions (reduced motion)
 *   - 2.5.5: Target Size (enlarged targets)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useReducedMotion, type UseReducedMotionReturn } from './useReducedMotion';
import {
  getParentFocusBridge,
  type SensoryLimits,
} from '../lib/parent-focus-bridge';

// ============================================================================
// Types
// ============================================================================

export type SensoryPreset = 'low' | 'moderate' | 'high';

export type AudioMode = 'full' | 'reduced' | 'muted';

export interface SensoryModeState {
  /** Current child this sensory profile applies to */
  childId: string | null;

  /** Whether muted colors are active */
  mutedColors: boolean;
  /** Whether touch targets are enlarged (25% bigger) */
  enlargeTargets: boolean;
  /** Whether text density is reduced */
  reduceText: boolean;
  /** Whether visual timers are shown on transitions */
  showTimers: boolean;
  /** Audio mode: full, reduced (50%), or muted (0%) */
  audioMode: AudioMode;
  /** Maximum sensory channels active at once */
  maxChannels: number;

  // Computed helpers
  /** Touch target scale factor (1.0 or 1.25) */
  targetScale: number;
  /** Audio volume (0.0, 0.5, or 1.0) */
  audioVolume: number;
  /** Whether any sensory accommodation is active */
  isActive: boolean;
  /** Human-readable summary of active accommodations */
  summary: string;

  // Reduced motion (from useReducedMotion)
  /** Reduced motion state from the existing hook */
  reducedMotion: UseReducedMotionReturn;
}

export interface UseSensoryModeReturn extends SensoryModeState {
  /** Apply a preset sensory profile */
  applyPreset: (preset: SensoryPreset) => void;
  /** Toggle muted colors */
  toggleMutedColors: () => void;
  /** Toggle enlarged targets */
  toggleEnlargeTargets: () => void;
  /** Toggle reduced text density */
  toggleReduceText: () => void;
  /** Toggle visual timers */
  toggleShowTimers: () => void;
  /** Set audio mode */
  setAudioMode: (mode: AudioMode) => void;
  /** Set max sensory channels */
  setMaxChannels: (channels: number) => void;
  /** Switch to a different child's profile */
  switchChild: (childId: string) => void;
  /** Reset to default (high sensory tolerance) */
  reset: () => void;
  /** Get the current preset name based on settings */
  currentPreset: SensoryPreset | 'custom';
}

// ============================================================================
// Constants
// ============================================================================

const CSS_MUTED_COLORS = 'sensory-muted-colors';
const CSS_ENLARGE_TARGETS = 'sensory-enlarge-targets';
const CSS_REDUCE_TEXT = 'sensory-reduce-text';
const CSS_VISUAL_TIMERS = 'sensory-visual-timers';

const STORAGE_KEY = 'aminy-sensory-active-child';
const EVENT_NAME = 'aminy-sensory-change';

const AUDIO_VOLUME_MAP: Record<AudioMode, number> = {
  full: 1.0,
  reduced: 0.5,
  muted: 0.0,
};

// ============================================================================
// Helper: convert SensoryLimits to local state
// ============================================================================

function limitsToState(limits: SensoryLimits): Omit<SensoryModeState, 'childId' | 'targetScale' | 'audioVolume' | 'isActive' | 'summary' | 'reducedMotion'> {
  return {
    mutedColors: limits.mutedColors,
    enlargeTargets: limits.enlargeTargets,
    reduceText: false, // Not in SensoryLimits — defaults to follow muted colors
    showTimers: limits.showTimers,
    audioMode: limits.audioMode,
    maxChannels: limits.maxChannels,
  };
}

function stateToLimits(state: SensoryModeState): Partial<SensoryLimits> {
  return {
    mutedColors: state.mutedColors,
    enlargeTargets: state.enlargeTargets,
    showTimers: state.showTimers,
    audioMode: state.audioMode,
    maxChannels: state.maxChannels,
    reduceMotion: state.reducedMotion.isReducedMotion,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useSensoryMode(initialChildId?: string): UseSensoryModeReturn {
  const bridge = getParentFocusBridge();
  const reducedMotion = useReducedMotion();

  // Track which child is active
  const [childId, setChildId] = useState<string | null>(() => {
    if (initialChildId) return initialChildId;
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  // Local sensory state
  const [mutedColors, setMutedColors] = useState(false);
  const [enlargeTargets, setEnlargeTargets] = useState(false);
  const [reduceText, setReduceText] = useState(false);
  const [showTimers, setShowTimers] = useState(false);
  const [audioMode, setAudioModeState] = useState<AudioMode>('full');
  const [maxChannels, setMaxChannelsState] = useState(3);

  // Ref to avoid re-reading bridge on every render
  const loadedChildRef = useRef<string | null>(null);

  // Load sensory limits from bridge when childId changes
  useEffect(() => {
    if (!childId || childId === loadedChildRef.current) return;
    loadedChildRef.current = childId;

    const limits = bridge.getSensoryLimits(childId);
    const local = limitsToState(limits);

    setMutedColors(local.mutedColors);
    setEnlargeTargets(local.enlargeTargets);
    setReduceText(local.mutedColors); // text density follows muted colors by default
    setShowTimers(local.showTimers);
    setAudioModeState(local.audioMode);
    setMaxChannelsState(local.maxChannels);

    // Sync reduced motion to match profile
    if (limits.reduceMotion !== reducedMotion.isReducedMotion) {
      reducedMotion.setReducedMotion(limits.reduceMotion);
    }

    // Persist active child
    try {
      localStorage.setItem(STORAGE_KEY, childId);
    } catch { /* ignore */ }
  }, [childId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========================================================================
  // CSS Class Management
  // ========================================================================

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(CSS_MUTED_COLORS, mutedColors);
    root.classList.toggle(CSS_ENLARGE_TARGETS, enlargeTargets);
    root.classList.toggle(CSS_REDUCE_TEXT, reduceText);
    root.classList.toggle(CSS_VISUAL_TIMERS, showTimers);
  }, [mutedColors, enlargeTargets, reduceText, showTimers]);

  // Fire custom event for non-React listeners (e.g., audio engine)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: {
        childId,
        mutedColors,
        enlargeTargets,
        reduceText,
        showTimers,
        audioMode,
        audioVolume: AUDIO_VOLUME_MAP[audioMode],
        maxChannels,
        reducedMotion: reducedMotion.isReducedMotion,
      },
    }));
  }, [childId, mutedColors, enlargeTargets, reduceText, showTimers, audioMode, maxChannels, reducedMotion.isReducedMotion]);

  // ========================================================================
  // Persist changes back to bridge
  // ========================================================================

  const persistToBridge = useCallback((updates: Partial<SensoryLimits>) => {
    if (!childId) return;
    bridge.setSensoryLimits(childId, updates);
  }, [childId, bridge]);

  // ========================================================================
  // Toggles
  // ========================================================================

  const toggleMutedColors = useCallback(() => {
    setMutedColors(prev => {
      const next = !prev;
      persistToBridge({ mutedColors: next });
      return next;
    });
  }, [persistToBridge]);

  const toggleEnlargeTargets = useCallback(() => {
    setEnlargeTargets(prev => {
      const next = !prev;
      persistToBridge({ enlargeTargets: next });
      return next;
    });
  }, [persistToBridge]);

  const toggleReduceText = useCallback(() => {
    setReduceText(prev => !prev);
    // reduceText is a UI-only enhancement, not persisted to SensoryLimits
  }, []);

  const toggleShowTimers = useCallback(() => {
    setShowTimers(prev => {
      const next = !prev;
      persistToBridge({ showTimers: next });
      return next;
    });
  }, [persistToBridge]);

  const setAudioMode = useCallback((mode: AudioMode) => {
    setAudioModeState(mode);
    persistToBridge({ audioMode: mode });
  }, [persistToBridge]);

  const setMaxChannels = useCallback((channels: number) => {
    const clamped = Math.max(1, Math.min(3, channels));
    setMaxChannelsState(clamped);
    persistToBridge({ maxChannels: clamped });
  }, [persistToBridge]);

  // ========================================================================
  // Presets
  // ========================================================================

  const applyPreset = useCallback((preset: SensoryPreset) => {
    if (!childId) return;

    // Use the bridge's preset method for storage consistency
    bridge.applySensoryProfile(childId, preset);

    // Reload from bridge
    const limits = bridge.getSensoryLimits(childId);
    const local = limitsToState(limits);

    setMutedColors(local.mutedColors);
    setEnlargeTargets(local.enlargeTargets);
    setReduceText(local.mutedColors);
    setShowTimers(local.showTimers);
    setAudioModeState(local.audioMode);
    setMaxChannelsState(local.maxChannels);

    // Sync reduced motion
    reducedMotion.setReducedMotion(limits.reduceMotion);
  }, [childId, bridge, reducedMotion]);

  const switchChild = useCallback((newChildId: string) => {
    loadedChildRef.current = null; // Force reload
    setChildId(newChildId);
  }, []);

  const reset = useCallback(() => {
    setMutedColors(false);
    setEnlargeTargets(false);
    setReduceText(false);
    setShowTimers(false);
    setAudioModeState('full');
    setMaxChannelsState(3);
    reducedMotion.setReducedMotion(false);

    if (childId) {
      bridge.applySensoryProfile(childId, 'high');
    }
  }, [childId, bridge, reducedMotion]);

  // ========================================================================
  // Computed Values
  // ========================================================================

  const targetScale = enlargeTargets ? 1.25 : 1.0;
  const audioVolume = AUDIO_VOLUME_MAP[audioMode];
  const isActive = mutedColors || enlargeTargets || reduceText || showTimers || audioMode !== 'full' || reducedMotion.isReducedMotion;

  const currentPreset = useMemo((): SensoryPreset | 'custom' => {
    if (!mutedColors && !enlargeTargets && !showTimers && audioMode === 'full' && !reducedMotion.isReducedMotion) {
      return 'high';
    }
    if (mutedColors && enlargeTargets && showTimers && audioMode === 'reduced' && !reducedMotion.isReducedMotion) {
      return 'moderate';
    }
    if (mutedColors && enlargeTargets && showTimers && audioMode === 'reduced' && reducedMotion.isReducedMotion) {
      return 'low';
    }
    return 'custom';
  }, [mutedColors, enlargeTargets, showTimers, audioMode, reducedMotion.isReducedMotion]);

  const summary = useMemo(() => {
    if (!isActive) return 'Standard sensory mode';
    const parts: string[] = [];
    if (reducedMotion.isReducedMotion) parts.push('reduced motion');
    if (mutedColors) parts.push('muted colors');
    if (enlargeTargets) parts.push('larger targets');
    if (reduceText) parts.push('simplified text');
    if (showTimers) parts.push('visual timers');
    if (audioMode === 'reduced') parts.push('quieter audio');
    if (audioMode === 'muted') parts.push('audio muted');
    return `Active: ${parts.join(', ')}`;
  }, [isActive, mutedColors, enlargeTargets, reduceText, showTimers, audioMode, reducedMotion.isReducedMotion]);

  // ========================================================================
  // Return
  // ========================================================================

  return useMemo(
    () => ({
      childId,
      mutedColors,
      enlargeTargets,
      reduceText,
      showTimers,
      audioMode,
      maxChannels,
      targetScale,
      audioVolume,
      isActive,
      summary,
      reducedMotion,
      currentPreset,
      applyPreset,
      toggleMutedColors,
      toggleEnlargeTargets,
      toggleReduceText,
      toggleShowTimers,
      setAudioMode,
      setMaxChannels,
      switchChild,
      reset,
    }),
    [
      childId, mutedColors, enlargeTargets, reduceText, showTimers,
      audioMode, maxChannels, targetScale, audioVolume, isActive,
      summary, reducedMotion, currentPreset, applyPreset,
      toggleMutedColors, toggleEnlargeTargets, toggleReduceText,
      toggleShowTimers, setAudioMode, setMaxChannels, switchChild, reset,
    ],
  );
}

// ============================================================================
// Standalone Utilities (non-React)
// ============================================================================

/**
 * Check if any sensory accommodation CSS class is active on <html>.
 */
export function isSensoryModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return (
    root.classList.contains(CSS_MUTED_COLORS) ||
    root.classList.contains(CSS_ENLARGE_TARGETS) ||
    root.classList.contains(CSS_REDUCE_TEXT) ||
    root.classList.contains(CSS_VISUAL_TIMERS)
  );
}

/**
 * Get the current audio volume based on sensory mode.
 * Useful for audio playback outside React.
 */
export function getSensoryAudioVolume(): number {
  if (typeof localStorage === 'undefined') return 1.0;
  const activeChild = localStorage.getItem(STORAGE_KEY);
  if (!activeChild) return 1.0;
  const bridge = getParentFocusBridge();
  const limits = bridge.getSensoryLimits(activeChild);
  return AUDIO_VOLUME_MAP[limits.audioMode];
}

/**
 * Listen for sensory mode changes from outside React.
 */
export function onSensoryChange(
  callback: (detail: Record<string, unknown>) => void,
): () => void {
  const handler = (e: Event) => {
    callback((e as CustomEvent).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export default useSensoryMode;
