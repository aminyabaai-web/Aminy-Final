/**
 * Conversation Context Provider
 * Manages conversation state and history throughout the app
 *
 * Provides methods for Dashboard10 and other components to interact with AI chat
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useRef } from 'react';
import { sendMessageToClaude, type ClaudeMessage } from '../lib/ai-engine/claude-client';
import { dataService } from '../lib/supabase-data';
import { supabase } from '../utils/supabase/client';
import {
  getRelevantMemories,
  storeMemoryFact,
  buildMemoryContextString,
  type MemoryCategory,
  type MemorySource,
} from '../lib/ai-engine/conversation-memory';
import { extractFactsFromMessage } from '../lib/fact-extraction';
import { memoryManager } from '../lib/memory-system';
import { incrementStreak } from '../lib/streak-service';
import { checkAndAwardBadges } from '../lib/badge-service';
import {
  setJuniorDifficultyFromParent,
  addJuniorAvoidanceTrigger,
  addJuniorRecommendation,
  type FocusDomain,
  type DifficultyLevel,
} from '../lib/parent-junior-bridge';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  imageAttachment?: {
    base64: string;
    analysisResult?: string;
    type: 'photo' | 'video_summary';
  };
}

interface Conversation {
  id: string;
  childId: string;
  title: string;
  createdAt: number;
}

interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  currentConversationId: string | null;
  childContext: string | null;
}

interface SendMessageOptions {
  childId?: string;
  childName?: string;
  childAge?: number;
}

interface ConversationContextValue {
  // State access (for backward compatibility)
  state: ConversationState;

  // Direct access to messages (used by Dashboard10)
  messages: Message[];

  // Current conversation info
  currentConversation: Conversation | null;

  // Core methods (new interface for Dashboard10)
  sendMessage: (role: 'parent' | 'user', content: string, options?: SendMessageOptions) => Promise<void>;
  createConversation: (childId: string, title?: string) => void;
  setChildContext: (childId: string) => void;

  // Legacy methods (for backward compatibility)
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setConversationId: (id: string | null) => void;
  loadConversation: (messages: Message[]) => void;
}

const initialState: ConversationState = {
  messages: [],
  isLoading: false,
  currentConversationId: null,
  childContext: null,
};

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

interface ConversationProviderProps {
  children: ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [state, setState] = useState<ConversationState>(initialState);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to track current messages without causing re-renders
  const messagesRef = useRef<Message[]>([]);

  // Generate unique message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Keep messagesRef in sync with state.messages
  messagesRef.current = state.messages;

  // Add a message to the conversation
  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateMessageId(),
      timestamp: Date.now(),
    };
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
    return newMessage;
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
    }));
  }, []);

  // Set loading state
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  // Set conversation ID
  const setConversationId = useCallback((currentConversationId: string | null) => {
    setState(prev => ({ ...prev, currentConversationId }));
  }, []);

  // Load existing conversation messages
  const loadConversation = useCallback((messages: Message[]) => {
    setState(prev => ({ ...prev, messages }));
  }, []);

  // Set child context for the conversation
  const setChildContext = useCallback((childId: string) => {
    setState(prev => ({ ...prev, childContext: childId }));
  }, []);

  // Create a new conversation (persists to Supabase if authenticated)
  const createConversation = useCallback((childId: string, title?: string) => {
    const localId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversationTitle = title || `Conversation about ${childId}`;
    const newConversation: Conversation = {
      id: localId,
      childId,
      title: conversationTitle,
      createdAt: Date.now(),
    };

    setCurrentConversation(newConversation);
    setState(prev => ({
      ...prev,
      currentConversationId: localId,
      childContext: childId,
      messages: [],
    }));

    // Persist to Supabase (non-blocking) — swap local ID for real UUID
    dataService.createConversation(conversationTitle, childId || undefined).then(dbConv => {
      if (dbConv) {
        setCurrentConversation(prev => prev ? { ...prev, id: dbConv.id } : prev);
        setState(prev => ({
          ...prev,
          currentConversationId: dbConv.id,
        }));
      }
    }).catch(() => { /* offline — local ID is fine */ });
  }, []);

  // Send a message and get AI response
  const sendMessage = useCallback(async (
    role: 'parent' | 'user',
    content: string,
    options?: SendMessageOptions
  ) => {
    if (!content.trim()) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message immediately
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));

    try {
      // Build conversation history for Claude using ref for stable reference
      const conversationHistory: ClaudeMessage[] = messagesRef.current.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // Add the new user message
      conversationHistory.push({
        role: 'user',
        content: content.trim(),
      });

      // Get authenticated user for memory operations
      let userId: string | null = null;
      let childId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
        childId = state.childContext || null;
      } catch { /* not authenticated — memory still works via localStorage */ }

      // ─── Fetch relevant memories for AI context ───────────────
      let memoryContext = '';
      if (userId && childId) {
        try {
          // Try Supabase first for cross-device memories
          const memories = await getRelevantMemories(userId, childId, undefined, undefined, 20);
          if (memories.length > 0) {
            memoryContext = buildMemoryContextString(memories);
          }
        } catch {
          // Supabase unavailable — fall back to localStorage
        }
      }

      // Fallback: use localStorage memory manager if no Supabase memories
      if (!memoryContext) {
        try {
          const localContext = memoryManager.generateAIContext(childId || 'default', 'free');
          if (localContext) memoryContext = localContext;
        } catch { /* localStorage unavailable */ }
      }

      // Build context from options + memory
      const context = {
        childName: options?.childName || 'your child',
        childAge: options?.childAge || 5,
        concerns: [] as string[],
        goals: [] as string[],
        diagnoses: [] as string[],
        communicationLevel: 'verbal',
        parentName: 'there',
        tier: 'free' as const,
        memoryContext: memoryContext || undefined,
      };

      // Persist user message to Supabase (non-blocking)
      const convId = state.currentConversationId;
      if (convId && !convId.startsWith('conv_')) {
        dataService.saveMessage(convId, 'user', content.trim()).catch(() => {});
      }

      // Call Claude API
      const response = await sendMessageToClaude(conversationHistory, context);

      // Add AI response
      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));

      // Persist assistant message to Supabase (non-blocking)
      if (convId && !convId.startsWith('conv_')) {
        dataService.saveMessage(convId, 'assistant', response).catch(() => {});
        dataService.incrementUsage().catch(() => {});
      }

      // ─── Streak & Badge tracking (non-blocking) ───
      if (userId) {
        incrementStreak(userId).catch(() => {});
        const msgCount = state.messages.filter(m => m.role === 'assistant').length + 1;
        checkAndAwardBadges(userId, 'conversation', msgCount).catch(() => {});
      }

      // ─── Extract facts from user message & store (non-blocking) ───
      // This is what builds the child's profile over time
      try {
        const extractedFacts = extractFactsFromMessage(content.trim(), 'conversation');
        if (extractedFacts.length > 0) {
          const cid = childId || 'default';

          // Store to localStorage immediately (fast, offline-safe)
          extractedFacts.forEach(fact => {
            memoryManager.addFact({
              childId: cid,
              category: fact.category,
              content: fact.content,
              source: fact.source as 'conversation' | 'onboarding' | 'vault' | 'provider' | 'manual',
              confidence: fact.confidence,
            });
          });

          // Store to Supabase (non-blocking, cross-device persistence)
          if (userId) {
            extractedFacts.forEach(fact => {
              storeMemoryFact(userId!, cid, {
                category: fact.category as MemoryCategory,
                content: fact.content,
                source: 'conversation',
                confidence: fact.confidence,
              }).catch(() => { /* Supabase offline — localStorage has it */ });
            });
          }

          if (import.meta.env.DEV) {
            console.log(`[Memory] Extracted ${extractedFacts.length} facts:`, extractedFacts.map(f => `${f.category}: ${f.content}`));
          }
        }
      } catch {
        // Fact extraction should never break the conversation flow
      }

      // ─── Parse AI response for Junior recommendations (non-blocking) ───
      try {
        const cid = childId || 'default';
        const responseText = response.toLowerCase();
        const domainKeywords: Record<string, FocusDomain> = {
          'speech': 'speech', 'articulation': 'speech', 'language': 'speech', 'phonology': 'speech',
          'social': 'social', 'peer': 'social', 'interaction': 'social', 'friendship': 'social',
          'regulation': 'regulation', 'emotion': 'regulation', 'calm': 'regulation', 'meltdown': 'regulation',
          'routine': 'routines', 'schedule': 'routines', 'transition': 'routines',
          'sensory': 'sensory', 'stimming': 'sensory', 'noise': 'sensory', 'texture': 'sensory',
          'executive': 'executive', 'planning': 'executive', 'organization': 'executive',
          'aac': 'aac', 'communication device': 'aac',
        };

        // Detect difficulty suggestions: "make X easier/harder" or "try harder/easier X"
        const difficultyPatterns = [
          /(?:recommend|suggest|try)\s+(?:making\s+)?(\w+)\s+(?:exercises?|activities?|practice)\s+(easier|harder)/gi,
          /(?:try|start with)\s+(easier|harder)\s+(\w+)\s+(?:exercises?|activities?|practice)/gi,
          /(\w+)\s+(?:exercises?|activities?)\s+(?:are|seem)\s+too\s+(easy|hard|difficult)/gi,
        ];

        for (const pattern of difficultyPatterns) {
          let match;
          while ((match = pattern.exec(responseText)) !== null) {
            const word1 = match[1]?.toLowerCase();
            const word2 = match[2]?.toLowerCase();
            const diffWord = ['easier', 'easy'].includes(word1) ? word1 : ['easier', 'easy'].includes(word2) ? word2 : word2;
            const domainWord = diffWord === word1 ? word2 : word1;
            const domain = domainKeywords[domainWord];
            if (domain) {
              const level: DifficultyLevel = ['easier', 'easy'].includes(diffWord) ? 'easier' : 'harder';
              setJuniorDifficultyFromParent(cid, domain, level, `AI suggestion from conversation`);
              addJuniorRecommendation(cid, { domain, suggestion: match[0], difficulty: level });
            }
          }
        }

        // Detect avoidance triggers: "avoid X activities" or "X overwhelms/triggers"
        const avoidancePatterns = [
          /(?:avoid|skip|remove|don't use)\s+(.+?)\s+(?:activities?|exercises?|tasks?)/gi,
          /(.+?)\s+(?:overwhelms?|triggers?|distresses?|upsets?)\s/gi,
          /(?:stay away from|cut out)\s+(.+?)(?:\s+for now|\s+activities?|\.)/gi,
        ];

        for (const pattern of avoidancePatterns) {
          let match;
          while ((match = pattern.exec(responseText)) !== null) {
            const trigger = match[1]?.trim();
            if (trigger && trigger.length > 2 && trigger.length < 50) {
              addJuniorAvoidanceTrigger(cid, trigger, 'ai');
            }
          }
        }
      } catch {
        // Junior recommendation parsing should never break conversation flow
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);

      // Add error message
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
      }));
    }
  }, []); // No dependencies - uses refs for stable access to messages

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<ConversationContextValue>(() => ({
    // State (backward compatibility)
    state,

    // Direct access for Dashboard10
    messages: state.messages,
    currentConversation,

    // New methods for Dashboard10
    sendMessage,
    createConversation,
    setChildContext,

    // Legacy methods
    addMessage,
    clearMessages,
    setLoading,
    setConversationId,
    loadConversation,
  }), [
    state,
    currentConversation,
    sendMessage,
    createConversation,
    setChildContext,
    addMessage,
    clearMessages,
    setLoading,
    setConversationId,
    loadConversation,
  ]);

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}

export default ConversationContext;
