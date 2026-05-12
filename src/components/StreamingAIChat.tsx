// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Streaming AI Chat Component
 * Makes Aminy feel like a continuous, human conversation (like Claude)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { ThinkingStepsDisplay, useThinkingSteps, generateFollowUpSuggestions } from './ThinkingSteps';
import { Button } from './ui/button';
import { EnhancedChatInput, type Attachment } from './EnhancedChatInput';
import {
  loadConversationHistory,
  saveMessageToHistory,
  generateStreamingAIResponse as generateAIResponse,
  type StreamingChatMessage as ConversationMessage,
  type StreamingChatContext as ConversationContext,
} from '../lib/ai-engine';
import { store } from '../lib/store';
import { useRateLimitStore, hasReachedLimit } from '../lib/rate-limit-store';
import { RateLimitInline } from './RateLimitBadge';

interface StreamingAIChatProps {
  context: ConversationContext;
  placeholder?: string;
  className?: string;
  onConversionPrompt?: () => void; // Called when AI suggests trial
  childId?: string; // Child ID for memory extraction
  enableMemoryExtraction?: boolean; // Auto-extract memory facts from conversation
  onUpgradeClick?: () => void; // Called when user wants to upgrade
  showRateLimitIndicator?: boolean; // Show remaining messages indicator
}

