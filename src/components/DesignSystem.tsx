// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Check, Copy, Palette, Type, Component, Grid, Moon, Sun, Heart, Star, Shield, Users, ChevronRight, Settings, Home, Bell, User, Search, Calendar, FileText, BarChart3, MessageCircle, Phone, Mail, Camera, Paperclip, Send, ArrowLeft, ArrowRight, Plus, Minus, X, Menu, Filter, Download, Upload, Edit, Trash2, Save, PlayCircle, PauseCircle, RotateCcw, RefreshCw, AlertCircle, CheckCircle, Info, AlertTriangle, Zap, Sparkles } from 'lucide-react';

export function DesignSystem() {
  const [selectedSection, setSelectedSection] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToClipboard = (text: string, tokenName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(tokenName);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Design Tokens
  const colorTokens = {
    primary: {
      'color.bg.primary': { value: '#2A7D99', description: 'Primary teal brand color' },
      'color.text.primary-contrast': { value: '#ffffff', description: 'Text on primary backgrounds' },
      'color.border.primary': { value: '#2A7D99', description: 'Primary borders and dividers' },
    },
    surface: {
      'color.bg.surface': { value: '#ffffff', description: 'Main surface background' },
      'color.bg.surface-soft': { value: '#f8fafc', description: 'Softer surface variant' },
      'color.bg.surface-elevated': { value: '#ffffff', description: 'Elevated surface cards' },
    },
    text: {
      'color.text.primary': { value: '#1e293b', description: 'Primary text color' },
      'color.text.secondary': { value: '#64748b', description: 'Secondary text color' },
      'color.text.muted': { value: '#94a3b8', description: 'Muted helper text' },
    },
    accent: {
      'color.bg.accent': { value: '#fef3f2', description: 'Warm coral accent background' },
      'color.text.accent': { value: '#f97316', description: 'Warm coral accent text' },
      'color.border.accent': { value: '#fed7d7', description: 'Coral accent borders' },
    },
    status: {
      'color.bg.success': { value: '#dcfce7', description: 'Success state background' },
      'color.text.success': { value: '#166534', description: 'Success state text' },
      'color.bg.warning': { value: '#fef3c7', description: 'Warning state background' },
      'color.text.warning': { value: '#92400e', description: 'Warning state text' },
      'color.bg.error': { value: '#fecaca', description: 'Error state background' },
      'color.text.error': { value: '#991b1b', description: 'Error state text' },
      'color.bg.info': { value: '#dbeafe', description: 'Info state background' },
      'color.text.info': { value: '#1e40af', description: 'Info state text' },
    }
  };

  const spacingTokens = {
    'space.xs': { value: '4px', description: 'Extra small spacing' },
    'space.sm': { value: '8px', description: 'Small spacing' },
    'space.md': { value: '16px', description: 'Medium spacing' },
    'space.lg': { value: '24px', description: 'Large spacing' },
    'space.xl': { value: '32px', description: 'Extra large spacing' },
    'space.2xl': { value: '40px', description: 'Double extra large spacing' },
    'space.3xl': { value: '48px', description: 'Triple extra large spacing' },
  };

  const radiusTokens = {
    'radius.sm': { value: '4px', description: 'Small radius for chips and badges' },
    'radius.md': { value: '8px', description: 'Medium radius for buttons' },
    'radius.lg': { value: '12px', description: 'Large radius for cards' },
    'radius.xl': { value: '16px', description: 'Extra large radius for modals' },
    'radius.full': { value: '9999px', description: 'Full radius for pills' },
  };

  const typeTokens = {
    'type.heading.large': { value: '28px/34px', weight: '600', description: 'Large headings' },
    'type.heading.medium': { value: '24px/30px', weight: '600', description: 'Medium headings' },
    'type.heading.small': { value: '20px/28px', weight: '600', description: 'Small headings' },
    'type.body.large': { value: '16px/24px', weight: '400', description: 'Large body text' },
    'type.body.small': { value: '14px/20px', weight: '400', description: 'Small body text' },
  };

  const sections = [
    { id: 'overview', name: 'Overview', icon: Palette },
    { id: 'colors', name: 'Colors', icon: Palette },
    { id: 'typography', name: 'Typography', icon: Type },
    { id: 'spacing', name: 'Spacing', icon: Grid },
    { id: 'components', name: 'Components', icon: Component },
  ];

  const renderTokenCard = (tokenName: string, token: { value: string; description: string }, category: string) => (
    <div key={tokenName} className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <code className="text-sm font-mono text-[#1B2733] dark:text-slate-100 bg-[#F0EDE8] dark:bg-slate-700 px-2 py-1 rounded">
          {tokenName}
        </code>
        <button
          onClick={() => copyToClipboard(token.value, tokenName)}
          className="p-1 hover:bg-[#F0EDE8] dark:hover:bg-slate-700 rounded transition-colors"
        >
          {copiedToken === tokenName ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-[#5A6B7A]" />
          )}
        </button>
      </div>
      
      {category === 'colors' && (
        <div 
          className="w-full h-12 rounded-md mb-2 border border-[#E8E4DF]"
          style={{ backgroundColor: token.value }}
        />
      )}
      
      <div className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-1">
        {token.value}
      </div>
      <div className="text-sm text-[#5A6B7A] dark:text-[#5A6B7A]">
        {token.description}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-mist dark:bg-slate-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-[#1B2733] dark:text-white">
                  Aminy Design System
                </h1>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                  Mobile-first design for caregivers and children
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 hover:bg-[#F0EDE8] dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-[#5A6B7A] dark:text-slate-400" />
                ) : (
                  <Moon className="w-5 h-5 text-[#5A6B7A] dark:text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedSection === section.id
                        ? 'bg-[#6B9080]/10 dark:bg-[#1a3a5c] text-[#6B9080] dark:text-teal-100'
                        : 'text-[#3A4A57] dark:text-slate-300 hover:bg-[#F0EDE8] dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {section.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedSection === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1B2733] dark:text-white mb-4">
                    Design System Overview
                  </h2>
                  <p className="text-[#5A6B7A] dark:text-slate-400 mb-4 sm:mb-6">
                    A comprehensive design system built for stressed caregivers supporting children with developmental needs. 
                    Featuring calm, accessible colors and intuitive components optimized for mobile-first experiences.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-[#E8E4DF] dark:border-slate-700">
                    <div className="w-12 h-12 bg-[#6B9080]/10 dark:bg-[#1a3a5c] rounded-lg flex items-center justify-center mb-4">
                      <Palette className="w-6 h-6 text-[#6B9080] dark:text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">
                      Calm Color Palette
                    </h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400 text-sm">
                      Soothing teal and coral colors designed to reduce stress and create trust for caregivers.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-[#E8E4DF] dark:border-slate-700">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                      <Type className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">
                      Clear Typography
                    </h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400 text-sm">
                      Mobile-optimized type scale (28/34 to 14/20) for easy reading in stressful situations.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-[#E8E4DF] dark:border-slate-700">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">
                      AA+ Accessibility
                    </h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400 text-sm">
                      All color combinations exceed WCAG AA standards for accessibility and readability.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-[#FAF7F2] to-orange-50 dark:from-teal-950 dark:to-orange-950 p-6 rounded-lg border border-[#6B9080]/20 dark:border-[#6B9080]/30">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">
                    Mobile-First Grid System
                  </h3>
                  <p className="text-[#5A6B7A] dark:text-slate-400 mb-4">
                    390×844 mobile viewport with 16pt margins and 4-column grid system, optimized for one-handed use.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-sm">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-[#6B9080]/20 dark:bg-teal-700 h-8 rounded flex items-center justify-center text-sm font-medium text-[#6B9080] dark:text-teal-200">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedSection === 'colors' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1B2733] dark:text-white mb-4">
                    Color Tokens
                  </h2>
                  <p className="text-[#5A6B7A] dark:text-slate-400 mb-4 sm:mb-6">
                    Carefully chosen colors that prioritize accessibility and emotional well-being for stressed caregivers.
                  </p>
                </div>

                {Object.entries(colorTokens).map(([category, tokens]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4 capitalize">
                      {category} Colors
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {Object.entries(tokens).map(([tokenName, token]) =>
                        renderTokenCard(tokenName, token, 'colors')
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedSection === 'typography' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1B2733] dark:text-white mb-4">
                    Typography Scale
                  </h2>
                  <p className="text-[#5A6B7A] dark:text-slate-400 mb-4 sm:mb-6">
                    Mobile-first typography designed for clarity and readability in stressful moments.
                  </p>
                </div>

                <div className="space-y-3 sm:space-y-4 sm:space-y-6">
                  {Object.entries(typeTokens).map(([tokenName, token]) => (
                    <div key={tokenName} className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <code className="text-sm font-mono text-[#1B2733] dark:text-slate-100 bg-[#F0EDE8] dark:bg-slate-700 px-2 py-1 rounded">
                          {tokenName}
                        </code>
                        <button
                          onClick={() => copyToClipboard(`font-size: ${token.value.split('/')[0]}; line-height: ${token.value.split('/')[1]}; font-weight: ${token.weight};`, tokenName)}
                          className="p-1 hover:bg-[#F0EDE8] dark:hover:bg-slate-700 rounded transition-colors"
                        >
                          {copiedToken === tokenName ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#5A6B7A]" />
                          )}
                        </button>
                      </div>
                      
                      <div 
                        className="text-[#1B2733] dark:text-white mb-2"
                        style={{ 
                          fontSize: token.value.split('/')[0], 
                          lineHeight: token.value.split('/')[1],
                          fontWeight: token.weight 
                        }}
                      >
                        The quick brown fox jumps over the lazy dog
                      </div>
                      
                      <div className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-1">
                        Size: {token.value.split('/')[0]} / Line Height: {token.value.split('/')[1]} / Weight: {token.weight}
                      </div>
                      <div className="text-sm text-[#5A6B7A]">
                        {token.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSection === 'spacing' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1B2733] dark:text-white mb-4">
                    Spacing System
                  </h2>
                  <p className="text-[#5A6B7A] dark:text-slate-400 mb-4 sm:mb-6">
                    8pt-based spacing system for consistent, harmonious layouts across all screen sizes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
                  {Object.entries(spacingTokens).map(([tokenName, token]) => (
                    <div key={tokenName} className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <code className="text-sm font-mono text-[#1B2733] dark:text-slate-100 bg-[#F0EDE8] dark:bg-slate-700 px-2 py-1 rounded">
                          {tokenName}
                        </code>
                        <button
                          onClick={() => copyToClipboard(token.value, tokenName)}
                          className="p-1 hover:bg-[#F0EDE8] dark:hover:bg-slate-700 rounded transition-colors"
                        >
                          {copiedToken === tokenName ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#5A6B7A]" />
                          )}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:gap-4 mb-3">
                        <div 
                          className="bg-[#6B9080]/20 dark:bg-teal-700 h-8 rounded"
                          style={{ width: token.value }}
                        />
                        <span className="text-sm text-[#5A6B7A] dark:text-slate-400">
                          {token.value}
                        </span>
                      </div>
                      
                      <div className="text-sm text-[#5A6B7A]">
                        {token.description}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
                  {Object.entries(radiusTokens).map(([tokenName, token]) => (
                    <div key={tokenName} className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <code className="text-sm font-mono text-[#1B2733] dark:text-slate-100 bg-[#F0EDE8] dark:bg-slate-700 px-2 py-1 rounded">
                          {tokenName}
                        </code>
                        <button
                          onClick={() => copyToClipboard(token.value, tokenName)}
                          className="p-1 hover:bg-[#F0EDE8] dark:hover:bg-slate-700 rounded transition-colors"
                        >
                          {copiedToken === tokenName ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#5A6B7A]" />
                          )}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:gap-4 mb-3">
                        <div 
                          className="bg-[#6B9080]/20 dark:bg-teal-700 w-16 h-16"
                          style={{ borderRadius: token.value }}
                        />
                        <span className="text-sm text-[#5A6B7A] dark:text-slate-400">
                          {token.value}
                        </span>
                      </div>
                      
                      <div className="text-sm text-[#5A6B7A]">
                        {token.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSection === 'components' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1B2733] dark:text-white mb-4">
                    Component Library
                  </h2>
                  <p className="text-[#5A6B7A] dark:text-slate-400 mb-4 sm:mb-6">
                    Touch-friendly components designed for stressed caregivers with enhanced accessibility and child-safe interactions.
                  </p>
                </div>

                {/* Buttons */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Buttons</h3>
                  <div className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300">Primary</h4>
                        <button className="w-full bg-primary hover:bg-primary text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
                          Primary Button
                        </button>
                        <button className="w-full bg-primary hover:bg-primary text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
                          <Heart className="w-4 h-4" />
                          With Icon
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300">Secondary</h4>
                        <button className="w-full bg-[#F0EDE8] dark:bg-slate-700 hover:bg-[#E8E4DF] dark:hover:bg-slate-600 text-[#1B2733] dark:text-slate-100 font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
                          Secondary Button
                        </button>
                        <button className="w-full border border-slate-300 dark:border-slate-600 hover:bg-[#FAF7F2] dark:hover:bg-slate-800 text-[#3A4A57] dark:text-slate-300 font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
                          Outline Button
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300">Quiet</h4>
                        <button className="w-full text-[#5A6B7A] dark:text-slate-400 hover:text-[#1B2733] dark:hover:text-slate-100 hover:bg-[#F0EDE8] dark:hover:bg-slate-800 font-medium py-3 px-4 rounded-lg transition-colors duration-200">
                          Quiet Button
                        </button>
                        <button className="w-full text-[#6B9080] dark:text-primary hover:text-[#6B9080] dark:hover:text-[#7BA7BC] hover:bg-[#6B9080]/10 dark:hover:bg-teal-950 font-medium py-3 px-4 rounded-lg transition-colors duration-200">
                          Link Button
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Form Elements</h3>
                  <div className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#3A4A57] dark:text-slate-300 mb-2">
                            Text Input
                          </label>
                          <input 
                            type="text" 
                            placeholder="Enter text here..."
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-[#1B2733] dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[#3A4A57] dark:text-slate-300 mb-2">
                            Textarea
                          </label>
                          <textarea 
                            placeholder="Enter longer text here..."
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-[#1B2733] dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#3A4A57] dark:text-slate-300 mb-2">
                            Select
                          </label>
                          <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-[#1B2733] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                            <option>Choose an option</option>
                            <option>Option 1</option>
                            <option>Option 2</option>
                            <option>Option 3</option>
                          </select>
                        </div>
                        
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-[#3A4A57] dark:text-slate-300">
                            Checkbox
                          </label>
                          <div className="flex items-center space-x-3">
                            <input type="checkbox" id="check1" className="w-4 h-4 text-[#6B9080] border-slate-300 rounded focus:ring-teal-500" />
                            <label htmlFor="check1" className="text-sm text-[#3A4A57] dark:text-slate-300">Enable notifications</label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input type="checkbox" id="check2" className="w-4 h-4 text-[#6B9080] border-slate-300 rounded focus:ring-teal-500" />
                            <label htmlFor="check2" className="text-sm text-[#3A4A57] dark:text-slate-300">Accept terms</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Cards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
                    <div className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="w-12 h-12 bg-[#6B9080]/10 dark:bg-[#1a3a5c] rounded-lg flex items-center justify-center mb-4">
                        <Heart className="w-6 h-6 text-[#6B9080] dark:text-primary" />
                      </div>
                      <h4 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">Basic Card</h4>
                      <p className="text-[#5A6B7A] dark:text-slate-400 text-sm">
                        A simple card component with icon, title, and description.
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-[#FAF7F2] to-blue-50 dark:from-teal-950 dark:to-blue-950 border border-[#6B9080]/20 dark:border-[#6B9080]/30 rounded-lg p-6">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">Featured Card</h4>
                      <p className="text-[#3A4A57] dark:text-slate-300 text-sm">
                        A highlighted card with gradient background for important content.
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg overflow-hidden">
                      <div className="h-32 bg-gradient-to-r from-teal-400 to-blue-500"></div>
                      <div className="p-4 sm:p-5 md:p-6">
                        <h4 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">Media Card</h4>
                        <p className="text-[#5A6B7A] dark:text-slate-400 text-sm">
                          Card with image header and content section.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Status Badges</h3>
                  <div className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300">Success</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300">Warning</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-[#3A4A57] dark:text-yellow-200 text-xs font-medium rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Pending
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300">Error</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300">Info</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-[#4A6478] dark:text-blue-200 text-xs font-medium rounded-full">
                          <Info className="w-3 h-3" />
                          New
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Navigation</h3>
                  <div className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300 mb-3">Tab Navigation</h4>
                        <div className="flex space-x-1 bg-[#F0EDE8] dark:bg-slate-700 p-1 rounded-lg">
                          <button className="flex-1 py-2 px-3 text-sm font-medium text-white bg-primary rounded-md transition-colors">
                            Active
                          </button>
                          <button className="flex-1 py-2 px-3 text-sm font-medium text-[#5A6B7A] dark:text-slate-400 hover:text-[#1B2733] dark:hover:text-slate-100 transition-colors">
                            Inactive
                          </button>
                          <button className="flex-1 py-2 px-3 text-sm font-medium text-[#5A6B7A] dark:text-slate-400 hover:text-[#1B2733] dark:hover:text-slate-100 transition-colors">
                            Inactive
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300 mb-3">Bottom Navigation</h4>
                        <div className="bg-[#FAF7F2] dark:bg-slate-900 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-2">
                          <div className="flex justify-around">
                            <button className="flex flex-col items-center p-2 text-[#6B9080] dark:text-primary">
                              <Home className="w-5 h-5 mb-1" />
                              <span className="text-sm font-medium">Home</span>
                            </button>
                            <button className="flex flex-col items-center p-2 text-slate-400 dark:text-[#5A6B7A]">
                              <Calendar className="w-5 h-5 mb-1" />
                              <span className="text-sm font-medium">Plan</span>
                            </button>
                            <button className="flex flex-col items-center p-2 text-slate-400 dark:text-[#5A6B7A]">
                              <BarChart3 className="w-5 h-5 mb-1" />
                              <span className="text-sm font-medium">Reports</span>
                            </button>
                            <button className="flex flex-col items-center p-2 text-slate-400 dark:text-[#5A6B7A]">
                              <User className="w-5 h-5 mb-1" />
                              <span className="text-sm font-medium">More</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chips */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Chips</h3>
                  <div className="bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-lg p-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300 mb-3">Filter Chips</h4>
                        <div className="flex flex-wrap gap-2">
                          <button className="inline-flex items-center gap-1 px-3 py-1 bg-[#6B9080]/10 dark:bg-[#1a3a5c] text-[#6B9080] dark:text-teal-200 text-sm font-medium rounded-full border border-[#6B9080]/20 dark:border-teal-700">
                            <Check className="w-3 h-3" />
                            Selected
                          </button>
                          <button className="inline-flex items-center gap-1 px-3 py-1 bg-[#F0EDE8] dark:bg-slate-700 text-[#3A4A57] dark:text-slate-300 text-sm font-medium rounded-full border border-[#E8E4DF] dark:border-slate-600 hover:bg-[#E8E4DF] dark:hover:bg-slate-600">
                            Unselected
                          </button>
                          <button className="inline-flex items-center gap-1 px-3 py-1 bg-[#F0EDE8] dark:bg-slate-700 text-[#3A4A57] dark:text-slate-300 text-sm font-medium rounded-full border border-[#E8E4DF] dark:border-slate-600 hover:bg-[#E8E4DF] dark:hover:bg-slate-600">
                            Another Option
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-[#3A4A57] dark:text-slate-300 mb-3">Action Chips</h4>
                        <div className="flex flex-wrap gap-2">
                          <button className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 text-[#3A4A57] dark:text-slate-300 text-sm font-medium rounded-full border border-slate-300 dark:border-slate-600 hover:bg-[#FAF7F2] dark:hover:bg-slate-700">
                            <Plus className="w-3 h-3" />
                            Add Item
                          </button>
                          <button className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 text-[#3A4A57] dark:text-slate-300 text-sm font-medium rounded-full border border-slate-300 dark:border-slate-600 hover:bg-[#FAF7F2] dark:hover:bg-slate-700">
                            <Filter className="w-3 h-3" />
                            Filter
                          </button>
                          <button className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 text-[#3A4A57] dark:text-slate-300 text-sm font-medium rounded-full border border-slate-300 dark:border-slate-600 hover:bg-[#FAF7F2] dark:hover:bg-slate-700">
                            <Download className="w-3 h-3" />
                            Export
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}