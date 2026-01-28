/**
 * Bevel-Style Chat Overlay - Bottom sheet with blurred background
 * Modern chat scrolling with fixed input at bottom
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  fetchUserContext,
  buildAIContextString,
  getCurrentContext,
  fetchMemories,
  storeMemory,
  type UserContext,
  type CurrentContext
} from '../ai/contextLayer';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface BevelChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPath: string;
}

export function BevelChatOverlay({
  isOpen,
  onClose,
  userId,
  currentPath
}: BevelChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [currentContext, setCurrentContext] = useState<CurrentContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load context when opened
  useEffect(() => {
    if (isOpen && userId) {
      loadContext();
    }
  }, [isOpen, userId, currentPath]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const loadContext = async () => {
    const context = await fetchUserContext(userId);
    setUserContext(context);
    
    const current = getCurrentContext(currentPath, context);
    setCurrentContext(current);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build comprehensive context
      const contextString = userContext 
        ? buildAIContextString(userContext)
        : '';

      const moduleContext = currentContext 
        ? `Currently in: ${currentContext.moduleName}. ${currentContext.contextHint}`
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
            userMessage: input,
            conversationHistory: messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            systemPrompt: `You are Aminy, an AI behavioral wellness companion. You're warm, intelligent, and context-aware.

CURRENT CONTEXT: ${contextString}

MODULE CONTEXT: ${moduleContext}

Respond naturally, showing you understand where they are in the app. Be brief (2-3 sentences) unless they ask for more detail. Use ABA principles naturally without clinical jargon.`
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

      // Store as memory
      if (data.message.length > 50) {
        await storeMemory(userId, {
          timestamp: new Date(),
          category: 'calm_cue',
          content: data.message,
          context: { 
            userQuery: input,
            module: currentContext?.module
          }
        });
      }

    } catch (error) {
      toast.error('I had a little hiccup. Mind trying that again?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl"
            style={{
              height: '80vh',
              maxHeight: '80vh',
              boxShadow: '0 -4px 24px rgba(120, 120, 120, 0.15)'
            }}
          >
            {/* Header */}
            <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-50 to-violet-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-slate-900">Aminy</h2>
                    {currentContext && (
                      <p className="text-xs text-slate-500">{currentContext.moduleName}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-9 w-9 p-0 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </Button>
              </div>
            </div>

            {/* Messages Area - Modern Chat Scrolling */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-50 via-emerald-50 to-violet-50 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-cyan-600" />
                  </div>
                  <h3 className="text-slate-900 mb-2">
                    {currentContext?.moduleName || 'How can I help?'}
                  </h3>
                  <p className="text-sm text-slate-600 max-w-xs">
                    {currentContext?.contextHint || "I'm here to support you with behavioral wellness."}
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                        : 'bg-slate-50 text-slate-900'
                    }`}
                    style={{
                      boxShadow: message.role === 'assistant' 
                        ? '0 1px 3px rgba(120, 120, 120, 0.08)' 
                        : 'none'
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 bg-slate-50 rounded-2xl" style={{
                    boxShadow: '0 1px 3px rgba(120, 120, 120, 0.08)'
                  }}>
                    <div className="flex gap-1.5">
                      <motion.div
                        className="w-2 h-2 bg-slate-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-slate-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-slate-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Fixed Input Area - Bevel Style with safe area */}
            <div
              className="shrink-0 px-4 py-4 bg-gradient-to-t from-white via-white to-transparent border-t border-slate-100"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-end gap-2">
                {/* Plus Button */}
                <button
                  className="shrink-0 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  style={{ boxShadow: '0 1px 3px rgba(120, 120, 120, 0.08)' }}
                >
                  <Plus className="w-5 h-5 text-slate-700" />
                </button>

                {/* Input Container */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentContext?.placeholder || 'Ask Aminy anything...'}
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border-0 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm placeholder:text-slate-400"
                    style={{
                      maxHeight: '120px',
                      minHeight: '44px',
                      boxShadow: '0 1px 3px rgba(120, 120, 120, 0.08)'
                    }}
                    rows={1}
                  />
                  
                  {/* Gradient Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm"
                    style={{
                      boxShadow: input.trim() 
                        ? '0 2px 8px rgba(6, 182, 212, 0.3)' 
                        : 'none'
                    }}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