export function StreamingAIChat({
  context,
  placeholder = "Ask Aminy anything...",
  className = "",
  onConversionPrompt,
  childId,
  enableMemoryExtraction = true, // Enabled by default
  onUpgradeClick,
  showRateLimitIndicator = true,
}: StreamingAIChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Bevel-style thinking steps
  const { steps: thinkingSteps, isExpanded: thinkingExpanded, toggleExpanded: toggleThinking } = useThinkingSteps(lastUserMessage, isStreaming);

  // Rate limit tracking
  const { dailyUsage, setDailyUsage, fetchUsage } = useRateLimitStore();
  const isRateLimited = dailyUsage && hasReachedLimit(dailyUsage);

  // Fetch usage on mount
  useEffect(() => {
    fetchUsage();
  }, []);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  async function loadHistory() {
    const userId = store.getState().user?.id;
    if (!userId) {
      setIsLoadingHistory(false);
      return;
    }

    const history = await loadConversationHistory(userId);
    setMessages(history);
    setIsLoadingHistory(false);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const handleSend = useCallback(async (inputText: string, attachments: Attachment[]) => {
    if (!inputText.trim() || isStreaming) return;

    const userId = store.getState().user?.id;
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    // Build content with attachments info
    let content = inputText.trim();
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(a => `[${a.type}: ${a.name}]`).join(' ');
      content = `${content}\n\nAttachments: ${attachmentInfo}`;
    }

    const userMessage: ConversationMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      metadata: {
        module: context.module,
        action: context.recentAction,
        mood: context.parentMood,
        attachments: attachments.map(a => ({ type: a.type, name: a.name, url: a.url })),
      },
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent('');
    setLastUserMessage(content);
    setFollowUpSuggestions([]); // clear old suggestions

    // Save user message
    await saveMessageToHistory(userId, userMessage);

    // Bevel-style: Extract structured data from chat and route to app data stores
    try {
      const { extractFromChat, routeExtractedData } = await import('../lib/chat-to-data-pipeline');
      const extracted = extractFromChat(content);
      if (extracted.length > 0) {
        const result = await routeExtractedData(extracted, userId, childId);
        if (result.toast) {
          // Dynamic import to avoid circular dependency
          const { toast } = await import('sonner');
          toast.success(result.toast, { duration: 3000 });
        }
      }
    } catch {
      // Chat-to-data is best-effort — never block the chat flow
    }

    // Generate AI response with streaming
    try {
      const fullResponse = await generateAIResponse(
        userMessage.content,
        context,
        messages,
        {
          onToken: (token) => {
            setStreamingContent(prev => prev + token);
          },
          onComplete: async (fullText) => {
            // Create assistant message
            const assistantMessage: ConversationMessage = {
              role: 'assistant',
              content: fullText,
              timestamp: new Date().toISOString(),
              metadata: {
                module: context.module,
              },
            };

            // Add to history
            setMessages(prev => [...prev, assistantMessage]);
            setStreamingContent('');
            setIsStreaming(false);

            // Save assistant message
            await saveMessageToHistory(userId, assistantMessage);

            // Bevel-style: detect if response should become a persistent artifact
            try {
              const { shouldCreateArtifact, createArtifactFromResponse, saveArtifact } = await import('../lib/ai-artifacts');
              const artifactCheck = shouldCreateArtifact(fullText);
              if (artifactCheck.shouldCreate && artifactCheck.suggestedType) {
                const artifact = createArtifactFromResponse(
                  fullText,
                  artifactCheck.suggestedType,
                  artifactCheck.suggestedTitle || 'Saved from Aminy AI',
                  childId
                );
                await saveArtifact(artifact, userId);
                const { toast } = await import('sonner');
                toast.success(`Saved: ${artifactCheck.suggestedTitle}`, {
                  description: 'Find it in your Files anytime',
                  duration: 4000,
                });
              }
            } catch {
              // Artifact detection is best-effort
            }

            // Generate context-aware follow-up suggestions (Bevel-style)
            setFollowUpSuggestions(generateFollowUpSuggestions(fullText, content));

            // Check if AI mentioned trial (gentle conversion)
            if (fullText.toLowerCase().includes('trial') || 
                fullText.toLowerCase().includes('7 days')) {
              onConversionPrompt?.();
            }
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setIsStreaming(false);
            setStreamingContent('');
            
            // Add error message
            const errorMessage: ConversationMessage = {
              role: 'assistant',
              content: "I'm having a moment connecting. Can you try that again? 💙",
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
          },
          humanPacing: true, // Natural pauses at sentence boundaries
          extractMemory: enableMemoryExtraction && !!childId,
          childId,
          onUsageUpdate: setDailyUsage, // Update rate limit store
        }
      );
    } catch (error) {
      console.error('Error in handleSend:', error);
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [isStreaming, context, messages, childId, enableMemoryExtraction, onConversionPrompt]);

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-sm text-slate-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-3 sm:space-y-4"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Hi! I'm Aminy 💙
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              I'm here to help you navigate your child's development journey.
              I remember everything we've talked about, so feel free to pick up where we left off.
            </p>

            {/* Suggested prompts — reduce blank-page friction */}
            <div className="max-w-md mx-auto space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Try asking me
              </p>
              {[
                { emoji: '\u{1F319}', text: `Why is ${context.childName || 'my child'} melting down at bedtime?` },
                { emoji: '\u{1F4DD}', text: 'Help me write an email to my child\u2019s teacher' },
                { emoji: '\u{1F4C5}', text: 'Plan tomorrow\u2019s morning routine with me' },
                { emoji: '\u{1F3AF}', text: 'What should I work on this week?' },
                { emoji: '\u{1F4AA}', text: 'My child won\u2019t follow directions \u2014 what do I do?' },
                { emoji: '\u{1F4A1}', text: 'Translate this IEP jargon for me' },
              ].map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => handleSend(prompt.text, [])}
                  className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl border border-slate-200 transition-all text-sm text-slate-700 flex items-start gap-2"
                >
                  <span className="text-base flex-shrink-0">{prompt.emoji}</span>
                  <span className="flex-1">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            role="article"
            aria-label={`Message from ${message.role === 'user' ? 'you' : 'Aminy'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-accent text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-white/70' : 'text-slate-500'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming message — Bevel-style thinking steps */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-[#F0EDE8] shadow-sm text-[#1B2733]">
              {streamingContent ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-[#6B9080]/50 ml-1 animate-pulse" />
                </div>
              ) : (
                <ThinkingStepsDisplay
                  steps={thinkingSteps}
                  isExpanded={thinkingExpanded}
                  onToggle={toggleThinking}
                />
              )}
            </div>
          </div>
        )}

        {/* Context-aware follow-up suggestions (Bevel-style) */}
        {!isStreaming && followUpSuggestions.length > 0 && messages.length > 0 && (
          <div className="space-y-2 pt-2">
            {followUpSuggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSend(suggestion, [])}
                className="w-full text-left flex items-start gap-2 px-4 py-2.5 bg-white/80 hover:bg-white active:bg-[#F0EDE8] rounded-xl border border-[#F0EDE8] transition-all text-sm text-[#5A6B7A]"
              >
                <span className="text-[#6B9080] mt-0.5 flex-shrink-0">&rarr;</span>
                <span className="font-medium">{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Rate limit indicator */}
      {showRateLimitIndicator && (
        <RateLimitInline onUpgradeClick={onUpgradeClick} />
      )}

      {/* Enhanced Input area with mic/camera/upload */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <EnhancedChatInput
            onSend={handleSend}
            placeholder={isRateLimited ? "Daily limit reached - upgrade for unlimited messages" : placeholder}
            disabled={isRateLimited ?? undefined}
            isLoading={isStreaming}
            maxAttachments={5}
          />
        </div>
      </div>
    </div>
  );
}
