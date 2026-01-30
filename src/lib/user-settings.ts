/**
 * User Settings Service
 *
 * Handles persistence of user settings to Supabase.
 * Includes profile, child profiles, notification preferences, and privacy settings.
 */

import { supabase } from '../utils/supabase/client';
import { syncEncryptedStorage } from './security/encrypted-storage';

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
  createdAt: string;
  updatedAt: string;
}

export interface ChildProfile {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string;
  pronouns: string;
  avatarInitials: string;
  goals: string[];
  juniorStatus: 'paired' | 'unpaired';
  juniorDeviceInfo?: string;
  careTeamNotesEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  userId: string;
  // Email notifications
  emailDailySummary: boolean;
  emailWeeklyReport: boolean;
  emailGoalMilestones: boolean;
  emailSessionReminders: boolean;
  emailMessages: boolean;
  // Push notifications
  pushSessionReminders: boolean;
  pushMessages: boolean;
  pushUrgentAlerts: boolean;
  pushDailyTips: boolean;
  // SMS notifications
  smsSessionReminders: boolean;
  smsUrgentAlerts: boolean;
  smsAppointmentConfirmations: boolean;
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string;
  updatedAt: string;
}

export interface PrivacySettings {
  userId: string;
  allowModelTraining: boolean;
  shareAnonymizedData: boolean;
  localStorageOnly: boolean;
  enhancedPrivacyMode: boolean;
  updatedAt: string;
}

export interface AppPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  communicationStyle: 'supportive' | 'direct' | 'playful';
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  fontSize: 'small' | 'medium' | 'large';
  reduceMotion: boolean;
  highContrast: boolean;
  updatedAt: string;
}

// ============================================================================
// User Profile Functions
// ============================================================================

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found, return null
        return null;
      }
      throw error;
    }

    return transformDbToProfile(data);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Return from localStorage as fallback
    return getProfileFromStorage(userId);
  }
}

/**
 * Save user profile
 */
export async function saveUserProfile(
  userId: string,
  profile: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData = {
      ...transformProfileToDb(profile),
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_profiles')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) throw error;

    // Also save to localStorage as backup
    saveProfileToStorage(userId, profile);

    return { success: true };
  } catch (error) {
    console.error('Error saving user profile:', error);
    // Save to localStorage as fallback
    saveProfileToStorage(userId, profile);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save profile'
    };
  }
}

// ============================================================================
// Child Profile Functions
// ============================================================================

/**
 * Get child profiles for a user
 */
export async function getChildProfiles(userId: string): Promise<ChildProfile[]> {
  try {
    const { data, error } = await supabase
      .from('child_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformDbToChildProfile);
  } catch (error) {
    console.error('Error fetching child profiles:', error);
    return getChildProfilesFromStorage(userId);
  }
}

/**
 * Add a child profile
 */
export async function addChildProfile(
  userId: string,
  child: Omit<ChildProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; childId?: string; error?: string }> {
  try {
    const insertData = {
      user_id: userId,
      name: child.name,
      date_of_birth: child.dateOfBirth,
      pronouns: child.pronouns,
      avatar_initials: child.avatarInitials || child.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      goals: child.goals || [],
      junior_status: child.juniorStatus || 'unpaired',
      junior_device_info: child.juniorDeviceInfo,
      care_team_notes_enabled: child.careTeamNotesEnabled ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('child_profiles')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, childId: data.id };
  } catch (error) {
    console.error('Error adding child profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add child'
    };
  }
}

/**
 * Update a child profile
 */
export async function updateChildProfile(
  childId: string,
  updates: Partial<Omit<ChildProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth;
    if (updates.pronouns !== undefined) updateData.pronouns = updates.pronouns;
    if (updates.avatarInitials !== undefined) updateData.avatar_initials = updates.avatarInitials;
    if (updates.goals !== undefined) updateData.goals = updates.goals;
    if (updates.juniorStatus !== undefined) updateData.junior_status = updates.juniorStatus;
    if (updates.juniorDeviceInfo !== undefined) updateData.junior_device_info = updates.juniorDeviceInfo;
    if (updates.careTeamNotesEnabled !== undefined) updateData.care_team_notes_enabled = updates.careTeamNotesEnabled;

    const { error } = await supabase
      .from('child_profiles')
      .update(updateData)
      .eq('id', childId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating child profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update child'
    };
  }
}

/**
 * Delete a child profile
 */
export async function deleteChildProfile(childId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('child_profiles')
      .delete()
      .eq('id', childId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting child profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete child'
    };
  }
}

