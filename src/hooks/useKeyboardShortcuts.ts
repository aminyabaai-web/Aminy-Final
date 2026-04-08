// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Keyboard Shortcuts System
 *
 * Provides a comprehensive keyboard shortcuts system for power users.
 * Supports command palettes, custom shortcuts, and accessibility.
 */

import { useEffect, useCallback, useState, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Cmd on Mac
  description: string;
  category?: string;
  action: () => void;
  enabled?: boolean;
  global?: boolean; // Works even in input fields
}

export interface ShortcutGroup {
  name: string;
  shortcuts: Shortcut[];
}

type KeyHandler = (event: KeyboardEvent) => void;

// ============================================================================
// Utility Functions
// ============================================================================

function getKeyDisplay(shortcut: Shortcut): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');

  // Format the key nicely
  let key = shortcut.key.toUpperCase();
  if (key === ' ') key = 'Space';
  if (key === 'ARROWUP') key = '↑';
  if (key === 'ARROWDOWN') key = '↓';
  if (key === 'ARROWLEFT') key = '←';
  if (key === 'ARROWRIGHT') key = '→';
  if (key === 'ESCAPE') key = 'Esc';
  if (key === 'ENTER') key = '↵';
  if (key === 'BACKSPACE') key = '⌫';

  parts.push(key);

  return parts.join(isMac ? '' : '+');
}

function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
  const altMatches = shortcut.alt ? event.altKey : !event.altKey;
  const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const metaMatches = shortcut.meta ? event.metaKey : true; // meta is optional modifier

  return keyMatches && ctrlMatches && altMatches && shiftMatches && (shortcut.meta ? metaMatches : true);
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isEditable = target.isContentEditable;
  return isInput || isEditable;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useKeyboardShortcuts(shortcuts: Shortcut[], deps: unknown[] = []) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if in input unless shortcut is global
      const inInput = isInputElement(event.target);

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        if (inInput && !shortcut.global) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, deps);
}

// ============================================================================
// Single Shortcut Hook
// ============================================================================

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: Partial<Omit<Shortcut, 'key' | 'action' | 'description'>> = {},
  deps: unknown[] = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const inInput = isInputElement(event.target);
      if (inInput && !options.global) return;

      const shortcut: Shortcut = {
        key,
        ...options,
        description: '',
        action: () => {},
      };

      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        callbackRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, options.ctrl, options.alt, options.shift, options.meta, options.global, ...deps]);
}

// ============================================================================
// Escape Key Hook
// ============================================================================

export function useEscapeKey(callback: () => void, enabled = true) {
  useKeyboardShortcut('Escape', callback, { global: true, enabled });
}

// ============================================================================
// Arrow Keys Hook
// ============================================================================

export function useArrowKeys(
  callbacks: {
    onUp?: () => void;
    onDown?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
  },
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(event.target)) return;

      switch (event.key) {
        case 'ArrowUp':
          if (callbacks.onUp) {
            event.preventDefault();
            callbacks.onUp();
          }
          break;
        case 'ArrowDown':
          if (callbacks.onDown) {
            event.preventDefault();
            callbacks.onDown();
          }
          break;
        case 'ArrowLeft':
          if (callbacks.onLeft) {
            event.preventDefault();
            callbacks.onLeft();
          }
          break;
        case 'ArrowRight':
          if (callbacks.onRight) {
            event.preventDefault();
            callbacks.onRight();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks.onUp, callbacks.onDown, callbacks.onLeft, callbacks.onRight, enabled]);
}

// ============================================================================
// Command Palette Hook
// ============================================================================

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Cmd/Ctrl + K to open
  useKeyboardShortcut('k', toggle, { ctrl: true, global: true });

  // Escape to close
  useEscapeKey(close, isOpen);

  return { isOpen, open, close, toggle };
}

// ============================================================================
// Default App Shortcuts
// ============================================================================

export const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { key: 'g', description: 'Go to Dashboard', action: () => {}, category: 'navigation' },
      { key: 'c', description: 'Open Chat', action: () => {}, category: 'navigation' },
      { key: 's', description: 'Go to Settings', action: () => {}, category: 'navigation' },
    ],
  },
  {
    name: 'Actions',
    shortcuts: [
      { key: 'n', ctrl: true, description: 'New Entry', action: () => {}, category: 'actions' },
      { key: 's', ctrl: true, description: 'Save', action: () => {}, category: 'actions', global: true },
      { key: 'z', ctrl: true, description: 'Undo', action: () => {}, category: 'actions', global: true },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { key: '/', description: 'Search', action: () => {}, category: 'view' },
      { key: '?', shift: true, description: 'Show Shortcuts', action: () => {}, category: 'view' },
      { key: 'd', description: 'Toggle Dark Mode', action: () => {}, category: 'view' },
    ],
  },
];

// ============================================================================
// Shortcut Display Component Helper
// ============================================================================

export { getKeyDisplay };

// ============================================================================
// Type-ahead / Search Focus Hook
// ============================================================================

export function useSearchFocus(
  inputRef: React.RefObject<HTMLInputElement>,
  key = '/',
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(event.target)) return;

      if (event.key === key) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, enabled]);
}

// ============================================================================
// Konami Code Easter Egg Hook (fun!)
// ============================================================================

const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function useKonamiCode(callback: () => void) {
  const sequenceRef = useRef<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      sequenceRef.current.push(event.key);

      // Keep only the last N keys
      if (sequenceRef.current.length > KONAMI_CODE.length) {
        sequenceRef.current = sequenceRef.current.slice(-KONAMI_CODE.length);
      }

      // Check if sequence matches
      if (sequenceRef.current.length === KONAMI_CODE.length) {
        const matches = sequenceRef.current.every((key, i) => key === KONAMI_CODE[i]);
        if (matches) {
          callback();
          sequenceRef.current = [];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
}
