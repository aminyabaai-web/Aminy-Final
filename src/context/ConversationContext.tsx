/**
 * Conversation Context Provider
 * Manages conversation state and history throughout the app
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  currentConversationId: string | null;
}

interface ConversationContextValue {
  state: ConversationState;
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
};

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

interface ConversationProviderProps {
  children: ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [state, setState] = useState<ConversationState>(initialState);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
    }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setConversationId = useCallback((currentConversationId: string | null) => {
    setState(prev => ({ ...prev, currentConversationId }));
  }, []);

  const loadConversation = useCallback((messages: Message[]) => {
    setState(prev => ({ ...prev, messages }));
  }, []);

  const value: ConversationContextValue = {
    state,
    addMessage,
    clearMessages,
    setLoading,
    setConversationId,
    loadConversation,
  };

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
