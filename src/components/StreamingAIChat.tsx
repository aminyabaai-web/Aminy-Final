/**
 * Streaming AI Chat Component
 * Makes Aminy feel like a continuous, human conversation (like Claude)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  loadConversationHistory,
  saveMessageToHistory,
  generateAIResponse,
  ConversationMessage,
  ConversationContext,
} from '../lib/ai-conversation-engine';
import { store } from '../lib/store';

interface StreamingAIChatProps {
  context: ConversationContext;
  placeholder?: string;
  className?: string;
  onConversionPrompt?: () => void; // Called when AI suggests trial
}

export function StreamingAIChat({
  context,
  placeholder = "Ask Aminy anything...",
  className = "",
  onConversionPrompt,
}: StreamingAIChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  async function loadHistory() {
    const userId = store.getState().userId;
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

  async function handleSend() {
    if (!input.trim() || isStreaming) return;

    const userId = store.getState().userId;
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    const userMessage: ConversationMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      metadata: {
        module: context.module,
        action: context.recentAction,
        mood: context.parentMood,
      },
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    // Save user message
    await saveMessageToHistory(userId, userMessage);

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
        }
      );
    } catch (error) {
      console.error('Error in handleSend:', error);
      setIsStreaming(false);
      setStreamingContent('');
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Hi! I'm Aminy 💙
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              I'm here to help you navigate your child's development journey. 
              I remember everything we've talked about, so feel free to pick up where we left off.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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

        {/* Streaming message */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-slate-100 text-slate-900">
              {streamingContent ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-accent/50 ml-1 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 bg-white px-4 py-4">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 resize-none min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-white h-[44px] px-4"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
