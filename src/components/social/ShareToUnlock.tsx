// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Share-to-Unlock Mechanics
 * Incentivizes sharing achievements by unlocking premium content.
 * Generates shareable achievement cards with QR codes.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Lock,
  Unlock,
  Gift,
  Sparkles,
  CheckCircle,
  Star,
  Trophy,
  Palette,
  Volume2,
  Zap,
  X,
  Copy,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export type UnlockableType = 'buddy_accessory' | 'sound_pack' | 'daily_challenges';

export type ShareTrigger = 'care_plan_milestone' | 'ease_streak' | 'progress_snapshot';

export interface ShareableAchievement {
  id: string;
  trigger: ShareTrigger;
  title: string;
  description: string;
  unlocks: UnlockableType;
  unlockLabel: string;
  icon: 'trophy' | 'star' | 'zap';
  cardColor: string;
  cardGradient: string;
}

export interface ShareUnlockState {
  achievementId: string;
  shared: boolean;
  sharedAt: string | null;
  unlocked: boolean;
  unlockedAt: string | null;
  shareChannel: string | null;
}

// ============================================================================
// Achievement Definitions
// ============================================================================

const ACHIEVEMENTS: ShareableAchievement[] = [
  {
    id: 'care-plan-share',
    trigger: 'care_plan_milestone',
    title: 'Care Plan Champion',
    description: 'You completed a care plan milestone!',
    unlocks: 'buddy_accessory',
    unlockLabel: 'Custom Buddy Hat Accessory',
    icon: 'trophy',
    cardColor: '#43AA8B',
    cardGradient: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'ease-streak-share',
    trigger: 'ease_streak',
    title: 'Ease Streak Master',
    description: 'You maintained a 7-day Ease activity streak!',
    unlocks: 'sound_pack',
    unlockLabel: 'Premium Nature Sounds Pack',
    icon: 'star',
    cardColor: '#E07A5F',
    cardGradient: 'from-orange-400 to-rose-500',
  },
  {
    id: 'progress-share',
    trigger: 'progress_snapshot',
    title: 'Progress Superstar',
    description: 'Your child reached a new progress milestone!',
    unlocks: 'daily_challenges',
    unlockLabel: 'Bonus Daily Challenges',
    icon: 'zap',
    cardColor: '#577590',
    cardGradient: 'from-blue-500 to-indigo-600',
  },
];

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = 'aminy_share_unlocks';

