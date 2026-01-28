/**
 * Shareable Milestone Card Component
 * Creates beautiful, shareable images of child achievements for viral potential
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Download,
  X,
  Star,
  Trophy,
  Heart,
  Sparkles,
  PartyPopper,
  Rocket,
  Crown,
  Medal,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  Copy,
  Instagram,
  Twitter,
  Facebook,
  MessageCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';

type MilestoneType =
  | 'first_word'
  | 'new_skill'
  | 'streak'
  | 'therapy_win'
  | 'social_success'
  | 'independence'
  | 'communication'
  | 'sensory_win'
  | 'behavioral'
  | 'custom';

interface MilestoneConfig {
  icon: React.ElementType;
  gradient: string;
  pattern: string;
  emoji: string;
  defaultTitle: string;
}

const MILESTONE_CONFIGS: Record<MilestoneType, MilestoneConfig> = {
  first_word: {
    icon: MessageCircle,
    gradient: 'from-purple-500 to-pink-500',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
    emoji: '🗣️',
    defaultTitle: 'First Word!',
  },
  new_skill: {
    icon: Star,
    gradient: 'from-amber-400 to-orange-500',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
    emoji: '⭐',
    defaultTitle: 'New Skill Unlocked!',
  },
  streak: {
    icon: Trophy,
    gradient: 'from-emerald-400 to-teal-500',
    pattern: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
    emoji: '🔥',
    defaultTitle: 'Streak Achievement!',
  },
  therapy_win: {
    icon: Medal,
    gradient: 'from-blue-500 to-indigo-600',
    pattern: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 60%)',
    emoji: '🏆',
    defaultTitle: 'Therapy Win!',
  },
  social_success: {
    icon: Heart,
    gradient: 'from-rose-400 to-pink-500',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 40%)',
    emoji: '💖',
    defaultTitle: 'Social Success!',
  },
  independence: {
    icon: Rocket,
    gradient: 'from-cyan-400 to-blue-500',
    pattern: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 50%)',
    emoji: '🚀',
    defaultTitle: 'Independence Win!',
  },
  communication: {
    icon: Sparkles,
    gradient: 'from-violet-500 to-purple-600',
    pattern: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)',
    emoji: '✨',
    defaultTitle: 'Communication Milestone!',
  },
  sensory_win: {
    icon: Target,
    gradient: 'from-lime-400 to-green-500',
    pattern: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
    emoji: '🎯',
    defaultTitle: 'Sensory Win!',
  },
  behavioral: {
    icon: TrendingUp,
    gradient: 'from-orange-400 to-red-500',
    pattern: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
    emoji: '📈',
    defaultTitle: 'Behavioral Progress!',
  },
  custom: {
    icon: PartyPopper,
    gradient: 'from-fuchsia-500 to-pink-500',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)',
    emoji: '🎉',
    defaultTitle: 'Celebration!',
  },
};

interface ShareableMilestoneCardProps {
  isOpen: boolean;
  onClose: () => void;
  childName: string;
  milestoneType: MilestoneType;
  title?: string;
  description: string;
  date?: Date;
  streakDays?: number;
  customEmoji?: string;
}

export function ShareableMilestoneCard({
  isOpen,
  onClose,
  childName,
  milestoneType,
  title,
  description,
  date = new Date(),
  streakDays,
  customEmoji,
}: ShareableMilestoneCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const config = MILESTONE_CONFIGS[milestoneType];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayEmoji = customEmoji || config.emoji;

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    triggerHaptic('medium');
    const blob = await generateImage();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${childName}-milestone-${date.toISOString().split('T')[0]}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerHaptic('success');
  };

  const handleShare = async () => {
    triggerHaptic('medium');
    const blob = await generateImage();
    if (!blob) return;

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], 'milestone.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${childName}'s Milestone!`,
            text: `${displayEmoji} ${displayTitle}\n${description}\n\nTracked with Aminy - your child development companion`,
            files: [file],
          });
          triggerHaptic('success');
          return;
        }
      } catch (err) {
        console.error('Share failed:', err);
      }
    }

    // Fallback to showing share options
    setShowShareOptions(true);
  };

  const handleCopyLink = async () => {
    const shareText = `${displayEmoji} ${displayTitle}\n\n${description}\n\nTracked with Aminy - helping families thrive!\naminy.app`;
    await navigator.clipboard.writeText(shareText);
    triggerHaptic('success');
  };

  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* The Shareable Card */}
            <div
              ref={cardRef}
              className="relative overflow-hidden rounded-3xl shadow-2xl"
              style={{ aspectRatio: '1/1.2' }}
            >
              {/* Background Gradient */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  config.gradient
                )}
                style={{ backgroundImage: config.pattern }}
              />

              {/* Decorative Elements */}
              <div className="absolute inset-0">
                {/* Floating shapes */}
                <div className="absolute top-8 left-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-16 right-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-12 w-16 h-16 bg-white/5 rounded-full blur-xl" />
              </div>

              {/* Content */}
              <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
                {/* Header */}
                <div className="text-center">
                  {/* Big Emoji */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2, damping: 10 }}
                    className="text-7xl mb-4"
                  >
                    {displayEmoji}
                  </motion.div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2 drop-shadow-lg">
                    {displayTitle}
                  </h2>

                  {/* Child Name */}
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Crown className="w-4 h-4" />
                    <span className="font-semibold">{childName}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="text-center my-6">
                  <p className="text-xl leading-relaxed font-medium drop-shadow-md">
                    "{description}"
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{formattedDate}</span>
                  </div>

                  {streakDays && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
                      <span className="text-lg">🔥</span>
                      <span className="font-semibold">{streakDays} day streak</span>
                    </div>
                  )}
                </div>

                {/* Branding */}
                <div className="mt-4 sm:mt-6 pt-4 border-t border-white/20 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium text-sm">Tracked with Aminy</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 sm:mt-6 flex gap-3">
              <Button
                onClick={handleDownload}
                disabled={isGenerating}
                variant="outline"
                className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Save Image'}
              </Button>
              <Button
                onClick={handleShare}
                disabled={isGenerating}
                className="flex-1 bg-white text-primary hover:bg-white/90"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Share Options Modal */}
            <AnimatePresence>
              {showShareOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-4 bg-white rounded-xl p-4"
                >
                  <h4 className="font-semibold text-primary mb-3 text-center">Share to...</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => {
                        handleCopyLink();
                        setShowShareOptions(false);
                      }}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Copy className="w-5 h-5 text-gray-600" />
                      </div>
                      <span className="text-xs text-muted-foreground">Copy</span>
                    </button>
                    <a
                      href={`https://www.instagram.com/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                        <Instagram className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs text-muted-foreground">Instagram</span>
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(`${displayEmoji} ${displayTitle} - ${description}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Facebook className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs text-muted-foreground">Facebook</span>
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${displayEmoji} ${displayTitle}\n\n${description}\n\nTracked with @AminyApp`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                        <Twitter className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs text-muted-foreground">X</span>
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Quick Share Button for wins/milestones
 */
export function ShareMilestoneButton({
  childName,
  milestoneType,
  description,
  className,
}: {
  childName: string;
  milestoneType: MilestoneType;
  description: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(true);
        }}
        className={cn(
          "p-2 rounded-full hover:bg-gray-100 transition-colors",
          className
        )}
      >
        <Share2 className="w-5 h-5 text-muted-foreground" />
      </button>

      <ShareableMilestoneCard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        childName={childName}
        milestoneType={milestoneType}
        description={description}
      />
    </>
  );
}

export default ShareableMilestoneCard;