// ============================================================================
// Notification Preferences Functions
// ============================================================================

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return getDefaultNotificationPreferences(userId);
      throw error;
    }

    return transformDbToNotificationPrefs(data);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return getNotificationPrefsFromStorage(userId);
  }
}

/**
 * Save notification preferences
 */
export async function saveNotificationPreferences(
  userId: string,
  prefs: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData = {
      user_id: userId,
      ...transformNotificationPrefsToDb(prefs),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) throw error;

    // Save to localStorage as backup
    saveNotificationPrefsToStorage(userId, prefs);

    return { success: true };
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    saveNotificationPrefsToStorage(userId, prefs);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save preferences'
    };
  }
}

// ============================================================================
// Privacy Settings Functions
// ============================================================================

/**
 * Get privacy settings
 */
export async function getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
  try {
    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return getDefaultPrivacySettings(userId);
      throw error;
    }

    return {
      userId: data.user_id,
      allowModelTraining: data.allow_model_training,
      shareAnonymizedData: data.share_anonymized_data,
      localStorageOnly: data.local_storage_only,
      enhancedPrivacyMode: data.enhanced_privacy_mode,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return getPrivacySettingsFromStorage(userId);
  }
}

/**
 * Save privacy settings
 */
export async function savePrivacySettings(
  userId: string,
  settings: Partial<Omit<PrivacySettings, 'userId' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (settings.allowModelTraining !== undefined) updateData.allow_model_training = settings.allowModelTraining;
    if (settings.shareAnonymizedData !== undefined) updateData.share_anonymized_data = settings.shareAnonymizedData;
    if (settings.localStorageOnly !== undefined) updateData.local_storage_only = settings.localStorageOnly;
    if (settings.enhancedPrivacyMode !== undefined) updateData.enhanced_privacy_mode = settings.enhancedPrivacyMode;

    const { error } = await supabase
      .from('privacy_settings')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) throw error;

    savePrivacySettingsToStorage(userId, settings);

    return { success: true };
  } catch (error) {
    console.error('Error saving privacy settings:', error);
    savePrivacySettingsToStorage(userId, settings);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save settings'
    };
  }
}

// ============================================================================
// App Preferences Functions
// ============================================================================

/**
 * Get app preferences
 */
export async function getAppPreferences(userId: string): Promise<AppPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('app_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return getDefaultAppPreferences(userId);
      throw error;
    }

    return {
      userId: data.user_id,
      theme: data.theme,
      language: data.language,
      communicationStyle: data.communication_style,
      preferredTimeOfDay: data.preferred_time_of_day,
      fontSize: data.font_size,
      reduceMotion: data.reduce_motion,
      highContrast: data.high_contrast,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error fetching app preferences:', error);
    return getAppPreferencesFromStorage(userId);
  }
}

/**
 * Save app preferences
 */
export async function saveAppPreferences(
  userId: string,
  prefs: Partial<Omit<AppPreferences, 'userId' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (prefs.theme !== undefined) updateData.theme = prefs.theme;
    if (prefs.language !== undefined) updateData.language = prefs.language;
    if (prefs.communicationStyle !== undefined) updateData.communication_style = prefs.communicationStyle;
    if (prefs.preferredTimeOfDay !== undefined) updateData.preferred_time_of_day = prefs.preferredTimeOfDay;
    if (prefs.fontSize !== undefined) updateData.font_size = prefs.fontSize;
    if (prefs.reduceMotion !== undefined) updateData.reduce_motion = prefs.reduceMotion;
    if (prefs.highContrast !== undefined) updateData.high_contrast = prefs.highContrast;

    const { error } = await supabase
      .from('app_preferences')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) throw error;

    saveAppPreferencesToStorage(userId, prefs);

    return { success: true };
  } catch (error) {
    console.error('Error saving app preferences:', error);
    saveAppPreferencesToStorage(userId, prefs);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save preferences'
    };
  }
}

// ============================================================================
// Data Export/Delete Functions
// ============================================================================

/**
 * Export all user data
 */
export async function exportUserData(userId: string): Promise<{ data?: object; error?: string }> {
  try {
    // Fetch all user data
    const [profile, children, notificationPrefs, privacySettings, appPrefs] = await Promise.all([
      getUserProfile(userId),
      getChildProfiles(userId),
      getNotificationPreferences(userId),
      getPrivacySettings(userId),
      getAppPreferences(userId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      children,
      notificationPreferences: notificationPrefs,
      privacySettings,
      appPreferences: appPrefs,
    };

    return { data: exportData };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to export data'
    };
  }
}

/**
 * Request account deletion
 */
export async function requestAccountDeletion(
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        reason,
        status: 'pending',
        requested_at: new Date().toISOString(),
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request deletion'
    };
  }
}

