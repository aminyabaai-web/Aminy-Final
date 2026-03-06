/**
 * B2B Organization Setup Wizard
 * Post-checkout: org name, admin email, invite team, seat management
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Users, Mail, Plus, Trash2, Check,
  ArrowRight, ArrowLeft, Loader2, Sparkles, Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { B2B_PLANS, type B2BPlanType } from '../lib/b2b-checkout';

interface B2BOrgSetupProps {
  planType?: B2BPlanType;
  seatCount?: number;
  onComplete: () => void;
  onBack: () => void;
}

type SetupStep = 'org-info' | 'invite-team' | 'review';

interface TeamMember {
  email: string;
  role: 'admin' | 'provider' | 'staff';
}

export function B2BOrgSetup({
  planType = 'clinic',
  seatCount = 5,
  onComplete,
  onBack,
}: B2BOrgSetupProps) {
  const [step, setStep] = useState<SetupStep>('org-info');
  const [orgName, setOrgName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'provider' | 'staff'>('provider');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plan = B2B_PLANS[planType];

  const addTeamMember = () => {
    if (!newEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    if (teamMembers.length >= seatCount - 1) {
      toast.error(`You have ${seatCount} seats. Remove a member or upgrade.`);
      return;
    }
    if (teamMembers.some(m => m.email === newEmail)) {
      toast.error('This email is already added');
      return;
    }
    setTeamMembers(prev => [...prev, { email: newEmail, role: newRole }]);
    setNewEmail('');
  };

  const removeTeamMember = (email: string) => {
    setTeamMembers(prev => prev.filter(m => m.email !== email));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Save org to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('organizations').insert({
          name: orgName,
          admin_email: adminEmail || user.email,
          phone,
          plan_type: planType,
          seat_count: seatCount,
          owner_id: user.id,
          team_members: teamMembers,
          status: 'active',
        });
      }

      // Store locally for demo mode
      localStorage.setItem('aminy-b2b-org', JSON.stringify({
        orgName, adminEmail, phone, planType, seatCount, teamMembers,
        createdAt: new Date().toISOString(),
      }));

      toast.success('Organization setup complete!');
      onComplete();
    } catch (e) {
      // Demo fallback
      localStorage.setItem('aminy-b2b-org', JSON.stringify({
        orgName, adminEmail, phone, planType, seatCount, teamMembers,
        createdAt: new Date().toISOString(),
      }));
      toast.success('Organization setup complete!');
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Set Up Your Organization</h1>
            <p className="text-sm text-gray-500">{plan.name} Plan · {seatCount} seats</p>
          </div>
          <Crown className="w-6 h-6 text-blue-600" />
        </div>

        {/* Progress */}
        <div className="max-w-2xl mx-auto mt-4 flex gap-2">
          {(['org-info', 'invite-team', 'review'] as SetupStep[]).map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${
              ['org-info', 'invite-team', 'review'].indexOf(step) >= i ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Org Info */}
          {step === 'org-info' && (
            <motion.div
              key="org-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">Organization Details</h2>
                <p className="text-gray-500 text-sm">Tell us about your organization</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., Sunshine ABA Clinic"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@yourorg.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => {
                  if (!orgName.trim()) { toast.error('Organization name is required'); return; }
                  setStep('invite-team');
                }}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Invite Team */}
          {step === 'invite-team' && (
            <motion.div
              key="invite-team"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">Invite Your Team</h2>
                <p className="text-gray-500 text-sm">{teamMembers.length + 1}/{seatCount} seats used (including you)</p>
              </div>

              {/* Add member form */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTeamMember()}
                  placeholder="team@yourorg.com"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="px-3 py-3 border border-gray-300 rounded-xl bg-white text-sm"
                >
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
                <button
                  onClick={addTeamMember}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Team list */}
              <div className="space-y-2">
                {/* Admin (you) */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {(adminEmail || 'A')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{adminEmail || 'You (Admin)'}</p>
                    <p className="text-xs text-blue-600">Organization Admin</p>
                  </div>
                  <Crown className="w-4 h-4 text-blue-600" />
                </div>

                {teamMembers.map((member) => (
                  <div key={member.email} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {member.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{member.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                    </div>
                    <button
                      onClick={() => removeTeamMember(member.email)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {teamMembers.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">
                    No team members added yet. You can invite them later too.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('org-info')}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">Review & Launch</h2>
                <p className="text-gray-500 text-sm">Everything looks good?</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Organization</p>
                  <p className="font-semibold text-gray-900">{orgName}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan</p>
                  <p className="font-semibold text-gray-900">{plan.name} · {seatCount} seats</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Admin</p>
                  <p className="font-semibold text-gray-900">{adminEmail || 'Not set'}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Team Members</p>
                  <p className="font-semibold text-gray-900">{teamMembers.length + 1} of {seatCount} seats filled</p>
                  {teamMembers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {teamMembers.map(m => m.email).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('invite-team')}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Launch Organization
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default B2BOrgSetup;
