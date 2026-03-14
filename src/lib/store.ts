/**
 * Global State Management with Zustand
 * Centralized state for user data, goals, streaks, and app state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureZustandStorage } from '../hooks/useSecureStorage';
import {
  saveStreak,
  syncStreakFromCloud,
} from './streak-service';
import { requestNotificationPermission, subscribeToPush } from './push-notifications';

// ============================================================================
// TYPES
// ============================================================================

export interface Goal {
  id: string;
  title: string;
  description?: string;
  level: 'vision' | 'year' | 'quarter' | 'month' | 'week' | 'today';
  status: 'active' | 'completed' | 'declined' | 'pending';
  createdAt: string;
  completedAt?: string;
  aiSuggested?: boolean;
  parentGoalId?: string;
  progress?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  timeEstimate?: string;
  skillType?: 'speech' | 'social' | 'sensory' | 'routine' | 'behavior';
  priority: number;
  completed: boolean;
  completedAt?: string;
  whyItHelps?: string;
  goalId?: string;
  createdAt: string;
}

export interface StreakData {
  current: number;
  longest: number;
  lastActivityDate?: string;
  isPaused: boolean;
  pauseReason?: string;
}

export interface WinsData {
  weeklyWins: number;
  totalWins: number;
  recentWins: Array<{
    id: string;
    title: string;
    date: string;
    source: 'task' | 'jr' | 'manual';
  }>;
}

export interface CoverageStatus {
  provider?: string;
  status: 'unknown' | 'verified' | 'pending' | 'denied';
  lastChecked?: string;
  summaryGenerated?: boolean;
  documentsUploaded: string[];
}

/** Pattern detected by the AI knowledge graph */
export interface KnowledgePattern {
  type: string;
  data: Record<string, unknown>;
  detectedAt: string;
}

/** Child profile used by the AI brain for context building */
export interface AIChildProfile {
  id: string;
  name: string;
  age?: number;
  neuroType?: string;
  diagnoses?: string[];
  [key: string]: unknown;
}

/** A document stored in the vault */
export interface VaultDocument {
  id: string;
  title: string;
  type: string;
  date: string;
  summary?: string;
  keyInsights?: string[];
}

/** Vault data structure used by the AI brain */
export interface VaultData {
  evaluations?: VaultDocument[];
  ieps?: VaultDocument[];
  progressReports?: VaultDocument[];
  bcbaNotes?: VaultDocument[];
  insurance?: VaultDocument[];
  medical?: VaultDocument[];
}

/** Weekly plan data used by the AI brain */
export interface WeeklyPlanData {
  todayActivities?: unknown[];
  completedActivities?: unknown[];
  challenges?: unknown[];
  [key: string]: unknown;
}

/** Conversation history entry */
export interface ConversationHistoryEntry {
  role: string;
  content: string;
  timestamp?: number;
  [key: string]: unknown;
}

/** Junior mode session data */
export interface JuniorModeData {
  sessions?: unknown[];
  skillsPracticed?: unknown[];
  emotions?: unknown[];
  communicationAttempts?: number;
  successfulInteractions?: number;
  [key: string]: unknown;
}

export interface Session {
  id: string;
  type: 'telehealth' | 'jr' | 'live-vision';
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  summary?: string;
}