function getUnlockStates(): Record<string, ShareUnlockState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveUnlockState(state: ShareUnlockState): void {
  const all = getUnlockStates();
  all[state.achievementId] = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function isUnlocked(achievementId: string): boolean {
  const states = getUnlockStates();
  return states[achievementId]?.unlocked === true;
}

export function getUnlockedItems(): string[] {
  const states = getUnlockStates();
  return Object.values(states)
    .filter(s => s.unlocked)
    .map(s => s.achievementId);
}

// ============================================================================
// Component
// ============================================================================

interface ShareToUnlockProps {
  /** Which achievement to show */
  trigger: ShareTrigger;
  /** User's referral code to embed in QR */
  referralCode?: string;
  /** Child's name for personalization */
  childName?: string;
  /** Callback when unlock happens */
  onUnlock?: (unlockType: UnlockableType) => void;
  /** Callback to close */
  onClose?: () => void;
}

export function ShareToUnlock({
  trigger,
  referralCode = 'AMINY-DEMO',
  childName = 'your child',
  onUnlock,
  onClose,
}: ShareToUnlockProps) {
  const achievement = ACHIEVEMENTS.find(a => a.trigger === trigger);
  const [isShared, setIsShared] = useState(false);
  const [isUnlockedState, setIsUnlockedState] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check if already unlocked
  useEffect(() => {
    if (achievement && isUnlocked(achievement.id)) {
      setIsUnlockedState(true);
      setIsShared(true);
    }
  }, [achievement]);

  const shareUrl = `https://aminy.ai/join?ref=${referralCode}`;

  const generateShareCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !achievement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 400;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, achievement.cardColor);
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, 600, 400, 16);
    ctx.fill();

    // Achievement title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(achievement.title, 300, 80);

    // Description
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(achievement.description, 300, 120);

    // Child name
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${childName}'s journey on Aminy`, 300, 160);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 190);
    ctx.lineTo(500, 190);
    ctx.stroke();

    // QR code placeholder (simple box pattern)
    const qrX = 225;
    const qrY = 210;
    const qrSize = 150;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = '#000000';
    // Simple pattern to represent QR
    const cellSize = qrSize / 10;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        // Corner squares
        if ((row < 3 && col < 3) || (row < 3 && col > 6) || (row > 6 && col < 3)) {
          ctx.fillRect(qrX + col * cellSize, qrY + row * cellSize, cellSize, cellSize);
        }
        // Random middle pattern (seeded by referral code)
        else if (referralCode.charCodeAt(row % referralCode.length) % 3 === col % 3) {
          ctx.fillRect(qrX + col * cellSize, qrY + row * cellSize, cellSize, cellSize);
        }
      }
    }

    // Branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText('aminy.ai', 300, 385);

    // Referral code
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Code: ${referralCode}`, 300, 370);

    setShowCard(true);
  }, [achievement, childName, referralCode]);

  const handleShare = async (channel: string) => {
    if (!achievement) return;

    // Generate the card image
    generateShareCard();

    const shareText = `${achievement.title}! ${achievement.description} Check out Aminy for your family's therapy journey. Use code ${referralCode} for a free trial! ${shareUrl}`;

    if (channel === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: achievement.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    } else if (channel === 'sms') {
      window.open(`sms:?body=${encodeURIComponent(shareText)}`);
    } else if (channel === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(achievement.title)}&body=${encodeURIComponent(shareText)}`);
    } else if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
    } else if (channel === 'copy') {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Share text copied!');
      } catch {
        toast.error('Could not copy to clipboard');
        return;
      }
    }

    // Mark as shared and unlock
    const state: ShareUnlockState = {
      achievementId: achievement.id,
      shared: true,
      sharedAt: new Date().toISOString(),
      unlocked: true,
      unlockedAt: new Date().toISOString(),
      shareChannel: channel,
    };

    saveUnlockState(state);
    setIsShared(true);

    // Animate unlock
    setTimeout(() => {
      setIsUnlockedState(true);
      onUnlock?.(achievement.unlocks);
      toast.success(`Unlocked: ${achievement.unlockLabel}!`);
    }, 500);
  };

  if (!achievement) return null;

  const AchievementIcon = achievement.icon === 'trophy' ? Trophy : achievement.icon === 'star' ? Star : Zap;
  const UnlockIcon = achievement.unlocks === 'buddy_accessory' ? Palette
    : achievement.unlocks === 'sound_pack' ? Volume2
    : Sparkles;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md"
      >
        <Card className="overflow-hidden">
          {/* Achievement Header */}
          <div className={`bg-gradient-to-br ${achievement.cardGradient} p-6 text-white text-center relative`}>
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-white/60 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center"
            >
              <AchievementIcon className="w-8 h-8" />
            </motion.div>

            <h2 className="text-xl font-bold mb-1">{achievement.title}</h2>
            <p className="text-sm text-white/80">{achievement.description}</p>
          </div>

          {/* Unlock Section */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              {!isUnlockedState ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  {/* What you unlock */}
                  <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#E8E4DF] flex items-center justify-center">
                      {isShared ? (
                        <Unlock className="w-5 h-5 text-[#6B9080]" />
                      ) : (
                        <Lock className="w-5 h-5 text-[#8A9BA8]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#1B2733]">
                        {achievement.unlockLabel}
                      </p>
                      <p className="text-xs text-[#5A6B7A]">
                        Share this achievement to unlock
                      </p>
                    </div>
                    <UnlockIcon className="w-5 h-5 text-[#8A9BA8]" />
                  </div>

                  {/* Share Buttons */}
                  <div className="space-y-2">
                    {'share' in navigator && (
                      <Button
                        onClick={() => handleShare('native')}
                        className="w-full bg-primary hover:bg-primary text-white"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Achievement
                      </Button>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleShare('sms')}
                        className="flex flex-col items-center p-2.5 bg-[#FAF7F2] rounded-xl hover:bg-[#F0EDE8] transition-colors"
                      >
                        <MessageCircle className="w-5 h-5 text-green-600 mb-1" />
                        <span className="text-xs text-[#5A6B7A]">Text</span>
                      </button>
                      <button
                        onClick={() => handleShare('email')}
                        className="flex flex-col items-center p-2.5 bg-[#FAF7F2] rounded-xl hover:bg-[#F0EDE8] transition-colors"
                      >
                        <Mail className="w-5 h-5 text-blue-600 mb-1" />
                        <span className="text-xs text-[#5A6B7A]">Email</span>
                      </button>
                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="flex flex-col items-center p-2.5 bg-[#FAF7F2] rounded-xl hover:bg-[#F0EDE8] transition-colors"
                      >
                        <MessageCircle className="w-5 h-5 text-emerald-600 mb-1" />
                        <span className="text-xs text-[#5A6B7A]">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => handleShare('copy')}
                        className="flex flex-col items-center p-2.5 bg-[#FAF7F2] rounded-xl hover:bg-[#F0EDE8] transition-colors"
                      >
                        <Copy className="w-5 h-5 text-[#5A6B7A] mb-1" />
                        <span className="text-xs text-[#5A6B7A]">Copy</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="unlocked"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="text-center py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', damping: 10 }}
                    className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center"
                  >
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-[#1B2733] mb-1">Unlocked!</h3>
                  <p className="text-sm text-[#5A6B7A] mb-3">{achievement.unlockLabel}</p>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <Gift className="w-3 h-3 mr-1" />
                    Added to your account
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hidden canvas for card generation */}
          <canvas ref={canvasRef} className="hidden" />
        </Card>
      </motion.div>
    </div>
  );
}

export default ShareToUnlock;
