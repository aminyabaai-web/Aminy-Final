/**
 * Aminy Theme Provider
 *
 * Provides consistent theming across the app with:
 * - Light, Dark, and System modes
 * - Brand-aligned color tokens
 * - Persistent user preference
 * - Accessible contrast ratios
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark'; // Actual theme being applied
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'aminy-theme-preference';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Check localStorage for saved preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Resolve system theme
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Update resolved theme and apply to document
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);

    // Apply to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);

    // Also set color-scheme for native elements
    root.style.colorScheme = resolved;
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      document.documentElement.style.colorScheme = newTheme;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Theme Toggle Component - Compact button for settings
 */
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const options: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className={`flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md transition-all
            ${theme === option.value
              ? 'bg-white dark:bg-slate-700 shadow-sm text-accent'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
          `}
          aria-label={`Switch to ${option.label} mode`}
        >
          {option.icon}
          {showLabel && <span className="text-sm font-medium">{option.label}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Theme Selector - Full dropdown for settings page
 */
export function ThemeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options: { value: ThemeMode; label: string; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      description: 'Always use light mode'
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Always use dark mode'
    },
    {
      value: 'system',
      label: 'System',
      description: 'Match your device settings'
    },
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900 dark:text-white">
        Appearance
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              w-full flex items-center justify-between p-3 rounded-lg border transition-all
              ${theme === option.value
                ? 'border-accent bg-accent/5 dark:bg-accent/10'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-full
                ${theme === option.value
                  ? 'bg-accent/10 text-accent'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                }
              `}>
                {option.value === 'light' && <Sun className="w-4 h-4" />}
                {option.value === 'dark' && <Moon className="w-4 h-4" />}
                {option.value === 'system' && <Monitor className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-white">
                  {option.label}
                  {option.value === 'system' && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({resolvedTheme})
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </div>
            </div>
            {theme === option.value && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ThemeProvider;
