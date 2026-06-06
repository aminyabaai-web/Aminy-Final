// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Keyboard Help Modal
 *
 * Displays available keyboard shortcuts when users press F1 or Shift+?
 */

import React, { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { Button } from './ui/button';

interface KeyboardShortcut {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: KeyboardShortcut[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Alt', 'H'], description: 'Go to Home' },
      { keys: ['Alt', 'A'], description: 'Go to Aminy' },
      { keys: ['Alt', 'M'], description: 'Go to Messages' },
      { keys: ['Alt', 'P'], description: 'Go to Care Plan' },
      { keys: ['Alt', 'R'], description: 'Go to Reports' },
      { keys: ['Alt', 'S'], description: 'Go to Settings' },
      { keys: ['Alt', 'V'], description: 'Go to Document Vault' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open search' },
      { keys: ['Ctrl', 'Shift', 'H'], description: 'Emergency help' },
      { keys: ['Ctrl', 'Shift', 'M'], description: 'Focus main content' },
      { keys: ['Tab'], description: 'Move to next element' },
      { keys: ['Shift', 'Tab'], description: 'Move to previous element' },
      { keys: ['Enter'], description: 'Activate button or link' },
      { keys: ['Space'], description: 'Toggle checkbox or button' },
    ],
  },
  {
    title: 'Dialogs & Menus',
    shortcuts: [
      { keys: ['Escape'], description: 'Close dialog or menu' },
      { keys: ['↑', '↓'], description: 'Navigate menu items' },
      { keys: ['Home'], description: 'Go to first item' },
      { keys: ['End'], description: 'Go to last item' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [
      { keys: ['F1'], description: 'Show this help' },
      { keys: ['Shift', '?'], description: 'Show this help' },
    ],
  },
];

function KeyboardKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-[#F0EDE8] dark:bg-slate-700 border border-[#E8E4DF] dark:border-slate-600 rounded text-xs font-mono font-medium text-[#3A4A57] dark:text-gray-300 shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardHelpModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowHelp = () => setIsOpen(true);
    window.addEventListener('show-keyboard-help', handleShowHelp);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('show-keyboard-help', handleShowHelp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DF] dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6B9080]/10 dark:bg-cyan-900/20 rounded-lg">
              <Keyboard className="w-5 h-5 text-[#6B9080] dark:text-cyan-400" />
            </div>
            <h2
              id="keyboard-help-title"
              className="text-lg font-semibold text-[#1B2733] dark:text-gray-100"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="Close keyboard help"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {shortcutCategories.map((category) => (
              <div key={category.title}>
                <h3 className="text-sm font-semibold text-[#3A4A57] dark:text-gray-300 mb-3">
                  {category.title}
                </h3>
                <ul className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between gap-4 py-1"
                    >
                      <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <KeyboardKey>{key}</KeyboardKey>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-[#8A9BA8] dark:text-[#5A6B7A] text-xs">
                                +
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-[#6B9080]/10 dark:bg-cyan-900/20 rounded-lg">
            <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300 mb-2">
              Tips for keyboard navigation
            </h3>
            <ul className="text-sm text-cyan-700 dark:text-cyan-400 space-y-1 list-disc list-inside">
              <li>Use Tab to move through interactive elements</li>
              <li>Press Enter or Space to activate buttons</li>
              <li>Arrow keys work in menus and tabs</li>
              <li>Escape closes modals and dropdowns</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E4DF] dark:border-slate-700 bg-[#FAF7F2] dark:bg-slate-900">
          <p className="text-xs text-[#5A6B7A] dark:text-[#8A9BA8] text-center">
            Press <KeyboardKey>Esc</KeyboardKey> to close this dialog
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardHelpModal;
