// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AskAminyChatScreen
 *
 * Full-page chat experience styled like Claude.ai / One Medical.
 * No modals, no popups — just a dedicated screen for conversation.
 * Supports history sidebar, persistent memory, suggested prompts.
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, MessageSquare, Plus, Settings, PanelLeftOpen } from 'lucide-react';
import { StreamingAIChat } from './StreamingAIChat';
import { ChatSidebarDrawer } from './ChatSidebarDrawer';
import { getCurrentContext } from '../lib/ai-engine';
import type { StreamingChatContext } from '../lib/ai-engine';
import { useTheme } from '../lib/theme-provider';

interface AskAminyChatScreenProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  onPaywallTrigger?: () => void;
  userTier?: string;
  messagesLeft?: number;
  childName?: string;
  parentName?: string;
}

export function AskAminyChatScreen({
  onBack,
  onNavigate,
  onPaywallTrigger,
  userTier = 'free',
  messagesLeft,
  childName = 'your child',
  parentName = 'there',
}: AskAminyChatScreenProps) {
  const [context, setContext] = useState<StreamingChatContext | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // The app's ThemeProvider adds a `dark` class to the document root in dark/system
  // mode, and several children (StreamingAIChat input bar, EnhancedChatInput) carry
  // `dark:` variants. This screen's wrapper/header/settings used a hardcoded light
  // palette via arbitrary inline colors (which a CSS class can't override), so dark
  // mode produced a jarring two-tone screen. Drive the arbitrary colors off the
  // resolved theme so the whole screen flips together with its children.
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    // Build conversation context from current user data
    const ctx = getCurrentContext();
    setContext(ctx);
  }, []);

  if (!context) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: isDark ? '#0F172A' : '#FAF7F2' }}
      >
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-[#6B9080] mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    // Definite viewport height (not min-h-screen) so the messages area's flex-1
    // actually caps and scrolls INTERNALLY, pinning the input bar to the bottom.
    // 100dvh excludes mobile browser chrome; overflow-hidden keeps the page from
    // scrolling (only the messages list does).
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', backgroundColor: isDark ? '#0F172A' : '#FAF7F2' }}
    >
      {/* Header — minimal, Claude-style. Warm in light, slate in dark so it matches
          the StreamingAIChat input bar instead of staying cream over a dark body. */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md border-b"
        style={{
          backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(250,247,242,0.9)',
          borderColor: isDark ? '#334155' : '#F0EDE8',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            )}
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Open chat history"
              title="Chat history"
            >
              <PanelLeftOpen className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Aminy AI</h1>
                {messagesLeft !== undefined && userTier === 'free' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {messagesLeft} {messagesLeft === 1 ? 'message' : 'messages'} left today
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                // Clear current conversation and start fresh
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('aminy_conversation_history');
                  window.location.reload();
                }
              }}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="New conversation"
              title="New conversation"
            >
              <Plus className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Chat settings"
              title="Memory & settings"
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
        >
          <div className="max-w-3xl mx-auto px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Aminy remembers your child's preferences, routines, and what works.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate?.('memory-settings')}
                className="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 transition-colors"
              >
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Manage Memory
              </button>
              <button
                onClick={() => onNavigate?.('vault')}
                className="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 transition-colors"
              >
                Upload Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat area — full page, scrollable */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col min-h-0">
          <StreamingAIChat
            context={context}
            placeholder={`Message Aminy about ${childName}...`}
            onConversionPrompt={onPaywallTrigger}
          />
        </div>
      </div>

      {/* Chat history sidebar — opened by the PanelLeftOpen button */}
      <ChatSidebarDrawer
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onSelectConversation={() => setShowSidebar(false)}
        onNewChat={() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('aminy_conversation_history');
            window.location.reload();
          }
        }}
      />
    </div>
  );
}

export default AskAminyChatScreen;
