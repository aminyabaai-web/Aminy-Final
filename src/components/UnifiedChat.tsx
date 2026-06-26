// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Unified Chat Component
 * Single chat interface using ConversationContext for all conversations
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useConversation } from '../context/ConversationContext';
import { toast } from 'sonner';
import {
  Send,
  Loader2,
  Sparkles,
  User,
  Bot,
  Stethoscope,
  MessageSquare,
  Archive,
  Plus,
} from 'lucide-react';
import { CompassIcon } from './CompassIcon';

interface UnifiedChatProps {
  childId?: string;
  childName?: string;
  onClose?: () => void;
  embedded?: boolean;
  userData?: { parentName?: string; childName?: string };
  starterPrompts?: string[];
}

export function UnifiedChat({ 
  childId, 
  childName = 'your child', 
  onClose,
  embedded = false 
}: UnifiedChatProps) {
  const {
    messages,
    currentConversation,
    state,
    sendMessage,
    createConversation,
    setChildContext,
  } = useConversation();

  const loading = state.isLoading;
  const error: string | null = null;

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set child context when component mounts
  useEffect(() => {
    if (childId) {
      setChildContext(childId);
    }
  }, [childId, setChildContext]);

  // Map message role to author string for display
  const getAuthor = (msg: { role: string }): string => {
    switch (msg.role) {
      case 'user': return 'parent';
      case 'assistant': return 'ai';
      case 'system': return 'system';
      default: return msg.role;
    }
  };

  // Create conversation if none exists
  useEffect(() => {
    if (!currentConversation && childId) {
      createConversation(childId, `Chat about ${childName}`);
    }
  }, [currentConversation, childId, childName, createConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const messageText = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await sendMessage('parent', messageText, { childId });
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
      setInput(messageText); // Restore input on error
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get author icon
  const getAuthorIcon = (author: string) => {
    switch (author) {
      case 'parent':
        return <User className="w-4 h-4" />;
      case 'ai':
        return <CompassIcon className="w-4 h-4" />;
      case 'coach':
        return <MessageSquare className="w-4 h-4" />;
      case 'provider':
        return <Stethoscope className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  // Get author label
  const getAuthorLabel = (author: string) => {
    switch (author) {
      case 'parent':
        return 'You';
      case 'ai':
        return 'Aminy';
      case 'coach':
        return 'Coach';
      case 'provider':
        return 'Provider';
      default:
        return 'System';
    }
  };

  // Get author colors
  const getAuthorColors = (author: string) => {
    switch (author) {
      case 'parent':
        return { bg: 'bg-[#EEF4F8]', text: 'text-blue-900', border: 'border-blue-100' };
      case 'ai':
        return { bg: 'bg-[#6B9080]/10', text: 'text-[#6B9080]', border: 'border-[#E8E4DF]' };
      case 'coach':
        return { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-100' };
      case 'provider':
        return { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-100' };
      default:
        return { bg: 'bg-[#FAF7F2]', text: 'text-[#132F43]', border: 'border-[#E8E4DF]' };
    }
  };

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-screen max-w-4xl mx-auto'}`}>
      {/* Header */}
      {!embedded && (
        <div className="bg-white border-b border-[#E8E4DF] px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <CompassIcon className="w-5 h-5 compass-animate" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">Chat with Aminy</h2>
                <p className="text-sm text-muted-foreground">
                  {childName ? `About ${childName}` : 'Your AI companion'}
                </p>
              </div>
            </div>
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                Close
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 sm:px-6 py-3 sm:py-4">
        <div className="space-y-3 sm:space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="p-4 bg-[#6B9080]/10 rounded-full inline-block mb-4">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                Hi there! I'm Aminy.
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                I'm here to listen, support, and help make things a little easier.
                What's on your mind today?
              </p>
            </div>
          )}

          {messages.map((message) => {
            const colors = getAuthorColors(getAuthor(message));
            const isUser = getAuthor(message) === 'parent';

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    isUser ? 'order-2' : 'order-1'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {!isUser && (
                      <>
                        <div className={`p-1 ${colors.bg} rounded`}>
                          {getAuthorIcon(getAuthor(message))}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {getAuthorLabel(getAuthor(message))}
                        </span>
                      </>
                    )}
                    {isUser && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      isUser
                        ? 'bg-accent text-white'
                        : `${colors.bg} ${colors.text} border ${colors.border}`
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>

                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1 ml-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(loading || isSending) && (
            <div className="flex justify-start">
              <div className="bg-[#6B9080]/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-sm text-muted-foreground">
                  Aminy is thinking...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="bg-white border-t border-[#E8E4DF] px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="resize-none min-h-[60px] max-h-[120px]"
            disabled={isSending || loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending || loading}
            className="bg-accent hover:bg-accent/90 flex-shrink-0"
            size="lg"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Aminy is here to support you—not replace medical advice. For emergencies, call 911.
        </p>
      </div>
    </div>
  );
}
