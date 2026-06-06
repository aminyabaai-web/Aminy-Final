// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, type ThemeMode } from '../lib/theme-provider';

type Theme = ThemeMode;

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  // Drive off the single source of truth — ThemeProvider context.
  // The provider handles localStorage persistence and system-pref watching,
  // so this component is purely UI now.
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

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
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-[#E8E4DF] dark:border-slate-600 hover:border-[#E8E4DF] dark:hover:border-slate-500 hover:bg-[#FAF7F2] dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 group"
        aria-label="Theme settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-[#F0EDE8] dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <CurrentIcon className="w-5 h-5 text-[#5A6B7A] dark:text-slate-300" strokeWidth={1.5} />
          </div>
          
          <div className="text-left">
            <div className="text-sm text-[#1B2733] dark:text-slate-100">Appearance</div>
            <div className="text-xs text-[#5A6B7A] dark:text-slate-400">
              {currentTheme?.description}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-[#5A6B7A] dark:text-slate-400 capitalize">
            {theme}
          </span>
          <svg 
            className={`w-4 h-4 text-[#8A9BA8] dark:text-slate-400 transition-transform duration-200 ${
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
          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg border border-[#E8E4DF] dark:border-slate-600 shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide px-3 py-2 mb-1">
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
                        ? 'bg-[#6B9080]/10 dark:bg-[#6B9080]/10 text-[#6B9080] dark:text-[#7BA7BC]' 
                        : 'text-[#3A4A57] dark:text-slate-200 hover:bg-[#FAF7F2] dark:hover:bg-slate-700'
                    }`}
                    role="menuitemradio"
                    aria-checked={isSelected}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${
                        isSelected 
                          ? 'text-[#6B9080] dark:text-primary' 
                          : 'text-[#5A6B7A] dark:text-slate-400'
                      }`} />
                      <div className="text-left">
                        <div className="font-medium">{themeOption.label}</div>
                        <div className={`text-xs ${
                          isSelected 
                            ? 'text-[#6B9080] dark:text-primary' 
                            : 'text-[#5A6B7A] dark:text-slate-400'
                        }`}>
                          {themeOption.description}
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#6B9080] dark:text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="border-t border-[#E8E4DF] dark:border-slate-600 p-3">
              <p className="text-xs text-[#5A6B7A] dark:text-slate-400">
                System setting follows your device's appearance preference
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}