export interface UserProfile {
  id: string;
  caregiverName: string;
  childName: string;
  childAge?: number;
  tier: 'starter' | 'core' | 'complete';
  onboardingComplete: boolean;
  preferences: {
    timezone?: string;
    notifications: boolean;
    proactiveNudges: boolean;
    voiceInput: boolean;
  };
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AminyStore {
  // User & Profile
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  updateUserPreferences: (preferences: Partial<UserProfile['preferences']>) => void;
  
  // Goals & Tasks
  goals: Goal[];
  tasks: Task[];
  focusTask: Task | null;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (id: string) => void;
  setFocusTask: (task: Task | null) => void;
  
  // Streaks & Wins
  streaks: StreakData;
  wins: WinsData;
  updateStreak: (updates: Partial<StreakData>) => void;
  incrementStreak: () => void;
  addWin: (win: Omit<WinsData['recentWins'][0], 'id' | 'date'>) => void;
  
  // Coverage
  coverage: CoverageStatus;
  updateCoverage: (updates: Partial<CoverageStatus>) => void;
  
  // Sessions
  sessions: Session[];
  addSession: (session: Omit<Session, 'id'>) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  
  // UI State (not persisted)
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showUnloadMindModal: boolean;
  setShowUnloadMindModal: (show: boolean) => void;
  
  // Knowledge Graph (for AI personalization)
  knowledgeGraph: {
    patterns: KnowledgePattern[];
    preferences: Record<string, unknown>;
  };
  addPattern: (type: string, data: Record<string, unknown>) => void;
  updatePreference: (key: string, value: unknown) => void;

  // AI Brain compatibility (accessed by aminy-ai-brain.ts)
  currentChildId?: string;
  children?: AIChildProfile[];
  concerns?: string[];
  parentName?: string;
  selectedTier?: string;
  vault?: VaultData;
  weeklyPlan?: WeeklyPlanData;
  conversationHistory?: ConversationHistoryEntry[];
  juniorModeData?: JuniorModeData;

  // Reset
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  user: null,
  goals: [],
  tasks: [],
  focusTask: null,
  streaks: {
    current: 0,
    longest: 0,
    isPaused: false,
  },
  wins: {
    weeklyWins: 0,
    totalWins: 0,
    recentWins: [],
  },
  coverage: {
    status: 'unknown' as const,
    documentsUploaded: [],
  },
  sessions: [],
  activeTab: 'home',
  showUnloadMindModal: false,
  knowledgeGraph: {
    patterns: [],
    preferences: {},
  },
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAminyStore = create<AminyStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // User & Profile
      setUser: (user) => set({ user }),
      
      updateUserPreferences: (preferences) => set((state) => ({
        user: state.user ? {
          ...state.user,
          preferences: { ...state.user.preferences, ...preferences },
        } : null,
      })),
      
      // Goals
      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, {
          ...goal,
          id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        }],
      })),
      
      updateGoal: (id, updates) => set((state) => ({
        goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g),
      })),
      
      deleteGoal: (id) => set((state) => ({
        goals: state.goals.filter(g => g.id !== id),
      })),
      
      // Tasks
      addTask: (task) => set((state) => {
        const newTask = {
          ...task,
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          completed: false,
        };
        
        // Set as focus task if it's the first one or highest priority
        const shouldBeFocus = !state.focusTask || task.priority === 1;
        
        return {
          tasks: [...state.tasks, newTask],
          focusTask: shouldBeFocus ? newTask : state.focusTask,
        };
      }),
      
      updateTask: (id, updates) => set((state) => {
        const updatedTasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        const updatedFocusTask = state.focusTask?.id === id 
          ? { ...state.focusTask, ...updates }
          : state.focusTask;
        
        return {
          tasks: updatedTasks,
          focusTask: updatedFocusTask,
        };
      }),
      
      completeTask: (id) => set((state) => {
        const now = new Date().toISOString();
        const task = state.tasks.find(t => t.id === id);
        
        if (!task) return state;
        
        // Update task
        const updatedTasks = state.tasks.map(t => 
          t.id === id ? { ...t, completed: true, completedAt: now } : t
        );
        
        // Add win
        const newWin = {
          id: `win-${Date.now()}`,
          title: task.title,
          date: now,
          source: 'task' as const,
        };
        
        // Find next focus task
        const remainingTasks = updatedTasks
          .filter(t => !t.completed)
          .sort((a, b) => a.priority - b.priority);
        
        return {
          tasks: updatedTasks,
          focusTask: remainingTasks[0] || null,
          wins: {
            ...state.wins,
            weeklyWins: state.wins.weeklyWins + 1,
            totalWins: state.wins.totalWins + 1,
            recentWins: [newWin, ...state.wins.recentWins].slice(0, 10),
          },
        };
      }),
      
      setFocusTask: (task) => set({ focusTask: task }),
      
      // Streaks
      updateStreak: (updates) => {
        set((state) => ({
          streaks: { ...state.streaks, ...updates },
        }));
        // Sync to Supabase in background
        const user = get().user;
        if (user?.id) {
          const streaks = get().streaks;
          saveStreak({
            userId: user.id,
            currentStreak: streaks.current,
            longestStreak: streaks.longest,
            lastActivityDate: streaks.lastActivityDate || null,
            isPaused: streaks.isPaused,
            pauseReason: streaks.pauseReason,
          });
        }
      },

      incrementStreak: () => {
        const user = get().user;
        const state = get();
        const newCurrent = state.streaks.current + 1;
        const newStreaks = {
          ...state.streaks,
          current: newCurrent,
          longest: Math.max(newCurrent, state.streaks.longest),
          lastActivityDate: new Date().toISOString(),
        };

        set({ streaks: newStreaks });

        // Sync to Supabase in background
        if (user?.id) {
          saveStreak({
            userId: user.id,
            currentStreak: newStreaks.current,
            longestStreak: newStreaks.longest,
            lastActivityDate: newStreaks.lastActivityDate || null,
            isPaused: newStreaks.isPaused,
            pauseReason: newStreaks.pauseReason,
          });
        }
      },
      
      // Wins
      addWin: (win) => set((state) => {
        const newWin = {
          ...win,
          id: `win-${Date.now()}`,
          date: new Date().toISOString(),
        };
        
        return {
          wins: {
            weeklyWins: state.wins.weeklyWins + 1,
            totalWins: state.wins.totalWins + 1,
            recentWins: [newWin, ...state.wins.recentWins].slice(0, 10),
          },
        };
      }),
      
      // Coverage
      updateCoverage: (updates) => set((state) => ({
        coverage: { ...state.coverage, ...updates },
      })),
      
      // Sessions
      addSession: (session) => set((state) => ({
        sessions: [...state.sessions, {
          ...session,
          id: `session-${Date.now()}`,
        }],
      })),
      
      updateSession: (id, updates) => set((state) => ({
        sessions: state.sessions.map(s => s.id === id ? { ...s, ...updates } : s),
      })),
      
      // UI State
      setActiveTab: (tab) => set({ activeTab: tab }),
      setShowUnloadMindModal: (show) => set({ showUnloadMindModal: show }),
      
      // Knowledge Graph
      addPattern: (type, data) => set((state) => ({
        knowledgeGraph: {
          ...state.knowledgeGraph,
          patterns: [
            ...state.knowledgeGraph.patterns,
            { type, data, detectedAt: new Date().toISOString() },
          ].slice(-100), // Keep last 100 patterns
        },
      })),
      
      updatePreference: (key, value) => set((state) => ({
        knowledgeGraph: {
          ...state.knowledgeGraph,
          preferences: {
            ...state.knowledgeGraph.preferences,
            [key]: value,
          },
        },
      })),
      
      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'aminy-store',
      storage: createJSONStorage(() => secureZustandStorage),
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        goals: state.goals,
        tasks: state.tasks,
        focusTask: state.focusTask,
        streaks: state.streaks,
        wins: state.wins,
        coverage: state.coverage,
        sessions: state.sessions,
        knowledgeGraph: state.knowledgeGraph,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

