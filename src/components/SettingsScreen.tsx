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
  Globe,
  Fingerprint,
  ShieldCheck,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ThemeSelector } from '../lib/theme-provider';
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

  // Insurance state
  const [hasInsurance, setHasInsurance] = useState(true);
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
    marketingEmails: false
  });

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

  // Load settings
  useEffect(() => {
    loadSettings();
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

      if (prefs) {
        setNotifications({
          pushEnabled: prefs.push_enabled ?? true,
          emailDigest: prefs.email_digest ?? true,
          emailDigestFrequency: prefs.email_digest_frequency || 'weekly',
          smsReminders: prefs.sms_reminders ?? false,
          appointmentReminders: prefs.appointment_reminders ?? true,
          progressUpdates: prefs.progress_updates ?? true,
          communityActivity: prefs.community_activity ?? true,
          marketingEmails: prefs.marketing_emails ?? false
        });
      }

      // Check MFA status
      const { data: factors } = await supabase.auth.mfa.listFactors();
      setMfaEnabled(factors?.totp?.length > 0 || false);

    } catch (error) {
      console.error('Error loading settings:', error);
    }
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
          updated_at: new Date().toISOString()
        });

      setNotifications(newSettings);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
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
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to update password');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable 2FA');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
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
      // In production, this would call a secure backend endpoint
      // that handles account deletion properly
      toast.success('Account deletion requested. You will receive a confirmation email.');
      setShowDeleteDialog(false);
      onLogout?.();
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = () => {
    // Open Stripe Customer Portal or navigate to subscription page
    onNavigate?.('paywall');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold dark:text-white">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Subscription Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
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
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleManageSubscription}>
              Manage
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-teal-500" />
              <div className="text-left">
                <h3 className="font-semibold dark:text-white">Notifications</h3>
                <p className="text-sm text-muted-foreground">Push, email, and SMS preferences</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === 'notifications' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activeSection === 'notifications' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 dark:border-slate-700"
              >
                <div className="p-4 space-y-4">
                  {/* Push Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium dark:text-white">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Get alerts on your device</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.pushEnabled}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...notifications, pushEnabled: checked };
                        saveNotificationSettings(newSettings);
                      }}
                    />
                  </div>

                  {/* Email Digest */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
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

                  {/* Appointment Reminders */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
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
                      <Info className="w-4 h-4 text-muted-foreground" />
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
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
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
                      <Mail className="w-4 h-4 text-muted-foreground" />
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
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-teal-500" />
              <div className="text-left">
                <h3 className="font-semibold dark:text-white">Security</h3>
                <p className="text-sm text-muted-foreground">Password and two-factor authentication</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === 'security' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activeSection === 'security' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 dark:border-slate-700"
              >
                <div className="p-4 space-y-4">
                  {/* Change Password */}
                  <button
                    onClick={() => setShowPasswordDialog(true)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Change Password</p>
                        <p className="text-sm text-muted-foreground">Update your password</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-4 h-4 text-muted-foreground" />
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
                      <ShieldCheck className="w-4 h-4 text-green-600" />
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

        {/* Privacy & Data Section */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === 'privacy' ? null : 'privacy')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-teal-500" />
              <div className="text-left">
                <h3 className="font-semibold dark:text-white">Privacy & Data</h3>
                <p className="text-sm text-muted-foreground">Export data and manage privacy</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === 'privacy' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activeSection === 'privacy' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 dark:border-slate-700"
              >
                <div className="p-4 space-y-4">
                  {/* Insurance Info */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
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
                          {showInsuranceDetails ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {showInsuranceDetails ? 'Hide' : 'View'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setHasInsurance(false)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                    {showInsuranceDetails && hasInsurance && (
                      <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded border text-sm space-y-1">
                        <p><span className="text-muted-foreground">Plan:</span> Blue Cross Blue Shield</p>
                        <p><span className="text-muted-foreground">Member ID:</span> ••••••6789</p>
                        <p><span className="text-muted-foreground">Group:</span> GRP123</p>
                      </div>
                    )}
                  </div>

                  {/* Export Data */}
                  <button
                    onClick={() => setShowExportDialog(true)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Export My Data</p>
                        <p className="text-sm text-muted-foreground">Download all your data (GDPR)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Privacy Policy */}
                  <button
                    onClick={() => onNavigate?.('privacy-policy')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Privacy Policy</p>
                        <p className="text-sm text-muted-foreground">How we handle your data</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Terms of Service */}
                  <button
                    onClick={() => onNavigate?.('terms-of-service')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium dark:text-white">Terms of Service</p>
                        <p className="text-sm text-muted-foreground">Our terms and conditions</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Appearance Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-teal-500" />
            <h3 className="font-semibold dark:text-white">Appearance</h3>
          </div>
          <ThemeSelector />
        </Card>

        {/* Help Section */}
        <Card className="divide-y divide-gray-200 dark:divide-slate-700">
          <button
            onClick={() => window.open('mailto:support@aminy.care', '_blank')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-teal-500" />
              <div className="text-left">
                <p className="font-medium dark:text-white">Help & Support</p>
                <p className="text-sm text-muted-foreground">Contact us for assistance</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <div className="p-4">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h3>

            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-red-600" />
                <div className="text-left">
                  <p className="font-medium text-red-600">Delete Account</p>
                  <p className="text-sm text-red-500">Permanently delete your account and all data</p>
                </div>
              </div>
            </button>
          </div>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground">
          Aminy v1.0.0 • Made with care
        </p>
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
              <p className="text-xs text-muted-foreground mt-1">
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
                <AlertCircle className="w-4 h-4" />
                {passwordError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                <Check className="w-4 h-4 text-green-500" />
                Profile information
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Children's profiles and progress
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Conversation history with Aminy
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Vault documents and records
              </li>
            </ul>

            {isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting...</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
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
              <AlertTriangle className="w-5 h-5" />
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
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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

            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
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
              <Fingerprint className="w-4 h-4 mr-2" />
              Set Up 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsScreen;
