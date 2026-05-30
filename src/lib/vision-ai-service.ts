// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Vision AI Service
 * Photo analysis (Core/Pro tier) + Video session analysis (Pro+ tier)
 * Uses GPT-4o Vision API via Supabase Edge Function
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from './demo-seed';

const EDGE_FUNCTION_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

// ── Types ────────────────────────────────────────────────────────────

export interface VisionAnalysisResult {
  id: string;
  type: 'photo' | 'video_frame';
  analysis: string;
  timestamp: string;
  frameIndex?: number;
  confidence?: number;
}

export interface VideoSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  frames: VisionAnalysisResult[];
  summary?: string;
  totalFrames: number;
  maxFrames: number;
  /** When true, frames are processed but never retained in the session (privacy: "don't store frames"). */
  ephemeral?: boolean;
}

export type VisionTier = 'core' | 'pro' | 'pro_plus' | 'b2b';

// ── Prompts ──────────────────────────────────────────────────────────

const BEHAVIORAL_PHOTO_PROMPT = `You are a behavioral wellness AI assistant for families with neurodivergent children. Analyze this image and provide helpful, compassionate guidance.

Consider:
- If this is a document (IEP, medical report, prescription): extract key information and summarize in plain language
- If this shows a child's behavior or activity: describe what you observe about engagement, sensory responses, and communication patterns
- If this shows a rash, injury, or physical concern: describe what you see (do NOT diagnose — recommend seeing a healthcare provider)
- If this shows a product or tool: explain how it might be used for developmental support

Keep your response concise (2-4 paragraphs), empathetic, and actionable. Always include a disclaimer if medical advice is implied.`;

const BEHAVIORAL_VIDEO_FRAME_PROMPT = `You are observing a video frame from a behavioral observation session for a neurodivergent child. Analyze this single frame for:

1. **Engagement Level**: Is the child engaged with a person, toy, or activity? Rate: high/medium/low/disengaged
2. **Sensory State**: Any signs of sensory seeking, avoidance, or regulation?
3. **Communication**: Any visible communication attempts (verbal, gestural, sign, AAC)?
4. **Social Interaction**: Quality of interaction with others in frame?
5. **Notable Behaviors**: Anything noteworthy (stimming, meltdown signs, positive behaviors)?

Respond in JSON format: {"engagement":"high","sensory":"regulated","communication":"gestural","social":"parallel_play","notes":"Child appears engaged with blocks, occasional hand-flapping"}`;

const VIDEO_SUMMARY_PROMPT = `You are summarizing a behavioral observation video session for a parent of a neurodivergent child. Given these frame-by-frame analyses, provide a compassionate summary:

1. Overall engagement pattern across the session
2. Sensory regulation trends
3. Communication attempts observed
4. Positive moments to celebrate
5. Areas that might benefit from support
6. Suggested activities or strategies based on observations

Frame analyses:
`;

// ── Cost Tracking ────────────────────────────────────────────────────

const COST_KEY = 'aminy-vision-usage';

interface MonthlyUsage {
  month: string; // YYYY-MM
  photoCount: number;
  videoFrameCount: number;
  estimatedCost: number;
}

function getMonthlyUsage(userId: string): MonthlyUsage {
  const month = new Date().toISOString().slice(0, 7);
  const stored = localStorage.getItem(`${COST_KEY}-${userId}`);
  if (stored) {
    const usage = JSON.parse(stored);
    if (usage.month === month) return usage;
  }
  return { month, photoCount: 0, videoFrameCount: 0, estimatedCost: 0 };
}

function trackUsage(userId: string, type: 'photo' | 'video_frame') {
  const usage = getMonthlyUsage(userId);
  if (type === 'photo') {
    usage.photoCount++;
    usage.estimatedCost += 0.01; // ~$0.01 per photo
  } else {
    usage.videoFrameCount++;
    usage.estimatedCost += 0.01; // ~$0.01 per frame
  }
  localStorage.setItem(`${COST_KEY}-${userId}`, JSON.stringify(usage));
}

// ── Frame Limits per Tier ────────────────────────────────────────────

export function getFrameLimit(tier: VisionTier): number {
  switch (tier) {
    case 'core': return 0; // Photo only, no video
    case 'pro': return 10; // 10 frames per session
    case 'pro_plus': return 20; // 20 frames per session
    case 'b2b': return 999; // Unlimited for enterprise
    default: return 0;
  }
}

export function canUsePhotoAI(tier: VisionTier): boolean {
  return tier !== 'core' || true; // Photo AI available from Core tier up
}

export function canUseVideoAI(tier: VisionTier): boolean {
  return tier === 'pro' || tier === 'pro_plus' || tier === 'b2b';
}

// ── Photo Analysis ───────────────────────────────────────────────────

