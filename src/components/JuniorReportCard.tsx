/**
 * JuniorReportCard — Weekly Progress Sharing Component
 *
 * Displays a visual weekly summary card showing:
 *   - Sessions completed, skills practiced, accuracy trend
 *   - Streak, top achievements
 *   - Shareable as image via canvas capture
 *   - "Share with Therapist" button for CentralReach push
 *
 * Does NOT modify App.tsx or JuniorPageEnhancedPro.tsx.
 * Import this component where needed:
 *   import { JuniorReportCard } from './JuniorReportCard';
 */

import { useState, useCallback, useRef } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Calendar,
  Clock,
  Flame,
  Target,
  Share2,
  Copy,
  Check,
  X,
  Send,
  Download,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface WeeklyReportData {
  childInitial: string;
  weekLabel: string;             // e.g., "Mar 3 - Mar 9, 2026"
  sessionsCompleted: number;
  totalMinutes: number;
  streak: number;                // consecutive days
  skillsPracticed: string[];     // e.g., ["Speech", "Social", "Sensory"]
  accuracyTrend: 'improving' | 'stable' | 'declining';
  avgAccuracy: number;           // 0-100
  topAchievements: string[];     // e.g., ["First Word!", "5-Day Streak"]
  domainBreakdown: Array<{
    domain: string;
    sessions: number;
    accuracy: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  tokensEarned: number;
  calmCornerCount: number;
}

interface JuniorReportCardProps {
  data: WeeklyReportData;
  onClose: () => void;
  onShareTherapist?: (reportText: string) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function trendIcon(trend: 'improving' | 'stable' | 'declining') {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    default:
      return <Minus className="w-4 h-4 text-[#8A9BA8]" />;
  }
}

function trendLabel(trend: 'improving' | 'stable' | 'declining') {
  switch (trend) {
    case 'improving': return 'Improving';
    case 'declining': return 'Needs attention';
    default: return 'Steady';
  }
}

function trendColor(trend: 'improving' | 'stable' | 'declining') {
  switch (trend) {
    case 'improving': return 'text-green-600';
    case 'declining': return 'text-red-500';
    default: return 'text-[#5A6B7A]';
  }
}

function accuracyColor(accuracy: number): string {
  if (accuracy >= 80) return 'text-green-600';
  if (accuracy >= 60) return 'text-amber-600';
  return 'text-red-500';
}

function accuracyBg(accuracy: number): string {
  if (accuracy >= 80) return 'bg-green-100';
  if (accuracy >= 60) return 'bg-amber-100';
  return 'bg-red-100';
}

// =============================================================================
// Canvas-based image export (no external dependency)
// =============================================================================

async function captureCardAsImage(element: HTMLElement): Promise<Blob | null> {
  try {
    // Use the native Canvas approach: render the DOM element's computed layout
    const canvas = document.createElement('canvas');
    const scale = 2; // Retina-quality
    const rect = element.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Serialize the DOM to SVG foreignObject for canvas rendering
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${element.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

// =============================================================================
// Format report as CentralReach-compatible text
// =============================================================================

function formatForTherapist(data: WeeklyReportData): string {
  const lines: string[] = [
    `AMINY JUNIOR — Weekly Progress Report`,
    `Child: ${data.childInitial}. | Week: ${data.weekLabel}`,
    `---`,
    `Sessions: ${data.sessionsCompleted} | Total Time: ${data.totalMinutes} min | Streak: ${data.streak} days`,
    `Average Accuracy: ${data.avgAccuracy}% (${trendLabel(data.accuracyTrend)})`,
    `Skills Practiced: ${data.skillsPracticed.join(', ')}`,
    `Tokens Earned: ${data.tokensEarned} | Calm Corner: ${data.calmCornerCount}x`,
    ``,
    `--- Domain Breakdown ---`,
  ];

  data.domainBreakdown.forEach(d => {
    if (d.sessions > 0) {
      lines.push(`  ${d.domain}: ${d.sessions} sessions, ${d.accuracy}% avg accuracy (${trendLabel(d.trend)})`);
    }
  });

  if (data.topAchievements.length > 0) {
    lines.push('');
    lines.push('--- Achievements ---');
    data.topAchievements.forEach(a => lines.push(`  * ${a}`));
  }

  lines.push('');
  lines.push('Generated by Aminy Ease | https://aminy.app');
  lines.push('Note: Data is parent-reported via in-app activity tracking.');

  return lines.join('\n');
}

// =============================================================================
// Component
// =============================================================================

export function JuniorReportCard({
  data,
  onClose,
  onShareTherapist,
}: JuniorReportCardProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  // -------------------------------------------------------------------------
  // Share as image
  // -------------------------------------------------------------------------
  const handleShareImage = useCallback(async () => {
    if (!cardRef.current) return;
    setSharing(true);

    try {
      const blob = await captureCardAsImage(cardRef.current);

      if (blob && canNativeShare) {
        const file = new File([blob], 'aminy-junior-report.png', { type: 'image/png' });
        await navigator.share({
          title: `Aminy Ease Report — ${data.weekLabel}`,
          files: [file],
        });
      } else {
        // Fallback: copy text
        await handleCopyText();
      }
    } catch {
      // User cancelled or share not supported
    } finally {
      setSharing(false);
    }
  }, [data, canNativeShare]);

  // -------------------------------------------------------------------------
  // Copy report text
  // -------------------------------------------------------------------------
  const handleCopyText = useCallback(async () => {
    const text = formatForTherapist(data);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  // -------------------------------------------------------------------------
  // Share with therapist (CentralReach push)
  // -------------------------------------------------------------------------
  const handleShareTherapist = useCallback(() => {
    const text = formatForTherapist(data);
    onShareTherapist?.(text);
  }, [data, onShareTherapist]);

  // -------------------------------------------------------------------------
  // Download as image
  // -------------------------------------------------------------------------
  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    const blob = await captureCardAsImage(cardRef.current);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aminy-junior-report-${data.weekLabel.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="max-w-md w-full my-4">
        {/* Close */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Report Card */}
        <div
          ref={cardRef}
          className="rounded-2xl bg-white p-5 shadow-xl border border-[#E8E4DF]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white text-lg font-bold">
              {data.childInitial}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#1B2733]">Weekly Report Card</h2>
              <div className="flex items-center gap-1 text-xs text-[#5A6B7A]">
                <Calendar className="w-3 h-3" />
                {data.weekLabel}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {trendIcon(data.accuracyTrend)}
              <span className={`text-xs font-medium ${trendColor(data.accuracyTrend)}`}>
                {trendLabel(data.accuracyTrend)}
              </span>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 rounded-xl bg-[#EEF4F8]">
              <div className="text-lg font-bold text-blue-700">{data.sessionsCompleted}</div>
              <div className="text-xs text-blue-500">Sessions</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-green-50">
              <div className={`text-lg font-bold ${accuracyColor(data.avgAccuracy)}`}>
                {data.avgAccuracy}%
              </div>
              <div className="text-xs text-green-500">Accuracy</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-orange-50">
              <div className="flex items-center justify-center gap-0.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-lg font-bold text-orange-700">{data.streak}</span>
              </div>
              <div className="text-xs text-orange-500">Streak</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-purple-50">
              <div className="flex items-center justify-center gap-0.5">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-lg font-bold text-purple-700">{data.totalMinutes}</span>
              </div>
              <div className="text-xs text-purple-500">Minutes</div>
            </div>
          </div>

          {/* Domain breakdown */}
          {data.domainBreakdown.filter(d => d.sessions > 0).length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-4 h-4 text-[#5A6B7A]" />
                <span className="text-xs font-semibold text-[#3A4A57] uppercase tracking-wide">Skills Practiced</span>
              </div>
              <div className="space-y-1.5">
                {data.domainBreakdown
                  .filter(d => d.sessions > 0)
                  .map(d => (
                    <div key={d.domain} className="flex items-center gap-2">
                      <span className="text-xs text-[#5A6B7A] w-16 truncate capitalize">{d.domain}</span>
                      <div className="flex-1 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            d.accuracy >= 80 ? 'bg-green-400' :
                            d.accuracy >= 60 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(d.accuracy, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium w-10 text-right ${accuracyColor(d.accuracy)}`}>
                        {d.accuracy}%
                      </span>
                      {trendIcon(d.trend)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {data.topAchievements.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-[#3A4A57] uppercase tracking-wide">Achievements</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.topAchievements.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs"
                  >
                    <Star className="w-3 h-3" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extra stats */}
          <div className="flex items-center gap-3 text-xs text-[#8A9BA8] pt-2 border-t border-[#E8E4DF]">
            <span>{data.tokensEarned} tokens earned</span>
            {data.calmCornerCount > 0 && (
              <span>Calm Corner {data.calmCornerCount}x</span>
            )}
          </div>

          {/* Privacy note */}
          <p className="text-xs text-[#8A9BA8] text-center mt-3">
            Aminy Ease | Privacy-first: initials only, no PII shared
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          {/* Share with therapist */}
          {onShareTherapist && (
            <button
              onClick={handleShareTherapist}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary text-white rounded-xl font-medium transition-colors"
            >
              <Send size={18} />
              Share with Therapist
            </button>
          )}

          {/* Share / Download row */}
          <div className="flex gap-2">
            <button
              onClick={handleShareImage}
              disabled={sharing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/90 hover:bg-white text-[#3A4A57] rounded-xl text-sm transition-colors border border-[#E8E4DF] disabled:opacity-50"
            >
              <Share2 size={16} />
              {sharing ? 'Sharing...' : 'Share'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/90 hover:bg-white text-[#3A4A57] rounded-xl text-sm transition-colors border border-[#E8E4DF]"
            >
              <Download size={16} />
              Save Image
            </button>
            <button
              onClick={handleCopyText}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/90 hover:bg-white text-[#3A4A57] rounded-xl text-sm transition-colors border border-[#E8E4DF]"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JuniorReportCard;
