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
  CheckCircle
} from 'lucide-react';

/**
 * COLLABORATION & REFERRAL FLOWS
 * 
 * Complete implementation of:
 * 1. Family Co-caregiver Invite Flow
 * 2. Provider/School Invite Flow  
 * 3. Referral Code System
 * 
 * Features: Design tokens (8px radius, 16px padding), WCAG AA contrast,
 * proper focus rings, responsive mobile layout, loading states, toasts
 */

// =====================================================
// 1. FAMILY CO-CAREGIVER INVITE FLOW
// =====================================================

interface CoCaregiver {
  id: string;
  name: string;
  email: string;
  role: string;
  permission: 'view' | 'contribute' | 'full';
  status: 'active' | 'pending';
  lastActive?: string;
  avatar?: string;
}

interface FamilyInviteFlowProps {
  childName?: string;
  onClose: () => void;
}

export function FamilyInviteFlow({ childName = 'Eddie', onClose }: FamilyInviteFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<'invite' | 'success' | 'error' | 'manage'>('invite');
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    role: 'co-parent',
    permission: 'contribute' as 'view' | 'contribute' | 'full',
    message: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock co-caregivers data
  const [coCaregiversList] = useState<CoCaregiver[]>([
    {
      id: '1',
      name: 'Michael Chen',
      email: 'michael@example.com',
      role: 'Co-parent',
      permission: 'full',
      status: 'active',
      lastActive: '2 hours ago'
    }
  ]);

  const [pendingInvites] = useState<Array<{ email: string; role: string; status: string }>>([
    { email: 'grandma@example.com', role: 'Grandparent', status: 'Pending' }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.emailOrPhone) {
      setErrorMessage('Please enter an email or phone number');
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
      permission: 'contribute',
      message: ''
    });
    setCurrentScreen('invite');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* SCREEN 1: INVITE FORM */}
        {currentScreen === 'invite' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-primary mb-1">
                  Invite a co-caregiver
                </h2>
                <p className="text-sm text-muted-foreground">
                  Share {childName}'s progress with family
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
              <p className="text-sm text-gray-600">
                Co-caregivers can view activities, add notes, and track progress together
              </p>

              {/* Email/Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="emailOrPhone">Email or phone number</Label>
                <div className="relative">
                  <Input
                    id="emailOrPhone"
                    type="text"
                    placeholder="email@example.com or (555) 123-4567"
                    value={formData.emailOrPhone}
                    onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                    className="min-h-[44px] pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Role Selector */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-white"
                >
                  <option value="co-parent">Co-parent</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Permission Level Chips */}
              <div className="space-y-3">
                <Label>Permission level</Label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permission: 'view' })}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      formData.permission === 'view'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary">View only</p>
                        <p className="text-sm text-gray-600">Can see activities and progress</p>
                      </div>
                      {formData.permission === 'view' && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permission: 'contribute' })}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      formData.permission === 'contribute'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary">Can contribute</p>
                        <p className="text-sm text-gray-600">Can mark activities complete and add notes</p>
                      </div>
                      {formData.permission === 'contribute' && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permission: 'full' })}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      formData.permission === 'full'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary">Full access</p>
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
                <Label htmlFor="message">Add a personal message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="I'd love your help supporting Eddie's growth..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg transition-all"
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
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-primary mb-2">
                Invitation sent!
              </h2>
              <p className="text-gray-600 mb-1">
                We sent an invite to {formData.emailOrPhone}
              </p>
              <p className="text-sm text-gray-500 mb-8">
                They'll get access once they accept
              </p>

              {/* Pending Invites List */}
              {pendingInvites.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 sm:mb-6 text-left">
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
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg"
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
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-primary mb-2">
                Couldn't send invitation
              </h2>
              <p className="text-gray-600 mb-4">
                Please check the email/phone and try again
              </p>
              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-8">
                {errorMessage || 'Network error. Please try again.'}
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setCurrentScreen('invite')}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg"
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

        {/* SCREEN 4: MANAGE CO-CAREGIVERS */}
        {currentScreen === 'manage' && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-primary">
                Manage co-caregivers
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
              {/* Active Co-caregivers */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Active co-caregivers</h3>
                <div className="space-y-3">
                  {coCaregiversList.map((caregiver) => (
                    <div
                      key={caregiver.id}
                      className="flex items-center gap-3 sm:gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{caregiver.name}</p>
                        <p className="text-sm text-gray-600">{caregiver.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {caregiver.role}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {caregiver.permission === 'full' ? 'Full access' : 
                             caregiver.permission === 'contribute' ? 'Can contribute' : 'View only'}
                          </Badge>
                        </div>
                        {caregiver.lastActive && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last active: {caregiver.lastActive}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Pending invites</h3>
                  <div className="space-y-3">
                    {pendingInvites.map((invite, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{invite.email}</p>
                            <p className="text-sm text-gray-600">{invite.role}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors">
                            Resend
                          </button>
                          <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setCurrentScreen('invite')}
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite another co-caregiver
              </Button>
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
    attachReport: true,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate AI-drafted email
  const generateAIEmail = () => {
    const goals = 'communication and social skills'; // This would come from actual user data
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* SCREEN 1: PROVIDER INVITE FORM */}
        {currentScreen === 'invite' && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-primary mb-1">
                  Share with {childName}'s team
                </h2>
                <p className="text-sm text-muted-foreground">
                  Keep everyone in the loop
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
              <p className="text-sm text-gray-600">
                Share progress reports with therapists, teachers, and providers
              </p>

              {/* Provider Type Chips */}
              <div className="space-y-2">
                <Label>Provider type</Label>
                <div className="flex flex-wrap gap-2">
                  {['therapist', 'teacher', 'bcba', 'pediatrician', 'other'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, providerType: type })}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all capitalize ${
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
                <Label htmlFor="providerName">Provider name</Label>
                <Input
                  id="providerName"
                  type="text"
                  placeholder="Dr. Smith"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                  className="min-h-[44px]"
                />
              </div>

              {/* Provider Email */}
              <div className="space-y-2">
                <Label htmlFor="providerEmail">Provider email</Label>
                <Input
                  id="providerEmail"
                  type="email"
                  placeholder="provider@clinic.com"
                  value={formData.providerEmail}
                  onChange={(e) => setFormData({ ...formData, providerEmail: e.target.value })}
                  className="min-h-[44px]"
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
                <Label htmlFor="attachReport" className="cursor-pointer">
                  Attach latest progress report
                </Label>
              </div>

              {/* AI-Drafted Email Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Preview message</Label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, message: generateAIEmail() })}
                    className="text-sm text-accent hover:underline font-medium"
                  >
                    Edit message
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {formData.message || generateAIEmail()}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg transition-all"
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
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-primary mb-2">
                Invitation sent to {formData.providerName}!
              </h2>
              <p className="text-gray-600 mb-1">
                They can view reports at the link we sent
              </p>
              <p className="text-sm text-gray-500 mb-8">
                You'll get notified when they access the report
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={onClose}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg"
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
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-primary mb-2">
                Couldn't send invitation
              </h2>
              <p className="text-gray-600 mb-8">
                Please check the information and try again
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setCurrentScreen('invite')}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg"
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Code copied!', {
      description: 'Share it with friends to give them 1 month free',
      duration: 3000
    });
  };

  const handleShare = (method: 'sms' | 'email' | 'link' | 'more') => {
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
      case 'more':
        if (navigator.share) {
          navigator.share({ title: 'Try Aminy', text: message });
        } else {
          toast.info('Share feature not available');
        }
        break;
    }
  };

  const hasReferrals = referrals.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-primary mb-1">
              Give 1 month free, get 1 month free
            </h2>
            <p className="text-sm text-muted-foreground">
              Help other families discover Aminy
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
          
          {hasReferrals ? (
            <>
              {/* Referral Code Display */}
              <div className="bg-gradient-to-br from-accent/10 to-blue-50 border border-accent/20 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Your referral code</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <p className="text-4xl font-bold text-accent tracking-wider">{referralCode}</p>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    aria-label="Copy code"
                  >
                    <Copy className="w-5 h-5 text-accent" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Share this code with friends and family
                </p>
              </div>

              {/* Share Buttons */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Share your code</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleShare('sms')}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <span className="font-medium">Text message</span>
                  </button>
                  <button
                    onClick={() => handleShare('email')}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <Mail className="w-5 h-5 text-accent" />
                    <span className="font-medium">Email</span>
                  </button>
                  <button
                    onClick={() => handleShare('link')}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <Copy className="w-5 h-5 text-accent" />
                    <span className="font-medium">Copy link</span>
                  </button>
                  <button
                    onClick={() => handleShare('more')}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <Share2 className="w-5 h-5 text-accent" />
                    <span className="font-medium">More</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Your referrals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-green-600" />
                      <p className="text-xl sm:text-2xl font-bold text-green-900">{referralStats.friendsJoined}</p>
                    </div>
                    <p className="text-xs text-green-700">Friends joined</p>
                  </div>
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Gift className="w-5 h-5 text-accent" />
                      <p className="text-xl sm:text-2xl font-bold text-accent">{referralStats.monthsEarned}</p>
                    </div>
                    <p className="text-xs text-accent">Months earned</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{referralStats.invitesPending}</p>
                    </div>
                    <p className="text-xs text-gray-600">Invites pending</p>
                  </div>
                </div>
              </div>

              {/* Referral List */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Referral history</h3>
                <div className="space-y-2">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
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
            // SCREEN 4: EMPTY STATE
            <div className="text-center py-12">
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-accent" />
                </div>
              </div>
              
              <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">
                No referrals yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Share your code to start earning free months
              </p>

              {/* Referral Code Display */}
              <div className="bg-gradient-to-br from-accent/10 to-blue-50 border border-accent/20 rounded-xl p-6 mb-4 sm:mb-6 max-w-md mx-auto">
                <p className="text-sm text-gray-600 mb-2">Your referral code</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <p className="text-4xl font-bold text-accent tracking-wider">{referralCode}</p>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    aria-label="Copy code"
                  >
                    <Copy className="w-5 h-5 text-accent" />
                  </button>
                </div>
              </div>

              <Button
                onClick={() => handleShare('more')}
                className="bg-accent hover:bg-accent/90 text-white font-semibold py-4 px-8 rounded-lg"
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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">Have a referral code?</span>
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
              className={`flex-1 min-h-[44px] ${
                status === 'success' ? 'border-green-500' :
                status === 'error' ? 'border-red-500' : ''
              }`}
            />
            <Button
              onClick={handleApplyCode}
              className="bg-accent hover:bg-accent/90 text-white px-6"
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
      <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
        <h1 className="text-2xl font-semibold mb-4">Collaboration & Referral Flows</h1>
        
        <Button
          onClick={() => setActiveFlow('family')}
          className="w-full bg-accent hover:bg-accent/90"
        >
          <Users className="w-4 h-4 mr-2" />
          Invite Family Member
        </Button>
        
        <Button
          onClick={() => setActiveFlow('provider')}
          className="w-full bg-accent hover:bg-accent/90"
        >
          <FileText className="w-4 h-4 mr-2" />
          Share with Provider
        </Button>
        
        <Button
          onClick={() => setActiveFlow('referral')}
          className="w-full bg-accent hover:bg-accent/90"
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