export async function analyzePhoto(
  imageBase64: string,
  customPrompt?: string,
  userId?: string,
  /** When true, process the image but persist nothing (no usage tracking, no frame storage). */
  ephemeral?: boolean
): Promise<VisionAnalysisResult> {
  const prompt = customPrompt || BEHAVIORAL_PHOTO_PROMPT;

  try {
    // Get auth token
    let token = publicAnonKey;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch { /* use anon */ }

    const response = await fetch(`${EDGE_FUNCTION_BASE}/ai/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: imageBase64,
        prompt,
        model: 'gpt-4o',
      }),
    });

    const data = await response.json();

    // Ephemeral ("don't store") requests must not be persisted in usage tracking.
    if (userId && !ephemeral) trackUsage(userId, 'photo');

    const analysisText = data?.result || data?.message;
    if (!analysisText) {
      // No usable result came back — be honest rather than imply analysis succeeded.
      throw new Error('Empty vision response');
    }

    return {
      id: `photo-${Date.now()}`,
      type: 'photo',
      analysis: analysisText,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // In demo mode, return illustrative sample text. For real users, surface an honest error.
    if (isDemoMode()) {
      return {
        id: `photo-${Date.now()}`,
        type: 'photo',
        analysis: 'Sample analysis (demo mode): the image would be analyzed for engagement patterns, sensory responses, and communication indicators. Connect a live AI key to see real GPT-4o Vision results.',
        timestamp: new Date().toISOString(),
      };
    }
    throw new Error("Couldn't analyze the image right now — please try again.");
  }
}

// ── Video Session Management ─────────────────────────────────────────

const activeSessions: Map<string, VideoSession> = new Map();

export function startVideoSession(userId: string, tier: VisionTier, ephemeral = false): VideoSession {
  const session: VideoSession = {
    id: `session-${Date.now()}`,
    userId,
    startedAt: new Date().toISOString(),
    frames: [],
    totalFrames: 0,
    maxFrames: getFrameLimit(tier),
    ephemeral,
  };
  activeSessions.set(session.id, session);
  return session;
}

export async function analyzeFrame(
  sessionId: string,
  frameBase64: string
): Promise<VisionAnalysisResult | null> {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  if (session.totalFrames >= session.maxFrames) return null;

  try {
    let token = publicAnonKey;
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.access_token) token = authSession.access_token;
    } catch { /* use anon */ }

    const response = await fetch(`${EDGE_FUNCTION_BASE}/ai/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: frameBase64,
        prompt: BEHAVIORAL_VIDEO_FRAME_PROMPT,
        model: 'gpt-4o',
        responseFormat: 'json',
      }),
    });

    const data = await response.json();
    // Ephemeral sessions: process the frame but never persist usage.
    if (!session.ephemeral) trackUsage(session.userId, 'video_frame');

    const result: VisionAnalysisResult = {
      id: `frame-${Date.now()}`,
      type: 'video_frame',
      analysis: data?.result || JSON.stringify({ engagement: 'unknown', notes: 'Frame captured' }),
      timestamp: new Date().toISOString(),
      frameIndex: session.totalFrames,
    };

    // Honor the privacy flag: don't retain the frame's analysis in the session.
    if (!session.ephemeral) session.frames.push(result);
    session.totalFrames++;
    activeSessions.set(sessionId, session);

    return result;
  } catch {
    // Still count the frame so limits/counters stay accurate.
    session.totalFrames++;
    const result: VisionAnalysisResult = {
      id: `frame-${Date.now()}`,
      type: 'video_frame',
      analysis: JSON.stringify({ engagement: 'captured', notes: 'Frame captured for analysis' }),
      timestamp: new Date().toISOString(),
      frameIndex: session.totalFrames - 1,
    };
    if (!session.ephemeral) session.frames.push(result);
    activeSessions.set(sessionId, session);
    return result;
  }
}

export async function getSessionSummary(sessionId: string): Promise<string> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return 'No frames were captured during this session.';
  }
  if (session.frames.length === 0) {
    return session.ephemeral
      ? `Privacy mode was on, so frames were analyzed and discarded immediately — no data was retained, and no summary can be generated. ${session.totalFrames} frame(s) were processed this session. Turn off "Don't store frames" to get a session summary.`
      : 'No frames were captured during this session.';
  }

  session.endedAt = new Date().toISOString();

  // Build summary from frame analyses
  const frameData = session.frames.map((f, i) =>
    `Frame ${i + 1} (${f.timestamp}): ${f.analysis}`
  ).join('\n');

  try {
    let token = publicAnonKey;
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.access_token) token = authSession.access_token;
    } catch { /* anon */ }

    const response = await fetch(`${EDGE_FUNCTION_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: VIDEO_SUMMARY_PROMPT + frameData },
          { role: 'user', content: 'Please summarize this observation session.' },
        ],
        model: 'gpt-4o',
      }),
    });

    const data = await response.json();
    const summary = data?.result || data?.message || generateLocalSummary(session);
    session.summary = summary;
    activeSessions.set(sessionId, session);
    return summary;
  } catch {
    const summary = generateLocalSummary(session);
    session.summary = summary;
    return summary;
  }
}

function generateLocalSummary(session: VideoSession): string {
  const duration = session.endedAt
    ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;
  const facts = `Behavioral observation session completed. Duration: ${Math.floor(duration / 60)} minutes. ${session.frames.length} frames captured.`;

  if (isDemoMode()) {
    return `${facts} In production with an active AI connection, this would provide a comprehensive behavioral summary including engagement patterns, sensory regulation trends, communication attempts, and personalized recommendations.`;
  }

  // Real users: state plainly that the AI summary could not be generated, without fabricating insights.
  return `${facts} We couldn't generate the AI behavioral summary right now — please try again. Your individual frame analyses are still available above.`;
}

export function endVideoSession(sessionId: string): VideoSession | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  session.endedAt = new Date().toISOString();
  activeSessions.set(sessionId, session);
  return session;
}

export function getActiveSession(sessionId: string): VideoSession | null {
  return activeSessions.get(sessionId) || null;
}
