/**
 * MilestoneShareCard.tsx
 *
 * Generates a shareable card image when a child achieves a milestone.
 * Uses Canvas API to render a branded, privacy-safe card.
 * Shares via Web Share API with fallback to clipboard copy.
 *
 * Milestones: first session, 7-day streak, 10 activities completed,
 *             level up, badge earned.
 *
 * Privacy: NEVER includes child photo, last name, or identifiable info.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Share2, Download, Check, Copy, X, Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MilestoneType =
  | 'first_session'
  | '7_day_streak'
  | '10_activities'
  | 'level_up'
  | 'badge_earned';

export interface MilestoneData {
  type: MilestoneType;
  childFirstName: string;
  /** Extra detail — e.g. streak count, badge name, new level */
  detail?: string;
}

interface MilestoneConfig {
  title: string;
  subtitle: string;
  emoji: string;
  gradientStart: string;
  gradientEnd: string;
}

// ---------------------------------------------------------------------------
// Milestone Configurations
// ---------------------------------------------------------------------------

const MILESTONE_CONFIGS: Record<MilestoneType, MilestoneConfig> = {
  first_session: {
    title: 'First Session Complete!',
    subtitle: 'The journey begins',
    emoji: '🎉',
    gradientStart: '#43AA8B',
    gradientEnd: '#577590',
  },
  '7_day_streak': {
    title: '7-Day Streak!',
    subtitle: 'Consistency is everything',
    emoji: '🔥',
    gradientStart: '#E07A5F',
    gradientEnd: '#F2CC8F',
  },
  '10_activities': {
    title: '10 Activities Done!',
    subtitle: 'Building great habits',
    emoji: '⭐',
    gradientStart: '#577590',
    gradientEnd: '#43AA8B',
  },
  level_up: {
    title: 'Level Up!',
    subtitle: 'Growing stronger every day',
    emoji: '🚀',
    gradientStart: '#6C63FF',
    gradientEnd: '#43AA8B',
  },
  badge_earned: {
    title: 'Badge Earned!',
    subtitle: 'A new achievement unlocked',
    emoji: '🏆',
    gradientStart: '#F2CC8F',
    gradientEnd: '#E07A5F',
  },
};

// ---------------------------------------------------------------------------
// Canvas Rendering
// ---------------------------------------------------------------------------

const CARD_WIDTH = 600;
const CARD_HEIGHT = 400;

function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  milestone: MilestoneData
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const config = MILESTONE_CONFIGS[milestone.type];

  // --- Background gradient ---
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, config.gradientStart);
  gradient.addColorStop(1, config.gradientEnd);
  ctx.fillStyle = gradient;
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 24);
  ctx.fill();

  // --- Semi-transparent overlay for readability ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, 24, 24, CARD_WIDTH - 48, CARD_HEIGHT - 48, 16);
  ctx.fill();

  // --- Decorative circles ---
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(CARD_WIDTH - 60, 60, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, CARD_HEIGHT - 40, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // --- Emoji ---
  ctx.font = '64px serif';
  ctx.textAlign = 'center';
  ctx.fillText(config.emoji, CARD_WIDTH / 2, 100);

  // --- Child's first name ---
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${milestone.childFirstName}'s Achievement`,
    CARD_WIDTH / 2,
    160
  );

  // --- Milestone title ---
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(config.title, CARD_WIDTH / 2, 210);

  // --- Detail / subtitle ---
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const detailText = milestone.detail || config.subtitle;
  ctx.fillText(detailText, CARD_WIDTH / 2, 250);

  // --- Divider line ---
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CARD_WIDTH / 2 - 80, 280);
  ctx.lineTo(CARD_WIDTH / 2 + 80, 280);
  ctx.stroke();

  // --- Branding ---
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('Aminy', CARD_WIDTH / 2, 320);

  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(
    'Behavioral wellness for neurodivergent families',
    CARD_WIDTH / 2,
    345
  );

  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('aminy.ai', CARD_WIDTH / 2, 375);
}

/** Helper: rounded rectangle path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Sharing Utilities
// ---------------------------------------------------------------------------

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      'image/png',
      1.0
    );
  });
}

async function shareViaWebShareAPI(
  canvas: HTMLCanvasElement,
  milestone: MilestoneData
): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;

  try {
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], 'aminy-milestone.png', { type: 'image/png' });

    const shareData: ShareData = {
      title: `${milestone.childFirstName}'s Milestone on Aminy`,
      text: `${milestone.childFirstName} just achieved: ${MILESTONE_CONFIGS[milestone.type].title} on Aminy! 🎉`,
      url: 'https://aminy.ai',
      files: [file],
    };

    if (navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    }

    // Fallback: share without file
    const textOnly: ShareData = {
      title: shareData.title,
      text: shareData.text,
      url: shareData.url,
    };
    await navigator.share(textOnly);
    return true;
  } catch (err) {
    // User cancelled share — not an error
    if ((err as Error).name === 'AbortError') return true;
    console.warn('[MilestoneShareCard] Web Share failed:', err);
    return false;
  }
}

async function fallbackCopyLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(
      'Check out Aminy — behavioral wellness for neurodivergent families: https://aminy.ai'
    );
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aminy-milestone.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MilestoneShareCardProps {
  milestone: MilestoneData;
  onClose: () => void;
  /** Called after a successful share action */
  onShared?: (channel: 'native' | 'copy' | 'download') => void;
}

export function MilestoneShareCard({
  milestone,
  onClose,
  onShared,
}: MilestoneShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Render the card on mount / milestone change
  useEffect(() => {
    if (canvasRef.current) {
      renderCardToCanvas(canvasRef.current, milestone);
    }
  }, [milestone]);

  const handleShare = useCallback(async () => {
    if (!canvasRef.current || sharing) return;
    setSharing(true);

    const shared = await shareViaWebShareAPI(canvasRef.current, milestone);
    if (shared) {
      onShared?.('native');
    } else {
      // Fallback: copy link
      const didCopy = await fallbackCopyLink();
      if (didCopy) {
        setCopied(true);
        onShared?.('copy');
        setTimeout(() => setCopied(false), 2500);
      }
    }

    setSharing(false);
  }, [milestone, onShared, sharing]);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    await downloadImage(canvasRef.current);
    onShared?.('download');
  }, [onShared]);

  const config = MILESTONE_CONFIGS[milestone.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8E4DF]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-[#1B2733] text-base">
              Share This Milestone!
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#8A9BA8] hover:text-[#5A6B7A] hover:bg-[#F0EDE8] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas preview */}
        <div className="p-4">
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl shadow-md"
            style={{ aspectRatio: `${CARD_WIDTH}/${CARD_HEIGHT}` }}
          />
        </div>

        {/* Achievement summary */}
        <div className="px-4 pb-2 text-center">
          <p className="text-sm text-[#5A6B7A]">
            <span className="text-lg mr-1">{config.emoji}</span>
            <strong>{milestone.childFirstName}</strong> just hit a milestone!
          </p>
        </div>

        {/* Action buttons */}
        <div className="p-4 pt-2 flex gap-3">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${config.gradientStart}, ${config.gradientEnd})`,
            }}
          >
            {copied ? (
              <>
                <Check size={18} />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                {typeof navigator.share === 'function' ? <Share2 size={18} /> : <Copy size={18} />}
                <span>{typeof navigator.share === 'function' ? 'Share' : 'Copy Link'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-[#3A4A57] bg-[#F0EDE8] hover:bg-[#E8E4DF] transition-all active:scale-95"
            aria-label="Download image"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MilestoneShareCard;
