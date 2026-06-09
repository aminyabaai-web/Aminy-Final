// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useCallback } from 'react';
import {
  Gift, Share2, Users, Trophy, Zap, Star, Copy, Check, Mail,
  MessageSquare, ArrowLeft, Sparkles, Target, Crown, Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────────────

export interface ReferralCode {
  code: string;
  userId: string;
  totalReferrals: number;
  activeReferrals: number;
  rewardsEarned: ReferralReward[];
  shareUrl: string;
}

export interface ReferralReward {
  id: string;
  type: 'free-month' | 'feature-unlock' | 'badge' | 'discount';
  label: string;
  description: string;
  earnedAt: string;
  redeemed: boolean;
}

export interface ShareGate {
  feature: string;
  description: string;
  shareRequired: boolean;
  unlocked: boolean;
}

export interface SocialProof {
  totalFamilies: number;
  totalProviders: number;
  totalSessions: number;
  recentSignups: number;
  averageRating: number;
  testimonials: Array<{ quote: string; author: string; role: string }>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  shareable: boolean;
  shareImage?: string;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  participants: number;
  goal: number;
  progress: number;
  endsAt: string;
  reward: string;
  joined: boolean;
}

// ─── Referral System ─────────────────────────────────────────────────

interface ReferralSystemProps {
  referral: ReferralCode;
  onInviteSMS: (phone: string) => void;
  onInviteEmail: (email: string) => void;
  onBack?: () => void;
}

export function ReferralSystem({ referral, onInviteSMS, onInviteEmail, onBack }: ReferralSystemProps) {
  const [copied, setCopied] = useState(false);
  const [inviteMode, setInviteMode] = useState<'sms' | 'email' | null>(null);
  const [inviteTarget, setInviteTarget] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referral.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [referral.shareUrl]);

  const handleInvite = useCallback(() => {
    if (!inviteTarget.trim()) return;
    if (inviteMode === 'sms') onInviteSMS(inviteTarget.trim());
    if (inviteMode === 'email') onInviteEmail(inviteTarget.trim());
    setInviteSent(true);
    setTimeout(() => { setInviteSent(false); setInviteTarget(''); setInviteMode(null); }, 2000);
  }, [inviteMode, inviteTarget, onInviteSMS, onInviteEmail]);

  const milestones = [
    { count: 1, reward: 'Referral Badge', reached: referral.totalReferrals >= 1 },
    { count: 3, reward: '1 Month Free', reached: referral.totalReferrals >= 3 },
    { count: 5, reward: 'Premium Feature Pack', reached: referral.totalReferrals >= 5 },
    { count: 10, reward: 'Lifetime Champion Status', reached: referral.totalReferrals >= 10 },
  ];

  return (
    <div className="min-h-screen bg-mist">
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-[#F0EDE8]">
              <ArrowLeft className="h-5 w-5 text-[#5A6B7A]" />
            </button>
          )}
          <Gift className="h-6 w-6 text-[#6B9080]" />
          <h1 className="text-lg font-bold text-[#1B2733]">Invite & Earn</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero Card */}
        <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white">
          <Sparkles className="h-8 w-8 mb-3 opacity-80" />
          <h2 className="text-xl font-bold">Share the Love</h2>
          <p className="mt-1 text-sm text-teal-100">
            Every family you invite gets 14 days free. You earn rewards at every milestone.
          </p>

          <div className="mt-4 flex items-center gap-4 text-center">
            <div className="flex-1">
              <p className="text-2xl font-bold">{referral.totalReferrals}</p>
              <p className="text-xs text-teal-200">Invited</p>
            </div>
            <div className="h-8 w-px bg-teal-400/30" />
            <div className="flex-1">
              <p className="text-2xl font-bold">{referral.activeReferrals}</p>
              <p className="text-xs text-teal-200">Active</p>
            </div>
            <div className="h-8 w-px bg-teal-400/30" />
            <div className="flex-1">
              <p className="text-2xl font-bold">{referral.rewardsEarned.length}</p>
              <p className="text-xs text-teal-200">Rewards</p>
            </div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="rounded-xl border border-[#E8E4DF] bg-white p-4">
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-lg bg-[#F0EDE8] px-3 py-2 text-sm text-[#3A4A57] truncate">
              {referral.shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-[#6B9080]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#5A6B7A]">Code: <span className="font-mono font-bold">{referral.code}</span></p>
        </div>

        {/* Invite Methods */}
        <div className="flex gap-3">
          <button
            onClick={() => setInviteMode('sms')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E8E4DF] bg-white p-3 text-sm font-medium text-[#3A4A57] hover:bg-[#FAF7F2]"
          >
            <MessageSquare className="h-4 w-4 text-green-600" />
            Text
          </button>
          <button
            onClick={() => setInviteMode('email')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E8E4DF] bg-white p-3 text-sm font-medium text-[#3A4A57] hover:bg-[#FAF7F2]"
          >
            <Mail className="h-4 w-4 text-blue-600" />
            Email
          </button>
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E8E4DF] bg-white p-3 text-sm font-medium text-[#3A4A57] hover:bg-[#FAF7F2]"
          >
            <Share2 className="h-4 w-4 text-purple-600" />
            Share
          </button>
        </div>

        {/* Invite Input */}
        <AnimatePresence>
          {inviteMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-[#E8E4DF] bg-white p-4">
                <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                  {inviteMode === 'sms' ? 'Phone Number' : 'Email Address'}
                </label>
                <div className="flex gap-2">
                  <input
                    type={inviteMode === 'sms' ? 'tel' : 'email'}
                    value={inviteTarget}
                    onChange={e => setInviteTarget(e.target.value)}
                    placeholder={inviteMode === 'sms' ? '(555) 123-4567' : 'friend@example.com'}
                    className="flex-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={!inviteTarget.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#6B9080] disabled:opacity-40"
                  >
                    {inviteSent ? 'Sent!' : 'Send'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Milestones */}
        <div className="rounded-xl border border-[#E8E4DF] bg-white p-4">
          <h3 className="text-sm font-semibold text-[#1B2733] mb-3">Reward Milestones</h3>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  m.reached ? 'bg-[#6B9080]/10 text-[#6B9080]' : 'bg-[#F0EDE8] text-[#8A9BA8]'
                }`}>
                  {m.reached ? <Check className="h-4 w-4" /> : m.count}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${m.reached ? 'text-[#1B2733]' : 'text-[#5A6B7A]'}`}>
                    {m.count} referral{m.count > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-[#5A6B7A]">{m.reward}</p>
                </div>
                {m.reached && (
                  <span className="text-xs font-semibold text-[#6B9080]">Earned</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rewards Earned */}
        {referral.rewardsEarned.length > 0 && (
          <div className="rounded-xl border border-[#E8E4DF] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#1B2733] mb-3">Your Rewards</h3>
            <div className="space-y-2">
              {referral.rewardsEarned.map(reward => (
                <div key={reward.id} className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-amber-900">{reward.label}</p>
                    <p className="text-xs text-amber-700">{reward.description}</p>
                  </div>
                  {reward.redeemed ? (
                    <span className="text-xs text-[#8A9BA8]">Redeemed</span>
                  ) : (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">Active</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Social Proof Counters ───────────────────────────────────────────

interface SocialProofBannerProps {
  proof: SocialProof;
}

export function SocialProofBanner({ proof }: SocialProofBannerProps) {
  return (
    <div className="rounded-xl border border-[#E8E4DF] bg-white p-4">
      <div className="flex items-center gap-4 text-center">
        <div className="flex-1">
          <p className="text-xl font-bold text-[#1B2733]">{proof.totalFamilies.toLocaleString()}</p>
          <p className="text-xs text-[#5A6B7A]">Families</p>
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold text-[#1B2733]">{proof.totalProviders.toLocaleString()}</p>
          <p className="text-xs text-[#5A6B7A]">Providers</p>
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold text-[#1B2733]">{proof.totalSessions.toLocaleString()}</p>
          <p className="text-xs text-[#5A6B7A]">Sessions</p>
        </div>
      </div>

      {proof.recentSignups > 0 && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6B9080]">
          <Zap className="h-3.5 w-3.5" />
          <span>{proof.recentSignups} families joined this week</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`h-4 w-4 ${i <= Math.floor(proof.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-[#8A9BA8]'}`}
          />
        ))}
        <span className="ml-1 text-xs text-[#5A6B7A]">{proof.averageRating.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ─── Achievement Sharing Cards ───────────────────────────────────────

interface AchievementCardProps {
  achievement: Achievement;
  onShare: (achievement: Achievement) => void;
}

export function AchievementCard({ achievement, onShare }: AchievementCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
            {achievement.icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1B2733]">{achievement.title}</h3>
            <p className="text-xs text-[#5A6B7A]">{achievement.description}</p>
            <p className="mt-1 text-xs text-[#8A9BA8]">
              Earned {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {achievement.shareable && (
          <button
            onClick={() => onShare(achievement)}
            className="flex items-center gap-1 rounded-lg bg-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-300"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Community Challenges ────────────────────────────────────────────

interface CommunityChallengesProps {
  challenges: CommunityChallenge[];
  onJoin: (challengeId: string) => void;
  onBack?: () => void;
}

export function CommunityChallenges({ challenges, onJoin, onBack }: CommunityChallengesProps) {
  const typeIcons = {
    daily: <Zap className="h-4 w-4 text-amber-500" />,
    weekly: <Target className="h-4 w-4 text-blue-500" />,
    monthly: <Crown className="h-4 w-4 text-purple-500" />,
  };

  return (
    <div className="min-h-screen bg-mist">
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-[#F0EDE8]">
              <ArrowLeft className="h-5 w-5 text-[#5A6B7A]" />
            </button>
          )}
          <Trophy className="h-6 w-6 text-amber-500" />
          <h1 className="text-lg font-bold text-[#1B2733]">Community Challenges</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {challenges.map(challenge => {
          const progressPct = Math.min(100, Math.round((challenge.progress / challenge.goal) * 100));
          const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / 86400000));

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#E8E4DF] bg-white p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {typeIcons[challenge.type]}
                  <span className="text-xs font-medium text-[#5A6B7A] uppercase">{challenge.type}</span>
                </div>
                <span className="text-xs text-[#8A9BA8]">{daysLeft}d left</span>
              </div>

              <h3 className="text-sm font-bold text-[#1B2733]">{challenge.title}</h3>
              <p className="mt-1 text-xs text-[#5A6B7A]">{challenge.description}</p>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-[#5A6B7A] mb-1">
                  <span>{challenge.progress}/{challenge.goal}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#5A6B7A]">
                  <Users className="h-3.5 w-3.5" />
                  <span>{challenge.participants} participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Gift className="h-3.5 w-3.5" />
                    {challenge.reward}
                  </span>
                  {challenge.joined ? (
                    <span className="rounded-full bg-[#6B9080]/10 px-2.5 py-1 text-xs font-semibold text-[#6B9080]">
                      Joined
                    </span>
                  ) : (
                    <button
                      onClick={() => onJoin(challenge.id)}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-[#6B9080]"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {challenges.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="mx-auto h-12 w-12 text-[#8A9BA8]" />
            <p className="mt-3 text-sm text-[#5A6B7A]">No active challenges right now. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Share Gate ──────────────────────────────────────────────────────

interface ShareGateProps {
  gate: ShareGate;
  onShare: () => void;
}

export function ShareGateOverlay({ gate, onShare }: ShareGateProps) {
  if (gate.unlocked) return null;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#6B9080]/30 bg-[#6B9080]/10/50 p-6 text-center">
      <Heart className="h-10 w-10 text-primary mb-3" />
      <h3 className="text-sm font-bold text-[#1B2733]">{gate.feature}</h3>
      <p className="mt-1 text-xs text-[#5A6B7A]">{gate.description}</p>
      <button
        onClick={onShare}
        className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B9080]"
      >
        <Share2 className="h-4 w-4" />
        Share to Unlock
      </button>
    </div>
  );
}

export default ReferralSystem;
