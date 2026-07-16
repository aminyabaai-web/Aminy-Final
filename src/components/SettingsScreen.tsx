// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SettingsScreen - Comprehensive Settings & Preferences
 *
 * Features:
 * - Notification preferences (push, email, SMS)
 * - Password change
 * - Two-factor authentication toggle
 * - Data export (GDPR compliance)
 * - Account deletion
 * - Subscription management
 * - Privacy controls
 * - Theme/appearance settings
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Shield,
  CreditCard,
  Trash2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Palette,
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Smartphone,
  Key,
  Download,
  FileText,
  ChevronRight,
  Check,
  X,
  Loader2,
  Crown,
  Clock,
  ExternalLink,
  HelpCircle,
  MessageCircle,
  Globe,
  Fingerprint,
  ShieldCheck,
  AlertTriangle,
  Info,
  CalendarDays,
  RefreshCw,
  Unplug,
  Users,
  Gift,
  DollarSign,
  Heart,
  Trophy,
  Microscope,
  Handshake
} from 'lucide-react';
import { ThemeSelector } from '../lib/theme-provider';
import { CalendarConnectionCard } from './CalendarConnectionCard';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { TierType, getTierDisplayName } from '../lib/tier-utils';
import { createPortalSession, openCustomerPortal } from '../lib/stripe-service';
import { isDemoMode } from '../lib/demo-seed';
import { app as appConfig } from '../lib/env-config';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push-notifications';
import { setNotificationPrefsCache } from '../lib/notification-prefs';
import {
  isCalendarConnected,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  triggerFullSync,
  toggleAutoSync,
  getCalendarIntegration,
  type CalendarIntegration,
} from '../lib/google-calendar-sync';
import {
  AI_PERSONALITIES,
  loadAISettings,
  saveAISettings,
  type AIPersonality,
} from '../lib/ai-personality';
import { fetchUserContext, updateUserContext, type UserContext } from '../ai/contextLayer';

/** Lucide renderers for PersonalityConfig.icon — brand rule: no emoji in parent chrome. */
const PERSONALITY_ICONS = { Heart, Trophy, Microscope, Handshake } as const;

interface SettingsScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
  onNavigate?: (screen: string) => void;
  userTier?: TierType;
}

interface NotificationSettings {
  pushEnabled: boolean;
  emailDigest: boolean;
  emailDigestFrequency: 'daily' | 'weekly' | 'never';
  smsReminders: boolean;
  appointmentReminders: boolean;
  progressUpdates: boolean;
  communityActivity: boolean;
  marketingEmails: boolean;
  checkInFrequency: 'off' | 'daily' | 'twice-weekly' | 'weekly';
  checkInTime: 'morning' | 'afternoon' | 'evening';
  // App-scheduling toggles (persisted to user_preferences, mirrored to the
  // notification-prefs cache so the nudge/push engines pick them up live).
  weeklyBriefing: boolean;
  dailyTips: boolean;
  proactiveNudges: boolean;
  // profiles.lifecycle_emails_enabled — same column the email-footer unsubscribe
  // deep link flips, so the two must always agree.
  updateEmails: boolean;
}

