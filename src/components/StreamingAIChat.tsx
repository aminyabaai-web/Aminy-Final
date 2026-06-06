// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Streaming AI Chat Component
 * Makes Aminy feel like a continuous, human conversation (like Claude)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Sparkles, Inbox } from 'lucide-react';
import { ThinkingStepsDisplay, useThinkingSteps, generateFollowUpSuggestions } from './ThinkingSteps';
import { Button } from './ui/button';
import { EnhancedChatInput, type Attachment } from './EnhancedChatInput';
import { DataConfirmationModal } from './DataConfirmationModal';
import type { ExtractedDataPoint } from '../lib/chat-to-data-pipeline';
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
  placeholder = "Message Aminy AI...",
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
  const [pendingReview, setPendingReview] = useState<ExtractedDataPoint[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
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
        if (result.pendingConfirmation.length > 0) {
          setPendingReview((prev) => [...prev, ...result.pendingConfirmation]);
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
          <p className="text-sm text-[#5A6B7A]">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-3 sm:space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <div className="py-8">
            {/* Bevel-style greeting */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6B9080]/20 to-[#7BA7BC]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#6B9080]" />
              </div>
              <p className="text-xs text-[#8E9BAA] mb-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <h3 className="text-xl font-semibold text-[#1B2733]">
                {(() => {
                  const hour = new Date().getHours();
                  const name = context.childProfile?.name ? `about ${context.childProfile.name}` : '';
                  if (hour < 12) return `Good morning! What's on your mind ${name}?`;
                  if (hour < 17) return `Good afternoon! How can I help ${name}?`;
                  return `Good evening! What's going on ${name}?`;
                })()}
              </h3>
            </div>

            {/* Bevel-style horizontal scrolling action cards */}
            <div className="overflow-x-auto -mx-4 px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {[
                  { icon: '\u{1F4CB}', title: 'Create a care plan', subtitle: 'Personalized for your child', prompt: `Create a weekly care plan for ${context.childProfile?.name || 'my child'}` },
                  { icon: '\u{1F4DD}', title: 'Log an incident', subtitle: 'Track what happened', prompt: 'I need to log a behavioral incident' },
                  { icon: '\u{1F319}', title: 'Bedtime help', subtitle: 'Calmer nights start here', prompt: `${context.childProfile?.name || 'My child'} won't go to sleep. Help.` },
                  { icon: '\u{1F3EB}', title: 'School email', subtitle: 'Write to the teacher', prompt: "Help me write an email to my child's teacher" },
                  { icon: '\u{1F4CA}', title: 'Weekly progress', subtitle: 'See how things are going', prompt: 'How is my child doing this week?' },
                  { icon: '\u{1F6E1}️', title: 'Insurance help', subtitle: 'Coverage questions', prompt: 'Help me understand my ABA coverage' },
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={() => handleSend(card.prompt, [])}
                    className="flex-shrink-0 w-[160px] text-left bg-white hover:bg-[#F0EDE8] active:scale-[0.97] border border-[#F0EDE8] rounded-2xl p-4 transition-all shadow-sm"
                  >
                    <span className="text-2xl block mb-2">{card.icon}</span>
                    <p className="text-sm font-semibold text-[#1B2733] leading-tight">{card.title}</p>
                    <p className="text-xs text-[#8E9BAA] mt-1 leading-tight">{card.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick text prompts below cards */}
            <div className="mt-4 space-y-2 max-w-md mx-auto">
              {[
                `What should I work on with ${context.childProfile?.name || 'my child'} this week?`,
                "My child won't follow directions — what do I do?",
                'Translate this IEP jargon for me',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt, [])}
                  className="w-full text-left px-4 py-2.5 bg-white/80 hover:bg-white active:bg-[#F0EDE8] rounded-xl border border-[#F0EDE8] transition-all text-sm text-[#5A6B7A] flex items-center gap-2"
                >
                  <span className="text-[#6B9080] flex-shrink-0">&rarr;</span>
                  <span>{prompt}</span>
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
                  : 'bg-[#F0EDE8] text-[#1B2733]'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-white/70' : 'text-[#5A6B7A]'
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

      {/* Ready for review badge (Bevel-style inbox affordance) */}
      {pendingReview.length > 0 && (
        <div className="px-4 pb-1">
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full max-w-4xl mx-auto flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#6B9080]/10 border border-[#6B9080]/20 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-[#6B9080] flex items-center justify-center flex-shrink-0">
              <Inbox className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1B2733] leading-tight">
                {pendingReview.length} {pendingReview.length === 1 ? 'thing' : 'things'} ready for review
              </p>
              <p className="text-xs text-[#5A6B7A] truncate">
                Aminy heard something — confirm what to save
              </p>
            </div>
            <span className="text-xs font-semibold text-[#6B9080] flex-shrink-0">Review →</span>
          </button>
        </div>
      )}

      {/* Rate limit indicator */}
      {showRateLimitIndicator && (
        <RateLimitInline onUpgradeClick={onUpgradeClick} />
      )}

      {/* Enhanced Input area with mic/camera/upload */}
      <div className="border-t border-[#E8E4DF] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4">
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

      {/* Ready-for-Review modal */}
      <DataConfirmationModal
        isOpen={showReviewModal}
        pending={pendingReview}
        onClose={() => setShowReviewModal(false)}
        onConfirm={async (item) => {
          const userId = store.getState().user?.id;
          if (!userId) return;
          const { confirmAndPersist } = await import('../lib/chat-to-data-pipeline');
          try {
            await confirmAndPersist(item, userId, childId);
            setPendingReview((prev) => prev.filter((p) => p !== item));
            const { toast } = await import('sonner');
            toast.success('Saved');
          } catch {
            const { toast } = await import('sonner');
            toast.error("Couldn't save. Try again.");
          }
        }}
        onSkip={(item) => {
          setPendingReview((prev) => prev.filter((p) => p !== item));
        }}
        onConfirmAll={async (items) => {
          const userId = store.getState().user?.id;
          if (!userId) return;
          const { confirmAndPersist } = await import('../lib/chat-to-data-pipeline');
          const remaining: ExtractedDataPoint[] = [];
          for (const item of items) {
            try {
              await confirmAndPersist(item, userId, childId);
            } catch {
              remaining.push(item);
            }
          }
          setPendingReview(remaining);
          setShowReviewModal(false);
          const { toast } = await import('sonner');
          if (remaining.length === 0) toast.success(`Saved ${items.length}`);
          else toast.error(`Saved ${items.length - remaining.length} of ${items.length}`);
        }}
      />
    </div>
  );
}
