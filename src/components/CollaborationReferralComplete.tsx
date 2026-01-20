import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  X,
  Check,
  AlertCircle,
  Users,
  Mail,
  Phone,
  Share2,
  Copy,
  Gift,
  Clock,
  ChevronRight,
  UserPlus,
  Trash2,
  Edit,
  Send,
  MessageSquare,
  FileText,
  ExternalLink,
  CheckCircle,
  Link as LinkIcon,
  Sparkles,
  Heart
} from 'lucide-react';

/**
 * COLLABORATION & REFERRAL FLOWS - COMPLETE IMPLEMENTATION
 * 
 * Design Tokens:
 * - 8px border radius
 * - 16px button padding
 * - H2: 22px
 * - Body: 16px
 * - Teal accent (#0891b2)
 * - WCAG AA contrast
 * - 44px minimum touch targets
 * - Focus rings on all interactive elements
 */

// =====================================================
// 1. FAMILY CO-CAREGIVER INVITE FLOW
// =====================================================

interface FamilyInviteFlowProps {
  childName?: string;
  onClose: () => void;
}

type PermissionLevel = 'view' | 'edit' | 'full';

interface CoCaregiver {
  id: string;
  name: string;
  email: string;
  role: string;
  permission: PermissionLevel;
  status: 'active' | 'pending';
  lastActive?: string;
}

