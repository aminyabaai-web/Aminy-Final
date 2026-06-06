// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Referral Program
 * Provider-side referral incentives for recruiting other providers.
 *
 * Rewards:
 * - $100 credit per provider who completes onboarding
 * - "Featured Provider" badge after 3 successful referrals
 * - Share tools and referral stats
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Share2,
  Copy,
  Check,
  Users,
  DollarSign,
  Award,
  Star,
  Mail,
  MessageCircle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Link2,
  X,
} from 'lucide-react';
import { generateProviderReferralCode, type ReferralCode } from '../../lib/referral-engine';
import { isDemoMode } from '../../lib/demo-seed';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface ProviderReferralProgramProps {
  providerId: string;
  providerName: string;
}

interface ProviderReferral {
  id: string;
  name: string;
  specialty: string;
  status: 'invited' | 'applied' | 'onboarding' | 'completed';
  invitedAt: string;
  completedAt: string | null;
  creditEarned: number;
}

// ============================================================================
// Demo Data — sample referrals for demo walkthroughs only. Real providers
// start with an empty list and a friendly empty state until referrals land.
// ============================================================================

function getDemoProviderReferrals(): ProviderReferral[] {
  const now = Date.now();
  return [
    {
      id: 'pr-1',
      name: 'Dr. Lisa Wong',
      specialty: 'Speech Therapy (SLP-CCC)',
      status: 'completed',
      invitedAt: new Date(now - 45 * 86400000).toISOString(),
      completedAt: new Date(now - 20 * 86400000).toISOString(),
      creditEarned: 100,
    },
    {
      id: 'pr-2',
      name: 'Marcus Johnson',
      specialty: 'Occupational Therapy (OTR/L)',
      status: 'completed',
      invitedAt: new Date(now - 30 * 86400000).toISOString(),
      completedAt: new Date(now - 10 * 86400000).toISOString(),
      creditEarned: 100,
    },
    {
      id: 'pr-3',
      name: 'Dr. Priya Sharma',
      specialty: 'ABA Therapy (BCBA)',
      status: 'onboarding',
      invitedAt: new Date(now - 7 * 86400000).toISOString(),
      completedAt: null,
      creditEarned: 0,
    },
    {
      id: 'pr-4',
      name: 'Katie Chen',
      specialty: 'Social Skills (BCBA)',
      status: 'applied',
      invitedAt: new Date(now - 3 * 86400000).toISOString(),
      completedAt: null,
      creditEarned: 0,
    },
  ];
}

// ============================================================================
// Constants
// ============================================================================

const CREDIT_PER_REFERRAL = 100;
const FEATURED_BADGE_THRESHOLD = 3;

// ============================================================================
// Component
// ============================================================================

