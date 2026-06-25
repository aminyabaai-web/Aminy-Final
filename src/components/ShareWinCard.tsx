import React, { useState } from 'react';
import { Share2, Copy, Check, Download, X, Star, Trophy, Heart, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

type WinType = 'milestone' | 'breakthrough' | 'streak' | 'goal' | 'daily';

interface ShareWinCardProps {
  winText: string;
  childInitial?: string;
  winType?: WinType;
  streakCount?: number;
  onShare?: () => void;
}

const winTypeConfig: Record<WinType, { icon: React.ReactNode; gradient: string; label: string }> = {
  milestone: {
    icon: <Trophy className="w-5 h-5" />,
    gradient: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    label: 'Milestone Reached!'
  },
  breakthrough: {
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    label: 'Breakthrough!'
  },
  streak: {
    icon: <Star className="w-5 h-5" />,
    gradient: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
    label: 'Streak Achievement'
  },
  goal: {
    icon: <Trophy className="w-5 h-5" />,
    gradient: 'from-[#FAF7F2] to-[#F0EDE8] dark:from-blue-900/20 dark:to-cyan-900/20',
    label: 'Goal Completed!'
  },
  daily: {
    icon: <Heart className="w-5 h-5" />,
    gradient: 'from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20',
    label: "Today's Win"
  }
};

export function ShareWinCard({
  winText,
  childInitial = 'A',
  winType = 'daily',
  streakCount,
  onShare
}: ShareWinCardProps) {
  const [copied, setCopied] = useState(false);
  const config = winTypeConfig[winType];

  const shareText = `${config.label} ${winText}`;
  const shareFooter = '✨ Shared with Aminy - Supporting autism families';
  const privacyHint = 'Privacy-first: Uses initials only, no personal details shared.';

  const handleCopyLink = () => {
    const fullText = `${shareText}\n\n${shareFooter}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const fullText = `${shareText}\n\n${shareFooter}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: config.label,
          text: fullText,
          url: 'https://aminy.ai'
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
    onShare?.();
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`${shareText}\n\n${shareFooter}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    onShare?.();
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent('https://aminy.ai');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(shareText)}`, '_blank');
    onShare?.();
  };

  return (
    <Card className={`p-6 bg-gradient-to-br ${config.gradient} border-2 border-opacity-50
      shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]`}>
      {/* Header with icon and type */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-full bg-white/60 dark:bg-black/20 text-primary">
          {config.icon}
        </div>
        <span className="text-sm font-medium text-primary/80">{config.label}</span>
        {streakCount && winType === 'streak' && (
          <span className="ml-auto px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
            {streakCount} days!
          </span>
        )}
      </div>

      {/* Win text with child initial */}
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary
            flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
            {childInitial}
          </div>
          <p className="text-[#3A4A57] dark:text-slate-200 text-lg leading-relaxed pt-1">
            {winText}
          </p>
        </div>
      </div>

      {/* Aminy branding footer */}
      <div className="flex items-center justify-center p-3 bg-white/60 dark:bg-black/20 rounded-lg mb-4">
        <span className="text-sm text-muted-foreground font-medium">
          ✨ Shared with <span className="text-primary font-semibold">Aminy</span>
        </span>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleShare}
          className="flex-1 bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button
          onClick={shareToTwitter}
          variant="outline"
          size="sm"
          className="bg-white/60 dark:bg-black/20 hover:bg-sky-50 dark:hover:bg-sky-900/30"
          aria-label="Share on X"
        >
          <X className="w-4 h-4 text-[#1B2733]" />
        </Button>
        <Button
          onClick={shareToFacebook}
          variant="outline"
          size="sm"
          className="bg-white/60 dark:bg-black/20 hover:bg-[#EEF4F8] dark:hover:bg-blue-900/30"
          aria-label="Share on Facebook"
        >
          <Share2 className="w-4 h-4 text-blue-600" />
        </Button>
        <Button
          onClick={handleCopyLink}
          variant="outline"
          size="sm"
          className="bg-white/60 dark:bg-black/20"
          aria-label={copied ? "Win copied" : "Copy win to clipboard"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Privacy notice */}
      <p className="text-sm text-muted-foreground mt-3 text-center">
        🔒 {privacyHint}
      </p>
    </Card>
  );
}

// Export a gallery component for displaying multiple wins
export function WinCardGallery({ wins }: {
  wins: Array<{ text: string; type: WinType; initial?: string; streak?: number }>
}) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
      {wins.map((win, i) => (
        <ShareWinCard
          key={i}
          winText={win.text}
          winType={win.type}
          childInitial={win.initial}
          streakCount={win.streak}
        />
      ))}
    </div>
  );
}
