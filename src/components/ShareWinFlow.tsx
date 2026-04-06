// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Share Win Flow
 * Easy one-tap sharing of success stories to social media
 * Addresses: "make success sharing easy for parents" for viral growth
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Twitter,
  Facebook,
  Instagram,
  Copy,
  Check,
  Download,
  Sparkles,
  Heart,
  Star,
  X,
  Camera,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface WinData {
  type: 'milestone' | 'streak' | 'goal' | 'calm_moment' | 'routine' | 'custom';
  title: string;
  description: string;
  metric?: string;
  date: Date;
  childName?: string;
}

interface ShareWinFlowProps {
  win: WinData;
  onClose?: () => void;
  isOpen?: boolean;
}

const WIN_TEMPLATES = {
  milestone: {
    emoji: '🎉',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
  },
  streak: {
    emoji: '🔥',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
  },
  goal: {
    emoji: '🎯',
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50',
  },
  calm_moment: {
    emoji: '🧘',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
  },
  routine: {
    emoji: '✅',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
  },
  custom: {
    emoji: '⭐',
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50',
  },
};

export function ShareWinFlow({ win, onClose, isOpen = true }: ShareWinFlowProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const template = WIN_TEMPLATES[win.type] || WIN_TEMPLATES.custom;

  const getShareText = () => {
    const childRef = win.childName ? `my child` : 'our family';
    const texts = {
      milestone: `${win.title}! ${childRef} just hit a major milestone. ${win.description} #AutismParenting #Aminy`,
      streak: `${win.metric} streak! Consistency matters. ${win.description} #ParentingWin #Aminy`,
      goal: `Goal achieved! ${win.title} - ${win.description} #Progress #Aminy`,
      calm_moment: `Calm win today. ${win.description} #MindfulParenting #Aminy`,
      routine: `Routine success! ${win.description} #Structure #Aminy`,
      custom: `Win of the day: ${win.title}. ${win.description} #ParentingWin #Aminy`,
    };
    return texts[win.type] || texts.custom;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getShareText());
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}`, '_blank');
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `aminy-win-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Image downloaded! Share it on Instagram or anywhere.');
    } catch (error) {
      toast.error('Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md"
        >
          <Card className="overflow-hidden">
            {/* Header */}
            <div className={`p-4 bg-gradient-to-r ${template.color} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Share Your Win</span>
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/20 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Shareable Card Preview */}
            <div className="p-3 sm:p-4">
              <div
                ref={cardRef}
                className={`p-6 rounded-xl ${template.bgColor} border-2 border-gray-100`}
              >
                {/* Branding */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-gray-900">Aminy</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {new Date(win.date).toLocaleDateString()}
                  </Badge>
                </div>

                {/* Win Content */}
                <div className="text-center py-4">
                  <span className="text-5xl mb-4 block">{template.emoji}</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {win.title}
                  </h3>
                  {win.metric && (
                    <p className="text-xl sm:text-2xl font-bold text-teal-600 mb-2">
                      {win.metric}
                    </p>
                  )}
                  <p className="text-gray-600">{win.description}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm text-gray-500">
                    Tracked with Aminy
                  </span>
                </div>
              </div>
            </div>

            {/* Share Options */}
            <div className="p-4 bg-gray-50 border-t">
              <p className="text-sm text-gray-500 mb-3 text-center">
                Share your progress and inspire other parents
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={handleShareTwitter}
                >
                  <Twitter className="w-5 h-5 text-blue-400" />
                  <span className="text-xs">Twitter</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={handleShareFacebook}
                >
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <span className="text-xs">Facebook</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={handleDownloadImage}
                  disabled={generating}
                >
                  {generating ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-pink-500" />
                  )}
                  <span className="text-xs">Instagram</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={handleCopyText}
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-xs">Copy</span>
                </Button>
              </div>

              {/* Text Preview */}
              <div className="p-3 bg-white rounded-lg border text-sm text-gray-600">
                {getShareText()}
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Quick Share Button - Can be placed anywhere a win happens
 */
export function QuickShareButton({
  win,
  variant = 'default',
}: {
  win: WinData;
  variant?: 'default' | 'compact' | 'icon';
}) {
  const [showFlow, setShowFlow] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFlow(true)}
          className="p-2"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        {showFlow && (
          <ShareWinFlow win={win} onClose={() => setShowFlow(false)} />
        )}
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFlow(true)}
        >
          <Share2 className="w-4 h-4 mr-1" />
          Share
        </Button>
        {showFlow && (
          <ShareWinFlow win={win} onClose={() => setShowFlow(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <Button onClick={() => setShowFlow(true)}>
        <Share2 className="w-4 h-4 mr-2" />
        Share this win
      </Button>
      {showFlow && (
        <ShareWinFlow win={win} onClose={() => setShowFlow(false)} />
      )}
    </>
  );
}

export default ShareWinFlow;
