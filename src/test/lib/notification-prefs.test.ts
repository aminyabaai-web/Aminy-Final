import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the supabase client used by notification-prefs
// ---------------------------------------------------------------------------
const maybeSingle = vi.fn();
const getUser = vi.fn();

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: (...a: unknown[]) => maybeSingle(...a),
        })),
      })),
    })),
  },
}));

import {
  getNotificationPrefs,
  setNotificationPrefsCache,
  invalidateNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
} from '../../lib/notification-prefs';

describe('notification-prefs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateNotificationPrefs();
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('reads columns from user_preferences', async () => {
    maybeSingle.mockResolvedValue({
      data: { weekly_briefing: false, daily_tips: true, proactive_nudges: false },
      error: null,
    });
    const prefs = await getNotificationPrefs();
    expect(prefs).toEqual({ weekly_briefing: false, daily_tips: true, proactive_nudges: false });
  });

  it('caches after first fetch (no second query)', async () => {
    maybeSingle.mockResolvedValue({
      data: { weekly_briefing: true, daily_tips: true, proactive_nudges: true },
      error: null,
    });
    await getNotificationPrefs();
    await getNotificationPrefs();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('fails open to enabled when there is no user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const prefs = await getNotificationPrefs();
    expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('fails open to enabled on query error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const prefs = await getNotificationPrefs();
    expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('fails open to enabled on thrown exception', async () => {
    getUser.mockRejectedValue(new Error('network'));
    const prefs = await getNotificationPrefs();
    expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('setNotificationPrefsCache overrides without a fetch', async () => {
    setNotificationPrefsCache({ proactive_nudges: false });
    const prefs = await getNotificationPrefs();
    expect(prefs.proactive_nudges).toBe(false);
    expect(prefs.daily_tips).toBe(true); // untouched keys keep default
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('invalidateNotificationPrefs forces a re-fetch', async () => {
    setNotificationPrefsCache({ daily_tips: false });
    invalidateNotificationPrefs();
    maybeSingle.mockResolvedValue({
      data: { weekly_briefing: true, daily_tips: true, proactive_nudges: true },
      error: null,
    });
    const prefs = await getNotificationPrefs();
    expect(prefs.daily_tips).toBe(true);
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });
});
