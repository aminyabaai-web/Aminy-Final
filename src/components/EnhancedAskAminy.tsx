// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic, Sparkles, X, Minimize2, Maximize2, Brain, RotateCcw, Copy, MessageSquare, Zap, Volume2, ChevronDown, Plus, ArrowUp, AlertTriangle, Clock, Share2 } from 'lucide-react';
import { ShareInsightInline } from './ShareInsight';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import { useContextEngine } from '../lib/context-engine';
import { useAnalytics } from '../lib/analytics-engine';
import { toast } from 'sonner';
import { useAminyStore } from '../lib/store';
import {
  sendMessage as sendAIMessage,
  type ConversationMessage as AIConversationMessage,
} from '../lib/ai-engine';
import { memoryManager } from '../lib/memory-system';
import type { TierType } from '../lib/tier-utils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  contextUsed?: boolean;
  suggestions?: string[];
  confidence?: number;
  tokens?: number;
  isCrisisResponse?: boolean;
}

interface EnhancedAskAminyProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  userTier: string;
  userData: { parentName: string; childName: string };
  onPaywallTrigger?: () => void;
  className?: string;
}

// Response templates — CTCA Child Standard: lead with empathy, validate the parent, then offer expertise
// These are fallback templates when the AI API is unreachable. The real Claude responses are warmer.
const RESPONSE_TEMPLATES = {
  routine: {
    responses: [
      "I hear you — routines can feel like a constant battle. But here's the thing: {childName} actually craves that structure, even when it doesn't look like it. Let's build a visual schedule together that makes each step feel predictable and safe.",
      "You're already doing the hardest part — being consistent. For {childName}, even a small visual cue (a picture, a timer, a song) can turn chaos into something manageable. What part of the day feels hardest right now?",
      "The fact that you're thinking about routines tells me you understand {childName} really well. Predictability reduces anxiety — let's start with one routine and make it rock-solid before we add more."
    ],
    followUps: [
      "Help me build a visual schedule",
      "Transitions are the hardest part",
      "Morning routine ideas",
      "Bedtime is a struggle"
    ]
  },
  behavior: {
    responses: [
      "I can tell this is weighing on you, and I want you to know — you're not failing. Every behavior is {childName} trying to communicate something. Let's figure out what they're telling us, together.",
      "Behavior is communication, especially for {childName}. When things escalate, there's always a reason underneath — sensory overload, frustration, anxiety. You're already noticing patterns, which is huge. Let's use that.",
      "You're asking exactly the right questions. The fact that you're looking for what's *behind* the behavior — not just trying to stop it — means {childName} has an incredible advocate. What moments feel most challenging?"
    ],
    followUps: [
      "Help me see the patterns",
      "What to do during a meltdown",
      "Prevention strategies",
      "Making our space work better"
    ]
  },
  communication: {
    responses: [
      "Communication looks different for every child, and {childName}'s path is uniquely theirs. There are so many ways to support this journey — and you're already doing it by paying attention. What are you noticing?",
      "Here's something important: communication isn't just about words. {childName} is already communicating — through gestures, behaviors, preferences. Let's build on what's already working.",
      "You're tuning into something really important about {childName}'s communication. Connection first, words second — that's the approach that research supports. What feels like it's working, even a little?"
    ],
    followUps: [
      "Activities we can do at home",
      "Visual supports that help",
      "When should I be concerned?",
      "Ways to encourage language"
    ]
  },
  school: {
    responses: [
      "Navigating school is one of the hardest parts of this journey, and the fact that you're advocating for {childName} says everything. I can help you prepare for meetings, understand your rights, and make the team work *with* you.",
      "You shouldn't have to fight for what {childName} needs at school — but I know it can feel that way. Let's make sure you walk into every meeting with the right language, the right requests, and confidence in your corner.",
      "School can be amazing or exhausting for {childName} — sometimes both in the same day. What's your biggest concern right now? I'll help you figure out the next step."
    ],
    followUps: [
      "Help me prep for an IEP meeting",
      "How to talk to the teacher",
      "What accommodations should I ask for?",
      "School is sending notes home"
    ]
  },
  sensory: {
    responses: [
      "You're recognizing something really important about {childName}. Sensory needs affect everything — eating, sleeping, learning, playing. The good news is that once we understand the profile, we can make {childName}'s world feel so much safer.",
      "Sensory processing shapes how {childName} experiences the world. What feels overwhelming to us might be unbearable for them — and vice versa. Let's figure out {childName}'s specific triggers and build a toolkit that actually works.",
      "The way {childName} responds to sensory input tells us so much. You're already picking up on these cues — that's incredibly perceptive. Let's turn those observations into strategies you can use every day."
    ],
    followUps: [
      "Help me understand sensory needs",
      "Our home feels overwhelming",
      "Calming strategies that work",
      "Sensory activities to try"
    ]
  }
};

