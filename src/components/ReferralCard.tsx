/**
 * Referral Component
 *
 * Makes referrals prominent and rewarding.
 * K-factor improvement through natural share moments.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

interface ReferralCardProps {
  referralCode: string;
  referralCount: number;
  rewardEarned: number;
  variant?: 'dashboard' | 'full';
  onShare?: () => void;
}

export function ReferralCard({
  referralCode,
  referralCount,
  rewardEarned,
  variant = 'dashboard',
  onShare,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://aminy.ai/join/${referralCode}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Failed to copy');
    }
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    const shareText = `I've been using Aminy to help support my child, and it's been amazing. If you're looking for AI-powered parenting support, try it out!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Aminy',
          text: shareText,
          url: referralLink,
        });
        onShare?.();
      } catch (e) {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  }, [referralLink, onShare, handleCopy]);

  // Compact dashboard variant
  if (variant === 'dashboard') {
    return (
      <Card className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="font-medium text-[#132F43]">Share Aminy, Get Rewards</p>
              <p className="text-sm text-[#5A6B7A]">
                {referralCount > 0
                  ? `${referralCount} friends joined • $${rewardEarned} earned`
                  : 'Give friends a 14-day Pro trial'}
              </p>
            </div>
          </div>

          <Button
            onClick={handleShare}
            size="sm"
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>
      </Card>
    );
  }

  // Full page variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <Card className="overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-pink-500 to-rose-500 text-white text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <Gift className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Share the Love</h2>
          <p className="text-pink-100">
            Help other families discover Aminy
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-[#F6FBFB] rounded-xl">
              <Users className="w-6 h-6 text-[#8A9BA8] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#132F43]">{referralCount}</p>
              <p className="text-sm text-[#5A6B7A]">Friends joined</p>
            </div>
            <div className="text-center p-4 bg-[#F6FBFB] rounded-xl">
              <Heart className="w-6 h-6 text-[#8A9BA8] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#132F43]">${rewardEarned}</p>
              <p className="text-sm text-[#5A6B7A]">Credits earned</p>
            </div>
          </div>

          {/* Referral link */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-2">
              Your referral link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 px-3 py-2 text-sm bg-[#EDF4F7] border border-[#E8E4DF] rounded-lg text-[#5A6B7A]"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <h3 className="font-medium text-[#132F43]">How it works</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold shrink-0">
                  1
                </div>
                <p className="text-[#5A6B7A]">Share your link with other parents</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold shrink-0">
                  2
                </div>
                <p className="text-[#5A6B7A]">They get their first month free</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold shrink-0">
                  3
                </div>
                <p className="text-[#5A6B7A]">You get $10 credit when they subscribe</p>
              </div>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShare}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Link
            </Button>
            <Button
              onClick={() => {
                const text = encodeURIComponent(
                  `I've been using Aminy to help support my child, and it's been a game-changer! Try it out: ${referralLink}`
                );
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default ReferralCard;
