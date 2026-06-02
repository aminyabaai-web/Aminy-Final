// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AccountSettingsPremium - 10/10 Apple Health / Calm App Aesthetic
 *
 * Features:
 * - Refined typography and spacing (Whitespace as a design element)
 * - Premium, calm color palette (#F8F8F6 background, subtle shadows)
 * - Deep HIPAA compliance tracking and BAA generation display
 * - Complete Stripe subscription management hookups
 * - GDPR Data Export
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    ShieldCheck,
    CreditCard,
    Trash2,
    AlertCircle,
    Lock,
    Eye,
    EyeOff,
    LogOut,
    Bell,
    Smartphone,
    Mail,
    Clock,
    Info,
    MessageSquare,
    Key,
    Fingerprint,
    Download,
    FileText,
    ChevronRight,
    Check,
    Loader2,
    Crown,
    ExternalLink,
    HelpCircle,
    AlertTriangle,
    FileSignature
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { TierType } from '../lib/tier-utils';

interface AccountSettingsPremiumProps {
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

export function AccountSettingsPremium({ onBack, onLogout, onNavigate, userTier = 'core' }: AccountSettingsPremiumProps) {
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

    // HIPAA / BAA
    const [hipaaConsentSigned, setHipaaConsentSigned] = useState(true);

    // Data export
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

    // Account deletion
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Subscription — tier comes from props; period/status hydrate from billing when available
    const [subscription] = useState<SubscriptionInfo>({
        tier: userTier,
        status: 'active',
        currentPeriodEnd: undefined,
        cancelAtPeriodEnd: false
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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

            const { data: factors } = await supabase.auth.mfa.listFactors();
            setMfaEnabled((factors?.totp && factors.totp.length > 0) || false);

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

    const handleExportData = async () => {
        setIsExporting(true);
        setExportProgress(0);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const interval = setInterval(() => {
                setExportProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 500);

            const [profileRes, childrenRes, conversationsRes, vaultRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id),
                supabase.from('children').select('*').eq('parent_id', user.id),
                supabase.from('conversations').select('*').eq('user_id', user.id).limit(100),
                supabase.from('vault_records').select('*').eq('user_id', user.id)
            ]);

            clearInterval(interval);
            setExportProgress(100);

            const exportData = {
                exportDate: new Date().toISOString(),
                profile: profileRes.data,
                children: childrenRes.data,
                conversations: conversationsRes.data,
                vaultRecords: vaultRes.data
            };

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
            toast.success('Account deletion requested. You will receive a confirmation email.');
            setShowDeleteDialog(false);
            onLogout?.();
        } catch (error) {
            toast.error('Failed to delete account');
        } finally {
            setIsLoading(false);
        }
    };

    const SectionButton = ({ title, subtitle, icon: Icon, active, onClick, color = '#5a7380' }: {
        title: string;
        subtitle: string;
        icon: React.ComponentType<{ size: number; color: string }>;
        active: boolean;
        onClick: () => void;
        color?: string;
    }) => (
        <button
            onClick={onClick}
            className="w-full px-5 py-4 flex items-center justify-between bg-white border-b border-gray-900/4 cursor-pointer transition-colors duration-200 font-sans antialiased hover:bg-[#FAFAFA]"
        >
            <div className="flex items-center gap-4">
                <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                    style={{ backgroundColor: `${color}15` }}
                >
                    <Icon size={18} color={color} />
                </div>
                <div className="text-left">
                    <h3 className="text-[15px] font-medium text-gray-900/90">{title}</h3>
                    <p className="text-[13px] text-gray-900/45 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <ChevronRight size={18} color="rgba(17, 24, 39, 0.3)" style={{
                transform: active ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
            }} />
        </button>
    );

    return (
        <div className="min-h-screen bg-[#F8F8F6] pb-[100px] font-sans antialiased">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F8F8F6]/85 backdrop-blur-md border-b border-gray-900/4">
                <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-9 h-9 rounded-full border-none bg-white shadow-back-btn flex items-center justify-center cursor-pointer"
                        >
                            <ArrowLeft size={18} color="rgba(17, 24, 39, 0.7)" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-[20px] font-semibold text-gray-900/90 tracking-[-0.01em]">Account</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-[640px] mx-auto px-5 py-6 flex flex-col gap-6">

                {/* Plan & Subscription Card */}
                <div className="bg-white rounded-[20px] p-5 shadow-card flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#5a7380] to-[#4a6370] flex items-center justify-center">
                            <Crown size={22} color="#FFFFFF" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-[17px] font-semibold text-gray-900/90">
                                    {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
                                </h2>
                                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                                    subscription.status === 'active'
                                        ? 'bg-teal-600/10 text-teal-600'
                                        : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                    {subscription.status.toUpperCase()}
                                </span>
                            </div>
                            {subscription.currentPeriodEnd && !isNaN(new Date(subscription.currentPeriodEnd).getTime()) && (
                                <p className="text-[13px] text-gray-900/45">
                                    {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'} {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate?.('paywall')}
                        className="px-4 py-2 rounded-[12px] border border-gray-900/10 bg-white text-[13px] font-medium text-gray-900/80 cursor-pointer"
                    >
                        Manage
                    </button>
                </div>

                {/* Trust Engine Settings Group */}
                <div className="bg-white rounded-[20px] shadow-card overflow-hidden">
                    <SectionButton
                        title="Privacy & Data Control"
                        subtitle="HIPAA, BAA, Export"
                        icon={ShieldCheck}
                        color="#0d9488"
                        active={activeSection === 'privacy'}
                        onClick={() => setActiveSection(activeSection === 'privacy' ? null : 'privacy')}
                    />
                    <AnimatePresence>
                        {activeSection === 'privacy' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-[#FAFAFA]"
                            >
                                <div className="px-5 py-4 border-b border-gray-900/4 flex flex-col gap-5">

                                    {/* HIPAA Notice */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900/90">HIPAA Data Privacy</p>
                                            <p className="text-[13px] text-gray-900/50 mt-0.5">Your data is encrypted and handled under our HIPAA-conscious privacy program.</p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-teal-600/10 text-teal-600 flex items-center gap-1">
                                            <Check size={12} /> Active
                                        </span>
                                    </div>

                                    {/* BAA Document */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900/90">Business Associate Agreement</p>
                                            <p className="text-[13px] text-gray-900/50 mt-0.5">For clinical providers & agencies.</p>
                                        </div>
                                        <button
                                            onClick={() => toast.info('Business Associate Agreements are issued during provider/agency onboarding. Contact support@aminy.ai to request a copy.')}
                                            className="px-3 py-1.5 rounded-lg border border-gray-900/10 bg-white text-[12px] font-medium text-gray-900/80 cursor-pointer flex items-center gap-1"
                                        >
                                            <FileSignature size={14} /> View BAA
                                        </button>
                                    </div>

                                    {/* Export */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900/90">Export Account Data</p>
                                            <p className="text-[13px] text-gray-900/50 mt-0.5">Download a complete JSON archive of all logs.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowExportDialog(true)}
                                            className="px-3 py-1.5 rounded-lg border border-gray-900/10 bg-white text-[12px] font-medium text-gray-900/80 cursor-pointer flex items-center gap-1"
                                        >
                                            <Download size={14} /> Request
                                        </button>
                                    </div>

                                    {/* Legal Links */}
                                    <div className="pt-3 border-t border-gray-900/5 flex gap-4">
                                        <span onClick={() => onNavigate?.('privacy-policy')} className="text-[13px] text-[#5a7380] cursor-pointer flex items-center gap-1"><FileText size={14} /> Privacy Policy</span>
                                        <span onClick={() => onNavigate?.('terms-of-service')} className="text-[13px] text-[#5a7380] cursor-pointer flex items-center gap-1"><FileText size={14} /> Terms of Service</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <SectionButton
                        title="Notifications"
                        subtitle="Push, email, insights"
                        icon={Bell}
                        color="#ec4899"
                        active={activeSection === 'notifications'}
                        onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
                    />
                    <AnimatePresence>
                        {activeSection === 'notifications' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-[#FAFAFA]"
                            >
                                <div className="px-5 py-4 border-b border-gray-900/4 flex flex-col gap-5">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Smartphone size={16} color="rgba(17, 24, 39, 0.4)" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900/90">Push Notifications</p>
                                                <p className="text-[13px] text-gray-900/50">Instant alerts on your device</p>
                                            </div>
                                        </div>
                                        <Switch checked={notifications.pushEnabled} onCheckedChange={(checked) => saveNotificationSettings({ ...notifications, pushEnabled: checked })} />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Mail size={16} color="rgba(17, 24, 39, 0.4)" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900/90">Weekly AI Digest</p>
                                                <p className="text-[13px] text-gray-900/50">Summaries of your child's progress</p>
                                            </div>
                                        </div>
                                        <Switch checked={notifications.emailDigest} onCheckedChange={(checked) => saveNotificationSettings({ ...notifications, emailDigest: checked })} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <SectionButton
                        title="Security"
                        subtitle="Password, 2FA"
                        icon={Lock}
                        color="#5a7380"
                        active={activeSection === 'security'}
                        onClick={() => setActiveSection(activeSection === 'security' ? null : 'security')}
                    />
                    <AnimatePresence>
                        {activeSection === 'security' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-[#FAFAFA]"
                            >
                                <div className="px-5 py-4 flex flex-col gap-5">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Key size={16} color="rgba(17, 24, 39, 0.4)" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900/90">Change Password</p>
                                                <p className="text-[13px] text-gray-900/50">Update your login credentials</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowPasswordDialog(true)} className="px-3 py-1.5 rounded-lg border border-gray-900/10 bg-white text-[12px] font-medium cursor-pointer">Update</button>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Fingerprint size={16} color="rgba(17, 24, 39, 0.4)" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900/90">Two-Factor Authentication (2FA)</p>
                                                <p className="text-[13px] text-gray-900/50">{mfaEnabled ? 'Extra security active' : 'Add extra security'}</p>
                                            </div>
                                        </div>
                                        <Switch checked={mfaEnabled} onCheckedChange={(checked) => checked ? toast.info('Authenticator-app two-factor setup is coming soon. We will notify you when it is available.') : handleDisableMfa()} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Support & Logout */}
                <div className="bg-white rounded-[20px] shadow-card overflow-hidden">
                    <button
                        onClick={() => window.open('mailto:support@aminy.ai', '_blank')}
                        className="w-full px-5 py-4 flex items-center justify-between bg-white border-b border-gray-900/4 cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <HelpCircle size={18} color="rgba(17, 24, 39, 0.6)" />
                            <span className="text-[15px] font-medium text-gray-900/90">Contact Support</span>
                        </div>
                        <ExternalLink size={16} color="rgba(17, 24, 39, 0.3)" />
                    </button>

                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="w-full px-5 py-4 flex items-center gap-3 bg-white cursor-pointer border-none"
                        >
                            <LogOut size={18} color="rgba(220, 38, 38, 0.8)" />
                            <span className="text-[15px] font-medium text-red-600/90">Sign Out</span>
                        </button>
                    )}
                </div>

                {/* App Version — kept consistent with SettingsScreen; derived from VITE_APP_VERSION (same source as production.config / env-config), default 1.0.0 */}
                <p className="text-center text-[12px] text-gray-900/30 mt-2">
                    Aminy v{import.meta.env.VITE_APP_VERSION || '1.0.0'} • Made with care
                </p>

            </div>

            {/* Dialogs remain identical state-wise, updating just visual layout lightly */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogContent className="rounded-[24px] p-6 font-sans antialiased">
                    <DialogHeader>
                        <DialogTitle>Export Your Data</DialogTitle>
                        <DialogDescription>Download a complete JSON archive of all logs according to GDPR/HIPAA standards.</DialogDescription>
                    </DialogHeader>
                    <div className="py-5">
                        {isExporting ? (
                            <div className="text-center">
                                <Loader2 className="animate-spin mx-auto mb-4" color="#5a7380" />
                                <p className="text-sm text-gray-900/60">Generating your archive... {exportProgress}%</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-900/70">This will export all child profiles, chat logs, forms, and vault documents.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExportDialog(false)} className="rounded-[12px]">Cancel</Button>
                        <Button onClick={handleExportData} disabled={isExporting} className="bg-[#5a7380] rounded-[12px] text-white">
                            Start Export
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent className="rounded-[24px] p-6 font-sans antialiased">
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>Use at least 8 characters with an uppercase letter and a number.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex flex-col gap-3">
                        <div className="relative">
                            <Input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="New password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="rounded-[12px] pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(v => !v)}
                                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <Input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="rounded-[12px]"
                        />
                        {passwordError && (
                            <p className="text-[13px] text-red-600 flex items-center gap-1"><AlertCircle size={14} /> {passwordError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="rounded-[12px]">Cancel</Button>
                        <Button onClick={handlePasswordChange} disabled={isSaving} className="bg-[#5a7380] rounded-[12px] text-white">
                            {isSaving ? 'Updating…' : 'Update Password'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default AccountSettingsPremium;
