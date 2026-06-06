// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Palette, Moon, Sun, Zap, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

// ===== PHASE 3: ACCESSIBILITY ENHANCEMENTS =====

// Accessibility preferences
interface A11yPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  darkMode: 'light' | 'dark' | 'auto';
  soundEffects: boolean;
}

// Skip Links Component
export const SkipLinks: React.FC = () => (
  <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50">
    <a
      href="#main-content"
      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      onFocus={() => toast.info('Skip to main content available')}
    >
      Skip to main content
    </a>
    <a
      href="#navigation"
      className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
    >
      Skip to navigation
    </a>
  </div>
);

// Focus Management Hook
export const useFocusManagement = () => {
  const focusRingRef = useRef<HTMLDivElement>(null);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [lastFocusedElement, setLastFocusedElement] = useState<Element | null>(null);

  useEffect(() => {
    // Track keyboard vs mouse users
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        document.body.classList.add('keyboard-user');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      document.body.classList.remove('keyboard-user');
    };

    // Focus ring visualization
    const handleFocusIn = (e: FocusEvent) => {
      if (isKeyboardUser && e.target instanceof HTMLElement) {
        setLastFocusedElement(e.target);
        
        if (focusRingRef.current) {
          const rect = e.target.getBoundingClientRect();
          const ring = focusRingRef.current;
          
          ring.style.display = 'block';
          ring.style.left = `${rect.left - 2}px`;
          ring.style.top = `${rect.top - 2}px`;
          ring.style.width = `${rect.width + 4}px`;
          ring.style.height = `${rect.height + 4}px`;
        }
      }
    };

    const handleFocusOut = () => {
      if (focusRingRef.current) {
        focusRingRef.current.style.display = 'none';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [isKeyboardUser]);

  const restoreFocus = () => {
    if (lastFocusedElement && 'focus' in lastFocusedElement) {
      (lastFocusedElement as HTMLElement).focus();
    }
  };

  return { isKeyboardUser, restoreFocus, focusRingRef };
};

// Screen Reader Announcements
export const ScreenReaderAnnouncer: React.FC = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  useEffect(() => {
    const handleAnnouncement = (event: CustomEvent) => {
      const message = event.detail.message;
      const priority = event.detail.priority || 'polite';
      
      setAnnouncements(prev => [...prev, message].slice(-3)); // Keep only last 3
      
      // Clear after reading
      setTimeout(() => {
        setAnnouncements(prev => prev.filter(msg => msg !== message));
      }, 3000);
    };

    window.addEventListener('announce', handleAnnouncement as EventListener);

    return () => {
      window.removeEventListener('announce', handleAnnouncement as EventListener);
    };
  }, []);

  return (
    <div className="sr-only">
      {announcements.map((announcement, index) => (
        <div key={index} aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      ))}
    </div>
  );
};

// Announce function for components to use
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  window.dispatchEvent(new CustomEvent('announce', {
    detail: { message, priority }
  }));
};

