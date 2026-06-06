// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Junior Milestone Share Component
 *
 * Generates shareable milestone cards for Aminy Ease achievements.
 * Privacy-first: uses child initials only, never full names.
 * Supports Web Share API (mobile) + clipboard + social intents.
 *
 * Milestone types:
 * - first-word: Child's first speech recognition success
 * - streak: N-day activity streak
 * - level-up: Advanced to next difficulty level
 * - calm-champion: Completed N calm-down activities
 * - skill-master: Mastered a skill track
 * - session-count: Hit a session milestone (10, 25, 50, 100)
 */

import { useState, useCallback, useRef } from 'react';
import {
  Share2,
  Copy,
  Check,
  Trophy,
  Star,
  Sparkles,
  Heart,
  Flame,
  Crown,
  Zap,
  X,
  MessageCircle,
} from 'lucide-react';

export type MilestoneType =
  | 'first-word'
  | 'streak'
  | 'level-up'
  | 'calm-champion'
  | 'skill-master'
  | 'session-count';

interface MilestoneData {
  type: MilestoneType;
  childInitial: string;
  value?: number; // streak count, session count, level number
  skillName?: string; // e.g., "Speech", "Social Skills"
  detail?: string; // extra context
}

interface JuniorMilestoneShareProps {
  milestone: MilestoneData;
  onClose: () => void;
  onShared?: (method: string) => void;
}

const milestoneConfig: Record<MilestoneType, {
  icon: React.ReactNode;
  gradient: string;
  bgGradient: string;
  getTitle: (m: MilestoneData) => string;
  getMessage: (m: MilestoneData) => string;
  emoji: string;
}> = {
  'first-word': {
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
    getTitle: () => 'First Word!',
    getMessage: (m) => `${m.childInitial}. just spoke their first word in Aminy Ease! The speech recognition caught it perfectly.`,
    emoji: '🎉',
  },
  'streak': {
    icon: <Flame className="w-8 h-8" />,
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-50 to-red-50',
    getTitle: (m) => `${m.value}-Day Streak!`,
    getMessage: (m) => `${m.childInitial}. has been on a ${m.value}-day learning streak! Consistency is building real skills.`,
    emoji: '🔥',
  },
  'level-up': {
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
    getTitle: (m) => `Level ${m.value}!`,
    getMessage: (m) => `${m.childInitial}. leveled up to Level ${m.value} in ${m.skillName || 'their activities'}! The adaptive system noticed real progress.`,
    emoji: '⬆️',
  },
  'calm-champion': {
    icon: <Heart className="w-8 h-8" />,
    gradient: 'from-teal-500 to-green-500',
    bgGradient: 'from-teal-50 to-green-50',
    getTitle: (m) => 'Calm Champion!',
    getMessage: (m) => `${m.childInitial}. completed ${m.value} calm-down activities in CalmCorner! Building real self-regulation skills.`,
    emoji: '💚',
  },
  'skill-master': {
    icon: <Crown className="w-8 h-8" />,
    gradient: 'from-amber-500 to-yellow-500',
    bgGradient: 'from-amber-50 to-yellow-50',
    getTitle: (m) => 'Skill Mastered!',
    getMessage: (m) => `${m.childInitial}. has mastered ${m.skillName || 'a skill track'} in Aminy Ease! Reached the highest difficulty level with sustained accuracy.`,
    emoji: '👑',
  },
  'session-count': {
    icon: <Trophy className="w-8 h-8" />,
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-50 to-indigo-50',
    getTitle: (m) => `${m.value} Sessions!`,
    getMessage: (m) => `${m.childInitial}. has completed ${m.value} Aminy Ease sessions! Every session builds toward meaningful progress.`,
    emoji: '🏆',
  },
};

export function JuniorMilestoneShare({
  milestone,
  onClose,
  onShared,
}: JuniorMilestoneShareProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const config = milestoneConfig[milestone.type];
  const title = config.getTitle(milestone);
  const message = config.getMessage(milestone);
  const shareText = `${config.emoji} ${title}\n\n${message}\n\n✨ Aminy Ease — Evidence-based learning for neurodivergent children\nhttps://aminy.app`;

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const handleNativeShare = useCallback(async () => {
    if (!canNativeShare) return;
    setSharing(true);
    try {
      await navigator.share({
        title: `Aminy Ease: ${title}`,
        text: shareText,
        url: 'https://aminy.app',
      });
      onShared?.('native');
    } catch {
      // User cancelled — not an error
    } finally {
      setSharing(false);
    }
  }, [canNativeShare, title, shareText, onShared]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      onShared?.('clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: textarea copy
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareText, onShared]);

  const handleSocialShare = useCallback((platform: 'twitter' | 'facebook') => {
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent('https://aminy.app');

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
    onShared?.(platform);
  }, [shareText, onShared]);

  const handleSMS = useCallback(() => {
    const smsBody = encodeURIComponent(shareText);
    window.open(`sms:?body=${smsBody}`, '_self');
    onShared?.('sms');
  }, [shareText, onShared]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-sm w-full animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Milestone card */}
        <div
          ref={cardRef}
          className={`rounded-2xl bg-gradient-to-br ${config.bgGradient} p-6 shadow-xl border border-white/20`}
        >
          {/* Icon + title */}
          <div className="text-center mb-4">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} text-white shadow-lg mb-3`}>
              {config.icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white text-sm font-bold">
                {milestone.childInitial}
              </div>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 text-center leading-relaxed mb-4">
            {message}
          </p>

          {/* Privacy note */}
          <p className="text-xs text-gray-400 text-center italic">
            Privacy-first: Uses initials only. No personal details shared.
          </p>
        </div>

        {/* Share actions */}
        <div className="mt-4 space-y-3">
          {/* Primary: Native share (mobile) or copy */}
          {canNativeShare ? (
            <button
              onClick={handleNativeShare}
              disabled={sharing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-[#6B9080] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Share2 size={18} />
              {sharing ? 'Sharing...' : 'Share Milestone'}
            </button>
          ) : (
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-[#6B9080] text-white rounded-xl font-medium transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy to Share'}
            </button>
          )}

          {/* Secondary share options */}
          <div className="flex gap-2">
            <button
              onClick={handleSMS}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/80 hover:bg-white text-gray-700 rounded-xl text-sm transition-colors border border-gray-200"
            >
              <MessageCircle size={16} />
              Text
            </button>
            <button
              onClick={() => handleSocialShare('twitter')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/80 hover:bg-white text-gray-700 rounded-xl text-sm transition-colors border border-gray-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Post
            </button>
            <button
              onClick={() => handleSocialShare('facebook')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/80 hover:bg-white text-gray-700 rounded-xl text-sm transition-colors border border-gray-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Share
            </button>
          </div>

          {/* Copy fallback if native share is available */}
          {canNativeShare && (
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Or copy text'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default JuniorMilestoneShare;