// ============================================================================
// Helper Functions - Transformers
// ============================================================================

function transformDbToProfile(data: Record<string, unknown>): UserProfile {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    name: data.name as string,
    email: data.email as string,
    phone: data.phone as string | undefined,
    address: data.address as string | undefined,
    timeZone: data.time_zone as string || 'America/Los_Angeles',
    profilePhotoUrl: data.profile_photo_url as string | undefined,
    emailVerified: data.email_verified as boolean,
    twoFactorEnabled: data.two_factor_enabled as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function transformProfileToDb(profile: Partial<UserProfile>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (profile.name !== undefined) data.name = profile.name;
  if (profile.email !== undefined) data.email = profile.email;
  if (profile.phone !== undefined) data.phone = profile.phone;
  if (profile.address !== undefined) data.address = profile.address;
  if (profile.timeZone !== undefined) data.time_zone = profile.timeZone;
  if (profile.profilePhotoUrl !== undefined) data.profile_photo_url = profile.profilePhotoUrl;
  if (profile.emailVerified !== undefined) data.email_verified = profile.emailVerified;
  if (profile.twoFactorEnabled !== undefined) data.two_factor_enabled = profile.twoFactorEnabled;
  return data;
}

function transformDbToChildProfile(data: Record<string, unknown>): ChildProfile {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    name: data.name as string,
    dateOfBirth: data.date_of_birth as string,
    pronouns: data.pronouns as string,
    avatarInitials: data.avatar_initials as string,
    goals: (data.goals as string[]) || [],
    juniorStatus: data.junior_status as 'paired' | 'unpaired',
    juniorDeviceInfo: data.junior_device_info as string | undefined,
    careTeamNotesEnabled: data.care_team_notes_enabled as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function transformDbToNotificationPrefs(data: Record<string, unknown>): NotificationPreferences {
  return {
    userId: data.user_id as string,
    emailDailySummary: data.email_daily_summary as boolean,
    emailWeeklyReport: data.email_weekly_report as boolean,
    emailGoalMilestones: data.email_goal_milestones as boolean,
    emailSessionReminders: data.email_session_reminders as boolean,
    emailMessages: data.email_messages as boolean,
    pushSessionReminders: data.push_session_reminders as boolean,
    pushMessages: data.push_messages as boolean,
    pushUrgentAlerts: data.push_urgent_alerts as boolean,
    pushDailyTips: data.push_daily_tips as boolean,
    smsSessionReminders: data.sms_session_reminders as boolean,
    smsUrgentAlerts: data.sms_urgent_alerts as boolean,
    smsAppointmentConfirmations: data.sms_appointment_confirmations as boolean,
    quietHoursEnabled: data.quiet_hours_enabled as boolean,
    quietHoursStart: data.quiet_hours_start as string,
    quietHoursEnd: data.quiet_hours_end as string,
    updatedAt: data.updated_at as string,
  };
}

function transformNotificationPrefsToDb(prefs: Partial<NotificationPreferences>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (prefs.emailDailySummary !== undefined) data.email_daily_summary = prefs.emailDailySummary;
  if (prefs.emailWeeklyReport !== undefined) data.email_weekly_report = prefs.emailWeeklyReport;
  if (prefs.emailGoalMilestones !== undefined) data.email_goal_milestones = prefs.emailGoalMilestones;
  if (prefs.emailSessionReminders !== undefined) data.email_session_reminders = prefs.emailSessionReminders;
  if (prefs.emailMessages !== undefined) data.email_messages = prefs.emailMessages;
  if (prefs.pushSessionReminders !== undefined) data.push_session_reminders = prefs.pushSessionReminders;
  if (prefs.pushMessages !== undefined) data.push_messages = prefs.pushMessages;
  if (prefs.pushUrgentAlerts !== undefined) data.push_urgent_alerts = prefs.pushUrgentAlerts;
  if (prefs.pushDailyTips !== undefined) data.push_daily_tips = prefs.pushDailyTips;
  if (prefs.smsSessionReminders !== undefined) data.sms_session_reminders = prefs.smsSessionReminders;
  if (prefs.smsUrgentAlerts !== undefined) data.sms_urgent_alerts = prefs.smsUrgentAlerts;
  if (prefs.smsAppointmentConfirmations !== undefined) data.sms_appointment_confirmations = prefs.smsAppointmentConfirmations;
  if (prefs.quietHoursEnabled !== undefined) data.quiet_hours_enabled = prefs.quietHoursEnabled;
  if (prefs.quietHoursStart !== undefined) data.quiet_hours_start = prefs.quietHoursStart;
  if (prefs.quietHoursEnd !== undefined) data.quiet_hours_end = prefs.quietHoursEnd;
  return data;
}

// ============================================================================
// Helper Functions - LocalStorage Fallbacks (with encryption for PHI)
// ============================================================================

function getProfileFromStorage(userId: string): UserProfile | null {
  try {
    const stored = syncEncryptedStorage.getItem(`aminy_profile_${userId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveProfileToStorage(userId: string, profile: Partial<UserProfile>): void {
  try {
    const existing = getProfileFromStorage(userId) || {};
    syncEncryptedStorage.setItem(`aminy_profile_${userId}`, JSON.stringify({ ...existing, ...profile }));
  } catch {
    // Ignore storage errors
  }
}

function getChildProfilesFromStorage(userId: string): ChildProfile[] {
  try {
    const stored = syncEncryptedStorage.getItem(`aminy_children_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveChildProfilesToStorage(userId: string, children: ChildProfile[]): void {
  try {
    syncEncryptedStorage.setItem(`aminy_children_${userId}`, JSON.stringify(children));
  } catch {
    // Ignore storage errors
  }
}

function getNotificationPrefsFromStorage(userId: string): NotificationPreferences | null {
  try {
    const stored = syncEncryptedStorage.getItem(`aminy_notifications_${userId}`);
    return stored ? JSON.parse(stored) : getDefaultNotificationPreferences(userId);
  } catch {
    return getDefaultNotificationPreferences(userId);
  }
}

function saveNotificationPrefsToStorage(userId: string, prefs: Partial<NotificationPreferences>): void {
  try {
    const existing = getNotificationPrefsFromStorage(userId) || getDefaultNotificationPreferences(userId);
    syncEncryptedStorage.setItem(`aminy_notifications_${userId}`, JSON.stringify({ ...existing, ...prefs }));
  } catch {
    // Ignore storage errors
  }
}

function getPrivacySettingsFromStorage(userId: string): PrivacySettings | null {
  try {
    const stored = syncEncryptedStorage.getItem(`aminy_privacy_${userId}`);
    return stored ? JSON.parse(stored) : getDefaultPrivacySettings(userId);
  } catch {
    return getDefaultPrivacySettings(userId);
  }
}

function savePrivacySettingsToStorage(userId: string, settings: Partial<PrivacySettings>): void {
  try {
    const existing = getPrivacySettingsFromStorage(userId) || getDefaultPrivacySettings(userId);
    syncEncryptedStorage.setItem(`aminy_privacy_${userId}`, JSON.stringify({ ...existing, ...settings }));
  } catch {
    // Ignore storage errors
  }
}

function getAppPreferencesFromStorage(userId: string): AppPreferences | null {
  try {
    // App preferences are not PHI, can use regular storage
    const stored = localStorage.getItem(`aminy_app_prefs_${userId}`);
    return stored ? JSON.parse(stored) : getDefaultAppPreferences(userId);
  } catch {
    return getDefaultAppPreferences(userId);
  }
}

function saveAppPreferencesToStorage(userId: string, prefs: Partial<AppPreferences>): void {
  try {
    // App preferences are not PHI, can use regular storage
    const existing = getAppPreferencesFromStorage(userId) || getDefaultAppPreferences(userId);
    localStorage.setItem(`aminy_app_prefs_${userId}`, JSON.stringify({ ...existing, ...prefs }));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Helper Functions - Defaults
// ============================================================================

function getDefaultNotificationPreferences(userId: string): NotificationPreferences {
  return {
    userId,
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
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultPrivacySettings(userId: string): PrivacySettings {
  return {
    userId,
    allowModelTraining: false,
    shareAnonymizedData: false,
    localStorageOnly: false,
    enhancedPrivacyMode: false,
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultAppPreferences(userId: string): AppPreferences {
  return {
    userId,
    theme: 'system',
    language: 'en',
    communicationStyle: 'supportive',
    preferredTimeOfDay: 'morning',
    fontSize: 'medium',
    reduceMotion: false,
    highContrast: false,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Export Default
// ============================================================================

export default {
  getUserProfile,
  saveUserProfile,
  getChildProfiles,
  addChildProfile,
  updateChildProfile,
  deleteChildProfile,
  getNotificationPreferences,
  saveNotificationPreferences,
  getPrivacySettings,
  savePrivacySettings,
  getAppPreferences,
  saveAppPreferences,
  exportUserData,
  requestAccountDeletion,
};
