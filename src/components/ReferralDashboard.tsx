/**
 * Referral Dashboard Component
 * Shows referral code, tracking, rewards, and tier progress
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Share2,
  Copy,
  Check,
  Gift,
  Users,
  Trophy,
  Clock,
  ChevronRight,
  Sparkles,
  Star,
  Crown,
  Mail,
  MessageCircle,
  Link2,
  QrCode,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  type Referral,
  type ReferralTier,
  REFERRAL_TIERS,
  REFERRAL_PROGRAM_CONFIG,
  getReferralShareMessage,
  getReferralQualificationDays,
} from '../lib/referral-program';
import { useReferralData } from '../hooks/useReferralData';
import { EmptyReferrals } from './ui/empty-state';
import { toast } from 'sonner';
import { trackReferralShare, getShareText, getReferralUrl } from '../lib/viral-analytics';

interface ReferralDashboardProps {
  userId: string;
  userName: string;
  onShare?: (method: 'copy' | 'email' | 'sms' | 'qr') => void;
}

export function ReferralDashboard({
  userId,
  userName,
  onShare,
}: ReferralDashboardProps) {
  // Use the Supabase-first referral hook
  const {
    referralCode: referralCodeData,
    referrals,
    summary,
    loading,
    error,
    getOrCreateCode,
  } = useReferralData(userId);

  const referralCode = referralCodeData?.code || '';
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  // Auto-create referral code on mount if not present
  useEffect(() => {
    if (!loading && !referralCodeData && userId) {
      getOrCreateCode();
    }
  }, [loading, referralCodeData, userId, getOrCreateCode]);

  // Show error toast if load fails
  useEffect(() => {
    if (error) {
      toast.error('Unable to load your referral data. Please try again.');
    }
  }, [error]);

  // Copy referral link
  const handleCopy = async () => {
    try {
      const { url } = getReferralShareMessage(referralCode, userName);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Referral link copied!');
      onShare?.('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  // Share via email
  const handleEmailShare = () => {
    const { title, body, url } = getReferralShareMessage(referralCode, userName);
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body + '\n\n' + url)}`;
    window.open(mailtoUrl);
    onShare?.('email');
  };

  // Share via SMS
  const handleSmsShare = async () => {
    const { body, url } = getReferralShareMessage(referralCode, userName);
    const smsUrl = `sms:?body=${encodeURIComponent(body + ' ' + url)}`;
    window.open(smsUrl);
    onShare?.('sms');
    // Track the share
    await trackReferralShare(userId, 'sms');
  };

  // Share via Twitter
  const handleTwitterShare = async () => {
    const shareText = getShareText();
    const url = getReferralUrl(referralCode);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.twitter)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    onShare?.('copy'); // Using 'copy' as generic social
    await trackReferralShare(userId, 'social');
    toast.success('Opening Twitter to share');
  };

  // Share via Facebook
  const handleFacebookShare = async () => {
    const url = getReferralUrl(referralCode);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    onShare?.('copy'); // Using 'copy' as generic social
    await trackReferralShare(userId, 'social');
    toast.success('Opening Facebook to share');
  };

  // Native share API (mobile)
  const handleNativeShare = async () => {
    const { title, body, url } = getReferralShareMessage(referralCode, userName);

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: body,
          url,
        });
        onShare?.('copy');
        await trackReferralShare(userId, 'other');
        toast.success('Thanks for sharing!');
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </Card>
    );
  }

  const getTierIcon = (tier: ReferralTier | null) => {
    if (!tier) return <Star className="w-5 h-5" />;
    switch (tier.name) {
      case 'Ambassador':
        return <Crown className="w-5 h-5" />;
      case 'Champion':
        return <Trophy className="w-5 h-5" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-6 h-6 text-teal-600" />
            Refer & Earn
          </h2>
          <p className="text-sm text-gray-600">
            Share Aminy with friends and earn rewards
          </p>
        </div>
      </div>

      {/* Referral Code Card */}
      <Card className="p-5 bg-gradient-to-br from-teal-500 to-blue-600 text-white">
        <div className="text-center mb-4">
          <p className="text-teal-100 text-sm mb-2">Your Referral Code</p>
          <div className="font-mono text-xl sm:text-2xl font-bold tracking-wide">
            {referralCode}
          </div>
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
            onClick={() => setShowShareOptions(!showShareOptions)}
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Share Options */}
        {showShareOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-white/20"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <button
                onClick={handleEmailShare}
                className="flex flex-col items-center p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Mail className="w-5 h-5 mb-1" />
                <span className="text-xs">Email</span>
              </button>
              <button
                onClick={handleSmsShare}
                className="flex flex-col items-center p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <MessageCircle className="w-5 h-5 mb-1" />
                <span className="text-xs">Text</span>
              </button>
              <button
                onClick={handleTwitterShare}
                className="flex flex-col items-center p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 mb-1" />
                <span className="text-xs">X</span>
              </button>
              <button
                onClick={handleFacebookShare}
                className="flex flex-col items-center p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Share2 className="w-5 h-5 mb-1" />
                <span className="text-xs">Facebook</span>
              </button>
              <button
                onClick={() => onShare?.('qr')}
                className="flex flex-col items-center p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span className="text-xs">QR Code</span>
              </button>
            </div>
            {/* Native share button for mobile */}
            {'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full mt-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Share2 className="w-4 h-4" />
                More sharing options
              </button>
            )}
          </motion.div>
        )}

        {/* Reward Info */}
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>
              You get <strong>{REFERRAL_PROGRAM_CONFIG.referrerReward.description}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Gift className="w-4 h-4 text-pink-300" />
            <span>
              Friend gets <strong>{REFERRAL_PROGRAM_CONFIG.referredReward.description}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {summary.totalReferrals}
            </div>
            <div className="text-xs text-gray-500">Total Referrals</div>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {summary.qualifiedReferrals}
            </div>
            <div className="text-xs text-gray-500">Qualified</div>
          </Card>
          <Card className="p-3 text-center">
            <Gift className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {summary.totalRewardsEarned}
            </div>
            <div className="text-xs text-gray-500">Free Months</div>
          </Card>
        </div>
      )}

      {/* Tier Progress */}
      {summary && (
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getTierIcon(summary.currentTier)}
              <span className="font-semibold text-gray-900">
                {summary.currentTier?.name || 'Getting Started'}
              </span>
              {summary.currentTier && (
                <Badge
                  className="text-white"
                  style={{ backgroundColor: summary.currentTier.badgeColor }}
                >
                  {summary.currentTier.badgeIcon}
                </Badge>
              )}
            </div>
            {summary.nextTier && (
              <span className="text-sm text-gray-500">
                {summary.referralsToNextTier} to {summary.nextTier.name}
              </span>
            )}
          </div>

          {summary.nextTier && (
            <>
              <Progress
                value={(() => {
                  const base = summary.currentTier?.minReferrals || 0;
                  const span = summary.nextTier.minReferrals - base;
                  if (span <= 0) return 0;
                  const pct = ((summary.qualifiedReferrals - base) / span) * 100;
                  return Math.max(0, Math.min(100, pct));
                })()}
                className="h-2 mb-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{summary.qualifiedReferrals} referrals</span>
                <span>{summary.nextTier.minReferrals} for {summary.nextTier.name}</span>
              </div>
            </>
          )}

          {/* Current Tier Perks */}
          {summary.currentTier && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Perks:</p>
              <div className="space-y-1">
                {summary.currentTier.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    {perk}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tier Roadmap */}
      <Card className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Tier Roadmap
        </h3>
        <div className="space-y-3">
          {REFERRAL_TIERS.map((tier, index) => {
            const isCurrentTier = summary?.currentTier?.name === tier.name;
            const isUnlocked = summary?.qualifiedReferrals
              ? summary.qualifiedReferrals >= tier.minReferrals
              : false;

            return (
              <div
                key={tier.name}
                className={`p-3 rounded-lg border ${
                  isCurrentTier
                    ? 'border-teal-500 bg-teal-50'
                    : isUnlocked
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tier.badgeIcon}</span>
                    <span className="font-medium text-gray-900">{tier.name}</span>
                    {isCurrentTier && (
                      <Badge className="bg-teal-500 text-white text-xs">Current</Badge>
                    )}
                    {isUnlocked && !isCurrentTier && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {tier.minReferrals}+ referrals
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {tier.perks[tier.perks.length - 1]}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Referrals */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Recent Referrals</h3>
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {referrals.length === 0 ? (
          <EmptyReferrals
            onInvite={() => setShowShareOptions(true)}
          />
        ) : (
          <div className="space-y-2">
            {referrals.slice(0, 5).map((referral) => {
              const daysRemaining = getReferralQualificationDays(referral);

              return (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        referral.status === 'rewarded'
                          ? 'bg-green-100'
                          : referral.status === 'converted'
                          ? 'bg-blue-100'
                          : 'bg-gray-200'
                      }`}
                    >
                      {referral.status === 'rewarded' ? (
                        <Gift className="w-4 h-4 text-green-600" />
                      ) : referral.status === 'converted' ? (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        Friend joined via your link
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {referral.status === 'rewarded' ? (
                      <Badge className="bg-green-100 text-green-700">
                        +1 month earned
                      </Badge>
                    ) : referral.status === 'converted' ? (
                      <Badge className="bg-blue-100 text-blue-700">
                        Qualified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">
                        {daysRemaining}d to qualify
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* How It Works */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">How It Works</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-blue-900">Share your code</p>
              <p className="text-sm text-blue-700">
                Send your unique link to friends with neurodivergent children
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-blue-900">Friend joins</p>
              <p className="text-sm text-blue-700">
                They sign up for a paid plan using your code and get ${REFERRAL_PROGRAM_CONFIG.referredReward.value} credit
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-blue-900">You earn</p>
              <p className="text-sm text-blue-700">
                After {REFERRAL_PROGRAM_CONFIG.qualificationPeriodDays} days, you get 1 free month
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ReferralDashboard;
