/**
 * Global State Management with Zustand
 * Centralized state for user data, goals, streaks, and app state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
    patterns: Array<{ type: string; data: any; detectedAt: string }>;
    preferences: Record<string, any>;
  };
  addPattern: (type: string, data: any) => void;
  updatePreference: (key: string, value: any) => void;
  
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
      updateStreak: (updates) => set((state) => ({
        streaks: { ...state.streaks, ...updates },
      })),
      
      incrementStreak: () => set((state) => {
        const newCurrent = state.streaks.current + 1;
        return {
          streaks: {
            ...state.streaks,
            current: newCurrent,
            longest: Math.max(newCurrent, state.streaks.longest),
            lastActivityDate: new Date().toISOString(),
          },
        };
      }),
      
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
      storage: createJSONStorage(() => localStorage),
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
  const { requestNotificationPermission, subscribeToPush } = await import('./push-notifications');

  // Mark onboarding as complete in store
  const store = useAminyStore.getState();
  if (store.user) {
    store.setUser({
      ...store.user,
      onboardingComplete: true,
    });
  }

  try {
    // 1. Trigger email onboarding sequence
    await triggerOnboardingSequence(userId, email, childName);

    // 2. Request push notification permission
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      // Subscribe to push and schedule all retention notifications
      await subscribeToPush(userId);
      await scheduleRetentionNotifications(userId, childName, '09:00'); // 9 AM default
    }

    console.log('Onboarding complete: All retention flows activated');
  } catch (error) {
    console.error('Error setting up retention flows:', error);
    // Don't block onboarding completion on retention setup errors
  }
}