// Store instance alias for non-React access (getState/setState)
export const store = useAminyStore;

export const selectors = {
  // Get active goals by level
  getGoalsByLevel: (level: Goal['level']) => (state: AminyStore) => 
    state.goals.filter(g => g.level === level && g.status === 'active'),
  
  // Get pending AI suggestions
  getPendingSuggestions: () => (state: AminyStore) =>
    state.goals.filter(g => g.status === 'pending' && g.aiSuggested),
  
  // Get today's tasks
  getTodaysTasks: () => (state: AminyStore) =>
    state.tasks.filter(t => !t.completed).sort((a, b) => a.priority - b.priority),
  
  // Get upcoming sessions
  getUpcomingSessions: () => (state: AminyStore) => {
    const now = new Date();
    return state.sessions
      .filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  },
  
  // Check if user has active tier
  hasActiveTier: (tier: 'core' | 'complete') => (state: AminyStore) => {
    if (!state.user) return false;
    if (tier === 'core') return state.user.tier === 'core' || state.user.tier === 'complete';
    return state.user.tier === 'complete';
  },
};

// ============================================================================
// ONBOARDING COMPLETION HANDLER
// ============================================================================

/**
 * Call this when onboarding completes to trigger retention/engagement flows
 */
export async function handleOnboardingComplete(
  userId: string,
  email: string,
  childName: string,
  parentName: string
): Promise<void> {
  // Import dynamically to avoid circular dependencies
  const { triggerOnboardingSequence, scheduleRetentionNotifications } = await import('./retention-engine');

  // Mark onboarding as complete in store
  const store = useAminyStore.getState();
  if (store.user) {
    store.setUser({
      ...store.user,
      onboardingComplete: true,
    });
  }

  try {
    // 1. Trigger email onboarding sequence (welcome email sent immediately)
    await triggerOnboardingSequence(userId, email, childName, parentName);

    // 2. Request push notification permission
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      // Subscribe to push and schedule all retention notifications
      await subscribeToPush(userId);
      await scheduleRetentionNotifications(userId, childName, '09:00'); // 9 AM default
    }

    if (import.meta.env.DEV) console.log('Onboarding complete: All retention flows activated');
  } catch (error) {
    console.error('Error setting up retention flows:', error);
    // Don't block onboarding completion on retention setup errors
  }
}

// ============================================================================
// STREAK SYNC
// ============================================================================

/**
 * Sync streaks from Supabase on app load
 * Call this after user authentication to restore streak from cloud
 */
