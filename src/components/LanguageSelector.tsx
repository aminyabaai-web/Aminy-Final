/**
 * Language Selector Component
 *
 * Allows users to switch between supported languages
 * Persists selection to localStorage
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
} from '../i18n';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const currentLang = getCurrentLanguage();

  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === currentLang
  );

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === currentLang) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      await changeLanguage(langCode);
      // Force a re-render by closing dropdown
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  // Compact variant - just shows flag
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
          aria-label={t('settings.language')}
        >
          <span className="text-lg">{currentLanguageInfo?.flag || '🌐'}</span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1 py-1 w-40 bg-white rounded-lg shadow-lg border z-50">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={isChanging}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                    lang.code === currentLang
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-700'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="flex-1">{lang.nativeName}</span>
                  {lang.code === currentLang && (
                    <Check className="w-4 h-4 text-teal-600" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Inline variant - horizontal list of flags
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="w-4 h-4 text-gray-500" />
        <div className="flex gap-1">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={isChanging}
              className={`p-1.5 rounded transition-colors ${
                lang.code === currentLang
                  ? 'bg-teal-100 ring-2 ring-teal-500'
                  : 'hover:bg-gray-100'
              }`}
              title={lang.nativeName}
            >
              <span className="text-lg">{lang.flag}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Dropdown variant - full dropdown with labels
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border rounded-xl flex items-center justify-between hover:border-gray-400 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-gray-500" />
          <div className="text-left">
            <div className="text-sm text-gray-500">{t('settings.language')}</div>
            <div className="font-medium flex items-center gap-2">
              <span>{currentLanguageInfo?.flag}</span>
              <span>{currentLanguageInfo?.nativeName}</span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 mt-2 py-2 bg-white rounded-xl shadow-lg border z-50">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={isChanging}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  lang.code === currentLang
                    ? 'bg-teal-50'
                    : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-sm text-gray-500">{lang.name}</div>
                </div>
                {lang.code === currentLang && (
                  <Check className="w-5 h-5 text-teal-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
