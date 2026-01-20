import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAminyStore } from './store';

// Reset store before each test
beforeEach(() => {
  useAminyStore.getState().reset();
});

describe('Aminy Store', () => {
  describe('User Management', () => {
    it('sets user correctly', () => {
      const user = {
        id: 'test-user',
        caregiverName: 'Sarah',
        childName: 'Alex',
        childAge: 6,
        tier: 'core' as const,
        onboardingComplete: true,
        preferences: {
          notifications: true,
          proactiveNudges: true,
          voiceInput: false,
        },
      };

      useAminyStore.getState().setUser(user);
      expect(useAminyStore.getState().user).toEqual(user);
    });

    it('clears user when set to null', () => {
      const user = {
        id: 'test-user',
        caregiverName: 'Sarah',
        childName: 'Alex',
        tier: 'starter' as const,
        onboardingComplete: false,
        preferences: {
          notifications: true,
          proactiveNudges: true,
          voiceInput: false,
        },
      };

      useAminyStore.getState().setUser(user);
      useAminyStore.getState().setUser(null);
      expect(useAminyStore.getState().user).toBeNull();
    });

    it('updates user preferences correctly', () => {
      const user = {
        id: 'test-user',
        caregiverName: 'Sarah',
        childName: 'Alex',
        tier: 'core' as const,
        onboardingComplete: true,
        preferences: {
          notifications: true,
          proactiveNudges: true,
          voiceInput: false,
        },
      };

      useAminyStore.getState().setUser(user);
      useAminyStore.getState().updateUserPreferences({ voiceInput: true });

      expect(useAminyStore.getState().user?.preferences.voiceInput).toBe(true);
      expect(useAminyStore.getState().user?.preferences.notifications).toBe(true);
    });
  });

  describe('Goal Management', () => {
    it('adds a goal with generated id and timestamp', () => {
      useAminyStore.getState().addGoal({
        title: 'Improve morning routines',
        description: 'Create visual schedule',
        level: 'month',
        status: 'active',
      });

      const goals = useAminyStore.getState().goals;
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toBe('Improve morning routines');
      expect(goals[0].id).toMatch(/^goal-/);
      expect(goals[0].createdAt).toBeDefined();
    });

    it('updates an existing goal', () => {
      useAminyStore.getState().addGoal({
        title: 'Test Goal',
        level: 'week',
        status: 'active',
      });

      const goalId = useAminyStore.getState().goals[0].id;
      useAminyStore.getState().updateGoal(goalId, { status: 'completed' });

      expect(useAminyStore.getState().goals[0].status).toBe('completed');
    });

    it('deletes a goal', () => {
      useAminyStore.getState().addGoal({
        title: 'Goal to delete',
        level: 'today',
        status: 'active',
      });

      const goalId = useAminyStore.getState().goals[0].id;
      useAminyStore.getState().deleteGoal(goalId);

      expect(useAminyStore.getState().goals).toHaveLength(0);
    });
  });

  describe('Task Management', () => {
    it('adds a task with generated id and timestamp', () => {
      useAminyStore.getState().addTask({
        title: 'Practice deep breathing',
        priority: 1,
        skillType: 'sensory',
      });

      const tasks = useAminyStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Practice deep breathing');
      expect(tasks[0].id).toMatch(/^task-/);
      expect(tasks[0].completed).toBe(false);
    });

    it('sets first task as focus task', () => {
      useAminyStore.getState().addTask({
        title: 'First task',
        priority: 1,
      });

      expect(useAminyStore.getState().focusTask?.title).toBe('First task');
    });

    it('completes a task and adds a win', () => {
      useAminyStore.getState().addTask({
        title: 'Complete me',
        priority: 1,
      });

      const taskId = useAminyStore.getState().tasks[0].id;
      useAminyStore.getState().completeTask(taskId);

      const tasks = useAminyStore.getState().tasks;
      const wins = useAminyStore.getState().wins;

      expect(tasks[0].completed).toBe(true);
      expect(tasks[0].completedAt).toBeDefined();
      expect(wins.totalWins).toBe(1);
      expect(wins.weeklyWins).toBe(1);
      expect(wins.recentWins).toHaveLength(1);
      expect(wins.recentWins[0].title).toBe('Complete me');
    });

    it('moves focus to next task after completion', () => {
      useAminyStore.getState().addTask({
        title: 'Task 1',
        priority: 1,
      });
      useAminyStore.getState().addTask({
        title: 'Task 2',
        priority: 2,
      });

      const taskId = useAminyStore.getState().tasks[0].id;
      useAminyStore.getState().completeTask(taskId);

      expect(useAminyStore.getState().focusTask?.title).toBe('Task 2');
    });
  });

  describe('Streak Management', () => {
    it('increments streak correctly', () => {
      expect(useAminyStore.getState().streaks.current).toBe(0);

      useAminyStore.getState().incrementStreak();
      expect(useAminyStore.getState().streaks.current).toBe(1);
      expect(useAminyStore.getState().streaks.longest).toBe(1);

      useAminyStore.getState().incrementStreak();
      expect(useAminyStore.getState().streaks.current).toBe(2);
      expect(useAminyStore.getState().streaks.longest).toBe(2);
    });

    it('updates streak data', () => {
      useAminyStore.getState().updateStreak({
        current: 5,
        isPaused: true,
        pauseReason: 'vacation',
      });

      const streaks = useAminyStore.getState().streaks;
      expect(streaks.current).toBe(5);
      expect(streaks.isPaused).toBe(true);
      expect(streaks.pauseReason).toBe('vacation');
    });

    it('updates longest streak when current exceeds it', () => {
      useAminyStore.getState().updateStreak({ longest: 3 });

      // Increment 4 times to exceed longest
      for (let i = 0; i < 4; i++) {
        useAminyStore.getState().incrementStreak();
      }

      expect(useAminyStore.getState().streaks.longest).toBe(4);
    });
  });

  describe('Wins Management', () => {
    it('adds a win correctly', () => {
      useAminyStore.getState().addWin({
        title: 'First calm morning',
        source: 'manual',
      });

      const wins = useAminyStore.getState().wins;
      expect(wins.totalWins).toBe(1);
      expect(wins.weeklyWins).toBe(1);
      expect(wins.recentWins[0].title).toBe('First calm morning');
      expect(wins.recentWins[0].source).toBe('manual');
    });

    it('limits recent wins to 10', () => {
      for (let i = 0; i < 15; i++) {
        useAminyStore.getState().addWin({
          title: `Win ${i}`,
          source: 'manual',
        });
      }

      expect(useAminyStore.getState().wins.recentWins).toHaveLength(10);
      expect(useAminyStore.getState().wins.totalWins).toBe(15);
    });
  });

  describe('Coverage Management', () => {
    it('updates coverage status', () => {
      useAminyStore.getState().updateCoverage({
        status: 'verified',
        provider: 'Aetna',
        lastChecked: new Date().toISOString(),
      });

      const coverage = useAminyStore.getState().coverage;
      expect(coverage.status).toBe('verified');
      expect(coverage.provider).toBe('Aetna');
    });
  });

  describe('Session Management', () => {
    it('adds a session', () => {
      useAminyStore.getState().addSession({
        type: 'telehealth',
        scheduledAt: '2024-01-15T10:00:00Z',
        duration: 60,
        status: 'scheduled',
      });

      const sessions = useAminyStore.getState().sessions;
      expect(sessions).toHaveLength(1);
      expect(sessions[0].type).toBe('telehealth');
      expect(sessions[0].id).toBeDefined();
    });

    it('updates session status', () => {
      useAminyStore.getState().addSession({
        type: 'jr',
        scheduledAt: '2024-01-15T10:00:00Z',
        duration: 30,
        status: 'scheduled',
      });

      const sessionId = useAminyStore.getState().sessions[0].id;
      useAminyStore.getState().updateSession(sessionId, {
        status: 'completed',
        summary: 'Great session!',
      });

      const session = useAminyStore.getState().sessions[0];
      expect(session.status).toBe('completed');
      expect(session.summary).toBe('Great session!');
    });
  });

  describe('UI State', () => {
    it('sets active tab', () => {
      useAminyStore.getState().setActiveTab('care');
      expect(useAminyStore.getState().activeTab).toBe('care');
    });

    it('toggles unload mind modal', () => {
      expect(useAminyStore.getState().showUnloadMindModal).toBe(false);

      useAminyStore.getState().setShowUnloadMindModal(true);
      expect(useAminyStore.getState().showUnloadMindModal).toBe(true);
    });
  });

  describe('Reset', () => {
    it('resets all state to initial values', () => {
      // Add some data
      useAminyStore.getState().setUser({
        id: 'test',
        caregiverName: 'Test',
        childName: 'Child',
        tier: 'core',
        onboardingComplete: true,
        preferences: { notifications: true, proactiveNudges: true, voiceInput: true },
      });
      useAminyStore.getState().addGoal({ title: 'Goal', level: 'week', status: 'active' });
      useAminyStore.getState().addTask({ title: 'Task', priority: 1 });
      useAminyStore.getState().incrementStreak();

      // Reset
      useAminyStore.getState().reset();

      // Verify reset
      expect(useAminyStore.getState().user).toBeNull();
      expect(useAminyStore.getState().goals).toHaveLength(0);
      expect(useAminyStore.getState().tasks).toHaveLength(0);
      expect(useAminyStore.getState().streaks.current).toBe(0);
    });
  });
});