interface SubscriptionInfo {
  tier: TierType;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export function SettingsScreen({ onBack, onLogout, onNavigate, userTier = 'core' }: SettingsScreenProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Insurance state. Real users start with no insurance on file until coverage
  // is loaded/entered — never show fabricated PHI. Demo mode shows a sample card.
  const [hasInsurance, setHasInsurance] = useState(isDemoMode());
  const [insuranceDetails] = useState(
    isDemoMode()
      ? { plan: 'Blue Cross Blue Shield', memberId: '••••••6789', group: 'GRP123' }
      : null,
  );
  const [showInsuranceDetails, setShowInsuranceDetails] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushEnabled: true,
    emailDigest: true,
    emailDigestFrequency: 'weekly',
    smsReminders: false,
    appointmentReminders: true,
    progressUpdates: true,
    communityActivity: true,
    marketingEmails: false,
    checkInFrequency: 'daily',
    checkInTime: 'morning',
    weeklyBriefing: true,
    dailyTips: true,
    proactiveNudges: true,
    updateEmails: true,
  });

  // First child's name for notification microcopy — falls back to "your child".
  const [childName, setChildName] = useState('your child');

  // Password change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  // Data export
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Account deletion
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Subscription
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    tier: userTier,
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false
  });

  // Calendar integration
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarIntegration, setCalendarIntegration] = useState<CalendarIntegration | null>(null);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<AIPersonality>(() => loadAISettings().personality);
  const [aiMemory, setAiMemory] = useState<UserContext | null>(null);
  const [aiMemoryLoading, setAiMemoryLoading] = useState(false);
  const [aiMemoryExpanded, setAiMemoryExpanded] = useState(false);

  const handlePersonalityChange = (p: AIPersonality) => {
    setSelectedPersonality(p);
    const current = loadAISettings();
    saveAISettings({ ...current, personality: p });
    toast.success(`${AI_PERSONALITIES[p].name} mode activated`);
  };

  const loadAIMemory = async () => {
    if (aiMemory) return;
    setAiMemoryLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ctx = await fetchUserContext(user.id);
      setAiMemory(ctx);
    } catch { /* ignore */ }
    finally { setAiMemoryLoading(false); }
  };

  const clearAIMemory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await updateUserContext(user.id, {
        lastCalmCue: undefined,
        strugglingWith: [],
        celebratingWins: [],
        bestTimeOfDay: undefined,
        lastJrSession: undefined,
        lastShopPurchase: undefined,
        lastHubPost: undefined,
      });
      setAiMemory(prev => prev ? { ...prev, lastCalmCue: undefined, strugglingWith: [], celebratingWins: [] } : prev);
      toast.success('AI memory cleared');
    } catch { toast.error('Could not clear memory'); }
  };

  // Load settings
  useEffect(() => {
    loadSettings();
    // Email-footer unsubscribe deep link (?unsubscribe=lifecycle) — one-click
    // opt-out from every lifecycle email. Flips profiles.lifecycle_emails_enabled
    // and confirms; transactional email (password reset, provider messages) is
    // unaffected. Param is stripped so a refresh doesn't re-trigger.
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('unsubscribe') !== 'lifecycle') return;
        params.delete('unsubscribe');
        const qs = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase
          .from('profiles')
          .update({ lifecycle_emails_enabled: false })
          .eq('id', user.id);
        if (error) throw error;
        // Keep the "Update emails" toggle in agreement with the column just flipped.
        setNotifications(prev => ({ ...prev, updateEmails: false }));
        toast.success("You're unsubscribed from update emails. Account and security emails still arrive.");
      } catch {
        toast.error("Couldn't update your email preference — please try again.");
      }
    })();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load notification preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Update-emails toggle reads profiles.lifecycle_emails_enabled — the SAME
      // column the email-footer unsubscribe deep link flips, so they agree.
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('lifecycle_emails_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (prefs) {
        setNotifications({
          pushEnabled: prefs.push_enabled ?? true,
          emailDigest: prefs.email_digest ?? true,
          emailDigestFrequency: prefs.email_digest_frequency || 'weekly',
          smsReminders: prefs.sms_reminders ?? false,
          appointmentReminders: prefs.appointment_reminders ?? true,
          progressUpdates: prefs.progress_updates ?? true,
          communityActivity: prefs.community_activity ?? true,
          marketingEmails: prefs.marketing_emails ?? false,
          checkInFrequency: prefs.check_in_frequency || 'daily',
          checkInTime: prefs.check_in_time || 'morning',
          weeklyBriefing: prefs.weekly_briefing ?? true,
          dailyTips: prefs.daily_tips ?? true,
          proactiveNudges: prefs.proactive_nudges ?? true,
          updateEmails: profileRow?.lifecycle_emails_enabled ?? true,
        });
        // Prime the engine cache so nudge/push scheduling reflects saved prefs.
        setNotificationPrefsCache({
          weekly_briefing: prefs.weekly_briefing ?? true,
          daily_tips: prefs.daily_tips ?? true,
          proactive_nudges: prefs.proactive_nudges ?? true,
        });
      } else if (profileRow) {
        setNotifications(prev => ({ ...prev, updateEmails: profileRow.lifecycle_emails_enabled ?? true }));
      }

      // First child's name for the weekly-briefing microcopy.
      const { data: kids } = await supabase
        .from('children')
        .select('name')
        .eq('parent_id', user.id)
        .limit(1);
      const firstName = kids?.[0]?.name?.trim();
      if (firstName) setChildName(firstName);

      // Check MFA status
      const { data: factors } = await supabase.auth.mfa.listFactors();
      setMfaEnabled((factors?.totp?.length ?? 0) > 0 || false);

      // Check calendar integration status
      const connected = await isCalendarConnected(user.id);
      setCalendarConnected(connected);
      if (connected) {
        const integration = await getCalendarIntegration(user.id);
        setCalendarIntegration(integration);
      }

    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const scheduleAICheckIns = async (userId: string, freq: NotificationSettings['checkInFrequency'], time: NotificationSettings['checkInTime']) => {
    if (freq === 'off') return;
    try {
      const { projectId: pid, publicAnonKey: key } = await import('../utils/supabase/info');
      await fetch(`https://${pid}.supabase.co/functions/v1/make-server-8a022548/push-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ userId, action: 'schedule-checkins', frequency: freq, timeOfDay: time }),
      });
    } catch { /* non-critical — push schedule set in DB, edge fn handles delivery */ }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          push_enabled: newSettings.pushEnabled,
          email_digest: newSettings.emailDigest,
          email_digest_frequency: newSettings.emailDigestFrequency,
          sms_reminders: newSettings.smsReminders,
          appointment_reminders: newSettings.appointmentReminders,
          progress_updates: newSettings.progressUpdates,
          community_activity: newSettings.communityActivity,
          marketing_emails: newSettings.marketingEmails,
          check_in_frequency: newSettings.checkInFrequency,
          check_in_time: newSettings.checkInTime,
          weekly_briefing: newSettings.weeklyBriefing,
          daily_tips: newSettings.dailyTips,
          proactive_nudges: newSettings.proactiveNudges,
          updated_at: new Date().toISOString()
        });

      setNotifications(newSettings);
      // Mirror to the engine cache so nudge/push scheduling reacts immediately.
      setNotificationPrefsCache({
        weekly_briefing: newSettings.weeklyBriefing,
        daily_tips: newSettings.dailyTips,
        proactive_nudges: newSettings.proactiveNudges,
      });
      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * "Update emails" toggle → profiles.lifecycle_emails_enabled (same column the
   * unsubscribe deep link flips). Optimistic with revert on failure.
   */
  const saveUpdateEmails = async (enabled: boolean) => {
    const previous = notifications.updateEmails;
    setNotifications(prev => ({ ...prev, updateEmails: enabled }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      const { error } = await supabase
        .from('profiles')
        .update({ lifecycle_emails_enabled: enabled })
        .eq('id', user.id);
      if (error) throw error;
      toast.success(enabled ? 'Update emails on' : 'Update emails off');
    } catch (error) {
      console.error('Error saving update-email preference:', error);
      setNotifications(prev => ({ ...prev, updateEmails: previous }));
      toast.error('Could not update your email preference');
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    // Validation
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (!/[A-Z]/.test(passwordForm.newPassword) || !/[0-9]/.test(passwordForm.newPassword)) {
      setPasswordError('Password must contain uppercase letter and number');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setShowPasswordDialog(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableMfa = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });

      if (error) throw error;

      // In production, show QR code to user
      toast.success('Two-factor authentication enabled');
      setMfaEnabled(true);
      setShowMfaSetup(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to enable 2FA');
    }
  };

  const handleDisableMfa = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp?.[0]) {
        await supabase.auth.mfa.unenroll({
          factorId: factors.totp[0].id
        });
      }

      setMfaEnabled(false);
      toast.success('Two-factor authentication disabled');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA');
    }
  };

  // Calendar integration handlers
  const handleConnectCalendar = async () => {
    setCalendarConnecting(true);
    try {
      await connectGoogleCalendar();
      // User will be redirected to Google OAuth
    } catch (error: unknown) {
      console.error('Failed to connect calendar:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Google Calendar');
      setCalendarConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await disconnectGoogleCalendar(user.id);
      setCalendarConnected(false);
      setCalendarIntegration(null);
      toast.success('Google Calendar disconnected');
    } catch (error: unknown) {
      console.error('Failed to disconnect calendar:', error);
      toast.error('Failed to disconnect Google Calendar');
    }
  };

  const handleSyncNow = async () => {
    setCalendarSyncing(true);
    try {
      const result = await triggerFullSync();
      if (result.errors.length > 0) {
        toast.error(`Sync completed with ${result.errors.length} error(s)`);
      } else {
        toast.success(`Synced: ${result.pushed} pushed, ${result.pulled} events pulled`);
      }
      // Refresh integration data to update last_sync_at
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const integration = await getCalendarIntegration(user.id);
        setCalendarIntegration(integration);
      }
    } catch (error: unknown) {
      console.error('Sync failed:', error);
      toast.error('Calendar sync failed');
    } finally {
      setCalendarSyncing(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await toggleAutoSync(user.id, enabled);
      setCalendarIntegration(prev => prev ? { ...prev, sync_enabled: enabled } : null);
      toast.success(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
    } catch (error: unknown) {
      console.error('Failed to toggle auto-sync:', error);
      toast.error('Failed to update sync settings');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Simulate export progress
      const interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      // Fetch all user data
      const [profileRes, childrenRes, conversationsRes, vaultRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id),
        supabase.from('children').select('*').eq('parent_id', user.id),
        supabase.from('conversations').select('*').eq('user_id', user.id).limit(1000),
        supabase.from('vault_records').select('*').eq('user_id', user.id)
      ]);

      clearInterval(interval);
      setExportProgress(100);

      // Create export file
      const exportData = {
        exportDate: new Date().toISOString(),
        profile: profileRes.data,
        children: childrenRes.data,
        conversations: conversationsRes.data,
        vaultRecords: vaultRes.data
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aminy-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Cancel active subscription (best effort)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-server-8a022548/payments/cancel-subscription`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId: user.id, reason: 'account_deletion' }),
            }
          );
        }
      } catch {
        // Continue — cancellation is best-effort
      }

      // 2. Record deletion request in Supabase — must be confirmed (compliance-critical)
      const { error: deletionError } = await supabase.from('account_deletion_requests').insert({
        user_id: user.id,
        email: user.email,
        status: 'pending',
        requested_at: new Date().toISOString(),
      });
      if (deletionError) throw deletionError;

      toast.success('Account deletion requested. You will receive a confirmation email.');
      setShowDeleteDialog(false);
      onLogout?.();
    } catch (error) {
      console.error('[Settings] Delete account error:', error);
      toast.error('Failed to submit deletion request. Please contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in — show paywall instead
        onNavigate?.('paywall');
        return;
      }
      if (subscription.tier === 'free') {
        // Free users go to paywall to upgrade
        onNavigate?.('paywall');
        return;
      }
      // Paying users get Stripe Customer Portal
      toast.loading('Opening billing portal...');
      const { url } = await createPortalSession(user.id);
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
      toast.dismiss();
      toast.error('Could not open billing portal. Please try again.');
      // Fallback to paywall
      onNavigate?.('paywall');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background dark:bg-slate-900" style={{ paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 80px))' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold dark:text-white">Settings</h1>
              <h2 className="sr-only">Settings overview</h2>
              <h3 className="sr-only">Preferences and account sections</h3>
              <p className="text-sm text-muted-foreground">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-6 space-y-6 md:grid md:grid-cols-[240px_1fr] md:gap-6 md:space-y-0">
        {/* Desktop settings sidebar — hidden on mobile */}
        <aside className="hidden md:block space-y-1" aria-label="Settings categories">
          {[
            { id: 'subscription', label: 'Subscription', icon: Crown },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'theme', label: 'Appearance', icon: Palette },
            { id: 'data', label: 'Data & Privacy', icon: Download },
            { id: 'danger', label: 'Account', icon: AlertTriangle },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(isActive ? null : item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#6B9080]/10 dark:bg-[#6B9080]/10 text-[#6B9080] dark:text-[#7BA7BC]'
                    : 'text-foreground dark:text-gray-300 hover:bg-[#EDF4F7] dark:hover:bg-slate-700'
                }`}
              >
                <Icon aria-hidden="true" className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </aside>

        {/* Settings content cards */}
        <div className="space-y-6">

        {/* Account Profile Card */}
        <Card className="p-4">
          <button
            onClick={() => onNavigate?.('account-settings')}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center">
                <Users aria-hidden="true" className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold dark:text-white">Account &amp; Profile</p>
                <p className="text-sm text-muted-foreground">Edit name, email, photo, password</p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </Card>

        {/* AI Personality Card */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #6AA9BC 100%)' }}
            >
              ✦
            </div>
            <div>
              <p className="font-semibold dark:text-white">Aminy AI Personality</p>
              <p className="text-sm text-muted-foreground">Choose how Aminy talks with you</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.values(AI_PERSONALITIES) as typeof AI_PERSONALITIES[AIPersonality][]).map((p) => {
              const isActive = selectedPersonality === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePersonalityChange(p.id)}
                  className={`relative flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? 'border-[#2A7D99] bg-[#2A7D99]/5'
                      : 'border-[#E8E4DF] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#2A7D99] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                  {(() => {
                    const PersonalityIcon = PERSONALITY_ICONS[p.icon] ?? Heart;
                    return (
                      <span className="w-8 h-8 rounded-full bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center">
                        <PersonalityIcon className="w-4 h-4 text-[#2A7D99]" />
                      </span>
                    );
                  })()}
                  <span className="text-sm font-semibold dark:text-white">{p.name}</span>
                  <span className="text-sm text-muted-foreground leading-snug">{p.tagline}</span>
                </button>
              );
            })}
          </div>
          {selectedPersonality && (
            <p className="mt-3 text-sm text-[#5A6B7A] dark:text-slate-400 text-center">
              {AI_PERSONALITIES[selectedPersonality].description}
            </p>
          )}
        </Card>

        {/* What Aminy Knows Card */}
        <Card className="p-4">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => {
              setAiMemoryExpanded(!aiMemoryExpanded);
              if (!aiMemoryExpanded && !aiMemory) loadAIMemory();
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base shrink-0"
                style={{ background: 'linear-gradient(135deg, #6AA9BC 0%, #0D1B2A 100%)' }}
              >
                🧠
              </div>
              <div className="text-left">
                <p className="font-semibold dark:text-white">What Aminy Knows</p>
                <p className="text-sm text-muted-foreground">
                  {aiMemory?.childName ? `${aiMemory.childName}'s AI memory` : 'View your AI context'}
                </p>
              </div>
            </div>
            <ChevronRight
              aria-hidden="true"
              className={`w-5 h-5 text-muted-foreground transition-transform ${aiMemoryExpanded ? 'rotate-90' : ''}`}
            />
          </button>

          {aiMemoryExpanded && (
            <div className="mt-4 space-y-3">
              {aiMemoryLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading memory…
                </div>
              )}
              {aiMemory && !aiMemoryLoading && (
                <>
                  {aiMemory.childName && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Child</span>
                      <span className="text-sm dark:text-white">{aiMemory.childName}{aiMemory.childAge ? `, age ${aiMemory.childAge}` : ''}{aiMemory.diagnosis ? ` · ${aiMemory.diagnosis}` : ''}</span>
                    </div>
                  )}
                  {(aiMemory.activeGoals?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-24 shrink-0 mt-0.5">Goals</span>
                      <div className="flex flex-wrap gap-1">
                        {aiMemory.activeGoals!.map((g, i) => (
                          <span key={i} className="text-xs bg-[#6B9080]/10 text-[#6B9080] border border-[#6B9080]/20 rounded-full px-2 py-0.5">{g}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiMemory.lastCalmCue && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Calm cue</span>
                      <span className="text-sm dark:text-white">"{aiMemory.lastCalmCue}"</span>
                    </div>
                  )}
                  {(aiMemory.celebratingWins?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-24 shrink-0 mt-0.5">Wins</span>
                      <div className="flex flex-wrap gap-1">
                        {aiMemory.celebratingWins!.map((w, i) => (
                          <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(aiMemory.strugglingWith?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-24 shrink-0 mt-0.5">Working on</span>
                      <div className="flex flex-wrap gap-1">
                        {aiMemory.strugglingWith!.map((s, i) => (
                          <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiMemory.progressThisWeek && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">This week</span>
                      <span className="text-sm dark:text-white">{aiMemory.progressThisWeek.sessionsCompleted} sessions · {aiMemory.progressThisWeek.calmMoments} calm moments</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={clearAIMemory}
                  >
                    Clear AI Memory
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Subscription Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Crown aria-hidden="true" className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold dark:text-white">{getTierDisplayName(subscription.tier)} Plan</h3>
                  <Badge className={
                    subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                    subscription.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {subscription.status === 'trialing' ? 'Trial' : subscription.status}
                  </Badge>
                </div>
                {subscription.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">
                  AI memory:{' '}
                  {subscription.tier === 'free' ? '50 facts' :
                   subscription.tier === 'core' ? '5,000 facts' :
                   subscription.tier === 'pro' ? '15,000 facts' :
                   'unlimited facts'}
                  {' '}· {subscription.tier === 'free' || subscription.tier === 'core' ? (
                    <button onClick={() => onNavigate?.('paywall')} className="text-[#6B9080] underline">upgrade for more</button>
                  ) : 'full history'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleManageSubscription}>
              Manage
              <ChevronRight aria-hidden="true" className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Manage Subscription deep-link — paying users only */}
          {subscription.tier !== 'free' && (
            <div className="mt-3 pt-3 border-t border-[#E8E4DF] dark:border-slate-700 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-sm"
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    toast.loading('Opening subscription portal...');
                    await openCustomerPortal(user.id);
                    toast.dismiss();
                  } catch (err) {
                    toast.dismiss();
                    toast.error('Could not open subscription portal.');
                    console.error('Portal deep-link error:', err);
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <CreditCard aria-hidden="true" className="w-4 h-4" />
                  Manage Subscription
                </span>
                <ExternalLink aria-hidden="true" className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Update payment method, switch plans, view invoices, or cancel
              </p>
            </div>
          )}
        </Card>

        {/* Invite Families Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center">
                <Users aria-hidden="true" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold dark:text-white">Invite Families</h3>
                <p className="text-sm text-muted-foreground">Share Aminy with other families</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('referral-dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6B9080]/10 hover:bg-[#6B9080]/20 text-[#6B9080] rounded-lg text-sm font-medium transition-colors"
            >
              <Gift aria-hidden="true" className="w-4 h-4" />
              View Rewards
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E8E4DF] dark:border-slate-700">
            <p className="text-sm text-muted-foreground">
              Refer a family and earn rewards when they join. Every family you help builds a stronger community.
            </p>
            <button
              onClick={() => onNavigate?.('referral-dashboard')}
              className="mt-3 w-full py-2.5 bg-primary hover:bg-primary text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Users aria-hidden="true" className="w-4 h-4" />
              Invite Families & Track Rewards
            </button>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell aria-hidden="true" className="w-5 h-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold dark:text-white">Notifications</h3>
                <p className="text-sm text-muted-foreground">Push, email, and SMS preferences</p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === 'notifications' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activeSection === 'notifications' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#E8E4DF] dark:border-slate-700"
              >
                <div className="p-4 space-y-4">
                  {/* Push Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          {!isPushSupported()
                            ? 'Not supported in this browser'
                            : getNotificationPermission() === 'denied'
                              ? 'Blocked — enable in browser settings'
                              : 'Get alerts on your device'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.pushEnabled}
                      disabled={!isPushSupported() || getNotificationPermission() === 'denied'}
                      onCheckedChange={async (checked) => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          const userId = user?.id || '';
                          if (checked) {
                            // Subscribe to push via Web Push API
                            const sub = await subscribeToPush(userId);
                            if (!sub) {
                              toast.error('Could not enable push notifications. Check browser permissions.');
                              return;
                            }
                          } else {
                            // Unsubscribe from push
                            await unsubscribeFromPush(userId);
                          }
                          const newSettings = { ...notifications, pushEnabled: checked };
                          saveNotificationSettings(newSettings);
                        } catch (err) {
                          console.error('Push toggle error:', err);
                          toast.error('Failed to update push notifications');
                        }
                      }}
                    />
                  </div>

                  {/* Email Digest */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Email Digest</p>
                        <p className="text-sm text-muted-foreground">Weekly progress summary</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.emailDigest}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...notifications, emailDigest: checked };
                        saveNotificationSettings(newSettings);
                      }}
                    />
                  </div>

                  {/* Weekly progress briefing (email) → user_preferences.weekly_briefing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Weekly progress briefing</p>
                        <p className="text-sm text-muted-foreground">A short Sunday note about {childName}'s week</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.weeklyBriefing}
                      onCheckedChange={(checked) => {
                        saveNotificationSettings({ ...notifications, weeklyBriefing: checked });
                      }}
                    />
                  </div>

                  {/* Daily gentle tips (push) → user_preferences.daily_tips */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Daily gentle tips</p>
                        <p className="text-sm text-muted-foreground">One small idea to try, sent to your device</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.dailyTips}
                      onCheckedChange={(checked) => {
                        saveNotificationSettings({ ...notifications, dailyTips: checked });
                      }}
                    />
                  </div>

                  {/* Proactive check-ins (in-app) → user_preferences.proactive_nudges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Proactive check-ins from Aminy</p>
                        <p className="text-sm text-muted-foreground">Gentle nudges inside the app when the moment fits</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.proactiveNudges}
                      onCheckedChange={(checked) => {
                        saveNotificationSettings({ ...notifications, proactiveNudges: checked });
                      }}
                    />
                  </div>

                  {/* Text reminders for appointments → existing user_preferences.sms_reminders */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Text reminders for appointments</p>
                        <p className="text-sm text-muted-foreground">SMS before telehealth and in-person visits</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.smsReminders}
                      onCheckedChange={(checked) => {
                        saveNotificationSettings({ ...notifications, smsReminders: checked });
                      }}
                    />
                  </div>

                  {/* Update emails → profiles.lifecycle_emails_enabled (agrees with unsubscribe deep link) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Update emails</p>
                        <p className="text-sm text-muted-foreground">Product news and occasional account updates</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.updateEmails}
                      onCheckedChange={(checked) => saveUpdateEmails(checked)}
                    />
                  </div>

                  {/* Google Calendar connection */}
                  <CalendarConnectionCard />

                  {/* AI Check-ins Schedule */}
                  <div className="rounded-2xl border border-[#E8E4DF] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#F5F2EC]">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg, #2A7D9922 0%, #6AA9BC22 100%)' }}
                        >
                          <span className="text-base">✦</span>
                        </div>
                        <div>
                          <p className="font-medium text-[#132F43] text-sm">AI Check-ins</p>
                          <p className="text-sm text-muted-foreground">Proactive insights from Aminy</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.checkInFrequency !== 'off'}
                        onCheckedChange={(checked) => {
                          const newSettings = {
                            ...notifications,
                            checkInFrequency: checked ? 'daily' as const : 'off' as const,
                          };
                          saveNotificationSettings(newSettings);
                          if (checked && notifications.pushEnabled) {
                            supabase.auth.getUser().then(({ data: { user } }) => {
                              if (user) scheduleAICheckIns(user.id, 'daily', notifications.checkInTime);
                            });
                          }
                        }}
                      />
                    </div>

                    {notifications.checkInFrequency !== 'off' && (
                      <div className="px-4 py-3 space-y-3 border-t border-[#E8E4DF] bg-white">
                        {/* Frequency chips */}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Frequency</p>
                          <div className="flex gap-2 flex-wrap">
                            {([
                              { id: 'daily', label: 'Daily' },
                              { id: 'twice-weekly', label: '2x week' },
                              { id: 'weekly', label: 'Weekly' },
                            ] as const).map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  const newSettings = { ...notifications, checkInFrequency: opt.id };
                                  saveNotificationSettings(newSettings);
                                  supabase.auth.getUser().then(({ data: { user } }) => {
                                    if (user) scheduleAICheckIns(user.id, opt.id, notifications.checkInTime);
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  notifications.checkInFrequency === opt.id
                                    ? 'text-white shadow-sm'
                                    : 'bg-[#EDF4F7] text-[#5A6B7A] hover:bg-[#E8E4DF]'
                                }`}
                                style={notifications.checkInFrequency === opt.id ? {
                                  background: 'linear-gradient(135deg, #2A7D99 0%, #6AA9BC 100%)'
                                } : {}}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Time chips */}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Best time</p>
                          <div className="flex gap-2">
                            {([
                              { id: 'morning', label: '☀️ Morning', sub: '7–9 am' },
                              { id: 'afternoon', label: '🌤 Afternoon', sub: '12–2 pm' },
                              { id: 'evening', label: '🌙 Evening', sub: '7–9 pm' },
                            ] as const).map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  const newSettings = { ...notifications, checkInTime: opt.id };
                                  saveNotificationSettings(newSettings);
                                  supabase.auth.getUser().then(({ data: { user } }) => {
                                    if (user) scheduleAICheckIns(user.id, notifications.checkInFrequency as any, opt.id);
                                  });
                                }}
                                className={`flex-1 py-2 px-1 rounded-xl text-center transition-all border ${
                                  notifications.checkInTime === opt.id
                                    ? 'border-[#6B9080] bg-[#6B9080]/10 text-[#132F43]'
                                    : 'border-[#E8E4DF] bg-[#F6FBFB] text-foreground hover:border-[#6B9080]'
                                }`}
                              >
                                <p className="text-sm font-medium">{opt.label}</p>
                                <p className="text-sm text-slate-400 mt-0.5">{opt.sub}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className="text-sm text-slate-400 leading-relaxed">
                          Aminy will send a personalized insight based on recent sessions, goals, and behavior patterns — at your chosen time.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Appointment Reminders */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Appointment Reminders</p>
                        <p className="text-sm text-muted-foreground">Before telehealth sessions</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.appointmentReminders}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...notifications, appointmentReminders: checked };
                        saveNotificationSettings(newSettings);
                      }}
                    />
                  </div>

                  {/* Progress Updates */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Info aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Progress Updates</p>
                        <p className="text-sm text-muted-foreground">Goal achievements and milestones</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.progressUpdates}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...notifications, progressUpdates: checked };
                        saveNotificationSettings(newSettings);
                      }}
                    />
                  </div>

                  {/* Community Activity */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Community Activity</p>
                        <p className="text-sm text-muted-foreground">Replies and mentions</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.communityActivity}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...notifications, communityActivity: checked };
                        saveNotificationSettings(newSettings);
                      }}
                    />
                  </div>

                  {/* Marketing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Marketing Emails</p>
                        <p className="text-sm text-muted-foreground">Tips, features, and promotions</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...notifications, marketingEmails: checked };
                        saveNotificationSettings(newSettings);
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Security Section */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === 'security' ? null : 'security')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield aria-hidden="true" className="w-5 h-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold dark:text-white">Security</h3>
                <p className="text-sm text-muted-foreground">Password and two-factor authentication</p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === 'security' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activeSection === 'security' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#E8E4DF] dark:border-slate-700"
              >
                <div className="p-4 space-y-4">
                  {/* Change Password */}
                  <button
                    onClick={() => setShowPasswordDialog(true)}
                    className="w-full flex items-center justify-between p-3 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Key aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Change Password</p>
                        <p className="text-sm text-muted-foreground">Update your password</p>
                      </div>
                    </div>
                    <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between p-3 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Fingerprint aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">
                          {mfaEnabled ? 'Enabled - extra security active' : 'Add extra security to your account'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={mfaEnabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setShowMfaSetup(true);
                        } else {
                          handleDisableMfa();
                        }
                      }}
                    />
                  </div>

                  {mfaEnabled && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <ShieldCheck aria-hidden="true" className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Your account is protected with two-factor authentication
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Connected Calendars Section */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === 'calendars' ? null : 'calendars')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarDays aria-hidden="true" className="w-5 h-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold dark:text-white">Connected Calendars</h3>
                <p className="text-sm text-muted-foreground">
                  {calendarConnected ? 'Google Calendar connected' : 'Sync appointments with your calendar'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {calendarConnected && (
                <Badge className="bg-green-100 text-green-700">Connected</Badge>
              )}
              <ChevronRight aria-hidden="true" className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === 'calendars' ? 'rotate-90' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {activeSection === 'calendars' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#E8E4DF] dark:border-slate-700"
              >
                <div className="p-4 space-y-4">
                  {!calendarConnected ? (
                    /* Not Connected State */
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CalendarDays aria-hidden="true" className="w-6 h-6 text-[#6B9080]" />
                      </div>
                      <h4 className="font-medium dark:text-white mb-1">Connect Google Calendar</h4>
                      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                        Automatically sync your Aminy appointments to Google Calendar and see your full schedule in one place.
                      </p>
                      <Button
                        onClick={handleConnectCalendar}
                        disabled={calendarConnecting}
                        className="bg-primary hover:bg-primary text-white"
                      >
                        {calendarConnecting ? (
                          <>
                            <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <CalendarDays aria-hidden="true" className="w-4 h-4 mr-2" />
                            Connect Google Calendar
                          </>
                        )}
                      </Button>
                      <p className="text-sm text-muted-foreground mt-3">
                        We only access your calendar to create and read events. We never modify or delete your existing events.
                      </p>
                    </div>
                  ) : (
                    /* Connected State */
                    <>
                      {/* Connection Info */}
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-green-800 dark:text-green-300 text-sm">Google Calendar</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {calendarIntegration?.last_sync_at
                              ? `Last synced ${new Date(calendarIntegration.last_sync_at).toLocaleString()}`
                              : 'Connected — not yet synced'}
                          </p>
                        </div>
                        <ShieldCheck aria-hidden="true" className="w-4 h-4 text-green-600" />
                      </div>

                      {/* Auto-Sync Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <RefreshCw aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium dark:text-white">Auto-sync</p>
                            <p className="text-sm text-muted-foreground">
                              Automatically sync new appointments
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={calendarIntegration?.sync_enabled ?? true}
                          onCheckedChange={handleToggleAutoSync}
                        />
                      </div>

                      {/* Sync Now Button */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleSyncNow}
                        disabled={calendarSyncing}
                      >
                        {calendarSyncing ? (
                          <>
                            <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw aria-hidden="true" className="w-4 h-4 mr-2" />
                            Sync Now
                          </>
                        )}
                      </Button>

                      {/* Disconnect */}
                      <button
                        onClick={handleDisconnectCalendar}
                        className="w-full flex items-center justify-center gap-2 p-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Unplug aria-hidden="true" className="w-4 h-4" />
                        Disconnect Google Calendar
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Privacy & Data Section */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === 'privacy' ? null : 'privacy')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock aria-hidden="true" className="w-5 h-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold dark:text-white">Privacy & Data</h3>
                <p className="text-sm text-muted-foreground">Export data and manage privacy</p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === 'privacy' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activeSection === 'privacy' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#E8E4DF] dark:border-slate-700"
              >
                <div className="p-4 space-y-4">
                  {/* Insurance Info */}
                  <div className="p-3 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <CreditCard aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium dark:text-white">Insurance Information</p>
                          <p className="text-sm text-muted-foreground">
                            {hasInsurance ? 'Coverage on file (encrypted)' : 'No insurance on file'}
                          </p>
                        </div>
                      </div>
                      {hasInsurance && (
                        <Badge className="bg-green-100 text-green-700">Stored</Badge>
                      )}
                    </div>
                    {hasInsurance && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowInsuranceDetails(!showInsuranceDetails)}
                        >
                          {showInsuranceDetails ? <EyeOff aria-hidden="true" className="w-3 h-3 mr-1" /> : <Eye aria-hidden="true" className="w-3 h-3 mr-1" />}
                          {showInsuranceDetails ? 'Hide' : 'View'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setHasInsurance(false)}
                        >
                          <Trash2 aria-hidden="true" className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                    {showInsuranceDetails && hasInsurance && insuranceDetails && (
                      <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded border text-sm space-y-1">
                        <p><span className="text-muted-foreground">Plan:</span> {insuranceDetails.plan}</p>
                        <p><span className="text-muted-foreground">Member ID:</span> {insuranceDetails.memberId}</p>
                        <p><span className="text-muted-foreground">Group:</span> {insuranceDetails.group}</p>
                      </div>
                    )}
                  </div>

                  {/* Export Data */}
                  <button
                    onClick={() => setShowExportDialog(true)}
                    className="w-full flex items-center justify-between p-3 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Download aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Export My Data</p>
                        <p className="text-sm text-muted-foreground">Download all your data (GDPR)</p>
                      </div>
                    </div>
                    <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Privacy Policy */}
                  <button
                    onClick={() => onNavigate?.('privacy-policy')}
                    className="w-full flex items-center justify-between p-3 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Privacy Policy</p>
                        <p className="text-sm text-muted-foreground">How we handle your data</p>
                      </div>
                    </div>
                    <ExternalLink aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Terms of Service */}
                  <button
                    onClick={() => onNavigate?.('terms-of-service')}
                    className="w-full flex items-center justify-between p-3 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Terms of Service</p>
                        <p className="text-sm text-muted-foreground">Our terms and conditions</p>
                      </div>
                    </div>
                    <ExternalLink aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Appearance Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Palette aria-hidden="true" className="w-5 h-5 text-primary" />
            <h3 className="font-semibold dark:text-white">Appearance</h3>
          </div>
          <ThemeSelector />
        </Card>

        {/* Resources & Funding */}
        <Card className="divide-y divide-gray-200 dark:divide-slate-700">
          <button
            onClick={() => onNavigate?.('grant-navigator')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <DollarSign aria-hidden="true" className="w-5 h-5 text-primary" />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="font-medium dark:text-white">Grant Navigator</p>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[#6B9080]/10 text-[#6B9080]">Pro</span>
                </div>
                <p className="text-sm text-muted-foreground">Find funding for ABA &amp; behavioral health</p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
          </button>
        </Card>

        {/* Gift & Sponsor */}
        <Card className="divide-y divide-gray-200 dark:divide-slate-700">
          <button
            onClick={() => onNavigate?.('gift-sponsor')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Gift aria-hidden="true" className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium dark:text-white">Gift Aminy / Sponsor a family</p>
                <p className="text-sm text-muted-foreground">Give 3 months to a family, or fund one who can&apos;t afford it</p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
          </button>
        </Card>

        {/* Help Section */}
        <Card className="divide-y divide-gray-200 dark:divide-slate-700">
          <button
            onClick={() => onNavigate?.('feedback')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageCircle aria-hidden="true" className="w-5 h-5 text-[#2A7D99]" />
              <div className="text-left">
                <p className="font-medium dark:text-white">Send Feedback</p>
                <p className="text-sm text-muted-foreground">Help us improve Aminy</p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => window.open('mailto:support@aminy.ai', '_blank')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle aria-hidden="true" className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium dark:text-white">Help & Support</p>
                <p className="text-sm text-muted-foreground">Contact us for assistance</p>
              </div>
            </div>
            <ExternalLink aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
          </button>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <div className="p-4">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="w-5 h-5" />
              Danger Zone
            </h3>

            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 aria-hidden="true" className="w-4 h-4 text-red-600" />
                <div className="text-left">
                  <p className="font-medium text-red-600">Delete Account</p>
                  <p className="text-sm text-red-500">Permanently delete your account and all data</p>
                </div>
              </div>
            </button>
          </div>
        </Card>

        {/* Sign Out */}
        {onLogout && (
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={onLogout}
          >
            <LogOut aria-hidden="true" className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        )}

        {/* App Version — sourced from the shared app config so it stays in sync across screens */}
        <p className="text-center text-sm text-muted-foreground">
          Aminy v{appConfig.version} • Made with care
        </p>
        </div>{/* end settings content cards wrapper */}
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Current Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Must contain uppercase letter and number
              </p>
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                className="mt-1"
              />
            </div>

            {passwordError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle aria-hidden="true" className="w-4 h-4" />
                {passwordError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={isSaving}>
              {isSaving && <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Data Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Your Data</DialogTitle>
            <DialogDescription>
              Download a copy of all your data stored in Aminy
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your export will include:
            </p>
            <ul className="text-sm space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4 text-green-500" />
                Profile information
              </li>
              <li className="flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4 text-green-500" />
                Children's profiles and progress
              </li>
              <li className="flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4 text-green-500" />
                Conversation history with Aminy
              </li>
              <li className="flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4 text-green-500" />
                Vault documents and records
              </li>
            </ul>

            {isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting...</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full bg-[#E8E4DF] rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportData} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download aria-hidden="true" className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle aria-hidden="true" className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>Warning:</strong> Deleting your account will permanently remove:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 mt-2 space-y-1">
                <li>• All profile and children data</li>
                <li>• Conversation history</li>
                <li>• Vault documents and records</li>
                <li>• Subscription and payment history</li>
              </ul>
            </div>

            <Label>Type DELETE to confirm</Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || isLoading}
            >
              {isLoading && <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Setup Dialog */}
      <Dialog open={showMfaSetup} onOpenChange={setShowMfaSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Add an extra layer of security to your account
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app when you sign in.
            </p>

            <div className="p-4 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg">
              <p className="text-sm font-medium mb-2">You'll need:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>• Access to your phone</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMfaSetup(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnableMfa}>
              <Fingerprint aria-hidden="true" className="w-4 h-4 mr-2" />
              Set Up 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsScreen;
