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
import { ArrowLeft, Sparkles, MessageSquare, Plus, Settings } from 'lucide-react';
import { StreamingAIChat } from './StreamingAIChat';
import { getCurrentContext } from '../lib/ai-engine';
import type { StreamingChatContext } from '../lib/ai-engine';

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

  useEffect(() => {
    // Build conversation context from current user data
    const ctx = getCurrentContext();
    setContext(ctx);
  }, []);

  if (!context) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-[#6B9080] mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-slate-500">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Header — minimal, Claude-style, warm palette */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#F0EDE8]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">Aminy AI</h1>
                {messagesLeft !== undefined && userTier === 'free' && (
                  <p className="text-xs text-slate-500">
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
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="New conversation"
              title="New conversation"
            >
              <Plus className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Chat settings"
              title="Memory & settings"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border-b border-slate-100 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <p className="text-xs text-slate-500 mb-2">
              Aminy remembers your child's preferences, routines, and what works.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate?.('memory-settings')}
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Manage Memory
              </button>
              <button
                onClick={() => onNavigate?.('vault')}
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                Upload Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat area — full page, scrollable */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
          <StreamingAIChat
            context={context}
            placeholder={`Message Aminy about ${childName}...`}
            onConversionPrompt={onPaywallTrigger}
          />
        </div>
      </div>
    </div>
  );
}

export default AskAminyChatScreen;
