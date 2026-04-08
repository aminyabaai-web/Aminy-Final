// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Internationalization (i18n) Configuration
 *
 * Supports multiple languages for the Aminy app
 * Currently: English (en), Spanish (es)
 * Future: Portuguese (pt), French (fr), Chinese (zh)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

// Available languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇲🇽' },
  // Future languages:
  // { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  // { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  // { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

// Default namespace
export const DEFAULT_NS = 'common';

// Translation resources
const resources = {
  en: {
    common: enTranslations,
  },
  es: {
    common: esTranslations,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: DEFAULT_NS,
    ns: [DEFAULT_NS],

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'aminy_language',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Debug mode in development
    debug: import.meta.env.DEV,

    react: {
      useSuspense: false, // Disable suspense to prevent loading states
    },
  });

/**
 * Change the current language
 */
export function changeLanguage(langCode: string): Promise<void> {
  return new Promise((resolve) => {
    i18n.changeLanguage(langCode, () => {
      localStorage.setItem('aminy_language', langCode);
      // Update document direction for RTL languages (future)
      document.documentElement.lang = langCode;
      resolve();
    });
  });
}

/**
 * Get current language code
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(langCode: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === langCode);
}

/**
 * Get language info by code
 */
export function getLanguageInfo(langCode: string) {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === langCode);
}

export default i18n;
