// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useSettingsData Hook
 * Loads user settings/preferences from Supabase with localStorage fallback.
 *
 * Tables: user_profiles, app_preferences, notification_preferences, privacy_settings
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  timeZone: string;
  profilePhotoUrl?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  communicationStyle: 'supportive' | 'direct' | 'playful';
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  fontSize: 'small' | 'medium' | 'large';
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface NotificationPreferences {
  emailDailySummary: boolean;
  emailWeeklyReport: boolean;
  emailGoalMilestones: boolean;
  emailSessionReminders: boolean;
  emailMessages: boolean;
  pushSessionReminders: boolean;
  pushMessages: boolean;
  pushUrgentAlerts: boolean;
  pushDailyTips: boolean;
  smsSessionReminders: boolean;
  smsUrgentAlerts: boolean;
  smsAppointmentConfirmations: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface PrivacySettings {
  allowModelTraining: boolean;
  shareAnonymizedData: boolean;
  localStorageOnly: boolean;
  enhancedPrivacyMode: boolean;
}

export interface SettingsData {
  profile: UserProfile | null;
  appPreferences: AppPreferences;
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_APP_PREFS: AppPreferences = {
  theme: 'system',
  language: 'en',
  communicationStyle: 'supportive',
  preferredTimeOfDay: 'morning',
  fontSize: 'medium',
  reduceMotion: false,
  highContrast: false,
};

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  emailDailySummary: true,
  emailWeeklyReport: true,
  emailGoalMilestones: true,
  emailSessionReminders: true,
  emailMessages: true,
  pushSessionReminders: true,
  pushMessages: true,
  pushUrgentAlerts: true,
  pushDailyTips: true,
  smsSessionReminders: true,
  smsUrgentAlerts: true,
  smsAppointmentConfirmations: true,
  quietHoursEnabled: true,
  quietHoursStart: '21:00',
  quietHoursEnd: '07:00',
};

const DEFAULT_PRIVACY: PrivacySettings = {
  allowModelTraining: false,
  shareAnonymizedData: false,
  localStorageOnly: false,
  enhancedPrivacyMode: false,
};

// ============================================================================
// Cache helpers
// ============================================================================

const CACHE_KEY = 'aminy-settings-cache';

function readCache(): Partial<SettingsData> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(data: Partial<SettingsData>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ============================================================================
// Row → type mappers
// ============================================================================

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    name: (row.name as string) || '',
    email: (row.email as string) || '',
    phone: row.phone as string | undefined,
    address: row.address as string | undefined,
    timeZone: (row.time_zone as string) || 'America/Los_Angeles',
    profilePhotoUrl: row.profile_photo_url as string | undefined,
    emailVerified: (row.email_verified as boolean) || false,
    twoFactorEnabled: (row.two_factor_enabled as boolean) || false,
  };
}

function mapAppPrefs(row: Record<string, unknown>): AppPreferences {
  return {
    theme: (row.theme as AppPreferences['theme']) || 'system',
    language: (row.language as string) || 'en',
    communicationStyle: (row.communication_style as AppPreferences['communicationStyle']) || 'supportive',
    preferredTimeOfDay: (row.preferred_time_of_day as AppPreferences['preferredTimeOfDay']) || 'morning',
    fontSize: (row.font_size as AppPreferences['fontSize']) || 'medium',
    reduceMotion: (row.reduce_motion as boolean) || false,
    highContrast: (row.high_contrast as boolean) || false,
  };
}

function mapNotifications(row: Record<string, unknown>): NotificationPreferences {
  return {
    emailDailySummary: row.email_daily_summary !== false,
    emailWeeklyReport: row.email_weekly_report !== false,
    emailGoalMilestones: row.email_goal_milestones !== false,
    emailSessionReminders: row.email_session_reminders !== false,
    emailMessages: row.email_messages !== false,
    pushSessionReminders: row.push_session_reminders !== false,
    pushMessages: row.push_messages !== false,
    pushUrgentAlerts: row.push_urgent_alerts !== false,
    pushDailyTips: row.push_daily_tips !== false,
    smsSessionReminders: row.sms_session_reminders !== false,
    smsUrgentAlerts: row.sms_urgent_alerts !== false,
    smsAppointmentConfirmations: row.sms_appointment_confirmations !== false,
    quietHoursEnabled: row.quiet_hours_enabled !== false,
    quietHoursStart: (row.quiet_hours_start as string) || '21:00',
    quietHoursEnd: (row.quiet_hours_end as string) || '07:00',
  };
}

