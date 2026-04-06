// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Conversation Context Provider
 * Manages conversation state and history throughout the app
 *
 * Provides methods for Dashboard10 and other components to interact with AI chat
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useRef, useEffect } from 'react';
import { sendMessageToClaude, type ClaudeMessage } from '../lib/ai-engine/claude-client';
import { dataService } from '../lib/supabase-data';
import { supabase } from '../utils/supabase/client';
import { memoryManager } from '../lib/memory-system';
import { incrementStreak } from '../lib/streak-service';
import { checkAndAwardBadges } from '../lib/badge-service';
import {
  buildWorkflowMemoryContext,
  appendMessage as appendWorkflowMessage,
  resumeConversation as resumeWorkflowConversation,
  startConversation as startWorkflowConversation,
} from '../lib/caregiver-workflow';
import type { ConversationRecord } from '../lib/conversation-store';
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
  state: ConversationState;
  messages: Message[];
  currentConversation: Conversation | null;
  sendMessage: (role: 'parent' | 'user', content: string, options?: SendMessageOptions) => Promise<void>;
  createConversation: (childId: string, title?: string) => void;
  setChildContext: (childId: string) => void;
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

function toUiConversation(record: ConversationRecord, fallbackChildId?: string | null): Conversation {
  return {
    id: record.id,
    childId: record.childId || fallbackChildId || '',
    title: record.title,
    createdAt: new Date(record.createdAt).getTime(),
  };
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [state, setState] = useState<ConversationState>(initialState);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const currentConversationRef = useRef<Conversation | null>(null);

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateMessageId(),
      timestamp: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
    return newMessage;
  }, []);

  const clearMessages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
    }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  const setConversationId = useCallback((currentConversationId: string | null) => {
    setState((prev) => ({ ...prev, currentConversationId }));
  }, []);

  const loadConversation = useCallback((messages: Message[]) => {
    setState((prev) => ({ ...prev, messages }));
  }, []);

  const setChildContext = useCallback((childId: string) => {
    setState((prev) => ({ ...prev, childContext: childId }));
  }, []);

  const createConversation = useCallback((childId: string, title?: string) => {
    const placeholderId = `conv_local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const placeholder: Conversation = {
      id: placeholderId,
      childId,
      title: title || `Conversation about ${childId}`,
      createdAt: Date.now(),
    };

    setCurrentConversation(placeholder);
    setState((prev) => ({
      ...prev,
      currentConversationId: placeholderId,
      childContext: childId,
      messages: [],
    }));

    void (async () => {
      const authUserId = await supabase.auth.getUser()
        .then(({ data: { user } }) => user?.id || null)
        .catch(() => null);

      const conversation = authUserId
        ? await resumeWorkflowConversation({ childId, userId: authUserId }).catch(() => null)
          || await startWorkflowConversation({ childId, title: placeholder.title, userId: authUserId }).catch(() => null)
        : await startWorkflowConversation({ childId, title: placeholder.title }).catch(() => null);

      if (!conversation) {
        return;
      }

      const uiConversation = toUiConversation(conversation, childId);
      setCurrentConversation(uiConversation);
      setState((prev) => ({
        ...prev,
        currentConversationId: uiConversation.id,
        childContext: uiConversation.childId || childId,
      }));
    })().catch(() => {
      // Local placeholder remains usable until a later send retries creation.
    });
  }, []);

  const ensureConversation = useCallback(async (childId: string | null, childName?: string, userId?: string | null) => {
    const activeConversation = currentConversationRef.current;
    const stableChildId = childId || state.childContext || null;
    if (activeConversation && !activeConversation.id.startsWith('conv_local_')) {
      return activeConversation;
    }

    if (userId) {
      const resumedConversation = await resumeWorkflowConversation({
        childId: stableChildId || undefined,
        userId,
      }).catch(() => null);

      if (resumedConversation) {
        const uiConversation = toUiConversation(resumedConversation, stableChildId);
        setCurrentConversation(uiConversation);
        setState((prev) => ({
          ...prev,
          currentConversationId: uiConversation.id,
          childContext: uiConversation.childId || stableChildId,
        }));
        return uiConversation;
      }
    }

    const conversation = await startWorkflowConversation({
      childId: stableChildId || undefined,
      title: childName ? `Chat about ${childName}` : 'New Conversation',
      userId: userId || undefined,
    });
    const uiConversation = toUiConversation(conversation, stableChildId);
    setCurrentConversation(uiConversation);
    setState((prev) => ({
      ...prev,
      currentConversationId: uiConversation.id,
      childContext: uiConversation.childId || stableChildId,
    }));
    return uiConversation;
  }, [state.childContext]);

  const sendMessage = useCallback(async (
    _role: 'parent' | 'user',
    content: string,
    options?: SendMessageOptions,
  ) => {
    if (!content.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));

    try {
      const conversationHistory: ClaudeMessage[] = messagesRef.current.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
      conversationHistory.push({ role: 'user', content: content.trim() });

      let userId: string | null = null;
      const childId = options?.childId || state.childContext || null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch {
        userId = null;
      }

      let memoryContext = '';
      if (userId && childId) {
        try {
          memoryContext = await buildWorkflowMemoryContext(userId, childId);
        } catch {
          memoryContext = '';
        }
      }

      if (!memoryContext) {
        try {
          const localContext = memoryManager.generateAIContext(childId || 'default', 'free');
          if (localContext) memoryContext = localContext;
        } catch {
          // localStorage unavailable
        }
      }

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

      const activeConversation = await ensureConversation(childId, options?.childName, userId);

      if (userId) {
        const persistenceResult = await appendWorkflowMessage({
          conversationId: activeConversation.id,
          role: 'user',
          content: content.trim(),
          userId,
          childId: activeConversation.childId,
        }).catch(() => null);

        if (persistenceResult?.extractedFacts?.length) {
          persistenceResult.extractedFacts.forEach((fact) => {
            memoryManager.addFact({
              childId: activeConversation.childId || childId || 'default',
              category: fact.category,
              content: fact.content,
              source: fact.source as 'conversation' | 'onboarding' | 'vault' | 'provider' | 'manual',
              confidence: fact.confidence,
            });
          });
        }
      }

      const response = await sendMessageToClaude(conversationHistory, context);

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));

      if (userId) {
        await appendWorkflowMessage({
          conversationId: activeConversation.id,
          role: 'assistant',
          content: response,
          userId,
          childId: activeConversation.childId,
        }).catch(() => {});
        dataService.incrementUsage().catch(() => {});
      }

      if (userId) {
        incrementStreak(userId).catch(() => {});
        const msgCount = state.messages.filter((message) => message.role === 'assistant').length + 1;
        checkAndAwardBadges(userId, 'conversation', msgCount).catch(() => {});
      }

      try {
        const cid = activeConversation.childId || childId || 'default';
        const responseText = response.toLowerCase();
        const domainKeywords: Record<string, FocusDomain> = {
          speech: 'speech', articulation: 'speech', language: 'speech', phonology: 'speech',
          social: 'social', peer: 'social', interaction: 'social', friendship: 'social',
          regulation: 'regulation', emotion: 'regulation', calm: 'regulation', meltdown: 'regulation',
          routine: 'routines', schedule: 'routines', transition: 'routines',
          sensory: 'sensory', stimming: 'sensory', noise: 'sensory', texture: 'sensory',
          executive: 'executive', planning: 'executive', organization: 'executive',
          aac: 'aac',
          'communication device': 'aac',
        };

        const difficultyPatterns = [
          /(?:recommend|suggest|try)\s+(?:making\s+)?(\w+)\s+(?:exercises?|activities?|practice)\s+(easier|harder)/gi,
          /(?:try|start with)\s+(easier|harder)\s+(\w+)\s+(?:exercises?|activities?|practice)/gi,
          /(\w+)\s+(?:exercises?|activities?)\s+(?:are|seem)\s+too\s+(easy|hard|difficult)/gi,
        ];

        for (const pattern of difficultyPatterns) {
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(responseText)) !== null) {
            const word1 = match[1]?.toLowerCase();
            const word2 = match[2]?.toLowerCase();
            const diffWord = ['easier', 'easy'].includes(word1) ? word1 : ['easier', 'easy'].includes(word2) ? word2 : word2;
            const domainWord = diffWord === word1 ? word2 : word1;
            const domain = domainKeywords[domainWord];
            if (domain) {
              const level: DifficultyLevel = ['easier', 'easy'].includes(diffWord) ? 'easier' : 'harder';
              setJuniorDifficultyFromParent(cid, domain, level, 'AI suggestion from conversation');
              addJuniorRecommendation(cid, { domain, suggestion: match[0], difficulty: level });
            }
          }
        }

        const avoidancePatterns = [
          /(?:avoid|skip|remove|don't use)\s+(.+?)\s+(?:activities?|exercises?|tasks?)/gi,
          /(.+?)\s+(?:overwhelms?|triggers?|distresses?|upsets?)\s/gi,
          /(?:stay away from|cut out)\s+(.+?)(?:\s+for now|\s+activities?|\.)/gi,
        ];

        for (const pattern of avoidancePatterns) {
          let match: RegExpExecArray | null;
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

      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
      }));
    }
  }, [ensureConversation, state.childContext, state.messages]);

  const value = useMemo<ConversationContextValue>(() => ({
    state,
    messages: state.messages,
    currentConversation,
    sendMessage,
    createConversation,
    setChildContext,
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
