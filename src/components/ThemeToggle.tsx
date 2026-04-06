// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('system');
  const [isOpen, setIsOpen] = useState(false);

  // Initialize theme from localStorage or default to system
  useEffect(() => {
    const savedTheme = localStorage.getItem('aminy-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      setTheme('system');
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (themeToApply: Theme) => {
      const root = document.documentElement;
      
      if (themeToApply === 'system') {
        // Remove explicit theme classes and let CSS media queries handle it
        root.classList.remove('light', 'dark');
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        }
      } else if (themeToApply === 'dark') {
        root.classList.remove('light');
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    applyTheme(theme);
    localStorage.setItem('aminy-theme', theme);

    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  const themes = [
    {
      value: 'light' as Theme,
      label: 'Light',
      icon: Sun,
      description: 'Light mode'
    },
    {
      value: 'dark' as Theme,
      label: 'Dark',
      icon: Moon,
      description: 'Dark mode'
    },
    {
      value: 'system' as Theme,
      label: 'System',
      icon: Monitor,
      description: 'Follow system setting'
    }
  ];

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Monitor;

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 group"
        aria-label="Theme settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <CurrentIcon className="w-5 h-5 text-gray-600 dark:text-slate-300" strokeWidth={1.5} />
          </div>
          
          <div className="text-left">
            <div className="text-sm text-slate-900 dark:text-slate-100">Appearance</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {currentTheme?.description}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
            {theme}
          </span>
          <svg 
            className={`w-4 h-4 text-gray-400 dark:text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide px-3 py-2 mb-1">
                Choose Theme
              </div>
              
              {themes.map((themeOption) => {
                const Icon = themeOption.icon;
                const isSelected = theme === themeOption.value;
                
                return (
                  <button
                    key={themeOption.value}
                    onClick={() => handleThemeChange(themeOption.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                      isSelected 
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' 
                        : 'text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                    role="menuitemradio"
                    aria-checked={isSelected}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${
                        isSelected 
                          ? 'text-teal-600 dark:text-teal-400' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`} />
                      <div className="text-left">
                        <div className="font-medium">{themeOption.label}</div>
                        <div className={`text-xs ${
                          isSelected 
                            ? 'text-teal-600 dark:text-teal-400' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {themeOption.description}
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="border-t border-gray-200 dark:border-slate-600 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System setting follows your device's appearance preference
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}