import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface ShareWinCardProps {
  winText: string;
  childInitial?: string;
  onShare?: () => void;
}

export function ShareWinCard({ winText, childInitial = 'A', onShare }: ShareWinCardProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `Today's win: ${winText}`;
  const shareFooter = 'Shared with Aminy Autism';
  const privacyHint = 'This post uses initials and no personal details.';

  const handleCopyLink = () => {
    const fullText = `${shareText}\n\n${shareFooter}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Today's Win",
        text: `${shareText}\n\n${shareFooter}`
      });
    } else {
      handleCopyLink();
    }
    onShare?.();
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Today's win</h3>
        <p className="text-slate-700">{winText}</p>
      </div>

      <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg mb-4">
        <span className="text-sm text-muted-foreground">{shareFooter}</span>
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-accent">{childInitial}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handleShare}
          className="flex-1"
          size="sm"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button 
          onClick={handleCopyLink}
          variant="outline"
          size="sm"
          aria-label={copied ? "Win copied" : "Copy win to clipboard"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        {privacyHint}
      </p>
    </Card>
  );
}
