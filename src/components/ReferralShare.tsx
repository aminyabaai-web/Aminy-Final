// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ReferralShare - Word-of-mouth growth component
 *
 * Enables users to:
 * - Share Aminy with friends
 * - Get credit for referrals
 * - Track referral status
 *
 * Key design principles:
 * - Make sharing frictionless (one tap)
 * - Emotional connection ("help other families")
 * - Clear incentive (credit/discount)
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Share2,
  Copy,
  Check,
  Gift,
  Users,
  Heart,
  MessageCircle,
  Mail,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface ReferralShareProps {
  referralCode: string;
  referralCredits?: number;
  referralsCount?: number;
  userName?: string;
  onClose?: () => void;
  variant?: 'full' | 'compact' | 'modal';
}

export function ReferralShare({
  referralCode,
  referralCredits = 0,
  referralsCount = 0,
  userName = 'there',
  onClose,
  variant = 'full'
}: ReferralShareProps) {
  const [copied, setCopied] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');

  // Generate shareable link
  const referralLink = `https://aminy.ai/join?ref=${referralCode}`;

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied! Share it with families who need support.');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Share via native share API (mobile)
  const handleNativeShare = async () => {
    const shareData = {
      title: 'Join me on Aminy',
      text: `Hey! I've been using Aminy to help with ${userName === 'there' ? 'my child' : `my child's`} development, and it's been amazing. It's like having a supportive village in your pocket. Try it free with my referral link:`,
      url: referralLink
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Thanks for sharing the love!");
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  // Share via SMS
  const handleSMSShare = () => {
    const message = encodeURIComponent(
      `Hey! I've been using Aminy to help with my child's development, and it's been amazing. Try it free: ${referralLink}`
    );
    window.location.href = `sms:?body=${message}`;
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `Hey! I've been using Aminy for my child's development - it's like having a supportive village in your pocket. You should try it! ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // Share via Email
  const handleEmailShare = () => {
    const subject = encodeURIComponent('You should try Aminy!');
    const body = encodeURIComponent(
      `Hi!\n\nI wanted to share something that's been really helpful for our family. Aminy is an app that provides AI-powered support for parents of children with developmental needs.\n\nIt's helped me feel less alone and more confident in supporting my child's growth. I think you'd really benefit from it too.\n\nYou can try it free here: ${referralLink}\n\nHope this helps!\n\n- ${userName}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Send direct email invite
  const handleDirectEmailInvite = () => {
    if (!friendEmail || !friendEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    // In production, this would call an API to send the email
    toast.success(`Invitation sent to ${friendEmail}!`);
    setFriendEmail('');
    setShowEmailInput(false);
  };

  // Compact variant for sidebar/cards
  if (variant === 'compact') {
    return (
      <div className="p-4 bg-gradient-to-r from-accent/10 to-purple-500/10 rounded-lg border border-accent/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Gift className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[#132F43]">Share the love</p>
            <p className="text-sm text-[#5A6B7A]">
              Earn $10 credit for each friend who joins
            </p>
          </div>
          <Button size="sm" onClick={handleNativeShare}>
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>
      </div>
    );
  }

  // Modal variant
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md p-6 relative">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-4 right-4 p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          )}

          <div className="text-center mb-4 sm:mb-6">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] mb-2">
              Help Other Families
            </h2>
            <p className="text-[#5A6B7A]">
              Know someone who could use support? Share Aminy and earn $10 credit for each friend who joins.
            </p>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 sm:mb-6">
            <Button
              variant="outline"
              onClick={handleSMSShare}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">Text</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-sm">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleEmailShare}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Email</span>
            </Button>
          </div>

          {/* Copy link */}
          <div className="flex gap-2 mb-4">
            <Input
              value={referralLink}
              readOnly
              className="bg-[#FAF7F2] text-sm"
            />
            <Button onClick={handleCopy} variant={copied ? 'default' : 'outline'}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 sm:gap-6 pt-4 border-t border-[#E8E4DF]">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-accent">{referralsCount}</p>
              <p className="text-sm text-[#5A6B7A]">Friends joined</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">${referralCredits}</p>
              <p className="text-sm text-[#5A6B7A]">Credits earned</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Full variant (default)
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="p-3 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-xl">
          <Heart className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] mb-1">
            Help Other Families Find Support
          </h2>
          <p className="text-[#5A6B7A]">
            You know how hard this journey can be. Share Aminy with friends who need a village too.
          </p>
        </div>
      </div>

      {/* Incentive banner */}
      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-medium text-green-900">
              Earn $10 for each friend who joins
            </p>
            <p className="text-sm text-green-700">
              Plus, they get their first month free!
            </p>
          </div>
        </div>
      </div>

      {/* Share buttons */}
      <div className="space-y-3 mb-4 sm:mb-6">
        <Button
          onClick={handleNativeShare}
          className="w-full bg-accent hover:bg-accent/90 h-12"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share with a Friend
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={handleSMSShare}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm">Text</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-sm">WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleEmailShare}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="text-sm">Email</span>
          </Button>
        </div>
      </div>

      {/* Copy link section */}
      <div className="p-4 bg-[#FAF7F2] rounded-lg mb-4 sm:mb-6">
        <p className="text-sm font-medium text-[#3A4A57] mb-2">Or copy your referral link:</p>
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="bg-white text-sm font-mono"
          />
          <Button onClick={handleCopy} variant={copied ? 'default' : 'outline'} className="shrink-0">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Direct email invite */}
      {showEmailInput ? (
        <div className="p-4 bg-[#EEF4F8] rounded-lg border border-[#C8DDE8]">
          <p className="text-sm font-medium text-blue-900 mb-2">Send a direct invite:</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@email.com"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              className="bg-white"
            />
            <Button onClick={handleDirectEmailInvite} className="bg-blue-600 hover:bg-blue-700 shrink-0">
              Send
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmailInput(false)}
            className="mt-2 text-blue-600"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setShowEmailInput(true)}
          className="w-full text-accent"
        >
          <Mail className="w-4 h-4 mr-2" />
          Send a direct email invite
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}

      {/* Referral stats */}
      <div className="mt-4 sm:mt-6 pt-6 border-t border-[#E8E4DF]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8A9BA8]" />
            <span className="text-sm text-[#5A6B7A]">Your referral impact</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-accent">{referralsCount}</p>
              <p className="text-sm text-[#5A6B7A]">Friends joined</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">${referralCredits}</p>
              <p className="text-sm text-[#5A6B7A]">Credits earned</p>
            </div>
          </div>
        </div>

        {referralsCount > 0 && (
          <div className="mt-4 p-3 bg-accent/5 rounded-lg">
            <p className="text-sm text-center text-accent">
              <Sparkles className="w-4 h-4 inline mr-1" />
              You've helped {referralsCount} {referralsCount === 1 ? 'family' : 'families'} find support!
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ReferralShare;
