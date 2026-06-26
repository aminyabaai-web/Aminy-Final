// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProfileScreen - Comprehensive Profile Management
 *
 * Features:
 * - Profile photo upload with preview
 * - Parent profile editing
 * - Child management (add/edit/delete)
 * - Caregiver management link
 * - Connected accounts (Google/Apple)
 * - Session/login history
 * - Subscription status
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { logPHIView } from '../lib/security/hipaa-audit';
import {
  ArrowLeft,
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  Users,
  ChevronRight,
  Shield,
  Calendar,
  Clock,
  Smartphone,
  Globe,
  Crown,
  Baby,
  Cake,
  Heart,
  AlertCircle,
  Upload,
  Loader2,
  Link as LinkIcon,
  LogOut
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { TierType, getTierDisplayName } from '../lib/tier-utils';
import { useAuditedAction } from '../hooks/useAuditedAction';
import { isDemoMode } from '../lib/demo-seed';
import { UsageMeter } from './UsageMeter';
import { useRateLimitStore } from '../lib/rate-limit-store';

// Derive an honest label for the current device from the browser user-agent.
// No fabricated IP/location — we only know what the client tells us.
function describeCurrentDevice(): { device: string; browser: string } {
  if (typeof navigator === 'undefined' || !navigator.userAgent) {
    return { device: 'This device', browser: 'Current browser' };
  }
  const ua = navigator.userAgent;
  let device = 'This device';
  if (/iPad/i.test(ua)) device = 'iPad';
  else if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/Android/i.test(ua)) device = 'Android device';
  else if (/Macintosh|Mac OS X/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux device';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  return { device, browser };
}

// Types
interface ParentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  createdAt: string;
}

interface ChildProfile {
  id: string;
  name: string;
  dateOfBirth?: string;
  age: number;
  photoUrl?: string;
  diagnoses: string[];
  concerns: string[];
  goals: string[];
  isPrimary: boolean;
}

interface ConnectedAccount {
  provider: 'google' | 'apple';
  email: string;
  connectedAt: string;
}

interface LoginSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

interface ProfileScreenProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  userTier?: TierType;
}

// Diagnosis options
const DIAGNOSIS_OPTIONS = [
  'Autism Spectrum Disorder (ASD)',
  'ADHD',
  'Sensory Processing Disorder',
  'Speech/Language Delay',
  'Developmental Delay',
  'Anxiety',
  'Learning Disability',
  'Down Syndrome',
  'Cerebral Palsy',
  'Other',
  'Awaiting Evaluation',
  'No Diagnosis'
];

// Concern categories
const CONCERN_OPTIONS = [
  'Communication',
  'Behavior/Meltdowns',
  'Sleep',
  'Feeding/Eating',
  'Sensory Issues',
  'Social Skills',
  'Self-Care/Independence',
  'Motor Skills',
  'Academic/Learning',
  'Emotional Regulation',
  'Transitions',
  'Aggression',
  'Self-Injury'
];