// Accessibility Toolbar
export const AccessibilityToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<A11yPreferences>({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    largeText: false,
    screenReader: false,
    keyboardNavigation: true,
    darkMode: 'auto',
    soundEffects: true
  });

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem('aminy-a11y-preferences');
    if (saved) {
      try {
        const savedPrefs = JSON.parse(saved);
        setPreferences(prev => ({ ...prev, ...savedPrefs }));
      } catch (error) {
      }
    }
  }, []);

  useEffect(() => {
    // Save preferences
    localStorage.setItem('aminy-a11y-preferences', JSON.stringify(preferences));
    
    // Apply preferences
    applyAccessibilityPreferences(preferences);
  }, [preferences]);

  const togglePreference = (key: keyof A11yPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));

    announce(`${key} ${preferences[key] ? 'disabled' : 'enabled'}`);
  };

  const setDarkMode = (mode: 'light' | 'dark' | 'auto') => {
    setPreferences(prev => ({ ...prev, darkMode: mode }));
    announce(`Dark mode set to ${mode}`);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40 flex items-center justify-center"
        aria-label="Open accessibility toolbar"
        title="Accessibility Options"
      >
        <Eye className="w-6 h-6" />
      </button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Accessibility Options
          </DialogTitle>
          <DialogDescription>
            Customize your accessibility preferences for a better experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Visual Preferences */}
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Visual</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.highContrast}
                  onChange={() => togglePreference('highContrast')}
                  className="rounded border-[#E8E4DF] text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">High contrast</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.largeText}
                  onChange={() => togglePreference('largeText')}
                  className="rounded border-[#E8E4DF] text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Large text</span>
              </label>
            </div>
          </div>

          {/* Motion Preferences */}
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Motion</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.reducedMotion}
                onChange={() => togglePreference('reducedMotion')}
                className="rounded border-[#E8E4DF] text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Reduce motion</span>
            </label>
          </div>

          {/* Theme Selection */}
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Theme</h3>
            <div className="flex gap-2">
              <Button
                variant={preferences.darkMode === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDarkMode('light')}
                className="flex-1"
              >
                <Sun className="w-4 h-4 mr-1" />
                Light
              </Button>
              <Button
                variant={preferences.darkMode === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDarkMode('dark')}
                className="flex-1"
              >
                <Moon className="w-4 h-4 mr-1" />
                Dark
              </Button>
              <Button
                variant={preferences.darkMode === 'auto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDarkMode('auto')}
                className="flex-1"
              >
                <Zap className="w-4 h-4 mr-1" />
                Auto
              </Button>
            </div>
          </div>

          {/* Audio Preferences */}
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Audio</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.soundEffects}
                onChange={() => togglePreference('soundEffects')}
                className="rounded border-[#E8E4DF] text-blue-600 focus:ring-blue-500"
              />
              <Volume2 className="w-4 h-4" />
              <span className="text-sm">Sound effects</span>
            </label>
          </div>

          {/* Navigation Preferences */}
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Navigation</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.keyboardNavigation}
                onChange={() => togglePreference('keyboardNavigation')}
                className="rounded border-[#E8E4DF] text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Enhanced keyboard navigation</span>
            </label>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-between">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPreferences({
                reducedMotion: false,
                highContrast: false,
                largeText: false,
                screenReader: false,
                keyboardNavigation: true,
                darkMode: 'auto',
                soundEffects: true
              });
              announce('Accessibility preferences reset to default');
            }}
          >
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Apply accessibility preferences to DOM
const applyAccessibilityPreferences = (preferences: A11yPreferences) => {
  const root = document.documentElement;

  // High contrast
  if (preferences.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Large text
  if (preferences.largeText) {
    root.classList.add('large-text');
  } else {
    root.classList.remove('large-text');
  }

  // Reduced motion
  if (preferences.reducedMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }

  // Dark mode
  root.classList.remove('light', 'dark');
  if (preferences.darkMode === 'light') {
    root.classList.add('light');
  } else if (preferences.darkMode === 'dark') {
    root.classList.add('dark');
  } else {
    // Auto mode - use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    }
  }

  // Keyboard navigation
  if (preferences.keyboardNavigation) {
    root.classList.add('enhanced-focus');
  } else {
    root.classList.remove('enhanced-focus');
  }

  // Sound effects
  root.setAttribute('data-sound-effects', preferences.soundEffects ? 'on' : 'off');
};

// Voice Control Hook (future enhancement)
export const useVoiceControl = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognitionCtor = typeof globalThis.SpeechRecognition !== 'undefined' ? globalThis.SpeechRecognition : typeof globalThis.webkitSpeechRecognition !== 'undefined' ? globalThis.webkitSpeechRecognition : null;
    
    if (SpeechRecognitionCtor) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        
        // Basic voice commands
        if (transcript.includes('go to home')) {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }));
        } else if (transcript.includes('go to care')) {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'care' }));
        } else if (transcript.includes('go to plans')) {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'plan' }));
        } else if (transcript.includes('help') || transcript.includes('support')) {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'help' }));
        }
        
        announce(`Voice command recognized: ${transcript}`);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[Voice] Recognition error:', event.error);
        setIsListening(false);
        
        if (event.error !== 'aborted') {
          toast.error("Voice didn't catch that — try again or use keyboard", {
            description: 'We\'re here to help either way'
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('Listening for voice commands...');
    } catch (error) {
      toast.error("Voice features aren't available right now — keyboard works great!");
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isSupported, isListening, startListening, stopListening };
};

// Keyboard Navigation Helper
export const KeyboardNavigationHelper: React.FC = () => {
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show help on F1 or ?
      if (event.key === 'F1' || (event.shiftKey && event.key === '?')) {
        event.preventDefault();
        setShowHelper(true);
      }
      
      // Hide help on Escape
      if (event.key === 'Escape' && showHelper) {
        setShowHelper(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHelper]);

  if (!showHelper) return null;

  return (
    <Dialog open={showHelper} onOpenChange={setShowHelper}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Navigation Help</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Navigation</h3>
            <ul className="text-sm text-[#5A6B7A] space-y-1">
              <li><kbd>Tab</kbd> - Move to next element</li>
              <li><kbd>Shift + Tab</kbd> - Move to previous element</li>
              <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Activate button/link</li>
              <li><kbd>Escape</kbd> - Close modal/dropdown</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Shortcuts</h3>
            <ul className="text-sm text-[#5A6B7A] space-y-1">
              <li><kbd>Alt + H</kbd> - Go to Home</li>
              <li><kbd>Alt + C</kbd> - Go to Care</li>
              <li><kbd>Alt + P</kbd> - Go to Plan</li>
              <li><kbd>Alt + R</kbd> - Go to Reports</li>
              <li><kbd>Ctrl + Shift + H</kbd> - Emergency help</li>
              <li><kbd>F1</kbd> or <kbd>Shift + ?</kbd> - This help</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-[#1B2733] mb-2">Forms</h3>
            <ul className="text-sm text-[#5A6B7A] space-y-1">
              <li><kbd>Arrow Keys</kbd> - Navigate options</li>
              <li><kbd>Space</kbd> - Select checkbox/radio</li>
              <li><kbd>Enter</kbd> - Submit form</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end mt-4 sm:mt-6">
          <Button onClick={() => setShowHelper(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Global keyboard shortcuts
export const useGlobalKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if not in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;

      // Navigation shortcuts
      if (isAlt && !event.shiftKey && !isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'h':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }));
            announce('Navigating to Home');
            break;
          case 'c':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'care' }));
            announce('Navigating to Care');
            break;
          case 'p':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'plan' }));
            announce('Navigating to Plan');
            break;
          case 'r':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'reports' }));
            announce('Navigating to Reports');
            break;
          case 'j':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'junior' }));
            announce('Navigating to Ease');
            break;
          case 'm':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'more' }));
            announce('Navigating to More');
            break;
        }
      }

      // Emergency help shortcut
      if (isCtrlOrCmd && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('emergency-help'));
        announce('Emergency help activated');
      }

      // Search shortcut
      if (isCtrlOrCmd && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"]') as HTMLElement;
        if (searchInput) {
          searchInput.focus();
          announce('Search activated');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

// Focus Trap Hook
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
};

export default {
  SkipLinks,
  ScreenReaderAnnouncer,
  AccessibilityToolbar,
  KeyboardNavigationHelper,
  useFocusManagement,
  useVoiceControl,
  useGlobalKeyboardShortcuts,
  useFocusTrap,
  announce
};