export async function syncStreaksFromCloud(userId: string): Promise<void> {
  try {
    const store = useAminyStore.getState();

    const cloudStreak = await syncStreakFromCloud(userId, {
      current: store.streaks.current,
      longest: store.streaks.longest,
      lastActivityDate: store.streaks.lastActivityDate,
      isPaused: store.streaks.isPaused,
    });

    // Update local store with synced data
    store.updateStreak({
      current: cloudStreak.currentStreak,
      longest: cloudStreak.longestStreak,
      lastActivityDate: cloudStreak.lastActivityDate || undefined,
      isPaused: cloudStreak.isPaused,
      pauseReason: cloudStreak.pauseReason,
    });

    if (import.meta.env.DEV) console.log('[Store] Streaks synced from cloud');
  } catch (error) {
    console.error('[Store] Error syncing streaks:', error);
    // Keep local streaks on error
  }
}

// ============================================================================
// AI STATE STORE (Consolidates AIContext)
// ============================================================================

export interface ChildProfile {
  name: string;
  age?: number;
  neuroType: string;
}

export interface AIProcessingState {
  isProcessing: boolean;
  lastResponse: string | null;
  error: string | null;
  conversationId: string | null;
}

interface AIStoreState {
  parentStress: number;
  childProfile: ChildProfile;
  aiProcessing: AIProcessingState;

  // Actions
  updateParentStress: (stress: number) => void;
  updateChildProfile: (updates: Partial<ChildProfile>) => void;
  setAIProcessing: (processing: boolean) => void;
  setAIResponse: (response: string | null) => void;
  setAIError: (error: string | null) => void;
  setAIConversationId: (id: string | null) => void;
  resetAIState: () => void;
}

const initialAIState = {
  parentStress: 5,
  childProfile: { name: '', age: undefined, neuroType: '' },
  aiProcessing: {
    isProcessing: false,
    lastResponse: null,
    error: null,
    conversationId: null,
  },
};

export const useAIStore = create<AIStoreState>()((set) => ({
  ...initialAIState,

  updateParentStress: (stress) => set({
    parentStress: Math.max(0, Math.min(10, stress))
  }),

  updateChildProfile: (updates) => set((state) => ({
    childProfile: { ...state.childProfile, ...updates },
  })),

  setAIProcessing: (isProcessing) => set((state) => ({
    aiProcessing: { ...state.aiProcessing, isProcessing },
  })),

  setAIResponse: (lastResponse) => set((state) => ({
    aiProcessing: { ...state.aiProcessing, lastResponse },
  })),

  setAIError: (error) => set((state) => ({
    aiProcessing: { ...state.aiProcessing, error },
  })),

  setAIConversationId: (conversationId) => set((state) => ({
    aiProcessing: { ...state.aiProcessing, conversationId },
  })),

  resetAIState: () => set(initialAIState),
}));

// ============================================================================
// CONVERSATION STATE STORE (Consolidates ConversationContext)
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  // Extended fields for rich messages
  metadata?: {
    sources?: string[];
    confidence?: number;
    toolUsed?: string;
  };
}

interface ConversationStoreState {
  messages: Message[];
  isLoading: boolean;
  currentConversationId: string | null;

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setConversationId: (id: string | null) => void;
  loadConversation: (messages: Message[]) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
}

export const useConversationStore = create<ConversationStoreState>()((set) => ({
  messages: [],
  isLoading: false,
  currentConversationId: null,

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  clearMessages: () => set({ messages: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setConversationId: (currentConversationId) => set({ currentConversationId }),

  loadConversation: (messages) => set({ messages }),

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    ),
  })),

  removeMessage: (id) => set((state) => ({
    messages: state.messages.filter((m) => m.id !== id),
  })),
}));

// ============================================================================
// COMPATIBILITY HOOKS (For gradual migration from Context)
// ============================================================================

/**
 * Hook that provides AIContext-compatible interface using Zustand
 * Use this during migration, then switch to useAIStore directly
 */
export function useAICompatibility() {
  const store = useAIStore();
  const aminyStore = useAminyStore();

  return {
    parentStress: store.parentStress,
    childProfile: store.childProfile,
    currentGoals: aminyStore.goals.filter(g => g.status === 'active'),
    updateParentStress: store.updateParentStress,
    updateChildProfile: store.updateChildProfile,
    addGoal: aminyStore.addGoal,
    removeGoal: aminyStore.deleteGoal,
    state: store.aiProcessing,
    setProcessing: store.setAIProcessing,
    setResponse: store.setAIResponse,
    setError: store.setAIError,
    setConversationId: store.setAIConversationId,
    reset: store.resetAIState,
  };
}

/**
 * Hook that provides ConversationContext-compatible interface using Zustand
 * Use this during migration, then switch to useConversationStore directly
 */
export function useConversationCompatibility() {
  const store = useConversationStore();

  return {
    state: {
      messages: store.messages,
      isLoading: store.isLoading,
      currentConversationId: store.currentConversationId,
    },
    addMessage: store.addMessage,
    clearMessages: store.clearMessages,
    setLoading: store.setLoading,
    setConversationId: store.setConversationId,
    loadConversation: store.loadConversation,
  };
}
