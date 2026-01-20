/**
 * AI Context Provider
 * Provides AI state and configuration throughout the app
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChildProfile {
  name: string;
  age?: number;
  neuroType: string;
}

interface Goal {
  id: string;
  title: string;
  createdAt: string;
}

interface AIContextValue {
  parentStress: number;
  childProfile: ChildProfile;
  currentGoals: Goal[];
  updateParentStress: (stress: number) => void;
  updateChildProfile: (updates: Partial<ChildProfile>) => void;
  addGoal: (goal: Goal) => void;
  removeGoal: (goalId: string) => void;
  // Legacy state for compatibility
  state: {
    isProcessing: boolean;
    lastResponse: string | null;
    error: string | null;
    conversationId: string | null;
  };
  setProcessing: (processing: boolean) => void;
  setResponse: (response: string | null) => void;
  setError: (error: string | null) => void;
  setConversationId: (id: string | null) => void;
  reset: () => void;
}

const defaultChildProfile: ChildProfile = {
  name: '',
  age: undefined,
  neuroType: '',
};

const AIContext = createContext<AIContextValue | undefined>(undefined);

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const [parentStress, setParentStress] = useState(5);
  const [childProfile, setChildProfile] = useState<ChildProfile>(defaultChildProfile);
  const [currentGoals, setCurrentGoals] = useState<Goal[]>([]);
  const [state, setState] = useState({
    isProcessing: false,
    lastResponse: null as string | null,
    error: null as string | null,
    conversationId: null as string | null,
  });

  const updateParentStress = useCallback((stress: number) => {
    setParentStress(Math.max(0, Math.min(10, stress)));
  }, []);

  const updateChildProfile = useCallback((updates: Partial<ChildProfile>) => {
    setChildProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const addGoal = useCallback((goal: Goal) => {
    setCurrentGoals(prev => [...prev, goal]);
  }, []);

  const removeGoal = useCallback((goalId: string) => {
    setCurrentGoals(prev => prev.filter(g => g.id !== goalId));
  }, []);

  const setProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }));
  }, []);

  const setResponse = useCallback((lastResponse: string | null) => {
    setState(prev => ({ ...prev, lastResponse }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setConversationId = useCallback((conversationId: string | null) => {
    setState(prev => ({ ...prev, conversationId }));
  }, []);

  const reset = useCallback(() => {
    setParentStress(5);
    setChildProfile(defaultChildProfile);
    setCurrentGoals([]);
    setState({
      isProcessing: false,
      lastResponse: null,
      error: null,
      conversationId: null,
    });
  }, []);

  const value: AIContextValue = {
    parentStress,
    childProfile,
    currentGoals,
    updateParentStress,
    updateChildProfile,
    addGoal,
    removeGoal,
    state,
    setProcessing,
    setResponse,
    setError,
    setConversationId,
    reset,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI(): AIContextValue {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

// Alias for compatibility
export const useAIContext = useAI;

export default AIContext;
