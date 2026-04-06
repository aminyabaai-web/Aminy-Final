// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Persistent AI Chat Overlay - Warm, elegant, context-aware
 * With memory drawer and calm pulse aesthetics
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, Sparkles, Clock, TrendingUp, Heart, Brain, Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { EnhancedChatInput, type Attachment } from './EnhancedChatInput';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase as supabaseConfig } from '../lib/env-config';

const { projectId, anonKey: publicAnonKey } = supabaseConfig;

import {
  fetchUserContext,
  buildAIContextString,
  generateContextChips,
  fetchMemories,
  storeMemory,
  type UserContext,
  type MemorySummary
} from '../ai/contextLayer';

// Memory callout types for "Aminy remembers" feature
interface MemoryCallout {
  id: string;
  type: 'preference' | 'trigger' | 'strategy' | 'milestone' | 'challenge';
  content: string;
  timestamp: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PersistentAIChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPath: string;
  hasNewInsight?: boolean;
}

export function PersistentAIChatOverlay({
  isOpen,
  onClose,
  userId,
  currentPath,
  hasNewInsight = false
}: PersistentAIChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [memories, setMemories] = useState<MemorySummary[]>([]);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [memoryCallouts, setMemoryCallouts] = useState<MemoryCallout[]>([]);
  const [showMemoryCallout, setShowMemoryCallout] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user context and memories
  useEffect(() => {
    if (isOpen && userId) {
      loadContext();
      loadMemories();
    }
  }, [isOpen, userId]);

  const loadContext = async () => {
    const context = await fetchUserContext(userId);
    setUserContext(context);
  };

  const loadMemories = async () => {
    const recentMemories = await fetchMemories(userId, 5);
    setMemories(recentMemories);

    // Generate memory callouts from recent memories
    if (recentMemories.length > 0) {
      const callouts: MemoryCallout[] = recentMemories.slice(0, 3).map((memory, idx) => ({
        id: `callout-${idx}`,
        type: memory.category === 'calm_cue' ? 'strategy' :
              memory.category === 'progress' ? 'milestone' : 'preference',
        content: memory.content.slice(0, 100) + (memory.content.length > 100 ? '...' : ''),
        timestamp: new Date(memory.timestamp)
      }));
      setMemoryCallouts(callouts);
      // Show callout briefly when chat opens
      if (callouts.length > 0) {
        setShowMemoryCallout(true);
        setTimeout(() => setShowMemoryCallout(false), 5000);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate context chips
  const contextChips = userContext 
    ? generateContextChips(currentPath, userContext)
    : [];

  // Starter prompts
  const starterPrompts = [
    "Need a calm cue for right now?",
    "Want a 2-minute progress check?",
    "How's today feeling?",
    "Show me what's working"
  ];

  const handleSend = useCallback(async (inputText: string, attachments: Attachment[]) => {
    if (!inputText.trim() || isLoading) return;

    // Build message with attachments info
    let content = inputText;
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(a => `[${a.type}: ${a.name}]`).join(' ');
      content = `${inputText}\n\nAttachments: ${attachmentInfo}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build AI context
      const contextString = userContext 
        ? buildAIContextString(userContext)
        : '';

      // Call AI brain endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            userMessage: inputText,
            conversationHistory: messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            systemPrompt: `You are Aminy, an AI behavioral wellness companion. You're warm, intelligent, and always remember context.

CURRENT CONTEXT: ${contextString}

CURRENT SCREEN: ${generateContextChips(currentPath, userContext || {}).join(', ')}

Respond naturally, showing you remember their journey. Be brief (2-3 sentences) unless they need more detail. Use ABA principles naturally.`
          })
        }
      );

      if (!response.ok) {
        throw new Error('AI connection hiccup');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Store as memory if significant
      if (data.message.length > 50) {
        await storeMemory(userId, {
          timestamp: new Date(),
          category: 'calm_cue',
          content: data.message,
          context: { userQuery: inputText }
        });
      }

    } catch (error) {
      toast.error('I had a little hiccup. Mind trying that again?');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userContext, messages, currentPath, userId]);

  const handleStarterPrompt = useCallback((prompt: string) => {
    // Directly send the starter prompt
    handleSend(prompt, []);
  }, [handleSend]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Chat Overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-20 bottom-20 md:inset-x-auto md:right-6 md:w-[420px] md:top-20 md:bottom-6 bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom, #ffffff, #fefefe)',
              border: '1px solid transparent',
              backgroundImage: `
                linear-gradient(white, white),
                linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(251, 191, 36, 0.1), rgba(196, 181, 253, 0.1))
              `,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box'
            }}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                    {hasNewInsight && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-violet-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <h2 className="text-slate-900">Aminy</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Context Chips */}
              {contextChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {contextChips.map((chip, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-slate-50 text-slate-600 border-0 text-xs px-2 py-0.5"
                    >
                      {chip}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Memory Callout Banner - "Aminy remembers" */}
            <AnimatePresence>
              {showMemoryCallout && memoryCallouts.length > 0 && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-4 sm:mx-6 mt-2 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-cyan-50 dark:from-violet-900/20 dark:to-cyan-900/20 border border-violet-200 dark:border-violet-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-sm font-medium text-violet-800 dark:text-violet-200">
                      Aminy remembers...
                    </span>
                    <button
                      onClick={() => setShowMemoryCallout(false)}
                      className="ml-auto p-1 hover:bg-violet-100 dark:hover:bg-violet-800 rounded-full"
                    >
                      <X className="w-3 h-3 text-violet-500" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {memoryCallouts.slice(0, 2).map((callout) => (
                      <div
                        key={callout.id}
                        className="flex items-start gap-2 text-xs text-violet-700 dark:text-violet-300"
                      >
                        <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{callout.content}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-violet-500 dark:text-violet-400 mt-2 italic">
                    I use these memories to give you more personalized support.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
              {messages.length === 0 && (
                <div className="text-center pt-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-violet-50 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-cyan-600" />
                  </div>
                  <p className="text-slate-600 mb-4 sm:mb-6">
                    I'm here to help. What's on your mind?
                  </p>

                  {/* Starter Prompts */}
                  <div className="space-y-2">
                    {starterPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleStarterPrompt(prompt)}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm text-slate-700 transition-colors text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-50 text-slate-900'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Calm Pulse Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 bg-slate-50 rounded-2xl">
                    <div className="flex gap-1.5">
                      <motion.div
                        className="w-2 h-2 bg-cyan-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-amber-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-violet-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Memory Drawer Toggle */}
            {memories.length > 0 && (
              <button
                onClick={() => setShowMemoryDrawer(!showMemoryDrawer)}
                className="px-6 py-2 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Memory ({memories.length})
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showMemoryDrawer ? 'rotate-180' : ''}`}
                />
              </button>
            )}

            {/* Memory Drawer */}
            <AnimatePresence>
              {showMemoryDrawer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100 bg-slate-50 overflow-hidden shrink-0"
                >
                  <div className="px-6 py-3 space-y-2 max-h-32 overflow-y-auto">
                    {memories.map((memory) => (
                      <div key={memory.id} className="text-xs text-slate-600">
                        <div className="flex items-center gap-2 mb-1">
                          {memory.category === 'calm_cue' && <Heart className="w-3 h-3 text-emerald-500" />}
                          {memory.category === 'progress' && <TrendingUp className="w-3 h-3 text-cyan-500" />}
                          <span className="text-slate-400">
                            {new Date(memory.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 line-clamp-2">{memory.content}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Input with Mic/Camera/Upload */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 shrink-0">
              <EnhancedChatInput
                onSend={handleSend}
                placeholder="Ask anything... (or use mic/camera)"
                disabled={false}
                isLoading={isLoading}
                maxAttachments={3}
                className="rounded-xl"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