export function FamilyInviteFlow({ childName = 'Eddie', onClose }: FamilyInviteFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<'invite' | 'success' | 'error'>('invite');
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    role: 'co-parent',
    permission: 'edit' as PermissionLevel,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data
  const [pendingInvites] = useState([
    { email: 'grandma@example.com', role: 'Grandparent', status: 'Pending' }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.emailOrPhone) {
      setCurrentScreen('error');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentScreen('success');
      toast.success('Invitation sent!', {
        description: `We sent an invite to ${formData.emailOrPhone}`,
        duration: 3000
      });
    }, 1500);
  };

  const handleInviteAnother = () => {
    setFormData({
      emailOrPhone: '',
      role: 'co-parent',
      permission: 'edit',
      message: ''
    });
    setCurrentScreen('invite');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* SCREEN 1: INVITE FORM */}
        {currentScreen === 'invite' && (
          <>
            {/* Header - H2: 22px */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-[22px] font-semibold text-primary mb-1">
                  Invite a co-caregiver
                </h2>
                <p className="text-[16px] text-muted-foreground">
                  Share {childName}'s progress with family
                </p>
              </div>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] p-2 hover:bg-gray-100 rounded-[8px] transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Email/Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="emailOrPhone" className="text-[16px]">Email or phone number</Label>
                <div className="relative">
                  <Input
                    id="emailOrPhone"
                    type="text"
                    placeholder="email@example.com or (555) 123-4567"
                    value={formData.emailOrPhone}
                    onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                    className="min-h-[44px] pr-10 rounded-[8px]"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Role Selector */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[16px]">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-[8px] focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-white text-[16px]"
                >
                  <option value="co-parent">Co-parent</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Permission Level Chips - Single Select */}
              <div className="space-y-3">
                <Label className="text-[16px]">Permission level</Label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permission: 'view' })}
                    className={`w-full min-h-[44px] p-4 rounded-[8px] border-2 text-left transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none ${
                      formData.permission === 'view'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary text-[16px]">View only</p>
                        <p className="text-sm text-gray-600">Can see activities and progress</p>
                      </div>
                      {formData.permission === 'view' && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permission: 'edit' })}
                    className={`w-full min-h-[44px] p-4 rounded-[8px] border-2 text-left transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none ${
                      formData.permission === 'edit'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary text-[16px]">Can edit plan</p>
                        <p className="text-sm text-gray-600">Can modify activities and add notes</p>
                      </div>
                      {formData.permission === 'edit' && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permission: 'full' })}
                    className={`w-full min-h-[44px] p-4 rounded-[8px] border-2 text-left transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none ${
                      formData.permission === 'full'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary text-[16px]">Full access</p>
                        <p className="text-sm text-gray-600">Can edit plan and settings</p>
                      </div>
                      {formData.permission === 'full' && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Optional Message */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-[16px]">Add a personal message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="I'd love your help supporting Eddie's growth..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="min-h-[80px] rounded-[8px]"
                />
              </div>

              {/* Actions - 16px padding, 8px radius, 44px touch targets */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] px-4 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-[8px] hover:bg-gray-50 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] py-4 px-4 bg-accent hover:bg-accent/90 text-white font-semibold rounded-[8px] transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                  {isSubmitting ? 'Sending...' : 'Send invitation'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* SCREEN 2: SUCCESS STATE */}
        {currentScreen === 'success' && (
          <>
            <div className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <h2 className="text-[22px] font-semibold text-primary mb-2">
                Invitation sent!
              </h2>
              <p className="text-[16px] text-gray-600 mb-1">
                We sent an invite to {formData.emailOrPhone}
              </p>
              <p className="text-sm text-gray-500 mb-8">
                They'll get access once they accept
              </p>

              {/* Pending Invites List */}
              {pendingInvites.length > 0 && (
                <div className="bg-gray-50 rounded-[8px] p-4 mb-6 text-left">
                  <h3 className="font-medium text-sm text-gray-900 mb-3">Pending invites</h3>
                  <div className="space-y-2">
                    {pendingInvites.map((invite, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{invite.email}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {invite.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={onClose}
                  className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-[8px]"
                >
                  Done
                </Button>
                <button
                  onClick={handleInviteAnother}
                  className="text-sm text-accent hover:underline font-medium"
                >
                  Invite another
                </button>
              </div>
            </div>
          </>
        )}

        {/* SCREEN 3: ERROR STATE */}
        {currentScreen === 'error' && (
          <>
            <div className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              <h2 className="text-[22px] font-semibold text-primary mb-2">
                Couldn't send invitation
              </h2>
              <p className="text-[16px] text-gray-600 mb-8">
                Please check the email/phone and try again
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setCurrentScreen('invite')}
                  className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-[8px]"
                >
                  Try again
                </Button>
                <button
                  onClick={onClose}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// 2. PROVIDER/SCHOOL INVITE FLOW
// =====================================================

interface ProviderInviteFlowProps {
  childName?: string;
  parentName?: string;
  onClose: () => void;
}

export function ProviderInviteFlow({ 
  childName = 'Eddie', 
  parentName = 'Sarah',
  onClose 
}: ProviderInviteFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<'invite' | 'success' | 'error'>('invite');
  const [formData, setFormData] = useState({
    providerType: 'therapist',
    providerName: '',
    providerEmail: '',
    attachReport: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate AI-drafted email
  const generateAIEmail = () => {
    const goals = 'communication and social skills';
    return `Hi ${formData.providerName || '[Provider Name]'},

I've been using Aminy to support ${childName}'s development in ${goals}. I'd love to share progress reports with you so we can work together.

${formData.attachReport ? '[Attached: Weekly progress report]\n\n' : ''}Best,
${parentName}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.providerName || !formData.providerEmail) {
      setCurrentScreen('error');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentScreen('success');
      toast.success('Invitation sent!', {
        description: `We sent an invite to ${formData.providerName}`,
        duration: 3000
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* SCREEN 1: PROVIDER INVITE FORM */}
        {currentScreen === 'invite' && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-[22px] font-semibold text-primary mb-1">
                  Share with {childName}'s team
                </h2>
                <p className="text-[16px] text-muted-foreground">
                  Keep everyone in the loop
                </p>
              </div>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] p-2 hover:bg-gray-100 rounded-[8px] transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Provider Type Chips */}
              <div className="space-y-2">
                <Label className="text-[16px]">Provider type</Label>
                <div className="flex flex-wrap gap-2">
                  {['therapist', 'teacher', 'bcba', 'pediatrician', 'other'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, providerType: type })}
                      className={`min-h-[44px] px-4 py-2 rounded-[8px] border-2 font-medium transition-all capitalize focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none ${
                        formData.providerType === type
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-gray-300 text-gray-700 hover:border-accent/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Name */}
              <div className="space-y-2">
                <Label htmlFor="providerName" className="text-[16px]">Provider name</Label>
                <Input
                  id="providerName"
                  type="text"
                  placeholder="Dr. Smith"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                  className="min-h-[44px] rounded-[8px]"
                />
              </div>

              {/* Provider Email */}
              <div className="space-y-2">
                <Label htmlFor="providerEmail" className="text-[16px]">Provider email</Label>
                <Input
                  id="providerEmail"
                  type="email"
                  placeholder="provider@clinic.com"
                  value={formData.providerEmail}
                  onChange={(e) => setFormData({ ...formData, providerEmail: e.target.value })}
                  className="min-h-[44px] rounded-[8px]"
                />
              </div>

              {/* Attach Report Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attachReport"
                  checked={formData.attachReport}
                  onChange={(e) => setFormData({ ...formData, attachReport: e.target.checked })}
                  className="w-5 h-5 text-accent border-gray-300 rounded focus:ring-accent"
                />
                <Label htmlFor="attachReport" className="cursor-pointer text-[16px]">
                  Attach latest progress report
                </Label>
              </div>

              {/* AI-Drafted Email Preview */}
              <div className="space-y-2">
                <Label className="text-[16px]">Preview message</Label>
                <div className="bg-gray-50 border border-gray-200 rounded-[8px] p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {generateAIEmail()}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] px-4 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-[8px] hover:bg-gray-50 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] py-4 px-4 bg-accent hover:bg-accent/90 text-white font-semibold rounded-[8px] transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                  {isSubmitting ? 'Sending...' : 'Send invitation'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* SCREEN 2: SUCCESS STATE */}
        {currentScreen === 'success' && (
          <>
            <div className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <h2 className="text-[22px] font-semibold text-primary mb-2">
                Invitation sent to {formData.providerName}!
              </h2>
              <p className="text-[16px] text-gray-600 mb-1">
                They can view reports at the link we sent
              </p>
              <p className="text-sm text-gray-500 mb-8">
                You'll get notified when they access the report
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={onClose}
                  className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-[8px]"
                >
                  Done
                </Button>
                <button
                  onClick={() => setCurrentScreen('invite')}
                  className="text-sm text-accent hover:underline font-medium"
                >
                  Share with another provider
                </button>
              </div>
            </div>
          </>
        )}

        {/* SCREEN 3: ERROR STATE */}
        {currentScreen === 'error' && (
          <>
            <div className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              <h2 className="text-[22px] font-semibold text-primary mb-2">
                Couldn't send invitation
              </h2>
              <p className="text-[16px] text-gray-600 mb-8">
                Please check the information and try again
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setCurrentScreen('invite')}
                  className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-[8px]"
                >
                  Try again
                </Button>
                <button
                  onClick={onClose}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// 3. REFERRAL CODE FLOW
// =====================================================

interface Referral {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'redeemed';
  date: string;
  avatar?: string;
}

interface ReferralFlowProps {
  onClose: () => void;
}

export function ReferralFlow({ onClose }: ReferralFlowProps) {
  const [referralCode] = useState('SARAH2024');
  const [referralStats] = useState({
    friendsJoined: 3,
    monthsEarned: 3,
    invitesPending: 2
  });
  
  const [referrals] = useState<Referral[]>([
    { id: '1', name: 'Jessica Wu', email: 'jessica@example.com', status: 'active', date: 'Oct 10, 2024' },
    { id: '2', name: 'Michael Chen', email: 'michael@example.com', status: 'redeemed', date: 'Oct 5, 2024' },
    { id: '3', name: 'Sarah Jones', email: 'sarah@example.com', status: 'pending', date: 'Oct 15, 2024' }
  ]);

  const hasReferrals = referrals.length > 0;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Code copied!', {
      description: 'Share it with friends to give them 1 month free',
      duration: 3000
    });
  };

  const handleShare = (method: 'sms' | 'email' | 'link' | 'social') => {
    const message = `I've been using Aminy to support my child's development and it's been amazing! Get 1 month free with my code: ${referralCode}\n\nhttps://aminy.app`;
    
    switch (method) {
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(message)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=Try Aminy - 1 Month Free&body=${encodeURIComponent(message)}`);
        break;
      case 'link':
        navigator.clipboard.writeText(`https://aminy.app?ref=${referralCode}`);
        toast.success('Link copied!');
        break;
      case 'social':
        if (navigator.share) {
          navigator.share({ title: 'Try Aminy', text: message });
        } else {
          toast.info('Share feature not available');
        }
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-[22px] font-semibold text-primary mb-1">
              Give 1 month free, get 1 month free
            </h2>
            <p className="text-[16px] text-muted-foreground">
              Help other families discover Aminy
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] p-2 hover:bg-gray-100 rounded-[8px] transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {hasReferrals ? (
            <>
              {/* Referral Code Display */}
              <div className="bg-gradient-to-br from-accent/10 to-blue-50 border border-accent/20 rounded-[8px] p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Your referral code</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <p className="text-4xl font-bold text-accent tracking-wider">{referralCode}</p>
                  <button
                    onClick={handleCopyCode}
                    className="min-w-[44px] min-h-[44px] p-2 hover:bg-white/50 rounded-[8px] transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                    aria-label="Copy code"
                  >
                    <Copy className="w-5 h-5 text-accent" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Share this code with friends and family
                </p>
              </div>

              {/* Share Section */}
              <div>
                <h3 className="text-[16px] font-medium text-gray-900 mb-3">Share your code</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleShare('sms')}
                    className="min-h-[44px] flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-[8px] hover:border-accent hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                  >
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <span className="font-medium">Text</span>
                  </button>
                  <button
                    onClick={() => handleShare('email')}
                    className="min-h-[44px] flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-[8px] hover:border-accent hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                  >
                    <Mail className="w-5 h-5 text-accent" />
                    <span className="font-medium">Email</span>
                  </button>
                  <button
                    onClick={() => handleShare('link')}
                    className="min-h-[44px] flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-[8px] hover:border-accent hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                  >
                    <LinkIcon className="w-5 h-5 text-accent" />
                    <span className="font-medium">Copy link</span>
                  </button>
                  <button
                    onClick={() => handleShare('social')}
                    className="min-h-[44px] flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-[8px] hover:border-accent hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                  >
                    <Share2 className="w-5 h-5 text-accent" />
                    <span className="font-medium">Social</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div>
                <h3 className="text-[16px] font-medium text-gray-900 mb-3">Your referrals</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-[8px] p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-green-600" />
                      <p className="text-2xl font-bold text-green-900">{referralStats.friendsJoined}</p>
                    </div>
                    <p className="text-xs text-green-700">Friends joined</p>
                  </div>
                  <div className="bg-accent/10 border border-accent/20 rounded-[8px] p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Gift className="w-5 h-5 text-accent" />
                      <p className="text-2xl font-bold text-accent">{referralStats.monthsEarned}</p>
                    </div>
                    <p className="text-xs text-accent">Months earned</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-[8px] p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <p className="text-2xl font-bold text-gray-900">{referralStats.invitesPending}</p>
                    </div>
                    <p className="text-xs text-gray-600">Pending</p>
                  </div>
                </div>
              </div>

              {/* Referral List with Avatars */}
              <div>
                <h3 className="text-[16px] font-medium text-gray-900 mb-3">Referral history</h3>
                <div className="space-y-2">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-[8px]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{referral.name}</p>
                          <p className="text-xs text-gray-600">{referral.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            referral.status === 'active' ? 'default' :
                            referral.status === 'redeemed' ? 'secondary' :
                            'outline'
                          }
                          className="text-xs mb-1"
                        >
                          {referral.status === 'active' ? 'Active' :
                           referral.status === 'redeemed' ? 'Redeemed' :
                           'Pending'}
                        </Badge>
                        <p className="text-xs text-gray-500">{referral.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms Link */}
              <button
                onClick={() => window.open('/terms/referral', '_blank')}
                className="text-sm text-gray-600 hover:text-accent transition-colors flex items-center gap-1"
              >
                Referral program terms
                <ExternalLink className="w-3 h-3" />
              </button>
            </>
          ) : (
            // EMPTY STATE
            <div className="text-center py-12">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center">
                  <Heart className="w-10 h-10 text-accent" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-primary mb-2">
                No referrals yet
              </h3>
              <p className="text-[16px] text-gray-600 mb-8 max-w-md mx-auto">
                Share your code to start earning free months
              </p>

              {/* Referral Code Display */}
              <div className="bg-gradient-to-br from-accent/10 to-blue-50 border border-accent/20 rounded-[8px] p-6 mb-6 max-w-md mx-auto">
                <p className="text-sm text-gray-600 mb-2">Your referral code</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <p className="text-4xl font-bold text-accent tracking-wider">{referralCode}</p>
                  <button
                    onClick={handleCopyCode}
                    className="min-w-[44px] min-h-[44px] p-2 hover:bg-white/50 rounded-[8px] transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                    aria-label="Copy code"
                  >
                    <Copy className="w-5 h-5 text-accent" />
                  </button>
                </div>
              </div>

              <Button
                onClick={() => handleShare('social')}
                className="min-h-[44px] bg-accent hover:bg-accent/90 text-white font-semibold py-4 px-8 rounded-[8px]"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// REFERRAL CODE REDEMPTION (FOR NEW USERS)
// =====================================================

interface ReferralRedemptionProps {
  onApply: (code: string) => void;
}

export function ReferralRedemption({ onApply }: ReferralRedemptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleApplyCode = () => {
    if (!code) {
      setStatus('error');
      toast.error('Invalid code', {
        description: 'Please enter a valid referral code',
        duration: 3000
      });
      return;
    }

    // Validate code (mock)
    if (code.length >= 6) {
      setStatus('success');
      onApply(code);
      toast.success('Code applied! You get 1 month free', {
        description: 'Your first month is on us',
        duration: 3000,
        icon: <Gift className="w-4 h-4" />
      });
    } else {
      setStatus('error');
      toast.error('Invalid code', {
        description: 'Please check the code and try again',
        duration: 3000
      });
    }
  };

  return (
    <div className="border border-gray-200 rounded-[8px] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full min-h-[44px] p-4 flex items-center justify-between hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
      >
        <span className="font-medium text-gray-900 text-[16px]">Have a referral code?</span>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setStatus('idle');
              }}
              className={`flex-1 min-h-[44px] rounded-[8px] ${
                status === 'success' ? 'border-green-500' :
                status === 'error' ? 'border-red-500' : ''
              }`}
            />
            <Button
              onClick={handleApplyCode}
              className="min-h-[44px] bg-accent hover:bg-accent/90 text-white px-6 rounded-[8px]"
            >
              Apply
            </Button>
          </div>
          
          {status === 'success' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Code applied! You get 1 month free
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              Invalid code. Please try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Example usage component
export function CollaborationReferralExample() {
  const [activeFlow, setActiveFlow] = useState<'family' | 'provider' | 'referral' | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-[22px] font-semibold mb-4">Collaboration & Referral Flows</h1>
        
        <Button
          onClick={() => setActiveFlow('family')}
          className="w-full min-h-[44px] bg-accent hover:bg-accent/90 rounded-[8px]"
        >
          <Users className="w-4 h-4 mr-2" />
          Invite Family Member
        </Button>
        
        <Button
          onClick={() => setActiveFlow('provider')}
          className="w-full min-h-[44px] bg-accent hover:bg-accent/90 rounded-[8px]"
        >
          <FileText className="w-4 h-4 mr-2" />
          Share with Provider
        </Button>
        
        <Button
          onClick={() => setActiveFlow('referral')}
          className="w-full min-h-[44px] bg-accent hover:bg-accent/90 rounded-[8px]"
        >
          <Gift className="w-4 h-4 mr-2" />
          Referral Program
        </Button>

        <div className="pt-6">
        </div>
      </div>

      {activeFlow === 'family' && (
        <FamilyInviteFlow
          childName="Eddie"
          onClose={() => setActiveFlow(null)}
        />
      )}

      {activeFlow === 'provider' && (
        <ProviderInviteFlow
          childName="Eddie"
          parentName="Sarah"
          onClose={() => setActiveFlow(null)}
        />
      )}

      {activeFlow === 'referral' && (
        <ReferralFlow onClose={() => setActiveFlow(null)} />
      )}
    </div>
  );
}
