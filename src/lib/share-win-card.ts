// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Share-a-Win card generator
 *
 * Renders a 1080×1080 PNG share card for a Wins Journal moment via an
 * offscreen <canvas> — no dependencies, no server round-trip, no PHI upload.
 *
 * PRIVACY: The card renders ONLY the win text exactly as the parent wrote it
 * (first names only, per product policy) plus an optional streak line.
 * Never add child last names, photos, dates of birth, or any clinical data
 * to this card — it is designed to be posted publicly.
 *
 * Brand: mist gradient background (#F6FBFB → #EDF4F7), navy ink (#0D1B2A),
 * teal accent (#2A7D99), and the two-tone compass mark (navy ring, navy
 * north needle, teal #4E93A8 south needle) drawn with canvas paths that
 * mirror assets/aminy_mark.js in the design system.
 */

export const WIN_CARD_SIZE = 1080;

const NAVY = '#0D1B2A';
const TEAL = '#2A7D99';
const NEEDLE_TEAL = '#4E93A8'; // compass south-needle teal from the brand mark
const MIST_TOP = '#F6FBFB';
const MIST_BOTTOM = '#EDF4F7';
const SLATE = '#5A6B7A';

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Schibsted Grotesk', 'Segoe UI', Roboto, sans-serif";

export interface WinCardOptions {
  /** The win, exactly as the parent wrote it (first names only — see privacy note). */
  winText: string;
  /** Consecutive days with a saved win. Only rendered when >= 2. */
  streakDays?: number;
}

export const WIN_CARD_CAPTION = 'Celebrating a win with @aminy — aminy.ai';

/** Header line: "5 days of calmer moments" when a real streak exists. */
export function getWinCardHeader(streakDays?: number): string {
  if (streakDays && streakDays >= 2) {
    return `${streakDays} days of calmer moments`;
  }
  return 'A win worth celebrating';
}

/**
 * Greedy word-wrap using the canvas' own measureText.
 * Exported for unit testing.
 */
export function wrapText(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draw the Aminy compass mark (two-tone: navy ring, navy north needle,
 * teal south needle, white pivot dot). Geometry mirrors the brand SVG,
 * which lives in a 64×64 viewBox.
 */
export function drawCompass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const s = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // Navy ring — circle cx32 cy32 r27, stroke-width 4.8
  ctx.beginPath();
  ctx.arc(32, 32, 27, 0, Math.PI * 2);
  ctx.lineWidth = 4.8;
  ctx.strokeStyle = NAVY;
  ctx.stroke();

  // North needle (navy): M32 32 L28.5 34 L32 7 L35.5 34 Z
  ctx.beginPath();
  ctx.moveTo(32, 32);
  ctx.lineTo(28.5, 34);
  ctx.lineTo(32, 7);
  ctx.lineTo(35.5, 34);
  ctx.closePath();
  ctx.fillStyle = NAVY;
  ctx.fill();

  // South needle (teal): M32 32 L28.5 30 L32 57 L35.5 30 Z
  ctx.beginPath();
  ctx.moveTo(32, 32);
  ctx.lineTo(28.5, 30);
  ctx.lineTo(32, 57);
  ctx.lineTo(35.5, 30);
  ctx.closePath();
  ctx.fillStyle = NEEDLE_TEAL;
  ctx.fill();

  // White pivot dot — r 2.1
  ctx.beginPath();
  ctx.arc(32, 32, 2.1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

/**
 * Compose the full 1080×1080 card onto a 2D context.
 * Pure drawing (no DOM creation) so it can be unit-tested with a mock context.
 */
export function drawWinCard(ctx: CanvasRenderingContext2D, options: WinCardOptions): void {
  const S = WIN_CARD_SIZE;
  const margin = 96;

  // --- Mist gradient background (never pure white — brand rule) ---
  const gradient = ctx.createLinearGradient(0, 0, 0, S);
  gradient.addColorStop(0, MIST_TOP);
  gradient.addColorStop(1, MIST_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, S, S);

  // --- Header: streak line (or warm default) in teal, small caps feel ---
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = TEAL;
  ctx.font = `600 44px ${FONT_STACK}`;
  ctx.fillText(getWinCardHeader(options.streakDays), margin, 200);

  // --- Big warm win text, auto-wrapped and auto-sized ---
  const maxTextWidth = S - margin * 2 - 48; // room for the teal stripe
  const maxLines = 8;
  let fontSize = 72;
  let lines: string[] = [];
  // Shrink until the quote fits in maxLines (floor at 40px).
  for (; fontSize >= 40; fontSize -= 4) {
    ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
    lines = wrapText(ctx, options.winText, maxTextWidth);
    if (lines.length <= maxLines) break;
  }
  if (lines.length > maxLines) {
    // Extremely long wins: truncate the last visible line with an ellipsis.
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
  }

  const lineHeight = Math.round(fontSize * 1.3);
  const blockHeight = lines.length * lineHeight;
  const blockTop = Math.max(280, Math.round((S - blockHeight) / 2) - 40);

  // Signature Nudge-style teal stripe to the left of the quote
  ctx.fillStyle = TEAL;
  ctx.fillRect(margin, blockTop - Math.round(fontSize * 0.9), 10, blockHeight + 24);

  ctx.fillStyle = NAVY;
  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, margin + 48, blockTop + i * lineHeight);
  });

  // --- Footer: compass + wordmark (left), aminy.ai (right) ---
  const footerY = S - margin - 96;
  drawCompass(ctx, margin, footerY, 96);

  ctx.fillStyle = NAVY;
  ctx.font = `700 64px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('aminy', margin + 96 + 28, footerY + 72);

  ctx.fillStyle = SLATE;
  ctx.font = `500 36px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText('aminy.ai', S - margin, footerY + 68);
  ctx.textAlign = 'left';
}

/** Render the card to a PNG Blob via an offscreen canvas. */
export async function renderWinCardPng(options: WinCardOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIN_CARD_SIZE;
  canvas.height = WIN_CARD_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available in this browser');
  }

  drawWinCard(ctx, options);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not generate the win card image'));
    }, 'image/png');
  });
}

export type ShareWinResult = 'shared' | 'downloaded';

/**
 * Share the win card: native share sheet (with the PNG attached) when the
 * platform supports file sharing; otherwise download the PNG and copy a
 * ready-to-paste caption to the clipboard.
 */
export async function shareWinCard(options: WinCardOptions): Promise<ShareWinResult> {
  const blob = await renderWinCardPng(options);
  const file = new File([blob], 'aminy-win.png', { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
  };

  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        text: WIN_CARD_CAPTION,
        title: 'A win with Aminy',
      });
      return 'shared';
    } catch (err) {
      // AbortError = user closed the share sheet; treat as done, don't double-download.
      if (err instanceof Error && err.name === 'AbortError') return 'shared';
      // Any other failure: fall through to the download path below.
    }
  }

  // Fallback: download the PNG + copy the caption
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aminy-win.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }

  try {
    await navigator.clipboard.writeText(WIN_CARD_CAPTION);
  } catch {
    // Clipboard is best-effort (may be blocked without a user gesture context).
  }

  return 'downloaded';
}
