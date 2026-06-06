// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ShareInsight Component
 *
 * Makes sharing AI insights natural and beautiful.
 * Generates branded shareable cards that spread organically.
 *
 * Every valuable AI insight should be one tap away from being shared.
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Copy,
  Check,
  Download,
  MessageCircle,
  X,
  Sparkles,
  Heart,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface ShareInsightProps {
  insight: string;
  childName: string;
  category?: string; // e.g., "sleep tip", "meltdown strategy", "communication"
  onShare?: (platform: string) => void;
  variant?: 'inline' | 'floating' | 'modal';
}

// Clean up insight text for sharing
function prepareInsightForSharing(insight: string, childName: string): string {
  // Remove child's name for privacy, replace with generic
  const sanitized = insight.replace(new RegExp(childName, 'gi'), '[child]');

  // Truncate if too long
  if (sanitized.length > 280) {
    return sanitized.substring(0, 277) + '...';
  }
  return sanitized;
}

// Generate category emoji
function getCategoryEmoji(category?: string): string {
  const emojiMap: Record<string, string> = {
    'sleep': '😴',
    'meltdown': '🌊',
    'communication': '💬',
    'sensory': '✨',
    'routine': '📋',
    'anxiety': '💙',
    'behavior': '🎯',
    'nutrition': '🍎',
    'default': '💡',
  };
  return emojiMap[category?.toLowerCase() || 'default'] || emojiMap.default;
}

export function ShareInsight({
  insight,
  childName,
  category,
  onShare,
  variant = 'inline',
}: ShareInsightProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareText = prepareInsightForSharing(insight, childName);
  const emoji = getCategoryEmoji(category);
  const shareUrl = 'https://aminy.ai';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${emoji} ${shareText}\n\nvia @AminyApp - AI support for special needs parents\n${shareUrl}`);
      setCopied(true);
      onShare?.('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareText, emoji, onShare]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Helpful tip from Aminy',
          text: `${emoji} ${shareText}`,
          url: shareUrl,
        });
        onShare?.('native');
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      setShowShareMenu(true);
    }
  }, [shareText, emoji, onShare]);

  const handleTwitterShare = useCallback(() => {
    const tweetText = encodeURIComponent(`${emoji} ${shareText}\n\nvia @AminyApp`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    onShare?.('twitter');
    setShowShareMenu(false);
  }, [shareText, emoji, onShare]);

  const handleFacebookShare = useCallback(() => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`${emoji} ${shareText}`)}`, '_blank');
    onShare?.('facebook');
    setShowShareMenu(false);
  }, [shareText, emoji, onShare]);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(`${emoji} ${shareText}\n\nvia Aminy - ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onShare?.('whatsapp');
    setShowShareMenu(false);
  }, [shareText, emoji, onShare]);

  // Inline variant - small share button
  if (variant === 'inline') {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#6B9080] hover:text-[#6B9080] hover:bg-[#6B9080]/10 rounded-full transition-colors"
          aria-label="Share this insight"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        <AnimatePresence>
          {showShareMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 mb-2 z-50"
            >
              <Card className="p-2 shadow-lg bg-white border border-gray-200">
                <div className="flex gap-1">
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-600" />}
                  </button>
                  <button
                    onClick={handleTwitterShare}
                    className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
                    title="Share on X"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
                    title="Share on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={handleFacebookShare}
                    className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
                    title="Share on Facebook"
                  >
                    <Share2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowShareMenu(false)}
                    className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Floating variant - appears after AI response
  if (variant === 'floating') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2"
      >
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-[#6B9080] hover:bg-[#6B9080]/10 rounded-full transition-all border border-gray-200 hover:border-[#6B9080]/20"
        >
          <Share2 className="w-3 h-3" />
          <span>Share tip</span>
        </button>
        <button
          onClick={handleCopy}
          className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-[#F0EDE8] rounded-full transition-colors"
          title="Copy"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </motion.div>
    );
  }

  // Modal variant - full preview with branded card
  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] hover:from-teal-600 hover:to-cyan-600 rounded-xl transition-all shadow-sm"
      >
        <Share2 className="w-4 h-4" />
        <span>Share This Insight</span>
      </button>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Preview Card */}
              <div
                ref={cardRef}
                className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white shadow-2xl mb-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-white/90">Aminy Tip</span>
                  {category && (
                    <span className="ml-auto text-xs px-2 py-0.5 bg-white/20 rounded-full">
                      {emoji} {category}
                    </span>
                  )}
                </div>

                <p className="text-lg leading-relaxed mb-4">
                  "{shareText}"
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/20">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-300" />
                    <span className="text-xs text-white/70">Shared with love</span>
                  </div>
                  <span className="text-xs font-medium">aminy.ai</span>
                </div>
              </div>

              {/* Share Actions */}
              <Card className="p-4 bg-white">
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Share this tip with other parents who might need it
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex flex-col items-center gap-1 p-3 hover:bg-[#F0EDE8] rounded-xl transition-colors"
                  >
                    {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-gray-600" />}
                    <span className="text-xs text-gray-500">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleTwitterShare}
                    className="flex flex-col items-center gap-1 p-3 hover:bg-[#F0EDE8] rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-900" />
                    <span className="text-xs text-gray-500">X</span>
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex flex-col items-center gap-1 p-3 hover:bg-[#F0EDE8] rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-6 h-6 text-green-500" />
                    <span className="text-xs text-gray-500">WhatsApp</span>
                  </button>
                  <button
                    onClick={handleFacebookShare}
                    className="flex flex-col items-center gap-1 p-3 hover:bg-[#F0EDE8] rounded-xl transition-colors"
                  >
                    <Share2 className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-500">Facebook</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowPreview(false)}
                  className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Maybe later
                </button>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * ShareInsightInline - Minimal share button for chat messages
 */
export function ShareInsightInline({
  insight,
  childName,
  category,
  onShare,
}: Omit<ShareInsightProps, 'variant'>) {
  return (
    <ShareInsight
      insight={insight}
      childName={childName}
      category={category}
      onShare={onShare}
      variant="floating"
    />
  );
}

export default ShareInsight;
