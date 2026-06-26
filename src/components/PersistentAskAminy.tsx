// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { syncEncryptedStorage } from '../lib/security/encrypted-storage';
import { Send, Paperclip, Mic, Sparkles, X, Minimize2, Maximize2, Brain, RotateCcw, Copy, MessageSquare, Zap, Volume2, Clock } from 'lucide-react';
import { ChatSidebarDrawer } from './ChatSidebarDrawer';
import { AttachmentPicker } from './AttachmentPicker';
import { VoiceInput } from './VoiceInput';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import { useContextEngine } from '../lib/context-engine';
import { useAnalytics } from '../lib/analytics-engine';
import { toast } from 'sonner';
import { memoryManager } from '../lib/memory-system';
import type { TierType } from '../lib/tier-utils';
import { addBreadcrumb, captureError } from '../lib/sentry';
import { RateLimitBadge } from './RateLimitBadge';
import { useRateLimitStore, hasReachedLimit } from '../lib/rate-limit-store';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  contextUsed?: boolean;
  suggestions?: string[];
}

interface PersistentAskAminyProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  userTier: string;
  userData: { parentName: string; childName: string };
  onPaywallTrigger?: () => void;
  className?: string;
}

export function PersistentAskAminy({
  isOpen,
  onToggle,
  onClose,
  userTier,
  userData,
  onPaywallTrigger,
  className
}: PersistentAskAminyProps) {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId] = useState(() => `conv-${Date.now()}`);
  
  // Enhanced state for streaming experience
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [contextualSuggestions, setContextualSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Hooks
  const { enhancePrompt, generatePrompts, getInsights } = useContextEngine();
  const { track } = useAnalytics();

  // Rate limiting based on tier - check if user can send message
  const childId = 'default'; // Would come from user profile
  const { dailyUsage, fetchUsage, setDailyUsage } = useRateLimitStore();

  // Use backend usage if available, fall back to local memory manager
  const isBackendRateLimited = dailyUsage && hasReachedLimit(dailyUsage);
  const canSendMessage = !isBackendRateLimited && memoryManager.canSendMessage(childId, userTier as TierType);
  const messagesRemaining = dailyUsage?.remaining ?? memoryManager.getMessagesRemaining(childId, userTier as TierType);

  // Fetch usage on mount
  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen]);

  // Auto-resize textarea with improved logic
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = isMinimized ? 48 : 120;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, [isMinimized]);

  // Load conversation from localStorage
  useEffect(() => {
    if (!isOpen) return;
    
    try {
      const savedConversation = syncEncryptedStorage.getItem(`aminy-conversation-${conversationId}`);
      if (savedConversation) {
        const parsed = JSON.parse(savedConversation);
        setMessages(parsed.messages || []);
        setConversationTitle(parsed.title || '');
        setLastActivity(new Date(parsed.lastUpdated || Date.now()));
      }
    } catch (error) {
    }
  }, [conversationId, isOpen]);

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const conversationData = {
          messages,
          title: conversationTitle,
          lastUpdated: new Date().toISOString()
        };
        syncEncryptedStorage.setItem(`aminy-conversation-${conversationId}`, JSON.stringify(conversationData));
        setLastActivity(new Date());
      } catch (error) {
      }
    }
  }, [messages, conversationTitle, conversationId]);

  // Generate contextual suggestions
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const prompts = generatePrompts();
      const childName = userData.childName;
      
      const suggestions = [
        `Help with ${childName}'s bedtime routine`,
        `Managing ${childName}'s transitions`,
        'Communication strategies that work',
        'Supporting emotional regulation',
        'IEP goals and school support',
        'Sensory needs and accommodations'
      ];
      
      // Mix contextual and generic suggestions
      const contextualPrompts = prompts.slice(0, 2).map(p => p.prompt);
      const finalSuggestions = [
        ...contextualPrompts,
        ...suggestions.filter(s => !contextualPrompts.some(cp => cp.includes(s.split(' ')[2])))
      ].slice(0, 4);
      
      setContextualSuggestions(finalSuggestions);
    }
  }, [isOpen, messages.length, generatePrompts, userData.childName]);

  // Auto-resize textarea when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Scroll to bottom on new messages with enhanced smooth scrolling
  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isStreaming]);

  // Focus textarea when opening
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Enhanced AI response generation with streaming
  const generateEnhancedResponse = async (userMessage: string, context: Message[] = []) => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setIsTyping(true);
      setIsStreaming(true);

      // Generate conversation title if this is the first message
      if (messages.length === 0 && !conversationTitle) {
        const title = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
        setConversationTitle(title);
      }

      // Enhanced context-aware response generation
      const enhancedPrompt = enhancePrompt(userMessage);

      // Realistic processing delay
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      if (signal.aborted) throw new Error('AbortError');

      let response = '';
      let contextUsed = false;
      let suggestions: string[] = [];

      // Context-aware response generation
      const lowerMessage = userMessage.toLowerCase();
      const hasContext = context.length > 0;
      const isFollowUp = /\b(you said|earlier|previous|before|that|it|more|explain|tell me more|what about|how about|also)\b/i.test(userMessage);

      if (isFollowUp && hasContext) {
        response = generateContextAwareResponse(userMessage, context);
        contextUsed = true;
      } else if (lowerMessage.includes('routine') || lowerMessage.includes('schedule')) {
        response = `Routines are so important for ${userData.childName}! I'd suggest starting with visual schedules that show each step clearly. Consider using pictures or symbols for each part of the routine. What time of day or specific activity would you like to focus on first?`;
        suggestions = ['Morning routine help', 'Bedtime strategies', 'Transition techniques'];
      } else if (lowerMessage.includes('behavior') || lowerMessage.includes('meltdown')) {
        response = `Understanding the triggers behind challenging behaviors is key to supporting ${userData.childName}. I can help you identify patterns and develop prevention strategies. What situations tend to be most difficult for ${userData.childName}?`;
        suggestions = ['Behavior tracking tips', 'Calming strategies', 'Prevention techniques'];
      } else if (lowerMessage.includes('speech') || lowerMessage.includes('communication')) {
        response = `Communication development happens at different paces for every child. I can suggest activities that match ${userData.childName}'s current level and interests. What communication goals are you working on with ${userData.childName}?`;
        suggestions = ['Speech activities', 'Communication apps', 'Language development'];
      } else if (lowerMessage.includes('school') || lowerMessage.includes('teacher')) {
        response = `School partnerships are crucial for ${userData.childName}'s success. I can help you prepare for meetings, understand IEP goals, or suggest home-school collaboration strategies. What's your main school concern for ${userData.childName}?`;
        suggestions = ['IEP meeting prep', 'Teacher collaboration', 'School accommodations'];
      } else if (lowerMessage.includes('sensory') || lowerMessage.includes('overwhelmed')) {
        response = `Sensory needs can really impact ${userData.childName}'s daily life. I can help identify their sensory profile and suggest accommodations or activities. What sensory challenges do you notice most with ${userData.childName}?`;
        suggestions = ['Sensory tools', 'Calming techniques', 'Environment setup'];
      } else {
        response = `I'm here to help with any aspect of ${userData.childName}'s development! Whether it's daily routines, communication, behavior strategies, school support, or understanding evaluations - what would be most helpful to discuss about ${userData.childName} right now?`;
        suggestions = ['Daily routines', 'Communication help', 'Behavior support', 'School partnership'];
      }

      setIsTyping(false);
      return { response, contextUsed, suggestions };

    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'AbortError') {
        return null;
      }

      setIsTyping(false);
      setIsStreaming(false);
      throw error;
    }
  };

  const generateContextAwareResponse = (userMessage: string, context: Message[]): string => {
    const lastAssistantMessage = context.filter(m => m.role === 'assistant').slice(-1)[0];
    
    if (lastAssistantMessage?.content.includes('routine')) {
      return `Building on those routine strategies for ${userData.childName}, consistency is key! I'd recommend starting with one part of the routine and gradually expanding. Visual supports like pictures or timers can really help ${userData.childName} understand what comes next. What specific part of the routine is most challenging right now?`;
    } else if (lastAssistantMessage?.content.includes('behavior')) {
      return `Great question about behavior strategies for ${userData.childName}! Those techniques can be adapted for different situations. The key is staying consistent with your approach. Would you like me to suggest modifications for home, school, or community settings with ${userData.childName}?`;
    } else {
      return `I understand you'd like to know more about that for ${userData.childName}. Could you help me understand which specific aspect you'd like me to elaborate on? I'm here to provide detailed, personalized guidance.`;
    }
  };

  // Streaming simulation for realistic typing effect
  const simulateStreaming = async (fullResponse: string, messageId: string, suggestions: string[] = []) => {
    const words = fullResponse.split(' ');
    const wordsPerChunk = 2;
    const delayBetweenChunks = 50;

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(0, i + wordsPerChunk).join(' ');
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: chunk, isStreaming: true }
          : msg
      ));

      if (i + wordsPerChunk < words.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
      }
    }

    // Mark streaming as complete
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: fullResponse, isStreaming: false, suggestions }
        : msg
    ));

    setStreamingMessageId(null);
    setIsStreaming(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (!canSendMessage) {
      onPaywallTrigger?.();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    const messageContent = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);

    // Track message sent
    addBreadcrumb('ai.chat', 'User message sent', {
      messageLength: messageContent.length,
      messageCount: messages.length + 1,
      userTier,
    });
    track('ask_aminy_message_sent', {
      messageLength: messageContent.length,
      messageCount: messages.length + 1,
      userTier,
      hasContext: messages.length > 0
    });

    try {
      const result = await generateEnhancedResponse(messageContent, messages);
      
      if (result) {
        const { response, contextUsed, suggestions } = result;
        
        // Add AI response with streaming
        const aiMsgId = `msg-${Date.now() + 1}`;
        const aiMsg: Message = {
          id: aiMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
          contextUsed
        };
        
        setMessages(prev => [...prev, aiMsg]);
        setStreamingMessageId(aiMsgId);
        
        // Start streaming
        await simulateStreaming(response, aiMsgId, suggestions);
        
        // Track successful response
        track('ask_aminy_response_generated', {
          responseLength: response.length,
          contextUsed,
          suggestionsCount: suggestions.length,
          userTier
        });
      }
      
    } catch (error: unknown) {
      console.error('Error generating response:', error);
      const err = error instanceof Error ? error : new Error('AI response generation failed');
      captureError(err, { messageCount: messages.length, userTier });
      addBreadcrumb('ai.chat', `AI error: ${err.message}`, { messageCount: messages.length });
      toast.error('Sorry, I encountered an issue. Please try again.');
      
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  // Enhanced interaction handlers
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
    
    track('ask_aminy_suggestion_used', {
      suggestion,
      suggestionsShown: contextualSuggestions.length,
      userTier
    });
  };

  const handleClearConversation = () => {
    setMessages([]);
    setConversationTitle('');
    setShowSuggestions(true);
    try {
      syncEncryptedStorage.removeItem(`aminy-conversation-${conversationId}`);
      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Message copied');
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast.error('Failed to copy message');
    }
  };

  const handleRegenerateResponse = async () => {
    if (messages.length < 2) return;

    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
    if (!lastUserMessage) return;

    // Remove the last assistant message
    setMessages(prev => prev.filter(msg =>
      !(msg.role === 'assistant' && msg.timestamp > lastUserMessage.timestamp)
    ));

    // Regenerate response
    try {
      const result = await generateEnhancedResponse(lastUserMessage.content, messages.slice(0, -2));

      if (result) {
        const { response, contextUsed, suggestions } = result;
        const aiMsgId = `msg-${Date.now()}`;
        const aiMsg: Message = {
          id: aiMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
          contextUsed
        };

        setMessages(prev => [...prev, aiMsg]);
        setStreamingMessageId(aiMsgId);
        await simulateStreaming(response, aiMsgId, suggestions);
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
      toast.error('Failed to regenerate response');
    }
  };

  // Handle selecting a conversation from history
  const handleSelectConversation = (selectedConversationId: string) => {
    try {
      const savedConversation = syncEncryptedStorage.getItem(`aminy-conversation-${selectedConversationId}`);
      if (savedConversation) {
        const parsed = JSON.parse(savedConversation);
        setMessages(parsed.messages || []);
        setConversationTitle(parsed.title || '');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    }
    setShowChatHistory(false);
  };

  // Handle attachment selection
  const handleAttachmentSelected = async (file: File, type: 'photo' | 'image' | 'pdf') => {
    // For MVP, we'll create a message that mentions the attachment
    // In production, this would upload to Supabase Storage and include the URL
    const attachmentMessage = type === 'pdf'
      ? `[Attached PDF: ${file.name}]`
      : `[Attached image: ${file.name}]`;

    toast.success(`${file.name} attached`, {
      description: 'Attachment ready to send with your message'
    });

    // Add to input or send directly
    setInput(prev => prev ? `${prev}\n${attachmentMessage}` : attachmentMessage);
  };

  // Handle voice input transcript
  const handleVoiceTranscript = (text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
    // Focus the textarea
    textareaRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4",
      className
    )}>
      <Card className={cn(
        "w-full max-w-4xl bg-white dark:bg-gray-900 border-0 shadow-2xl transition-all duration-300",
        isMinimized 
          ? "h-16 rounded-t-2xl sm:rounded-2xl" 
          : "h-[85vh] max-h-[700px] rounded-t-2xl sm:rounded-2xl",
        "flex flex-col overflow-hidden"
      )}>
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8E4DF] dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center transition-all duration-300",
              isStreaming && "animate-pulse from-accent/30 to-accent/20"
            )}>
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#132F43] dark:text-gray-100">Aminy</h3>
                <Badge className="bg-green-100 text-green-800 border-green-200 text-sm">
                  Always Available
                </Badge>
                {isStreaming && (
                  <Badge variant="secondary" className="text-sm animate-pulse">
                    <Brain className="w-3 h-3 mr-1" />
                    Thinking...
                  </Badge>
                )}
              </div>
              {!isMinimized && (
                <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] aminy-ai-subtitle">
                  {conversationTitle || `Your AI guide for ${userData.childName}'s development and care`}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Chat History Button - Always visible */}
            {!isMinimized && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChatHistory(true)}
                className="w-8 h-8 p-0"
                title="Chat history"
              >
                <Clock className="w-4 h-4" />
              </Button>
            )}
            {messages.length > 0 && !isMinimized && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateResponse}
                  disabled={isTyping || isStreaming}
                  className="w-8 h-8 p-0"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearConversation}
                  disabled={isTyping || isStreaming}
                  className="w-8 h-8 p-0"
                  title="New conversation"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-8 h-8 p-0"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Enhanced Messages Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 sm:space-y-4 sm:space-y-6 py-4">
                  {messages.length === 0 && showSuggestions && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-accent" />
                      </div>
                      <h4 className="text-lg font-semibold text-[#132F43] dark:text-gray-100 mb-2">
                        How can I help with {userData.childName} today?
                      </h4>
                      <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mb-4 sm:mb-6 max-w-md mx-auto">
                        Ask me anything about development, routines, behaviors, school support, or concerns you have.
                      </p>
                      
                      {/* Contextual Suggestions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        {contextualSuggestions.slice(0, 4).map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-left justify-start h-auto p-3 text-sm hover:bg-accent/5 hover:border-accent/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-accent flex-shrink-0" />
                              <span className="truncate">{suggestion}</span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div key={message.id} className="group">
                      <div className={cn(
                        "flex gap-3",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}>
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            <Sparkles className="w-4 h-4 text-accent" />
                          </div>
                        )}
                        
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm relative",
                          message.role === 'user'
                            ? "bg-accent text-white"
                            : "bg-[#F0EDE8] dark:bg-gray-800 text-[#132F43] dark:text-gray-100 border border-[#E8E4DF] dark:border-gray-700"
                        )}>
                          {/* Message Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm opacity-60",
                                message.role === 'user' ? "text-white/80" : "text-[#5A6B7A] dark:text-[#8A9BA8]"
                              )}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {message.contextUsed && (
                                <Badge variant="secondary" className="text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                                  <Brain className="w-2 h-2 mr-1" />
                                  Aminy remembers
                                </Badge>
                              )}
                              {message.isStreaming && (
                                <div className="flex space-x-1">
                                  <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.1s]"></div>
                                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                </div>
                              )}
                            </div>
                            
                            {/* Message Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyMessage(message.content)}
                                className={cn(
                                  "h-6 w-6 p-0",
                                  message.role === 'user' 
                                    ? "hover:bg-white/20 text-white/80" 
                                    : "hover:bg-[#E8E4DF] dark:hover:bg-gray-700 text-[#5A6B7A] dark:text-[#8A9BA8]"
                                )}
                                title="Copy message"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Message Content */}
                          <div className="text-sm leading-relaxed">
                            {message.content}
                          </div>
                          
                          {/* Follow-up Suggestions */}
                          {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && !message.isStreaming && (
                            <div className="mt-3 pt-3 border-t border-[#E8E4DF] dark:border-gray-600">
                              <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mb-2">Continue the conversation:</p>
                              <div className="flex flex-wrap gap-2">
                                {message.suggestions.map((suggestion, suggestionIndex) => (
                                  <Button
                                    key={suggestionIndex}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="text-sm h-7 px-2 hover:bg-accent/5 hover:border-accent/30"
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {message.role === 'user' && (
                          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-sm font-medium text-accent">
                              {userData.parentName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Enhanced Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                      </div>
                      <div className="bg-[#F0EDE8] dark:bg-gray-800 rounded-2xl px-4 py-3 border border-[#E8E4DF] dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.1s]"></div>
                            <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
                          </div>
                          <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Aminy is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
            </div>

            {/* Enhanced Input Area */}
            <div className="border-t border-[#E8E4DF] dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
              <div className="relative bg-[#FAF7F2] dark:bg-gray-800 rounded-xl border border-[#E8E4DF] dark:border-gray-700 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all aminy-ai-card">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={canSendMessage 
                    ? `Message Aminy about ${userData.childName}...` 
                    : "Upgrade to continue unlimited conversations"
                  }
                  disabled={!canSendMessage || isTyping || isStreaming}
                  className="aminy-ai-input-field w-full bg-transparent border-none outline-none resize-none px-4 py-3 pr-32 text-sm placeholder-gray-500 dark:placeholder-gray-400 min-h-[52px] text-[#132F43] dark:text-gray-100"
                  rows={1}
                />
                
                {/* Input Actions */}
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-[#8A9BA8] hover:text-[#5A6B7A] dark:text-[#5A6B7A] dark:hover:text-[#8A9BA8] transition-all duration-200"
                    disabled={!canSendMessage || isTyping || isStreaming}
                    onClick={() => setShowAttachmentPicker(true)}
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <VoiceInput
                    onTranscript={handleVoiceTranscript}
                    className="w-8 h-8"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || !canSendMessage || isTyping || isStreaming}
                    className={cn(
                      "w-8 h-8 p-0 transition-all duration-200",
                      input.trim() && canSendMessage && !isTyping && !isStreaming
                        ? "bg-accent hover:bg-accent/90 text-white scale-100"
                        : "bg-gray-300 dark:bg-gray-600 text-[#5A6B7A] dark:text-[#8A9BA8] scale-95"
                    )}
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Helper Text */}
              <div className="mt-3 flex items-center justify-between text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                <div className="flex items-center gap-2">
                  <span className="aminy-ai-helper-text">
                    AI responses are for guidance only and don't replace professional medical advice
                  </span>
                </div>
                
                {/* Rate limit badge - shows for free/starter tiers */}
                <RateLimitBadge
                  variant="compact"
                  onUpgradeClick={onPaywallTrigger}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Chat History Sidebar Drawer */}
      <ChatSidebarDrawer
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleClearConversation}
        currentConversationId={conversationId}
      />

      {/* Attachment Picker */}
      <AttachmentPicker
        isOpen={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onAttachmentSelected={handleAttachmentSelected}
      />
    </div>
  );
}