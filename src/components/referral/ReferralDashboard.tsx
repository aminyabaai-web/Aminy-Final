/**
 * Enhanced Referral Dashboard
 * Parent-facing referral management with pre-written share messages,
 * conversion funnel, achievement cards, and leaderboard.
 *
 * This wraps and extends the existing ReferralDashboard component
 * with the new referral-engine features.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Share2,
  Copy,
  Check,
  Gift,
  Users,
  Trophy,
  ChevronRight,
  Sparkles,
  Star,
  Crown,
  Mail,
  MessageCircle,
  Link2,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  Heart,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  generateReferralCode,
  getReferralStats,
  getShareMessages,
  generateMockStats,
  type ReferralCode,
  type ReferralStats,
  type ShareMessage,
  type ReferralChain,
} from '../../lib/referral-engine';
import { isDemoMode } from '../../lib/demo-seed';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface EnhancedReferralDashboardProps {
  userId: string;
  userName: string;
  childName?: string;
  onNavigate?: (screen: string) => void;
}

// ============================================================================
// Leaderboard Mock Data
// ============================================================================

interface LeaderboardEntry {
  rank: number;
  name: string;
  referrals: number;
  isCurrentUser: boolean;
}

function getMockLeaderboard(userName: string): LeaderboardEntry[] {
  return [
    { rank: 1, name: 'Jessica M.', referrals: 12, isCurrentUser: false },
    { rank: 2, name: 'Sarah K.', referrals: 9, isCurrentUser: false },
    { rank: 3, name: 'Amanda T.', referrals: 7, isCurrentUser: false },
    { rank: 4, name: userName.split(' ')[0] || 'You', referrals: 4, isCurrentUser: true },
    { rank: 5, name: 'Rachel P.', referrals: 3, isCurrentUser: false },
  ];
}

// ============================================================================
// Component
// ============================================================================

export function EnhancedReferralDashboard({
  userId,
  userName,
  childName,
  onNavigate,
}: EnhancedReferralDashboardProps) {
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeShareTemplate, setActiveShareTemplate] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'leaderboard'>('overview');

  // Initialize
  useEffect(() => {
    const referralCode = generateReferralCode(userId);
    setCode(referralCode);
    // Rich sample stats only in demo mode; real users see their actual data.
    setStats(isDemoMode() ? generateMockStats(userId) : getReferralStats(userId));
  }, [userId]);

  const shareMessages = useMemo(() => {
    if (!code) return [];
    return getShareMessages(code.code, childName);
  }, [code, childName]);

  // Leaderboard requires a real cross-user ranking backend; show sample only in demo.
  const leaderboard = useMemo(
    () => (isDemoMode() ? getMockLeaderboard(userName) : []),
    [userName],
  );

  const shareUrl = code ? `https://aminy.ai/join?ref=${code.code}` : '';

  // Handlers
  const handleCopy = async (text?: string) => {
    try {
      await navigator.clipboard.writeText(text || shareUrl);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleShareTemplate = (msg: ShareMessage, channel: 'sms' | 'email' | 'whatsapp' | 'copy') => {
    const fullText = `${msg.body}`;

    switch (channel) {
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(fullText)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(fullText)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`);
        break;
      case 'copy':
        handleCopy(fullText);
        return; // handleCopy already shows its own toast
    }
    toast.success('Opening share…');
  };

  if (!code || !stats) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-[#E8E4DF] rounded w-1/2" />
        <div className="h-40 bg-[#E8E4DF] rounded" />
        <div className="h-24 bg-[#E8E4DF] rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1B2733] flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#6B9080]" />
            Refer & Earn
          </h2>
          <p className="text-sm text-[#5A6B7A]">
            Help families find care. Earn rewards.
          </p>
        </div>
      </div>

      {/* Referral Code Card */}
      <Card className="p-5 bg-gradient-to-br from-teal-500 to-blue-600 text-white overflow-hidden relative">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative">
          <p className="text-teal-100 text-sm mb-2 text-center">Your Referral Code</p>
          <div className="font-mono text-2xl font-bold tracking-widest text-center mb-4">
            {code.code}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleCopy()}
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
              onClick={() => setShowShareOptions(!showShareOptions)}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Reward Info */}
          <div className="mt-4 p-3 bg-white/10 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <span>You get <strong>1 free month</strong> of your current tier</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Gift className="w-4 h-4 text-pink-300 flex-shrink-0" />
              <span>Friend gets <strong>14-day Pro trial</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Heart className="w-4 h-4 text-red-300 flex-shrink-0" />
              <span>Both get <strong>$25 session credit</strong> after first booking</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Share Options Drawer */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#1B2733] text-sm">Pre-written Messages</h3>
                <button onClick={() => setShowShareOptions(false)} className="text-[#8A9BA8] hover:text-[#5A6B7A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {shareMessages.map((msg) => (
                  <div key={msg.id} className="border border-[#E8E4DF] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveShareTemplate(activeShareTemplate === msg.id ? null : msg.id)}
                      className="w-full p-3 text-left hover:bg-[#FAF7F2] transition-colors flex items-center justify-between"
                    >
                      <div>
                        <Badge variant="secondary" className="mb-1 text-xs">
                          {msg.label}
                        </Badge>
                        <p className="text-sm text-[#5A6B7A] line-clamp-2">{msg.body.slice(0, 80)}...</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-[#8A9BA8] flex-shrink-0 transition-transform ${activeShareTemplate === msg.id ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {activeShareTemplate === msg.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 border-t border-[#E8E4DF]">
                            <p className="text-xs text-[#5A6B7A] mb-3 whitespace-pre-line bg-[#FAF7F2] p-2 rounded-lg">
                              {msg.body}
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                              <button
                                onClick={() => handleShareTemplate(msg, 'sms')}
                                className="flex flex-col items-center p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 text-green-600 mb-0.5" />
                                <span className="text-xs text-green-700">Text</span>
                              </button>
                              <button
                                onClick={() => handleShareTemplate(msg, 'email')}
                                className="flex flex-col items-center p-2 bg-[#EEF4F8] rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Mail className="w-4 h-4 text-blue-600 mb-0.5" />
                                <span className="text-xs text-blue-700">Email</span>
                              </button>
                              <button
                                onClick={() => handleShareTemplate(msg, 'whatsapp')}
                                className="flex flex-col items-center p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600 mb-0.5" />
                                <span className="text-xs text-emerald-700">WhatsApp</span>
                              </button>
                              <button
                                onClick={() => handleShareTemplate(msg, 'copy')}
                                className="flex flex-col items-center p-2 bg-[#FAF7F2] rounded-lg hover:bg-[#F0EDE8] transition-colors"
                              >
                                <Copy className="w-4 h-4 text-[#5A6B7A] mb-0.5" />
                                <span className="text-xs text-[#3A4A57]">Copy</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F0EDE8] rounded-xl p-1">
        {(['overview', 'referrals', 'leaderboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-[#1B2733] shadow-sm'
                : 'text-[#5A6B7A] hover:text-[#3A4A57]'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'referrals' ? 'My Referrals' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold text-[#1B2733]">{stats.totalShares}</div>
                <div className="text-xs text-[#5A6B7A]">Shared</div>
              </Card>
              <Card className="p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold text-[#1B2733]">{stats.totalSignups}</div>
                <div className="text-xs text-[#5A6B7A]">Signed Up</div>
              </Card>
              <Card className="p-3 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <div className="text-2xl font-bold text-[#1B2733]">{stats.totalConverted}</div>
                <div className="text-xs text-[#5A6B7A]">Converted</div>
              </Card>
              <Card className="p-3 text-center">
                <Gift className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <div className="text-2xl font-bold text-[#1B2733]">{stats.rewardsEarned.length}</div>
                <div className="text-xs text-[#5A6B7A]">Rewards Earned</div>
              </Card>
            </div>

            {/* Conversion Funnel */}
            <Card className="p-4">
              <h3 className="font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#6B9080]" />
                Your Funnel
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Codes Shared', value: stats.totalShares, color: 'bg-blue-500' },
                  { label: 'Links Clicked', value: stats.totalClicks, color: 'bg-indigo-500' },
                  { label: 'Accounts Created', value: stats.totalSignups, color: 'bg-primary' },
                  { label: 'Sessions Booked', value: stats.totalSessionsBooked, color: 'bg-green-500' },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-[#5A6B7A] text-right">{step.label}</div>
                    <div className="flex-1 h-6 bg-[#F0EDE8] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max((step.value / Math.max(stats.totalShares, 1)) * 100, 5)}%` }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className={`h-full ${step.color} rounded-full flex items-center justify-end pr-2`}
                      >
                        <span className="text-xs text-white font-medium">{step.value}</span>
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#8A9BA8] mt-2 text-right">
                {stats.conversionRate.toFixed(0)}% conversion rate
              </p>
            </Card>

            {/* Achievement Card */}
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">
                    You helped {stats.totalConverted} families find care!
                  </h3>
                  <p className="text-sm text-amber-700">
                    Share this milestone with your network
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="text-amber-700 hover:bg-amber-100"
                  onClick={() => handleCopy(
                    `I helped ${stats.totalConverted} families find therapy through Aminy! Join us: ${shareUrl}`
                  )}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Pending Rewards */}
            {stats.pendingRewards.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Pending Rewards
                </h3>
                <div className="space-y-2">
                  {stats.pendingRewards.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-[#3A4A57]">{reward.description}</span>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === 'referrals' && (
          <motion.div
            key="referrals"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            {stats.chain.length === 0 ? (
              <Card className="p-6 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-[#8A9BA8]" />
                <h3 className="font-medium text-[#3A4A57] mb-1">No referrals yet</h3>
                <p className="text-sm text-[#5A6B7A] mb-4">Share your code to start earning rewards</p>
                <Button
                  onClick={() => setShowShareOptions(true)}
                  className="bg-primary hover:bg-[#6B9080] text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Now
                </Button>
              </Card>
            ) : (
              stats.chain.map((chain: ReferralChain) => (
                <Card key={chain.refereeId} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      chain.status === 'converted' ? 'bg-green-100' :
                      chain.status === 'first_session' ? 'bg-blue-100' :
                      'bg-[#F0EDE8]'
                    }`}>
                      {chain.status === 'converted' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : chain.status === 'first_session' ? (
                        <Star className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#8A9BA8]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#1B2733]">{chain.refereeName}</p>
                      <p className="text-xs text-[#5A6B7A]">
                        Joined {new Date(chain.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        chain.status === 'converted' ? 'bg-green-100 text-green-700 border-green-200' :
                        chain.status === 'first_session' ? 'bg-blue-100 text-blue-700 border-[#C8DDE8]' :
                        chain.status === 'trial_started' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        'bg-[#F0EDE8] text-[#5A6B7A] border-[#E8E4DF]'
                      }>
                        {chain.status === 'converted' ? 'Converted' :
                         chain.status === 'first_session' ? 'Booked Session' :
                         chain.status === 'trial_started' ? 'On Trial' :
                         'Signed Up'}
                      </Badge>
                    </div>
                  </div>

                  {/* Funnel progress for this referral */}
                  <div className="mt-2 flex items-center gap-1 px-2">
                    {['Shared', 'Signed Up', 'Trial', 'Session', 'Converted'].map((step, i) => {
                      const stepIndex = ['shared', 'signed_up', 'trial_started', 'first_session', 'converted'].indexOf(chain.status);
                      const isComplete = i <= Math.max(stepIndex, 1);
                      return (
                        <React.Fragment key={step}>
                          <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-primary' : 'bg-[#E8E4DF]'}`} />
                          {i < 4 && <div className={`flex-1 h-0.5 ${isComplete ? 'bg-primary' : 'bg-[#E8E4DF]'}`} />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </Card>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            <Card className="p-4">
              <h3 className="font-semibold text-[#1B2733] mb-1 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Top Referrers This Month
              </h3>
              <p className="text-xs text-[#5A6B7A] mb-4">
                Top 3 earn a free BCBA consultation
              </p>

              {leaderboard.length === 0 ? (
                <div className="text-center py-6">
                  <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-[#5A6B7A]">
                    The leaderboard is coming soon. Share your code to be among the first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        entry.isCurrentUser ? 'bg-[#6B9080]/10 border border-[#6B9080]/20' : 'bg-[#FAF7F2]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                        entry.rank === 2 ? 'bg-[#E8E4DF] text-[#3A4A57]' :
                        entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-[#F0EDE8] text-[#5A6B7A]'
                      }`}>
                        {entry.rank <= 3 ? (
                          entry.rank === 1 ? <Crown className="w-4 h-4" /> :
                          entry.rank === 2 ? <Star className="w-4 h-4" /> :
                          <Trophy className="w-4 h-4" />
                        ) : entry.rank}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${entry.isCurrentUser ? 'text-[#6B9080]' : 'text-[#1B2733]'}`}>
                          {entry.name}
                          {entry.isCurrentUser && <span className="text-[#6B9080] ml-1">(You)</span>}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-[#3A4A57]">
                        {entry.referrals} referrals
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Motivational CTA */}
            <Card className="p-4 bg-gradient-to-r from-[#FAF7F2] to-blue-50 border-[#6B9080]/20">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-[#6B9080] flex-shrink-0" />
                <div>
                  <p className="font-medium text-[#6B9080] text-sm">
                    Share your code to climb the leaderboard
                  </p>
                  <p className="text-xs text-[#6B9080]">
                    Every family you help find care moves you up
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="text-[#6B9080] hover:bg-[#6B9080]/10 flex-shrink-0"
                  aria-label="Share your referral code"
                  onClick={() => {
                    setShowShareOptions(true);
                    setActiveTab('overview');
                  }}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How It Works */}
      <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
        <h3 className="font-semibold text-blue-900 mb-3">How Referrals Work</h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share your code', desc: 'Send your unique link via text, email, or WhatsApp' },
            { step: '2', title: 'Friend gets Pro trial', desc: 'They get 14 days of Pro features free' },
            { step: '3', title: 'First session booked', desc: 'You both earn a $25 session credit' },
            { step: '4', title: 'You earn a free month', desc: 'Applied to your current subscription tier' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-blue-900 text-sm">{item.title}</p>
                <p className="text-xs text-blue-700">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default EnhancedReferralDashboard;