export function EnhancedAskAminy({
  isOpen,
  onToggle,
  onClose,
  userTier,
  userData,
  onPaywallTrigger,
  className
}: EnhancedAskAminyProps) {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId] = useState(() => `conv-${Date.now()}`);
  
  // Enhanced state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [contextualSuggestions, setContextualSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [streamingText, setStreamingText] = useState('');
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hooks
  const { enhancePrompt, generatePrompts, getInsights } = useContextEngine();
  const { track } = useAnalytics();

  // Rate limiting based on tier - check if user can send message
  const state = useAminyStore.getState();
  const childId = state.user?.id || 'default';
  const canSendMessage = memoryManager.canSendMessage(childId, userTier as TierType);
  const messagesRemaining = memoryManager.getMessagesRemaining(childId, userTier as TierType);

  // Enhanced auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = isMinimized ? 48 : 120;
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), maxHeight);
      textarea.style.height = newHeight + 'px';
    }
  }, [isMinimized]);

  // Enhanced message categorization
  const categorizeMessage = (message: string): keyof typeof RESPONSE_TEMPLATES | 'general' => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('routine') || lowerMessage.includes('schedule')) return 'routine';
    if (lowerMessage.includes('behavior') || lowerMessage.includes('meltdown') || lowerMessage.includes('tantrum')) return 'behavior';
    if (lowerMessage.includes('speech') || lowerMessage.includes('communication') || lowerMessage.includes('talking')) return 'communication';
    if (lowerMessage.includes('school') || lowerMessage.includes('teacher') || lowerMessage.includes('iep')) return 'school';
    if (lowerMessage.includes('sensory') || lowerMessage.includes('overwhelmed') || lowerMessage.includes('loud')) return 'sensory';
    
    return 'general';
  };

  // Enhanced response generation using real Claude AI
  const generateEnhancedResponse = async (userMessage: string, context: Message[] = []) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsTyping(true);

      // Get user/child IDs from store
      const state = useAminyStore.getState();
      const userId = state.user?.id || 'anonymous';
      const childId = 'default'; // Child ID comes from user profile

      // Generate conversation title if needed
      if (messages.length === 0 && !conversationTitle) {
        const title = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
        setConversationTitle(title);
      }

      // Convert messages to AI format
      const conversationHistory: AIConversationMessage[] = context.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }));

      // Track response text for streaming
      let streamedResponse = '';
      let suggestions: string[] = [];
      let crisisDetected = false;

      // Create a promise that will resolve when streaming is complete
      const aiResponse = await sendAIMessage(
        userMessage,
        conversationHistory,
        {
          userId,
          childId,
          conversationId,
          enableMemory: true,
          maxTokens: 1024,
        },
        {
          onToken: (token) => {
            streamedResponse += token;
            // Update streaming text state for real-time display
            setStreamingText(streamedResponse);
          },
          onComplete: (fullResponse) => {
            streamedResponse = fullResponse;
          },
          onError: (error) => {
            console.error('AI streaming error:', error);
          },
        }
      );

      suggestions = aiResponse.suggestions || [];
      crisisDetected = aiResponse.crisisDetected || false;

      // Update conversation title if provided
      if (aiResponse.title && !conversationTitle) {
        setConversationTitle(aiResponse.title);
      }

      setIsTyping(false);

      // Determine confidence based on memory usage
      const confidence = aiResponse.memoryFactsUsed && aiResponse.memoryFactsUsed > 0
        ? 0.92
        : 0.85;

      return {
        response: aiResponse.content || streamedResponse,
        contextUsed: (aiResponse.memoryFactsUsed || 0) > 0,
        suggestions,
        confidence,
        tokens: Math.floor((aiResponse.content || streamedResponse).length * 0.25),
        crisisDetected,
      };

    } catch (error: unknown) {
      console.error('AI response error:', error);

      // Fall back to template-based response if AI fails
      const category = categorizeMessage(userMessage);
      let response = '';
      let suggestions: string[] = [];

      if (category !== 'general') {
        const template = RESPONSE_TEMPLATES[category];
        const responseIndex = Math.floor(Math.random() * template.responses.length);
        response = template.responses[responseIndex].replace(/{childName}/g, userData.childName);
        suggestions = template.followUps;
      } else {
        response = `I'm here to help with ${userData.childName}'s development and care. What would you like to discuss?`;
        suggestions = ['Daily routines', 'Communication help', 'Behavior support', 'School partnership'];
      }

      setIsTyping(false);
      return {
        response,
        contextUsed: false,
        suggestions,
        confidence: 0.7,
        tokens: Math.floor(response.length * 0.75)
      };
    }
  };

  const generateContextualFollowUp = (userMessage: string, lastMessage: Message): string => {
    const lastContent = lastMessage.content.toLowerCase();
    
    if (lastContent.includes('routine')) {
      return `Building on those routine strategies for ${userData.childName}, consistency combined with flexibility is key. I'd recommend starting with visual cues like pictures or timers. What specific part of the routine feels most challenging right now?`;
    } else if (lastContent.includes('behavior')) {
      return `Those behavior strategies can definitely be adapted for ${userData.childName}'s specific needs. The key is understanding the function of the behavior first. Would you like me to help you analyze what might be triggering these behaviors for ${userData.childName}?`;
    } else if (lastContent.includes('communication')) {
      return `Great question about communication strategies for ${userData.childName}! Every child's communication journey is unique. What communication goals are you working on with ${userData.childName}, and what seems to motivate them most?`;
    }
    
    return `I understand you'd like to explore that further for ${userData.childName}. Could you help me understand which specific aspect you'd like me to elaborate on? I'm here to provide detailed, personalized guidance.`;
  };

  // Enhanced realistic streaming with varied speeds
  const simulateAdvancedStreaming = async (fullResponse: string, messageId: string, suggestions: string[] = [], confidence: number = 0.85) => {
    const sentences = fullResponse.split(/(?<=[.!?])\s+/);
    let currentText = '';
    
    for (const sentence of sentences) {
      const words = sentence.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: currentText, isStreaming: true }
            : msg
        ));

        // Variable delay based on punctuation and content
        let delay = 45;
        if (words[i].endsWith(',')) delay = 150;
        if (words[i].endsWith('.') || words[i].endsWith('!') || words[i].endsWith('?')) delay = 300;
        if (words[i].length > 8) delay = 80; // Longer words take more time
        
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 20));
      }
      
      // Pause between sentences
      if (sentence.length > 50) {
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));
      }
    }

    // Mark streaming as complete
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            content: fullResponse, 
            isStreaming: false, 
            suggestions,
            confidence 
          }
        : msg
    ));

    setStreamingMessageId(null);
    setIsStreaming(false);
  };

  // Load conversation from localStorage
  useEffect(() => {
    if (!isOpen) return;
    
    try {
      const savedConversation = localStorage.getItem(`aminy-conversation-${conversationId}`);
      if (savedConversation) {
        const parsed = JSON.parse(savedConversation);
        setMessages(parsed.messages || []);
        setConversationTitle(parsed.title || '');
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
        localStorage.setItem(`aminy-conversation-${conversationId}`, JSON.stringify(conversationData));
      } catch (error) {
      }
    }
  }, [messages, conversationTitle, conversationId]);

  // Generate time-aware contextual suggestions
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const prompts = generatePrompts();
      const childName = userData.childName;

      // Get current time of day for contextual prompts
      const hour = new Date().getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';

      // Time-based contextual prompts
      const TIME_PROMPTS: Record<string, string[]> = {
        morning: [
          `Help with ${childName}'s morning routine`,
          'Getting ready for school without meltdowns',
          'Breakfast time strategies',
          'Morning transition tips'
        ],
        afternoon: [
          'After-school decompression help',
          `Supporting ${childName} with homework`,
          'Snack time and afternoon routines',
          'Managing post-school energy'
        ],
        evening: [
          `Help with ${childName}'s bedtime routine`,
          'Wind-down activities that work',
          'Dinner time strategies',
          'Evening transition tips'
        ],
        night: [
          'Sleep strategies that help',
          'Calming nighttime routines',
          'Processing today\'s challenges',
          'Planning for tomorrow'
        ]
      };

      // General always-relevant prompts
      const generalSuggestions = [
        `Managing ${childName}'s transitions`,
        'Communication strategies that work',
        'Supporting emotional regulation',
        'Dealing with a meltdown right now',
        'IEP goals and school support',
        'Sensory needs and accommodations'
      ];

      // Get time-based prompts
      const timePrompts = TIME_PROMPTS[timeOfDay];

      // Combine time-based (priority) with general
      const contextualPrompts = prompts.slice(0, 1).map(p => p.prompt);
      const finalSuggestions = [
        ...timePrompts.slice(0, 2), // 2 time-based prompts
        ...contextualPrompts, // 1 context-engine prompt
        ...generalSuggestions.filter(s =>
          !timePrompts.some(tp => tp.includes(s.split(' ')[2]))
        ).slice(0, 1) // 1 general prompt
      ].slice(0, 4);

      setContextualSuggestions(finalSuggestions);
    }
  }, [isOpen, messages.length, generatePrompts, userData.childName]);

  // Auto-resize textarea
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Scroll to bottom on new messages
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
    setStreamingText(''); // Reset streaming text

    track('ask_aminy_message_sent', {
      messageLength: messageContent.length,
      messageCount: messages.length + 1,
      userTier,
      hasContext: messages.length > 0
    });

    try {
      // Add placeholder AI message for streaming
      const aiMsgId = `msg-${Date.now() + 1}`;
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        contextUsed: false,
        confidence: 0,
        tokens: 0
      };

      setMessages(prev => [...prev, aiMsg]);
      setStreamingMessageId(aiMsgId);
      setIsStreaming(true);

      const result = await generateEnhancedResponse(messageContent, messages.slice(0, -1)); // Exclude the just-added user message

      if (result) {
        const { response, contextUsed, suggestions, confidence, tokens, crisisDetected } = result;

        // Update the AI message with final content
        setMessages(prev => prev.map(msg =>
          msg.id === aiMsgId
            ? {
                ...msg,
                content: response,
                isStreaming: false,
                contextUsed,
                confidence,
                tokens,
                suggestions,
                isCrisisResponse: crisisDetected,
              }
            : msg
        ));

        track('ask_aminy_response_generated', {
          responseLength: response.length,
          contextUsed,
          suggestionsCount: suggestions?.length || 0,
          confidence,
          userTier,
          crisisDetected,
          usingRealAI: true,
        });
      }

    } catch (error: unknown) {
      console.error('Error generating response:', error);
      toast.error('Sorry, I encountered an issue. Please try again.');

      // Update the streaming message with error
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMessageId
          ? {
              ...msg,
              content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
              isStreaming: false,
            }
          : msg
      ));
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
      setStreamingText('');
    }
  };

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
      localStorage.removeItem(`aminy-conversation-${conversationId}`);
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
              (isStreaming || isTyping) && "animate-pulse from-accent/30 to-accent/20"
            )}>
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#1B2733] dark:text-gray-100">Aminy</h3>
                <Badge className="bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 border-violet-200 text-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Powered by AI
                </Badge>
                {(isStreaming || isTyping) && (
                  <Badge variant="secondary" className="text-sm animate-pulse">
                    <Brain className="w-3 h-3 mr-1" />
                    {isTyping ? 'Thinking...' : 'Responding...'}
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
            {messages.length > 0 && !isMinimized && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearConversation}
                disabled={isTyping || isStreaming}
                className="w-8 h-8 p-0"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-8 h-8 p-0"
              aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Enhanced Messages Area */}
            <div className="flex-1 flex flex-col overflow-hidden" role="log" aria-label="Chat messages" aria-live="polite">
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 sm:space-y-4 sm:space-y-6 py-4">
                  {messages.length === 0 && showSuggestions && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-accent" />
                      </div>
                      <h4 className="text-lg font-semibold text-[#1B2733] dark:text-gray-100 mb-2">
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

                  {messages.map((message) => (
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
                            : "bg-[#F0EDE8] dark:bg-gray-800 text-[#1B2733] dark:text-gray-100 border border-[#E8E4DF] dark:border-gray-700"
                        )}>
                          {/* Enhanced Message Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm opacity-60",
                                message.role === 'user' ? "text-white/80" : "text-[#5A6B7A] dark:text-[#8A9BA8]"
                              )}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {message.contextUsed && message.role === 'assistant' && (
                                <Badge variant="secondary" className="text-sm bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border border-violet-200 animate-pulse-subtle">
                                  <Brain className="w-3 h-3 mr-1" />
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
                          
                          {/* Crisis Response Warning */}
                          {message.isCrisisResponse && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                                Support resources included
                              </span>
                            </div>
                          )}

                          {/* Aminy Remembers Callout - shows value of memory */}
                          {message.contextUsed && message.role === 'assistant' && !message.isStreaming && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                              <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              <span className="text-sm text-violet-700 dark:text-violet-300 font-medium">
                                Personalized based on what I know about {userData.childName}
                              </span>
                            </div>
                          )}

                          {/* Enhanced Message Content */}
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {/* Show streaming text in real-time for the currently streaming message */}
                            {message.isStreaming && message.id === streamingMessageId
                              ? (streamingText || 'Thinking...')
                              : message.content}
                            {message.isStreaming && (
                              <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                            )}
                          </div>

                          {/* Share Button - Only for assistant messages that aren't streaming */}
                          {message.role === 'assistant' && !message.isStreaming && (
                            <div className="mt-2 pt-2 border-t border-[#E8E4DF] dark:border-gray-700">
                              <ShareInsightInline
                                insight={message.content}
                                childName={userData.childName}
                                onShare={(platform) => {
                                  // Track share for analytics
                                  if (import.meta.env.DEV) console.log(`Shared insight via ${platform}`);
                                }}
                              />
                            </div>
                          )}

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
                      </div>
                    </div>
                  ))}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Enhanced Input Area */}
            <div className="border-t border-[#E8E4DF] dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="p-3 sm:p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Ask me anything about ${userData.childName}...`}
                      aria-label={`Message Aminy about ${userData.childName}`}
                      className="w-full resize-none rounded-xl border border-[#E8E4DF] dark:border-gray-700 bg-[#FAF7F2] dark:bg-gray-800 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 aminy-ai-input-field"
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                      disabled={isTyping || isStreaming || !canSendMessage}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-10 h-10 p-0 rounded-lg hover:bg-[#F0EDE8] dark:hover:bg-gray-800"
                      title="Attach file"
                      aria-label="Attach file"
                      disabled={isTyping || isStreaming}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping || isStreaming || !canSendMessage}
                      className={cn(
                        "w-10 h-10 p-0 rounded-lg bg-accent hover:bg-accent/90 text-white transition-all duration-200",
                        input.trim() && "shadow-lg hover:shadow-xl hover:scale-105"
                      )}
                      title="Send message"
                      aria-label={isTyping || isStreaming ? "AI is responding" : "Send message"}
                    >
                      {isTyping || isStreaming ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowUp className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Helper text / Reset timer */}
                {!canSendMessage ? (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Messages reset in {memoryManager.getTimeUntilReset().formatted}
                      </span>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      You've used your daily messages. Upgrade for unlimited chat!
                    </p>
                    <Button
                      onClick={onPaywallTrigger}
                      size="sm"
                      className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Upgrade Now
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-2 text-center aminy-ai-helper-text">
                    Ask about routines, behaviors, communication, school, or any concerns
                    {messagesRemaining !== Infinity && messagesRemaining < 10 && (
                      <span className="ml-1 text-amber-600">
                        ({messagesRemaining} messages left today)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}