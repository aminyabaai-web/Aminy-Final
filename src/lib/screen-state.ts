// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Shared Screen State Module
 *
 * Since the Aminy app uses state-based navigation (currentScreen in App.tsx)
 * rather than URL routing, this module provides a simple way for non-React
 * code (like the AI context layer) to read the current screen.
 *
 * App.tsx calls setCurrentScreenGlobal() whenever currentScreen changes,
 * and the AI context layer reads it via getCurrentScreenGlobal().
 */

let _currentScreen: string = 'dashboard';

const _listeners: Set<(screen: string) => void> = new Set();

/**
 * Set the current screen value. Called from App.tsx on every screen change.
 */
export function setCurrentScreenGlobal(screen: string): void {
  _currentScreen = screen;
  _listeners.forEach((fn) => {
    try { fn(screen); } catch { /* listener errors are non-fatal */ }
  });
}

/**
 * Get the current screen value. Used by the AI context layer and any
 * non-React code that needs to know which screen the user is on.
 */
export function getCurrentScreenGlobal(): string {
  return _currentScreen;
}

/**
 * Subscribe to screen changes. Returns an unsubscribe function.
 */
export function onScreenChange(listener: (screen: string) => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}
