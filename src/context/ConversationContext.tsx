/**
 * Conversation Context Provider
 * Manages conversation state and history throughout the app
 *
 * Provides methods for Dashboard10 and other components to interact with AI chat
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useRef } from 'react';
import { sendMessageToClaude, type ClaudeMessage } from '../lib/ai-engine/claude-client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
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

  // Generate unique message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  // Create a new conversation
  const createConversation = useCallback((childId: string, title?: string) => {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConversation: Conversation = {
      id: conversationId,
      childId,
      title: title || `Conversation about ${childId}`,
      createdAt: Date.now(),
    };

    setCurrentConversation(newConversation);
    setState(prev => ({
      ...prev,
      currentConversationId: conversationId,
      childContext: childId,
      messages: [], // Start fresh conversation
    }));
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
      // Build conversation history for Claude
      const conversationHistory: ClaudeMessage[] = state.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // Add the new user message
      conversationHistory.push({
        role: 'user',
        content: content.trim(),
      });

      // Build context from options
      const context = {
        childName: options?.childName || 'your child',
        childAge: options?.childAge || 5,
        concerns: [],
        goals: [],
        diagnoses: [],
        communicationLevel: 'verbal',
        parentName: 'there',
        tier: 'free' as const,
      };

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
  }, [state.messages]);

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
