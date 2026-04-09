// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { SubscriptionManagement } from './SubscriptionManagement';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Smartphone,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  Edit,
  Download,
  Trash2,
  Crown,
  Mail,
  Lock,
  Check,
  X,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Camera,
  QrCode,
  Share,
  Copy,
  Key,
  Users,
  FileText,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  Zap,
  Volume2,
  Palette,
  Type,
  BookOpen,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Trash,
  Plus,
  Minus,
  Star,
  Video,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { DeleteAccount } from './DeleteAccount';

interface SettingsPageProps {
  onNavigate?: (destination: string) => void;
  userTier?: string | null;
  accessToken?: string | null;
}

export function SettingsPage({ onNavigate, userTier = 'core', accessToken: propAccessToken }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState('profile');
  
  // Handle URL parameters for direct section navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section && ['profile', 'notifications', 'privacy', 'children', 'billing', 'sessions', 'devices', 'data', 'accessibility', 'about'].includes(section)) {
      setActiveSection(section);
    }
  }, []);
  
  // Modal states for various features
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [showPlanComparisonModal, setShowPlanComparisonModal] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  
  // Form states
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newChildForm, setNewChildForm] = useState({
    name: '',
    dateOfBirth: '',
    pronouns: 'they/them',
    goals: [] as string[]
  });

  const [emailVerified, setEmailVerified] = useState(false);
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Mock user data
  const [profileData, setProfileData] = useState({
    name: 'Amy Johnson',
    email: 'amy.johnson@email.com',
    phone: '(555) 123-4567',
    address: '123 Main St, San Francisco, CA 94102',
    timeZone: 'America/Los_Angeles',
    profilePhoto: null as string | null
  });

  // Child profiles mock data
  const [childProfiles, setChildProfiles] = useState([
    {
      id: 'child-1',
      name: 'Eddie Johnson',
      avatar: 'EJ',
      dateOfBirth: '2017-03-15',
      pronouns: 'he/him',
      goals: ['Speech Development', 'Social Skills', 'Daily Routines'],
      juniorStatus: 'paired' as 'paired' | 'unpaired',
      lastPaired: 'Eddie\'s iPad - Just now',
      careTeamNotes: true
    }
  ]);

  // Handler functions for dead buttons
  const handleEmailVerification = async () => {
    if (emailVerified) return;
    
    setIsVerifyingEmail(true);
    try {
      // Simulate sending verification email
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowEmailVerificationModal(true);
      toast.success('Verification email sent! Check your inbox.');
    } catch (error) {
      toast.error('Failed to send verification email. Please try again.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code.');
      return;
    }
    
    try {
      // Simulate email verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmailVerified(true);
      setShowEmailVerificationModal(false);
      setVerificationCode('');
      toast.success('Email verified successfully!');
    } catch (error) {
      toast.error('Invalid verification code. Please try again.');
    }
  };
  
  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    
    try {
      // Simulate password change
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowPasswordChangeModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    } catch (error) {
      toast.error('Failed to change password. Please check your current password.');
    }
  };
  
  const handleAddChild = async () => {
    const { name, dateOfBirth, pronouns, goals } = newChildForm;
    
    if (!name.trim() || !dateOfBirth) {
      toast.error('Please fill in child name and date of birth.');
      return;
    }
    
    try {
      // Simulate adding child
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newChild = {
        id: `child-${Date.now()}`,
        name: name.trim(),
        avatar: name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        dateOfBirth,
        pronouns,
        goals,
        juniorStatus: 'unpaired' as const,
        lastPaired: '',
        careTeamNotes: false
      };
      
      setChildProfiles(prev => [...prev, newChild]);
      setShowAddChildModal(false);
      setNewChildForm({ name: '', dateOfBirth: '', pronouns: 'they/them', goals: [] });
      toast.success(`${name} has been added to your family!`);
    } catch (error) {
      toast.error('Failed to add child profile. Please try again.');
    }
  };
  
  const handleEditChild = (childId: string) => {
    const child = childProfiles.find(c => c.id === childId);
    if (child) {
      setSelectedChildId(childId);
      setNewChildForm({
        name: child.name,
        dateOfBirth: child.dateOfBirth,
        pronouns: child.pronouns,
        goals: child.goals
      });
      setShowEditChildModal(true);
    }
  };
  
  const handleSaveChildEdit = async () => {
    if (!selectedChildId) return;
    
    const { name, dateOfBirth, pronouns, goals } = newChildForm;
    
    if (!name.trim() || !dateOfBirth) {
      toast.error('Please fill in child name and date of birth.');
      return;
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setChildProfiles(prev => prev.map(child => 
        child.id === selectedChildId 
          ? { 
              ...child, 
              name: name.trim(),
              dateOfBirth,
              pronouns,
              goals,
              avatar: name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            }
          : child
      ));
      
      setShowEditChildModal(false);
      setSelectedChildId(null);
      setNewChildForm({ name: '', dateOfBirth: '', pronouns: 'they/them', goals: [] });
      toast.success('Child profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update child profile. Please try again.');
    }
  };
  
  const handleConnectToJunior = (childId: string) => {
    // Navigate to JrSetupWizard
    if (onNavigate) {
      onNavigate('jr-setup');
    } else {
      toast.info('Ease setup wizard will be launched here.');
    }
  };
  
  const handlePhotoUpload = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error('File size must be less than 5MB.');
          return;
        }
        
        if (!file.type.startsWith('image/')) {
          toast.error('Please select an image file.');
          return;
        }
        
        // Simulate file upload
        const reader = new FileReader();
        reader.onload = (e) => {
          const photoUrl = e.target?.result as string;
          setProfileData(prev => ({ ...prev, profilePhoto: photoUrl }));
          toast.success('Profile photo updated successfully!');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const settingSections = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'children', label: 'Child Profiles', icon: <Users className="w-4 h-4" /> },
    { id: 'billing', label: 'Subscription & Billing', icon: <CreditCard className="w-4 h-4" /> },
    ...(userTier === 'pro' ? [{ id: 'sessions', label: 'Sessions & Credits', icon: <Video className="w-4 h-4" /> }] : []),
    { id: 'devices', label: 'Devices & Integrations', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Sharing', icon: <Shield className="w-4 h-4" /> },
    { id: 'data', label: 'Data & Exports', icon: <Download className="w-4 h-4" /> },
    { id: 'accessibility', label: 'Accessibility & Language', icon: <Eye className="w-4 h-4" /> },
    { id: 'about', label: 'About & Legal', icon: <HelpCircle className="w-4 h-4" /> }
  ];

  const renderProfile = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl text-slate-900">Profile</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditingProfile(!editingProfile)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {editingProfile ? 'Save' : 'Edit'}
          </Button>
        </div>

        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
              {profileData.profilePhoto ? (
                <img src={profileData.profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={handlePhotoUpload}>
                <Camera className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <p className="text-xs text-slate-500">Square, 1:1 ratio recommended</p>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="grid gap-3 sm:gap-4">
            <div>
              <label className="text-sm text-slate-700 block mb-2">Parent Name</label>
              <Input 
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({...prev, name: e.target.value}))}
                disabled={!editingProfile}
              />
            </div>

            <div>
              <label className="text-sm text-slate-700 block mb-2">Email Address</label>
              <div className="flex items-center space-x-2">
                <Input 
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({...prev, email: e.target.value}))}
                  disabled={!editingProfile}
                  className="flex-1"
                />
                {emailVerified ? (
                  <Badge className="bg-green-100 text-green-700">
                    <Check className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleEmailVerification}
                    disabled={isVerifyingEmail}
                  >
                    {isVerifyingEmail ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                )}
              </div>
              {!emailVerified && (
                <p className="text-sm text-amber-600 mt-1">Please confirm your email to keep your account secure.</p>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-700 block mb-2">Phone Number (Optional)</label>
              <Input 
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({...prev, phone: e.target.value}))}
                disabled={!editingProfile}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="text-sm text-slate-700 block mb-2">Home Time Zone</label>
              <select 
                className="w-full border rounded-lg px-3 py-2"
                value={profileData.timeZone}
                disabled={!editingProfile}
              >
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-700 block mb-2">Address (Optional)</label>
              <Textarea 
                value={profileData.address}
                onChange={(e) => setProfileData(prev => ({...prev, address: e.target.value}))}
                disabled={!editingProfile}
                placeholder="Used for reports only"
                className="min-h-[60px]"
              />
              <p className="text-xs text-slate-500 mt-1">Used for reports only</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 mb-4">Security</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Change Password</p>
              <p className="text-xs text-slate-500">Update your account password</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordChangeModal(true)}>
              <Lock className="w-4 h-4 mr-2" />
              Change
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">2-Step Verification</p>
              <p className="text-xs text-slate-500">
                {twoStepEnabled ? 'Your account has an extra layer of security' : 'Add an extra layer of security'}
              </p>
            </div>
            <Switch 
              checked={twoStepEnabled}
              onCheckedChange={setTwoStepEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Sign-in Method</p>
              <p className="text-xs text-slate-500">Email • Apple ID • Google</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info('Authentication management coming soon!')}>
              Manage
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderChildren = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-slate-900">Child Profiles</h2>
        <Button size="sm" onClick={() => setShowAddChildModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Child
        </Button>
      </div>

      {childProfiles.map((child) => (
        <Card key={child.id} className="p-4 sm:p-5 md:p-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-lg text-teal-700">{child.avatar}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg text-slate-900">{child.name}</h3>
                <Button variant="outline" size="sm" onClick={() => handleEditChild(child.id)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              
              <div className="grid gap-3 text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-slate-600">Born:</span>
                  <span className="text-slate-900">{new Date(child.dateOfBirth).toLocaleDateString()}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-900">{child.pronouns}</span>
                </div>
                
                <div>
                  <span className="text-slate-600">Primary Goals:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {child.goals.map((goal, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-600">Ease Status:</span>
                    {child.juniorStatus === 'paired' ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Paired
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Not Paired
                      </Badge>
                    )}
                  </div>
                  {userTier === 'pro' && child.careTeamNotes && (
                    <Badge className="bg-purple-100 text-purple-700">
                      Care team notes visible to parent only
                    </Badge>
                  )}
                </div>
                
                {child.juniorStatus === 'paired' && (
                  <p className="text-xs text-slate-500">Last paired: {child.lastPaired}</p>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleConnectToJunior(child.id)}>
                  <QrCode className="w-4 h-4 mr-2" />
                  Connect to Ease
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info('Interest management coming soon!')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Interests
                </Button>
              </div>
              
              <p className="text-xs text-slate-500 mt-2">
                <strong>Interests:</strong> Helps Ease personalize calm tools, rewards, and transitions.
              </p>
            </div>
          </div>
        </Card>
      ))}

      {childProfiles.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg text-slate-900 mb-2">No child profiles</h3>
          <p className="text-slate-600 mb-4">Add your child to personalize Aminy Ease and your Plan.</p>
          <Button onClick={() => setShowAddChildModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Child Profile
          </Button>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    // Prefer prop over localStorage for access token (more secure)
    const accessToken = propAccessToken || (typeof window !== 'undefined'
      ? localStorage.getItem('access_token') || undefined
      : undefined);

    switch (activeSection) {
      case 'profile':
        return renderProfile();
      case 'children':
        return renderChildren();
      case 'billing':
        return <SubscriptionManagement accessToken={accessToken} />;
      case 'notifications':
        return (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg text-slate-900 mb-2">Notification Settings</h3>
            <p className="text-slate-600">Manage your notification preferences here.</p>
          </div>
        );
      case 'privacy':
        return (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg text-slate-900 mb-2">Privacy & Sharing</h3>
            <p className="text-slate-600">Control your privacy settings and data sharing preferences.</p>
          </div>
        );
      case 'data':
        return (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Export Section */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Your Data
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Download a copy of your data including chat history, care plans, and session notes.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export All Data
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Export Care Plan
                </Button>
              </div>
            </Card>

            {/* Storage Usage */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Storage Usage</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Chat History</span>
                  <span className="text-slate-900">2.3 MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Attachments</span>
                  <span className="text-slate-900">15.7 MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Care Documents</span>
                  <span className="text-slate-900">8.1 MB</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full mt-4">
                  <div className="h-2 bg-teal-500 rounded-full" style={{ width: '26%' }} />
                </div>
                <p className="text-xs text-slate-500">26.1 MB of 100 MB used</p>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-red-200">
              <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Danger Zone
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Clear Chat History</p>
                    <p className="text-sm text-slate-600">Delete all your AI chat conversations</p>
                  </div>
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                    Clear
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Delete Account</p>
                    <p className="text-sm text-slate-600">Permanently delete your account and data</p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setShowDeleteAccount(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );
      default:
        return (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg text-slate-900 mb-2">Coming Soon</h3>
            <p className="text-slate-600">This section is being developed.</p>
          </div>
        );
    }
  };

  // If showing delete account page, render it fullscreen
  if (showDeleteAccount) {
    return (
      <DeleteAccount
        onBack={() => setShowDeleteAccount(false)}
        onMessageSupport={() => {
          toast.success('Opening secure messaging...');
          // In production, this would navigate to the secure messaging feature
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-6 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl text-slate-900">Settings</h1>
            <p className="text-sm text-slate-600 mt-1">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 max-w-4xl mx-auto">
        <div className="grid gap-3 sm:gap-4 sm:gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <nav className="space-y-1">
                {settingSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-teal-100 text-teal-700'
                        : 'text-slate-600 hover:bg-gray-100'
                    }`}
                  >
                    {section.icon}
                    <span className="ml-3">{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Email Verification Modal */}
      <Dialog open={showEmailVerificationModal} onOpenChange={setShowEmailVerificationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Email</DialogTitle>
            <DialogDescription>
              We've sent a verification code to {profileData.email}. Enter the code below to verify your email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <Input
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button onClick={handleVerifyCode} className="flex-1">
                Verify Email
              </Button>
              <Button variant="outline" onClick={() => setShowEmailVerificationModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Modal */}
      <Dialog open={showPasswordChangeModal} onOpenChange={setShowPasswordChangeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <Input
              type="password"
              placeholder="Current password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="New password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={handlePasswordChange} className="flex-1">
                Change Password
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordChangeModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Child Modal */}
      <Dialog open={showAddChildModal} onOpenChange={setShowAddChildModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Child Profile</DialogTitle>
            <DialogDescription>
              Create a profile for your child to personalize their Aminy experience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <Input
              placeholder="Child's name"
              value={newChildForm.name}
              onChange={(e) => setNewChildForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              type="date"
              value={newChildForm.dateOfBirth}
              onChange={(e) => setNewChildForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            />
            <select 
              className="w-full border rounded-lg px-3 py-2"
              value={newChildForm.pronouns}
              onChange={(e) => setNewChildForm(prev => ({ ...prev, pronouns: e.target.value }))}
            >
              <option value="they/them">they/them</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
            </select>
            <div className="flex gap-2">
              <Button onClick={handleAddChild} className="flex-1">
                Add Child
              </Button>
              <Button variant="outline" onClick={() => setShowAddChildModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Child Modal */}
      <Dialog open={showEditChildModal} onOpenChange={setShowEditChildModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Child Profile</DialogTitle>
            <DialogDescription>
              Update your child's profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <Input
              placeholder="Child's name"
              value={newChildForm.name}
              onChange={(e) => setNewChildForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              type="date"
              value={newChildForm.dateOfBirth}
              onChange={(e) => setNewChildForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            />
            <select 
              className="w-full border rounded-lg px-3 py-2"
              value={newChildForm.pronouns}
              onChange={(e) => setNewChildForm(prev => ({ ...prev, pronouns: e.target.value }))}
            >
              <option value="they/them">they/them</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
            </select>
            <div className="flex gap-2">
              <Button onClick={handleSaveChildEdit} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setShowEditChildModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}