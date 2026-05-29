// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Screen State Registry — gives Aminy AI deeper screen awareness.
 *
 * When a parent is looking at a specific goal, child, session, or any other
 * focused piece of data, the component publishes that state here. The AI chat
 * reads from this registry when building the system prompt, so the AI can
 * reference what's literally on screen ("I see you're looking at Liam's
 * transition goal right now…").
 *
 * This is intentionally lightweight — no React context, no observers. Just a
 * module-level mutable map. Components write on render via useEffect,
 * BevelChatOverlay reads on send.
 */

export interface ScreenState {
  /** The screen the user is on (matches AppScreen names) */
  screen: string;
  /** Name of the child currently in focus (e.g. for child-selector screens) */
  activeChildName?: string;
  /** Active treatment goal being viewed/edited */
  activeGoal?: string;
  /** Recent action on this screen (e.g. "just logged a meltdown") */
  recentAction?: string;
  /** Any visible error or empty state (e.g. "no appointments this week") */
  visibleState?: string;
  /** Free-form additional context — what's literally visible */
  notes?: string;
  /** Timestamp of last update — for staleness checks */
  updatedAt: number;
}

let currentState: ScreenState | null = null;

/** Set the current screen state. Call from a useEffect when data changes. */
export function setScreenState(state: Omit<ScreenState, 'updatedAt'>): void {
  currentState = { ...state, updatedAt: Date.now() };
}

/** Clear screen state (call on unmount or screen change to prevent stale context). */
export function clearScreenState(): void {
  currentState = null;
}

/** Read the current screen state. Returns null if stale (>5 min) or unset. */
export function getScreenState(): ScreenState | null {
  if (!currentState) return null;
  if (Date.now() - currentState.updatedAt > 5 * 60 * 1000) {
    currentState = null;
    return null;
  }
  return currentState;
}

/**
 * Build a one-paragraph description of what the user is currently seeing,
 * for injection into the AI system prompt. Returns empty string if no state.
 */
export function buildScreenStateBlock(): string {
  const s = getScreenState();
  if (!s) return '';

  const parts: string[] = [`The parent is right now on the "${s.screen}" screen.`];

  if (s.activeChildName) parts.push(`They're focused on ${s.activeChildName}.`);
  if (s.activeGoal) parts.push(`The active goal they're viewing is: "${s.activeGoal}".`);
  if (s.recentAction) parts.push(`They just ${s.recentAction}.`);
  if (s.visibleState) parts.push(`What's on screen: ${s.visibleState}.`);
  if (s.notes) parts.push(s.notes);

  return parts.join(' ');
}

/**
 * Convenience React hook — set screen state on mount, clear on unmount.
 * Use this in any component where the AI should know what's visible.
 *
 * @example
 *   useScreenState({ screen: 'goal-detail', activeGoal: goal.name, activeChildName: child.name });
 */
import { useEffect } from 'react';

export function useScreenState(state: Omit<ScreenState, 'updatedAt'> | null) {
  useEffect(() => {
    if (state) {
      setScreenState(state);
      return () => clearScreenState();
    }
    return undefined;
  }, [
    // Re-publish when any meaningful field changes
    state?.screen,
    state?.activeChildName,
    state?.activeGoal,
    state?.recentAction,
    state?.visibleState,
    state?.notes,
  ]);
}