function mapPrivacy(row: Record<string, unknown>): PrivacySettings {
  return {
    allowModelTraining: (row.allow_model_training as boolean) || false,
    shareAnonymizedData: (row.share_anonymized_data as boolean) || false,
    localStorageOnly: (row.local_storage_only as boolean) || false,
    enhancedPrivacyMode: (row.enhanced_privacy_mode as boolean) || false,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useSettingsData(userId?: string): SettingsData & {
  refresh: () => Promise<void>;
  updateSetting: (table: 'profile' | 'appPreferences' | 'notifications' | 'privacy', key: string, value: unknown) => Promise<void>;
  updateSettings: (table: 'profile' | 'appPreferences' | 'notifications' | 'privacy', updates: Record<string, unknown>) => Promise<void>;
} {
  const [data, setData] = useState<SettingsData>({
    profile: null,
    appPreferences: DEFAULT_APP_PREFS,
    notifications: DEFAULT_NOTIFICATIONS,
    privacy: DEFAULT_PRIVACY,
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [profileResult, prefsResult, notifsResult, privacyResult] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', userId).single()
          .then(null, (err: unknown) => {
            console.warn('[Settings] user_profiles fetch failed:', err);
            return { data: null, error: err };
          }),
        supabase.from('app_preferences').select('*').eq('user_id', userId).single()
          .then(null, (err: unknown) => {
            console.warn('[Settings] app_preferences fetch failed:', err);
            return { data: null, error: err };
          }),
        supabase.from('notification_preferences').select('*').eq('user_id', userId).single()
          .then(null, (err: unknown) => {
            console.warn('[Settings] notification_preferences fetch failed:', err);
            return { data: null, error: err };
          }),
        supabase.from('privacy_settings').select('*').eq('user_id', userId).single()
          .then(null, (err: unknown) => {
            console.warn('[Settings] privacy_settings fetch failed:', err);
            return { data: null, error: err };
          }),
      ]);

      const profile = profileResult?.data ? mapProfile(profileResult.data as Record<string, unknown>) : null;
      const appPreferences = prefsResult?.data ? mapAppPrefs(prefsResult.data as Record<string, unknown>) : DEFAULT_APP_PREFS;
      const notifications = notifsResult?.data ? mapNotifications(notifsResult.data as Record<string, unknown>) : DEFAULT_NOTIFICATIONS;
      const privacy = privacyResult?.data ? mapPrivacy(privacyResult.data as Record<string, unknown>) : DEFAULT_PRIVACY;

      const result: SettingsData = {
        profile,
        appPreferences,
        notifications,
        privacy,
        loading: false,
        error: null,
      };

      writeCache(result);
      setData(result);
    } catch (error: unknown) {
      console.error('[Settings] Load failed, using cache:', error);
      const cached = readCache();
      setData({
        profile: cached.profile || null,
        appPreferences: cached.appPreferences || DEFAULT_APP_PREFS,
        notifications: cached.notifications || DEFAULT_NOTIFICATIONS,
        privacy: cached.privacy || DEFAULT_PRIVACY,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load settings',
      });
    }
  }, [userId]);

  // Map table name → Supabase table + key column
  const tableMap: Record<string, { table: string; pkCol: string }> = {
    profile: { table: 'user_profiles', pkCol: 'user_id' },
    appPreferences: { table: 'app_preferences', pkCol: 'user_id' },
    notifications: { table: 'notification_preferences', pkCol: 'user_id' },
    privacy: { table: 'privacy_settings', pkCol: 'user_id' },
  };

  const updateSetting = useCallback(async (
    tableName: 'profile' | 'appPreferences' | 'notifications' | 'privacy',
    key: string,
    value: unknown,
  ) => {
    if (!userId) return;
    const { table } = tableMap[tableName];
    try {
      await supabase.from(table).upsert({ user_id: userId, [key]: value }, { onConflict: 'user_id' });
    } catch (err) {
      console.warn(`[Settings] Failed to update ${table}.${key}:`, err);
    }
    await loadData();
  }, [userId, loadData]);

  const updateSettings = useCallback(async (
    tableName: 'profile' | 'appPreferences' | 'notifications' | 'privacy',
    updates: Record<string, unknown>,
  ) => {
    if (!userId) return;
    const { table } = tableMap[tableName];
    try {
      await supabase.from(table).upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });
    } catch (err) {
      console.warn(`[Settings] Failed to batch update ${table}:`, err);
    }
    await loadData();
  }, [userId, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh: loadData,
    updateSetting,
    updateSettings,
  };
}

export default useSettingsData;