export function ProviderReferralProgram({
  providerId,
  providerName,
}: ProviderReferralProgramProps) {
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<ProviderReferral[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  useEffect(() => {
    const providerCode = generateProviderReferralCode(providerId);
    setCode(providerCode);
    // Sample referrals are DEMO MODE ONLY — real providers start empty.
    setReferrals(isDemoMode() ? getDemoProviderReferrals() : []);
  }, [providerId]);

  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const totalCreditsEarned = referrals.reduce((sum, r) => sum + r.creditEarned, 0);
  const hasFeaturedBadge = completedReferrals >= FEATURED_BADGE_THRESHOLD;
  const referralsToFeatured = Math.max(0, FEATURED_BADGE_THRESHOLD - completedReferrals);

  const shareUrl = code ? `https://aminy.ai/provider-apply?ref=${code.code}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleShare = (channel: 'email' | 'sms' | 'copy') => {
    const subject = `Join me on Aminy - provider platform for neurodivergent care`;
    const body = `Hi! I've been using Aminy as a provider platform for families with neurodivergent children. It handles scheduling, care plans, EVV, and billing in one place. Use my referral code ${code?.code} when you apply: ${shareUrl}`;

    switch (channel) {
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(body)}`);
        break;
      case 'copy':
        handleCopy();
        break;
    }
  };

  if (!code) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-[#E8E4DF] rounded w-1/2" />
        <div className="h-40 bg-[#E8E4DF] rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#1B2733] flex items-center gap-2">
          <Users className="w-6 h-6 text-[#6B9080]" />
          Provider Referral Program
        </h2>
        <p className="text-sm text-[#5A6B7A]">
          Refer colleagues and earn credits
        </p>
      </div>

      {/* Code Card */}
      <Card className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative">
          <p className="text-indigo-100 text-sm mb-2 text-center">Your Provider Referral Code</p>
          <div className="font-mono text-2xl font-bold tracking-widest text-center mb-4">
            {code.code}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowSharePanel(!showSharePanel)}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Rewards Summary */}
          <div className="mt-4 p-3 bg-white/10 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-green-300 flex-shrink-0" />
              <span><strong>${CREDIT_PER_REFERRAL} credit</strong> per provider who completes onboarding</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span><strong>Featured Provider</strong> badge after {FEATURED_BADGE_THRESHOLD} referrals</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Share Panel */}
      <AnimatePresence>
        {showSharePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#1B2733] text-sm">Share with Colleagues</h3>
                <button onClick={() => setShowSharePanel(false)} className="text-[#8A9BA8] hover:text-[#5A6B7A]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleShare('email')}
                  className="flex flex-col items-center p-3 bg-[#EEF4F8] rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <Mail className="w-5 h-5 text-blue-600 mb-1" />
                  <span className="text-xs text-blue-700">Email</span>
                </button>
                <button
                  onClick={() => handleShare('sms')}
                  className="flex flex-col items-center p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-green-600 mb-1" />
                  <span className="text-xs text-green-700">Text</span>
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="flex flex-col items-center p-3 bg-[#FAF7F2] rounded-xl hover:bg-[#F0EDE8] transition-colors"
                >
                  <Link2 className="w-5 h-5 text-[#5A6B7A] mb-1" />
                  <span className="text-xs text-[#3A4A57]">Copy Link</span>
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
          <div className="text-2xl font-bold text-[#1B2733]">{referrals.length}</div>
          <div className="text-xs text-[#5A6B7A]">Referred</div>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
          <div className="text-2xl font-bold text-[#1B2733]">{completedReferrals}</div>
          <div className="text-xs text-[#5A6B7A]">Onboarded</div>
        </Card>
        <Card className="p-3 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          <div className="text-2xl font-bold text-[#1B2733]">${totalCreditsEarned}</div>
          <div className="text-xs text-[#5A6B7A]">Earned</div>
        </Card>
      </div>

      {/* Featured Badge Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${hasFeaturedBadge ? 'text-amber-500' : 'text-[#8A9BA8]'}`} />
            <span className="font-semibold text-[#1B2733] text-sm">
              {hasFeaturedBadge ? 'Featured Provider Badge Earned!' : 'Featured Provider Badge'}
            </span>
          </div>
          {hasFeaturedBadge && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              <Star className="w-3 h-3 mr-1" /> Active
            </Badge>
          )}
        </div>

        {!hasFeaturedBadge && (
          <>
            <Progress
              value={(completedReferrals / FEATURED_BADGE_THRESHOLD) * 100}
              className="h-2 mb-2"
            />
            <p className="text-xs text-[#5A6B7A]">
              {referralsToFeatured} more successful referral{referralsToFeatured !== 1 ? 's' : ''} to earn the Featured Provider badge
            </p>
          </>
        )}

        {hasFeaturedBadge && (
          <div className="mt-2 p-3 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-800">
              Your profile now shows the Featured Provider badge, giving you higher visibility
              in search results and the marketplace.
            </p>
          </div>
        )}
      </Card>

      {/* Referral List */}
      <Card className="p-4">
        <h3 className="font-semibold text-[#1B2733] mb-3">Your Provider Referrals</h3>
        {referrals.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-[#3A4A57]">No referrals yet</p>
            <p className="text-xs text-[#5A6B7A] mt-1">
              Share your referral link with colleagues — they'll show up here once they apply.
            </p>
          </div>
        )}
        <div className="space-y-2">
          {referrals.map((referral) => (
            <div key={referral.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                referral.status === 'completed' ? 'bg-green-100' :
                referral.status === 'onboarding' ? 'bg-blue-100' :
                referral.status === 'applied' ? 'bg-purple-100' :
                'bg-[#E8E4DF]'
              }`}>
                {referral.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : referral.status === 'onboarding' ? (
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                ) : referral.status === 'applied' ? (
                  <Clock className="w-5 h-5 text-purple-600" />
                ) : (
                  <Mail className="w-5 h-5 text-[#8A9BA8]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#1B2733]">{referral.name}</p>
                <p className="text-xs text-[#5A6B7A]">{referral.specialty}</p>
              </div>

              <div className="text-right">
                {referral.status === 'completed' ? (
                  <div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">Onboarded</Badge>
                    <p className="text-xs text-green-600 mt-1 font-medium">+${referral.creditEarned}</p>
                  </div>
                ) : (
                  <Badge className={
                    referral.status === 'onboarding' ? 'bg-blue-100 text-blue-700 border-[#C8DDE8]' :
                    referral.status === 'applied' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                    'bg-[#F0EDE8] text-[#5A6B7A] border-[#E8E4DF]'
                  }>
                    {referral.status === 'onboarding' ? 'Onboarding' :
                     referral.status === 'applied' ? 'Applied' : 'Invited'}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* How It Works */}
      <Card className="p-4 bg-indigo-50 border-[#6B9080]/20">
        <h3 className="font-semibold text-indigo-900 mb-3">How Provider Referrals Work</h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share your referral link', desc: 'Send to colleagues in ABA, speech, OT, or other specialties' },
            { step: '2', title: 'They apply & onboard', desc: 'Your colleague completes the provider application and onboarding' },
            { step: '3', title: 'You earn $100 credit', desc: `Credit applied after onboarding. Earn Featured badge at ${FEATURED_BADGE_THRESHOLD} referrals.` },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#6B9080] text-white flex items-center justify-center text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-indigo-900 text-sm">{item.title}</p>
                <p className="text-xs text-indigo-700">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default ProviderReferralProgram;
