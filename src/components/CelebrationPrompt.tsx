/**
 * Celebration Prompt Component
 * Auto-triggered celebrations and share prompts for milestones
 *
 * Trigger events:
 * - 3-day streak
 * - First goal completed
 * - Stress level improved
 * - 7-day streak (generates shareable card)
 * - Weekly adherence >80%
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  X,
  Share2,
  Download,
  Trophy,
  Flame,
  Heart,
  Target,
  Sparkles,
  Star,
  PartyPopper,
  TrendingDown,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export type CelebrationType =
  | 'streak_3'
  | 'streak_7'
  | 'first_goal'
  | 'stress_improved'
  | 'weekly_adherence'
  | 'milestone'
  | 'custom';

interface CelebrationData {
  type: CelebrationType;
  title: string;
  message: string;
  metric?: string | number;
  icon: 'trophy' | 'flame' | 'heart' | 'target' | 'star' | 'party';
  shareTemplate?: string;
}

interface CelebrationPromptProps {
  celebration: CelebrationData;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (celebration: CelebrationData) => void;
  userName?: string;
  childName?: string;
}

export function CelebrationPrompt({
  celebration,
  isOpen,
  onClose,
  onShare,
  userName,
  childName
}: CelebrationPromptProps) {
  const [showSharePreview, setShowSharePreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti on open
      triggerConfetti();
    }
  }, [isOpen]);

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const getIcon = () => {
    switch (celebration.icon) {
      case 'trophy': return <Trophy className="w-12 h-12 text-yellow-500" />;
      case 'flame': return <Flame className="w-12 h-12 text-orange-500" />;
      case 'heart': return <Heart className="w-12 h-12 text-pink-500" />;
      case 'target': return <Target className="w-12 h-12 text-purple-500" />;
      case 'star': return <Star className="w-12 h-12 text-yellow-400" />;
      case 'party': return <PartyPopper className="w-12 h-12 text-accent" />;
      default: return <Sparkles className="w-12 h-12 text-accent" />;
    }
  };

  const getGradient = () => {
    switch (celebration.icon) {
      case 'trophy': return 'from-yellow-400 to-amber-500';
      case 'flame': return 'from-orange-400 to-red-500';
      case 'heart': return 'from-pink-400 to-rose-500';
      case 'target': return 'from-purple-400 to-indigo-500';
      case 'star': return 'from-yellow-300 to-orange-400';
      case 'party': return 'from-accent to-teal-500';
      default: return 'from-accent to-teal-500';
    }
  };

  const handleShare = () => {
    setShowSharePreview(true);
    onShare?.(celebration);
  };

  const handleCopyShare = async () => {
    const shareText = celebration.shareTemplate ||
      `${celebration.title} with Aminy! ${celebration.message}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: celebration.title,
          text: shareText,
          url: 'https://aminy.app'
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-br ${getGradient()} p-8 text-center relative`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
            {getIcon()}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{celebration.title}</h2>

          {celebration.metric && (
            <Badge className="bg-white/20 text-white text-lg px-4 py-1">
              {celebration.metric}
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          <p className="text-slate-600 mb-6 leading-relaxed">
            {celebration.message}
          </p>

          {!showSharePreview ? (
            <div className="space-y-3">
              <Button
                onClick={handleShare}
                className={`w-full bg-gradient-to-r ${getGradient()} text-white hover:opacity-90 gap-2`}
              >
                <Share2 className="w-4 h-4" />
                Share This Win!
              </Button>

              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full text-slate-500"
              >
                Keep it private
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Share Preview Card */}
              <div className={`bg-gradient-to-br ${getGradient()} p-4 rounded-xl text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Aminy Win!</span>
                </div>
                <p className="text-sm opacity-90">
                  {celebration.shareTemplate || celebration.message}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyShare}
                  className="flex-1 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSharePreview(false)}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Celebration Trigger Hook
 * Monitors user activity and triggers celebrations at appropriate moments
 */
export function useCelebrationTriggers() {
  const [pendingCelebration, setPendingCelebration] = useState<CelebrationData | null>(null);
  const [celebrationsShown, setCelebrationsShown] = useState<Set<string>>(new Set());

  // Load shown celebrations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('aminy-celebrations-shown');
      if (stored) {
        setCelebrationsShown(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error('Error loading celebrations:', e);
    }
  }, []);

  const markShown = (type: string) => {
    const newSet = new Set(celebrationsShown);
    newSet.add(type);
    setCelebrationsShown(newSet);
    localStorage.setItem('aminy-celebrations-shown', JSON.stringify(Array.from(newSet)));
  };

  const triggerStreak = (days: number) => {
    if (days === 3 && !celebrationsShown.has('streak_3')) {
      setPendingCelebration({
        type: 'streak_3',
        title: '3-Day Streak!',
        message: "You've shown up for three days straight. That's the beginning of a habit! Keep going — you're building something beautiful.",
        metric: '3 days',
        icon: 'flame',
        shareTemplate: "I just hit a 3-day streak on Aminy! Consistency is key when supporting a child with autism."
      });
      markShown('streak_3');
    } else if (days === 7 && !celebrationsShown.has('streak_7')) {
      setPendingCelebration({
        type: 'streak_7',
        title: 'One Week Strong!',
        message: "A full week of consistency! You're not just using an app — you're transforming your family's routine. That takes dedication.",
        metric: '7 days',
        icon: 'trophy',
        shareTemplate: "One week of daily progress with Aminy! Helping my child thrive, one day at a time."
      });
      markShown('streak_7');
    }
  };

  const triggerFirstGoal = () => {
    if (!celebrationsShown.has('first_goal')) {
      setPendingCelebration({
        type: 'first_goal',
        title: 'First Goal Complete!',
        message: "You set a goal and crushed it. This is what progress looks like. What's next?",
        icon: 'target',
        shareTemplate: "Just completed my first goal with Aminy! Small wins lead to big changes."
      });
      markShown('first_goal');
    }
  };

  const triggerStressImproved = (percentImproved: number) => {
    if (percentImproved >= 20 && !celebrationsShown.has(`stress_improved_${Math.floor(percentImproved / 10) * 10}`)) {
      setPendingCelebration({
        type: 'stress_improved',
        title: 'Feeling Better!',
        message: `Your stress levels are down ${Math.round(percentImproved)}% from last week. Taking care of yourself helps you take better care of your child.`,
        metric: `${Math.round(percentImproved)}% lower`,
        icon: 'heart',
        shareTemplate: "My stress is down this week! Aminy is helping me be a calmer, more present parent."
      });
      markShown(`stress_improved_${Math.floor(percentImproved / 10) * 10}`);
    }
  };

  const triggerWeeklyAdherence = (percent: number) => {
    if (percent >= 80 && !celebrationsShown.has(`adherence_${Math.floor(percent / 10) * 10}`)) {
      setPendingCelebration({
        type: 'weekly_adherence',
        title: 'Routine Champion!',
        message: `${percent}% routine completion this week! That consistency creates the predictability children with autism need to thrive.`,
        metric: `${percent}%`,
        icon: 'star',
        shareTemplate: `${percent}% routine completion this week with Aminy! Consistency is love in action.`
      });
      markShown(`adherence_${Math.floor(percent / 10) * 10}`);
    }
  };

  const triggerMilestone = (title: string, message: string, shareTemplate?: string) => {
    setPendingCelebration({
      type: 'milestone',
      title,
      message,
      icon: 'party',
      shareTemplate
    });
  };

  const dismissCelebration = () => {
    setPendingCelebration(null);
  };

  return {
    pendingCelebration,
    triggerStreak,
    triggerFirstGoal,
    triggerStressImproved,
    triggerWeeklyAdherence,
    triggerMilestone,
    dismissCelebration
  };
}

/**
 * Pre-built Share Templates
 */
export const SHARE_TEMPLATES = {
  week1: (metrics: { stress?: number; routines?: number }) => ({
    title: 'Week 1 with Aminy',
    text: `Just completed my first week with Aminy! ${metrics.stress ? `Stress down ${metrics.stress}%. ` : ''}${metrics.routines ? `${metrics.routines}% routine completion. ` : ''}Feeling more confident as a parent.`,
    hashtags: ['AutismParent', 'AminyApp', 'ParentWellness']
  }),

  milestone: (childName: string, milestone: string) => ({
    title: 'Milestone Moment',
    text: `My child just ${milestone} with support from Aminy! These moments make every effort worth it.`,
    hashtags: ['AutismWin', 'AminyApp', 'CelebrateDifferences']
  }),

  confidence: () => ({
    title: 'Parent Confidence',
    text: "Feeling more confident as a parent. Aminy gives me the tools and support I need to help my child thrive.",
    hashtags: ['AutismParent', 'AminyApp', 'YouGotThis']
  }),

  routine: (streak: number) => ({
    title: 'Routine Streak',
    text: `${streak}-day routine streak! Consistency isn't easy, but it's making a difference.`,
    hashtags: ['AutismRoutines', 'AminyApp', 'ConsistencyWins']
  })
};

export default CelebrationPrompt;