export function ProfileScreen({ onBack, onNavigate, userTier = 'core' }: ProfileScreenProps) {
  // HIPAA audit: log PHI view on mount
  const { logAction, logExport } = useAuditedAction('child_profile');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'children' | 'security'>('profile');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const childFileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profile, setProfile] = useState<ParentProfile>({
    id: '',
    name: '',
    email: '',
    phone: '',
    location: '',
    photoUrl: '',
    createdAt: ''
  });

  const [editedProfile, setEditedProfile] = useState<ParentProfile>(profile);

  // Children state
  const [children, setChildren] = useState<ChildProfile[]>([]);

  // New child form
  const [newChild, setNewChild] = useState<Partial<ChildProfile>>({
    name: '',
    age: 0,
    diagnoses: [],
    concerns: [],
    goals: [],
    isPrimary: false
  });

  // Connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);

  // Login sessions
  const [sessions, setSessions] = useState<LoginSession[]>([]);

  // AI usage from rate-limit store
  const { dailyUsage, fetchUsage } = useRateLimitStore();
  useEffect(() => { fetchUsage(); }, []);

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        logPHIView(user.id, 'parent', user.email || '', 'profile', user.id, 'profile').catch(() => {});
        const loadedProfile = {
          id: user.id,
          name: profileData.name || user.user_metadata?.full_name || '',
          email: user.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          photoUrl: profileData.avatar_url || user.user_metadata?.avatar_url || '',
          createdAt: user.created_at || ''
        };
        setProfile(loadedProfile);
        setEditedProfile(loadedProfile);
      }

      // Load children
      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });

      if (childrenData) {
        setChildren(childrenData.map(c => ({
          id: c.id,
          name: c.name,
          dateOfBirth: c.date_of_birth,
          age: c.age_years || calculateAge(c.date_of_birth),
          photoUrl: c.avatar_url,
          diagnoses: c.diagnoses || [],
          concerns: c.concerns || [],
          goals: c.goals || [],
          isPrimary: c.is_primary || false
        })));
      }

      // Check connected accounts from user metadata
      const providers = user.app_metadata?.providers || [];
      const accounts: ConnectedAccount[] = [];

      if (providers.includes('google')) {
        accounts.push({
          provider: 'google',
          email: user.user_metadata?.email || user.email || '',
          connectedAt: user.created_at || ''
        });
      }
      if (providers.includes('apple')) {
        accounts.push({
          provider: 'apple',
          email: user.user_metadata?.email || user.email || '',
          connectedAt: user.created_at || ''
        });
      }
      setConnectedAccounts(accounts);

      // Active sessions: a dedicated session-tracking table is not yet wired, so
      // we do NOT fabricate sessions. Real users see an honest "this device"
      // entry derived from the browser (no fake IP/location). Investor/partner
      // demo walk-throughs show a representative sample session, clearly the
      // only populated state and never presented to a live user as their own.
      if (isDemoMode()) {
        setSessions([
          {
            id: 'sample-1',
            device: 'iPhone 15 Pro',
            browser: 'Safari',
            location: 'Sample location',
            ipAddress: '—',
            lastActive: new Date().toISOString(),
            isCurrent: true
          }
        ]);
      } else {
        const { device, browser } = describeCurrentDevice();
        setSessions([
          {
            id: 'current',
            device,
            browser,
            // Location/IP are not tracked yet — leave blank rather than invent one.
            location: '',
            ipAddress: '',
            lastActive: new Date().toISOString(),
            isCurrent: true
          }
        ]);
      }

    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (dateOfBirth?: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          name: editedProfile.name,
          phone: editedProfile.phone,
          location: editedProfile.location,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, isChild: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = isChild && editingChild
        ? `children/${editingChild.id}.${fileExt}`
        : `profiles/${user.id}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (isChild && editingChild) {
        // Update child photo
        await supabase
          .from('children')
          .update({ avatar_url: publicUrl })
          .eq('id', editingChild.id);

        setChildren(prev => prev.map(c =>
          c.id === editingChild.id ? { ...c, photoUrl: publicUrl } : c
        ));
        setEditingChild({ ...editingChild, photoUrl: publicUrl });
      } else {
        // Update profile photo
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        setProfile(prev => ({ ...prev, photoUrl: publicUrl }));
        setEditedProfile(prev => ({ ...prev, photoUrl: publicUrl }));
      }

      toast.success('Photo updated!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    }
  };

  const handleAddChild = async () => {
    if (!newChild.name || !newChild.age) {
      toast.error('Please enter child name and age');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isPrimary = children.length === 0;

      const { data, error } = await supabase
        .from('children')
        .insert({
          parent_id: user.id,
          name: newChild.name,
          age_years: newChild.age,
          diagnoses: newChild.diagnoses,
          concerns: newChild.concerns,
          goals: newChild.goals,
          is_primary: isPrimary
        })
        .select()
        .single();

      if (error) throw error;

      setChildren([...children, {
        id: data.id,
        name: data.name,
        age: data.age_years,
        diagnoses: data.diagnoses || [],
        concerns: data.concerns || [],
        goals: data.goals || [],
        isPrimary: data.is_primary
      }]);

      setNewChild({
        name: '',
        age: 0,
        diagnoses: [],
        concerns: [],
        goals: [],
        isPrimary: false
      });
      setShowAddChild(false);
      toast.success(`${data.name} added successfully!`);
    } catch (error) {
      console.error('Error adding child:', error);
      toast.error('Failed to add child');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateChild = async () => {
    if (!editingChild) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('children')
        .update({
          name: editingChild.name,
          age_years: editingChild.age,
          diagnoses: editingChild.diagnoses,
          concerns: editingChild.concerns,
          goals: editingChild.goals,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingChild.id);

      if (error) throw error;

      setChildren(prev => prev.map(c =>
        c.id === editingChild.id ? editingChild : c
      ));
      setEditingChild(null);
      toast.success('Child profile updated!');
    } catch (error) {
      console.error('Error updating child:', error);
      toast.error('Failed to update child');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);

      if (error) throw error;

      setChildren(prev => prev.filter(c => c.id !== childId));
      setShowDeleteConfirm(null);
      toast.success('Child removed');
    } catch (error) {
      console.error('Error deleting child:', error);
      toast.error('Failed to remove child');
    }
  };

  const handleSetPrimaryChild = async (childId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear all primary flags
      await supabase
        .from('children')
        .update({ is_primary: false })
        .eq('parent_id', user.id);

      // Set new primary
      await supabase
        .from('children')
        .update({ is_primary: true })
        .eq('id', childId);

      setChildren(prev => prev.map(c => ({
        ...c,
        isPrimary: c.id === childId
      })));

      toast.success('Primary child updated');
    } catch (error) {
      console.error('Error setting primary child:', error);
      toast.error('Failed to update primary child');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    // In production, this would call an API to revoke the session
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Session revoked');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700">
        <div className="max-w-2xl md:max-w-2xl md:mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-semibold dark:text-white">Profile</h1>
              <h2 className="sr-only">Profile overview</h2>
              <h3 className="sr-only">Account and household sections</h3>
              <p className="text-sm text-muted-foreground">
                Manage your account and family
              </p>
            </div>
            {userTier !== 'free' && (
              <Badge className="bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                {getTierDisplayName(userTier)}
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 border-b border-[#E8E4DF] dark:border-slate-700">
            {[
              { id: 'profile', label: 'My Profile', icon: User },
              { id: 'children', label: 'Children', icon: Baby },
              { id: 'security', label: 'Security', icon: Shield }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'profile' | 'children' | 'security')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#6B9080] text-[#6B9080] dark:text-[#7BA7BC]'
                    : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl md:max-w-2xl md:mx-auto px-4 py-6 space-y-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0"
          >
            {/* Profile Photo */}
            <Card className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                    {profile.photoUrl ? (
                      <AvatarImage src={profile.photoUrl} alt={profile.name} />
                    ) : (
                      <AvatarFallback className="text-white text-2xl font-semibold" style={{ background: 'linear-gradient(135deg, #4E93A8, #6AA9BC)' }}>
                        {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-[#6B9080] transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, false)}
                    className="hidden"
                  />
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-semibold dark:text-white">{profile.name}</h2>
                  <p className="text-muted-foreground">{profile.email}</p>
                  {profile.createdAt && !isNaN(new Date(profile.createdAt).getTime()) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Member since {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Profile Details */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold dark:text-white">Personal Information</h3>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditedProfile(profile);
                        setIsEditing(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium dark:text-white">{profile.name || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <p className="font-medium dark:text-white">{profile.email}</p>
                  <p className="text-sm text-muted-foreground">Email cannot be changed here</p>
                </div>

                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium dark:text-white">{profile.phone || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.location}
                      onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                      placeholder="City, State"
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium dark:text-white">{profile.location || 'Not set'}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* AI Usage — full width in 2-col grid */}
            <div className="lg:col-span-2">
              <UsageMeter
                variant="full"
                tier={userTier}
                messagesUsedToday={dailyUsage?.used ?? 0}
                documentsUploaded={0}
                memoryFactsStored={0}
                onUpgrade={() => onNavigate?.('upgrade')}
              />
            </div>

            {/* Connected Accounts */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 dark:text-white">Connected Accounts</h3>
              <div className="space-y-3">
                {connectedAccounts.length > 0 ? (
                  connectedAccounts.map(account => (
                    <div key={account.provider} className="flex items-center justify-between p-3 bg-[#FAF7F2] dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {account.provider === 'google' ? (
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium capitalize dark:text-white">{account.provider}</p>
                          <p className="text-sm text-muted-foreground">{account.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-[#6B9080]/10 text-[#6B9080] border-[#6B9080]/20">
                        Connected
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <LinkIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No connected accounts</p>
                    <p className="text-sm text-muted-foreground">
                      Connect Google or Apple for faster sign-in
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Links */}
            <Card className="divide-y divide-[#E8E4DF] dark:divide-slate-700">
              <button
                onClick={() => onNavigate?.('caregivers')}
                className="w-full p-4 flex items-center justify-between hover:bg-[#FAF7F2] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium dark:text-white">Manage Caregivers</p>
                    <p className="text-sm text-muted-foreground">Invite family members and set permissions</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => onNavigate?.('settings')}
                className="w-full p-4 flex items-center justify-between hover:bg-[#FAF7F2] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium dark:text-white">Privacy & Settings</p>
                    <p className="text-sm text-muted-foreground">Notifications, data, and preferences</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </Card>
          </motion.div>
        )}

        {/* Children Tab */}
        {activeTab === 'children' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Children List */}
            {children.map(child => (
              <Card key={child.id} className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 border-2 border-[#E8E4DF]">
                    {child.photoUrl ? (
                      <AvatarImage src={child.photoUrl} alt={child.name} />
                    ) : (
                      <AvatarFallback className="text-white text-xl font-semibold" style={{ background: 'linear-gradient(135deg, #6AA9BC, #4E93A8)' }}>
                        {child.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg dark:text-white">{child.name}</h3>
                      {child.isPrimary && (
                        <Badge className="bg-[#6B9080]/10 text-[#6B9080] border-[#6B9080]/20">
                          Primary
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Cake className="w-4 h-4" />
                        {child.age} years old
                      </span>
                    </div>

                    {child.diagnoses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {child.diagnoses.slice(0, 2).map(d => (
                          <Badge key={d} variant="outline" className="text-sm">
                            {d}
                          </Badge>
                        ))}
                        {child.diagnoses.length > 2 && (
                          <Badge variant="outline" className="text-sm">
                            +{child.diagnoses.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingChild(child)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      {!child.isPrimary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimaryChild(child.id)}
                        >
                          <Heart className="w-3 h-3 mr-1" />
                          Set as Primary
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowDeleteConfirm(child.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Add Child Button */}
            <Button
              onClick={() => setShowAddChild(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>

            {children.length === 0 && (
              <Card className="p-8 text-center">
                <Baby className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2 dark:text-white">No children added yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your child to get personalized care plans and strategies
                </p>
                <Button onClick={() => setShowAddChild(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Child
                </Button>
              </Card>
            )}
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Active Sessions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 dark:text-white">Active Sessions</h3>
              <div className="space-y-3">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-[#FAF7F2] dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#6B9080]/10 rounded-full flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium dark:text-white">{session.device}</p>
                          {session.isCurrent && (
                            <Badge className="bg-[#6B9080]/10 text-[#6B9080] text-sm">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[session.browser, session.location].filter(Boolean).join(' • ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last active: {new Date(session.lastActive).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Security Tips */}
            <Card className="p-6 bg-[#6B9080]/10 border-[#6B9080]/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-[#1B2733] dark:text-white mb-1">
                    Keep your account secure
                  </h4>
                  <ul className="text-sm text-[#5A6B7A] dark:text-slate-300 space-y-1">
                    <li>• Use a strong, unique password</li>
                    <li>• Enable two-factor authentication in Settings</li>
                    <li>• Review active sessions regularly</li>
                    <li>• Never share your login credentials</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Add/Edit Child Dialog */}
      <Dialog open={showAddChild || !!editingChild} onOpenChange={() => {
        setShowAddChild(false);
        setEditingChild(null);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChild ? `Edit ${editingChild.name}'s Profile` : 'Add Child'}
            </DialogTitle>
            <DialogDescription>
              {editingChild
                ? 'Update your child\'s information'
                : 'Add your child to get personalized care plans'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Photo Upload for Edit */}
            {editingChild && (
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-2 border-[#E8E4DF]">
                    {editingChild.photoUrl ? (
                      <AvatarImage src={editingChild.photoUrl} alt={editingChild.name} />
                    ) : (
                      <AvatarFallback className="text-white text-2xl" style={{ background: 'linear-gradient(135deg, #6AA9BC, #4E93A8)' }}>
                        {editingChild.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <button
                    onClick={() => childFileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={childFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, true)}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <Label>Child's Name</Label>
              <Input
                value={editingChild?.name || newChild.name}
                onChange={(e) => editingChild
                  ? setEditingChild({ ...editingChild, name: e.target.value })
                  : setNewChild({ ...newChild, name: e.target.value })
                }
                placeholder="First name"
                className="mt-1"
              />
            </div>

            {/* Age */}
            <div>
              <Label>Age</Label>
              <Select
                value={String(editingChild?.age || newChild.age || '')}
                onValueChange={(val) => editingChild
                  ? setEditingChild({ ...editingChild, age: parseInt(val) })
                  : setNewChild({ ...newChild, age: parseInt(val) })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select age" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(18)].map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1} {i === 0 ? 'year' : 'years'} old
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Diagnoses */}
            <div>
              <Label>Diagnosis (optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select all that apply
              </p>
              <div className="flex flex-wrap gap-2">
                {DIAGNOSIS_OPTIONS.map(diagnosis => {
                  const isSelected = editingChild
                    ? editingChild.diagnoses.includes(diagnosis)
                    : newChild.diagnoses?.includes(diagnosis);

                  return (
                    <Badge
                      key={diagnosis}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary hover:bg-[#216982]' : 'hover:bg-[#F0EDE8]'
                      }`}
                      onClick={() => {
                        if (editingChild) {
                          setEditingChild({
                            ...editingChild,
                            diagnoses: isSelected
                              ? editingChild.diagnoses.filter(d => d !== diagnosis)
                              : [...editingChild.diagnoses, diagnosis]
                          });
                        } else {
                          setNewChild({
                            ...newChild,
                            diagnoses: isSelected
                              ? (newChild.diagnoses || []).filter(d => d !== diagnosis)
                              : [...(newChild.diagnoses || []), diagnosis]
                          });
                        }
                      }}
                    >
                      {diagnosis}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Concerns */}
            <div>
              <Label>Main Concerns (optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                What are your biggest challenges?
              </p>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map(concern => {
                  const isSelected = editingChild
                    ? editingChild.concerns.includes(concern)
                    : newChild.concerns?.includes(concern);

                  return (
                    <Badge
                      key={concern}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#7BA7BC] hover:bg-[#7BA7BC]' : 'hover:bg-[#F0EDE8]'
                      }`}
                      onClick={() => {
                        if (editingChild) {
                          setEditingChild({
                            ...editingChild,
                            concerns: isSelected
                              ? editingChild.concerns.filter(c => c !== concern)
                              : [...editingChild.concerns, concern]
                          });
                        } else {
                          setNewChild({
                            ...newChild,
                            concerns: isSelected
                              ? (newChild.concerns || []).filter(c => c !== concern)
                              : [...(newChild.concerns || []), concern]
                          });
                        }
                      }}
                    >
                      {concern}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddChild(false);
                setEditingChild(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingChild ? handleUpdateChild : handleAddChild}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingChild ? 'Save Changes' : 'Add Child'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Remove Child?
            </DialogTitle>
            <DialogDescription>
              This will remove this child's profile and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeleteChild(showDeleteConfirm)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfileScreen;
