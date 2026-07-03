import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// getNotificationPrefs is the single gate the engines consult. Mock it so we
// can flip each toggle and assert the engine respects it.
// ---------------------------------------------------------------------------
const getNotificationPrefs = vi.fn();
vi.mock('../../lib/notification-prefs', () => ({
  getNotificationPrefs: (...a: unknown[]) => getNotificationPrefs(...a),
}));

// --- deps pulled in by proactive-nudges ------------------------------------
vi.mock('../../lib/content', () => ({
  CONTENT: {
    NUDGES: {
      BEDTIME: '',
      STREAK_CELEBRATION: () => '',
      EVENING_CHECK: '',
      WEEKLY_REFLECTION: '',
    },
  },
}));

const setActiveTab = vi.fn();
vi.mock('../../lib/store', () => ({
  useAminyStore: {
    getState: () => ({
      streaks: { current: 0, lastActivityDate: null },
      tasks: [],
      sessions: [],
      knowledgeGraph: { patterns: [] },
      setActiveTab,
      setShowUnloadMindModal: vi.fn(),
    }),
  },
}));

vi.mock('../../lib/caregiver-workflow', () => ({
  getLatestCaregiverSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}));

import { proactiveNudges } from '../../lib/proactive-nudges';
import { setupDailyCheckIns } from '../../lib/push-notifications';

// checkConditions is private; reach it directly so the assertion is awaitable.
const runCheck = () =>
  (proactiveNudges as unknown as { checkConditions: () => Promise<void> }).checkConditions();
const seed = (nudges: unknown[]) => {
  (proactiveNudges as unknown as { activeNudges: unknown[] }).activeNudges = nudges;
};

describe('proactive-nudges respects proactive_nudges toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears queued nudges and stops when proactive_nudges is OFF', async () => {
    getNotificationPrefs.mockResolvedValue({
      proactive_nudges: false,
      weekly_briefing: true,
      daily_tips: true,
    });
    seed([{ id: 'x', type: 'suggestion', priority: 'low', message: 'm', dismissible: true }]);

    await runCheck();

    expect(proactiveNudges.getAllNudges()).toHaveLength(0);
  });

  it('keeps generating nudges when proactive_nudges is ON', async () => {
    getNotificationPrefs.mockResolvedValue({
      proactive_nudges: true,
      weekly_briefing: false,
      daily_tips: true,
    });
    const future = new Date(Date.now() + 60 * 60 * 1000);
    seed([{ id: 'keep', type: 'suggestion', priority: 'low', message: 'm', dismissible: true, expiresAt: future }]);

    await runCheck();

    expect(proactiveNudges.getAllNudges().some((n) => n.id === 'keep')).toBe(true);
  });
});

describe('push-notifications respects daily_tips toggle', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ notificationId: 'n' }) });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('does NOT schedule check-ins when daily_tips is OFF', async () => {
    getNotificationPrefs.mockResolvedValue({
      daily_tips: false,
      weekly_briefing: true,
      proactive_nudges: true,
    });

    await setupDailyCheckIns('u1', 'Kid');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('schedules check-ins when daily_tips is ON', async () => {
    getNotificationPrefs.mockResolvedValue({
      daily_tips: true,
      weekly_briefing: true,
      proactive_nudges: true,
    });

    await setupDailyCheckIns('u1', 'Kid');

    expect(fetchMock).toHaveBeenCalledTimes(7);
  });
});
