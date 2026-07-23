// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { logPHIView } from '../lib/security/hipaa-audit';
import { X, Mic, ArrowUp, ChevronRight, Menu, Plus, ImageIcon, Trash2, MessageSquare, Settings, ChevronDown, Brain, Sparkles, RotateCcw, Check, User, Loader2, FileText, Calendar, Pill, Bell, Monitor, TrendingUp, BarChart2, BookOpen, Folder, Copy, ThumbsUp, ThumbsDown, Heart, Trophy, Microscope, Handshake, Camera, Pencil, Pin, PinOff, Search, Square, SquarePen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  fetchUserContext,
  buildAIContextString,
  getCurrentContext,
  storeMemory,
  fetchMemories,
  type UserContext,
  type CurrentContext
} from '../ai/contextLayer';
import { buildParentAIContext } from '../lib/parent-junior-bridge';
import { getTierLimits, getTierEntitlements, type TierType } from '../lib/tier-utils';
import { generateConversationSummary } from '../lib/ai-engine/conversation-memory';
import { buildScreenStateBlock } from '../ai/screenStateRegistry';
import { HAPTICS } from '../lib/mobile-experience-enhancer';
import { getStateAIContext } from '../lib/state-configs';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  loadAISettings,
  saveAISettings,
  hasStoredAISettings,
  getPersonalitySystemPrompt,
  AI_PERSONALITIES,
  type AIPersonality,
  type AminyAISettings
} from '../lib/ai-personality';
import { AIChart, parseAIResponseParts } from './AIChart';
import { AddToCalendarButtons } from './AddToCalendarButtons';
import { supabase } from '../utils/supabase/client';
import { updateUserContext } from '../ai/contextLayer';

import { renderRichMarkdown, splitInlineChartTokens } from '../lib/chat-markdown';
import { InlineTrendChart } from './chat/InlineTrendChart';
import { getProactiveNudges, formatNudgesForAI } from '../lib/ai-proactive-nudges';
import { sendLocalNotification } from '../lib/push-notifications';
import { Switch } from './ui/switch';
import { UsageMeter } from './UsageMeter';
import { useRateLimitStore } from '../lib/rate-limit-store';
import { ThinkingStepsDisplay, generateThinkingSteps, type ThinkingStep } from './ThinkingSteps';
import { getUserMemoryFacts, deleteFact, type MemoryFact } from '../lib/ai-memory-engine';
import { uploadVaultFile, processVaultDocument, markVaultDocumentProcessed, listVaultDocuments, type VaultDocument } from '../lib/vault-storage';
import { saveConversation, loadConversation, loadConversationSummaries, deleteConversation, renameConversation } from '../lib/conversation-persistence';

// Max size for any chat attachment (image or document) — ~10 MB.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// Claude-app parity: up to 4 images can ride along with one message.
const MAX_ATTACHED_IMAGES = 4;

/** Generate a UUID for a roamable conversation id (falls back for old envs). */
function newConversationId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* fall through */ }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Lucide renderers for PersonalityConfig.icon — brand rule: no emoji in parent chrome. */
const PERSONALITY_ICONS: Record<string, typeof Heart> = { Heart, Trophy, Microscope, Handshake };

// ─── Smart Action execution ──────────────────────────────────────────────────

type SmartAction =
  | { type: 'LOG_BEHAVIOR'; payload: { behavior_type: string; trigger?: string; intensity?: number; notes?: string; is_positive?: boolean } }
  | { type: 'SET_CALM_CUE'; payload: { cue: string } }
  | { type: 'ADD_WIN'; payload: { win: string } }
  | { type: 'ADD_STRUGGLE'; payload: { struggle: string } }
  | { type: 'ADD_APPOINTMENT'; payload: { title: string; provider?: string; service_type?: string; start_iso: string; duration_minutes?: number; location?: string; notes?: string } }
  | { type: 'NAVIGATE'; payload: { screen: string; tab?: string } };

function parseSmartActions(text: string): { cleanText: string; actions: SmartAction[] } {
  const actions: SmartAction[] = [];
  const cleaned = text.replace(/\[ACTION:([A-Z_]+):(\{.*?\})\]/gs, (_match, type, json) => {
    try {
      actions.push({ type, payload: JSON.parse(json) } as SmartAction);
    } catch { /* ignore malformed */ }
    return '';
  }).trim();
  return { cleanText: cleaned, actions };
}

async function executeSmartAction(action: SmartAction, userId: string): Promise<string> {
  switch (action.type) {
    case 'LOG_BEHAVIOR': {
      const { error } = await supabase.from('behavior_logs').insert({
        user_id: userId,
        behavior_type: action.payload.behavior_type,
        trigger: action.payload.trigger || null,
        intensity: action.payload.intensity || null,
        notes: action.payload.notes || null,
        is_positive: action.payload.is_positive ?? false,
        logged_at: new Date().toISOString(),
        logged_by: 'ai_suggestion_parent_confirmed',
      });
      if (error) throw error;
      return `✓ Behavior noted: ${action.payload.behavior_type}${action.payload.trigger ? ` (trigger: ${action.payload.trigger})` : ''}. Tap the behavior log to review or edit.`;
    }
    case 'SET_CALM_CUE': {
      await updateUserContext(userId, { lastCalmCue: action.payload.cue });
      return `✓ Calm cue saved: "${action.payload.cue}"`;
    }
    case 'ADD_WIN': {
      await updateUserContext(userId, { celebratingWins: [action.payload.win] });
      return `✓ Win recorded: ${action.payload.win}`;
    }
    case 'ADD_STRUGGLE': {
      await updateUserContext(userId, { strugglingWith: [action.payload.struggle] });
      return `✓ Noted: working through ${action.payload.struggle}`;
    }
    case 'ADD_APPOINTMENT': {
      const { title, provider, service_type, start_iso, duration_minutes = 60, location, notes } = action.payload;
      const startAt = new Date(start_iso);
      if (isNaN(startAt.getTime())) {
        return '✗ Could not parse that date — try again with a clearer time';
      }
      const endAt = new Date(startAt.getTime() + duration_minutes * 60_000);

      // Save to appointments table, capture the inserted ID so we can push to GCal
      let insertedId: string | null = null;
      try {
        const { data: row } = await supabase.from('appointments').insert({
          user_id: userId,
          title,
          provider_name: provider || null,
          service_type: service_type || null,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          location: location || null,
          notes: notes || null,
          source: 'ai_chat',
        }).select('id').single();
        insertedId = row?.id ?? null;
      } catch { /* table may not exist yet — fall through to calendar link */ }

      // If the parent has a calendar connected (Google or Outlook), push the
      // event in the background. Non-blocking — confirmation still shows .ics +
      // Google quick-add links as fallback for non-OAuth users.
      if (insertedId) {
        try {
          const { tryPushInBackground } = await import('../lib/calendar-providers');
          tryPushInBackground(insertedId);
        } catch { /* no provider connected — no-op */ }
      }

      // Three add-to-calendar paths — Apple/Google/Outlook. The chat message
      // emits a marker that the assistant bubble replaces with the rich
      // <AddToCalendarButtons> three-logo picker.
      const friendlyTime = startAt.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const calendarPayload = JSON.stringify({
        id: insertedId || undefined,
        title,
        provider,
        service_type,
        start_iso: startAt.toISOString(),
        end_iso: endAt.toISOString(),
        location,
        notes,
      });
      return `✓ Appointment saved: **${title}** — ${friendlyTime}${provider ? ` with ${provider}` : ''}.\n[CALENDAR:${calendarPayload}]`;
    }
    case 'NAVIGATE':
      // Handled by the component via onNavigate prop — return a navigate marker
      return `[NAVIGATE:${JSON.stringify(action.payload)}]`;
    default:
      return '';
  }
}

// ─── Chat session persistence ────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chips?: string[];
  imageUrl?: string;
  /** Multi-attachment (up to 4 images per message) — imageUrl kept for legacy sessions */
  imageUrls?: string[];
  isUpgradePrompt?: boolean;
  /** True when the parent tapped Stop mid-stream — partial text kept, note shown */
  stopped?: boolean;
}

interface ChatSession {
  id: string;
  timestamp: string; // ISO string — safe to stringify
  preview: string;
  messages: Message[];
  /** AI-generated or user-renamed title; falls back to `preview` when unset */
  title?: string;
  /** Pinned conversations float to the top of the history drawer */
  pinned?: boolean;
}

const SESSIONS_KEY = 'aminy-chat-sessions';

function loadChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

function persistChatSession(session: ChatSession) {
  try {
    const sessions = loadChatSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 25)));
  } catch { /* ignore quota errors */ }
}

function deleteChatSession(id: string) {
  try {
    const sessions = loadChatSessions().filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Claude-app style history sections. Pinned sessions are grouped separately. */
function sessionGroupLabel(iso: string): 'Today' | 'Yesterday' | 'Previous 7 days' | 'Earlier' {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startOfToday) return 'Today';
  const startYesterday = new Date(startOfToday.getTime() - 86400000);
  if (d >= startYesterday) return 'Yesterday';
  const startWeek = new Date(startOfToday.getTime() - 7 * 86400000);
  if (d >= startWeek) return 'Previous 7 days';
  return 'Earlier';
}

function groupChatSessions(sessions: ChatSession[]): Array<{ label: string; sessions: ChatSession[] }> {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const groups: Array<{ label: string; sessions: ChatSession[] }> = [];
  const push = (label: string, s: ChatSession) => {
    const g = groups.find(x => x.label === label);
    if (g) g.sessions.push(s);
    else groups.push({ label, sessions: [s] });
  };
  for (const s of sorted) {
    push(s.pinned ? 'Pinned' : sessionGroupLabel(s.timestamp), s);
  }
  // Keep a stable, chronological section order with Pinned first.
  const order = ['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Earlier'];
  return groups.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

// ─── Custom instructions ─────────────────────────────────────────────────────

const INSTRUCTIONS_KEY = 'aminy-custom-instructions';

interface CustomInstructions {
  aboutMe: string;    // "What Aminy should know about you and your family"
  responseStyle: string; // "How Aminy should communicate with you"
}

function loadCustomInstructions(): CustomInstructions {
  try {
    const raw = localStorage.getItem(INSTRUCTIONS_KEY);
    if (!raw) return { aboutMe: '', responseStyle: '' };
    return JSON.parse(raw) as CustomInstructions;
  } catch {
    return { aboutMe: '', responseStyle: '' };
  }
}

function saveCustomInstructions(instructions: CustomInstructions) {
  try {
    localStorage.setItem(INSTRUCTIONS_KEY, JSON.stringify(instructions));
  } catch {}
}

// ─── Context helpers ──────────────────────────────────────────────────────────

function getFollowUpChips(context: UserContext | null, currentPath: string, fallbackName?: string): string[] {
  const name = context?.childName || fallbackName || 'your child';

  if (currentPath.includes('session') || currentPath.includes('appointment')) {
    return [
      `How should I prepare for today's session?`,
      `What questions should I ask the BCBA?`,
      `What progress should ${name} make this week?`
    ];
  }
  if (currentPath.includes('goal') || currentPath.includes('plan')) {
    return [
      `Which goal is ${name} closest to mastering?`,
      `What can I do at home to reinforce this goal?`,
      `How do BCBAs measure goal progress?`
    ];
  }
  if (currentPath.includes('behavior') || currentPath.includes('data')) {
    return [
      `What's causing this behavior pattern?`,
      `How do I respond in the moment?`,
      `Is this normal for ${name}'s age and diagnosis?`
    ];
  }
  if (currentPath.includes('calm') || currentPath.includes('crisis')) {
    return [
      `What's working best to calm ${name}?`,
      `How long should a calm-down take?`,
      `When should I call the BCBA?`
    ];
  }

  return [
    `How is ${name} doing with their goals this week?`,
    `What should I focus on with ${name} today?`,
    `What can I do right now to support ${name}?`
  ];
}

function buildProactivePrompt(context: UserContext | null, currentContext: CurrentContext | null, fallbackName?: string): string {
  const name = context?.childName || fallbackName || 'your child';
  const screen = currentContext?.moduleName || 'the app';
  const struggles = context?.strugglingWith?.join(', ') || null;
  const wins = context?.celebratingWins?.join(', ') || null;
  const sessions = context?.progressThisWeek?.sessionsCompleted ?? null;

  return `You are Aminy — a BCBA with 15 years of clinical experience, now serving as this family's dedicated AI behavioral guide. A parent just opened the chat from ${screen}.

WHAT YOU KNOW ABOUT THIS FAMILY:
- Child: ${name}${context?.childAge ? `, age ${context.childAge}` : ''}
${sessions !== null ? `- Sessions this week: ${sessions} (${sessions === 0 ? 'none yet — engagement opportunity' : sessions < 3 ? 'below target frequency' : 'solid consistency'})` : ''}
${struggles ? `- Currently working through: ${struggles}` : ''}
${wins ? `- Recent wins to build on: ${wins}` : ''}
${context?.lastCalmCue ? `- Most effective calm cue: "${context.lastCalmCue}"` : ''}

TASK: Write ONE proactive opening message (2-3 sentences max).

FORMAT:
Line 1: Emoji + bold insight title (e.g., "🎯 Consistency Gap Detected" or "🌟 Breakthrough Moment" or "💡 Today's Strategy Focus" or "📈 Session Momentum")
Lines 2-3: A specific, clinically-grounded observation about this family's situation — draw on behavioral science, reference ${name} by name, and make it feel like it came from someone who studied their file. End with ONE focused question that opens a meaningful conversation.

NEVER:
- Say "How can I help?" or "What would you like to discuss?"
- Be generic or vague
- Give a list of options — pick the MOST relevant insight and go deep on it
- Use clinical jargon unless it helps clarity`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BevelChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPath: string;
  childName?: string;
  initialPrompt?: string;
  userTier?: string;
  onUpgrade?: () => void;
  onNavigate?: (screen: string, options?: { tab?: string }) => void;
  userType?: 'parent' | 'provider';
}

const FREE_DAILY_LIMIT = 3;

function getFreeDailyKey(userId: string) {
  return `aminy_ai_daily_${userId}_${new Date().toISOString().slice(0, 10)}`;
}
function getFreeDailyCount(userId: string): number {
  return parseInt(localStorage.getItem(getFreeDailyKey(userId)) || '0', 10);
}
function incrementFreeDailyCount(userId: string): number {
  const next = getFreeDailyCount(userId) + 1;
  localStorage.setItem(getFreeDailyKey(userId), String(next));
  return next;
}

// Reads a `text/event-stream` response from /ai/brain and drives progressive
// message rendering. Calls `onToken(accumulated, isFirst)` for each streamed
// token — `isFirst=true` on the very first token so callers can add the message
// bubble only once it has content. Returns the full accumulated text.
// Falls back to JSON parsing when the response is not SSE (e.g. OpenAI path).
async function readBrainStream(
  response: Response,
  onToken: (accumulated: string, isFirst: boolean) => void,
  onFirstToken: () => void
): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const data = await response.json();
    const text = data.message || data.response || '';
    onFirstToken();
    onToken(text, true);
    return text;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';
  let isFirst = true;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const payload = JSON.parse(raw);
          if (payload.token) {
            if (isFirst) onFirstToken();
            accumulated += payload.token;
            onToken(accumulated, isFirst);
            isFirst = false;
          }
        } catch { /* ignore malformed lines */ }
      }
    }
  } catch (err) {
    // Stop button aborts the fetch mid-stream — keep the partial text; the
    // caller decides how to mark it. Any other stream error still throws.
    if ((err as Error)?.name !== 'AbortError') throw err;
  }
  return accumulated;
}

export function BevelChatOverlay({
  isOpen,
  onClose,
  userId,
  currentPath,
  childName: propChildName,
  initialPrompt,
  userTier,
  onUpgrade,
  onNavigate,
  userType = 'parent',
}: BevelChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProactiveLoading, setIsProactiveLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [currentContext, setCurrentContext] = useState<CurrentContext | null>(null);
  const [personality, setPersonality] = useState<AIPersonality>('caregiver');
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [attachedImages, setAttachedImages] = useState<Array<{ name: string; dataUrl: string }>>([]);
  const [docUploading, setDocUploading] = useState<{ name: string } | null>(null);
  // PDF held as a pre-send chip (uploaded to the vault when the message sends)
  const [pendingDoc, setPendingDoc] = useState<File | null>(null);
  // Streaming lifecycle — true from send until the reply fully settles; the
  // Send button becomes Stop while this is set. (isLoading flips false on the
  // FIRST token so the typing indicator can yield to the streaming bubble.)
  const [isStreaming, setIsStreaming] = useState(false);
  // Edit-and-resend: id of the LAST user message being edited (send replaces
  // the conversation tail from that message onward)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  // History drawer upgrades
  const [historySearch, setHistorySearch] = useState('');
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  // Vault picker sheet
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  // UUID so the conversation can roam to the Supabase `conversations` table
  // (its `id` column is uuid — a "session-…" string would be rejected).
  const [sessionId] = useState(() => newConversationId());
  const [customInstructions, setCustomInstructions] = useState<CustomInstructions>(loadCustomInstructions);
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [pendingScreenContext, setPendingScreenContext] = useState<string | null>(null);
  const [showThinkingSteps, setShowThinkingSteps] = useState<boolean>(() => {
    try { return localStorage.getItem('aminy-show-thinking') !== 'false'; } catch { return true; }
  });
  const [showFollowUps, setShowFollowUps] = useState<boolean>(() => {
    try { return localStorage.getItem('aminy-show-followups') !== 'false'; } catch { return true; }
  });
  const [activeThinkingSteps, setActiveThinkingSteps] = useState<ThinkingStep[]>([]);
  const { dailyUsage, fetchUsage } = useRateLimitStore();
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [messageRatings, setMessageRatings] = useState<Record<string, 'up' | 'down' | null>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);       // photo library
  const cameraInputRef = useRef<HTMLInputElement>(null);     // camera capture
  const docInputRef = useRef<HTMLInputElement>(null);        // PDF documents
  const hasGeneratedProactive = useRef(false);
  // Id of the conversation currently being edited — starts as this overlay's
  // sessionId, switches to a loaded history session's id (so continuing it
  // upserts the same row), and resets on New Chat. Used for both localStorage
  // and Supabase roaming persistence.
  const activeConvIdRef = useRef<string>(sessionId);
  // Debounce timer for cross-device history roaming (Supabase upsert).
  const roamSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-fresh mirror of `messages` — avoids stale-closure history when a
  // memoized sendMessage instance fires (e.g. follow-up chips, queued sends).
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  // Stored-memory + Junior-activity block for the system prompt (S1). A ref,
  // not state: it's set inside loadContextAndOpenChat and must be readable
  // synchronously by buildSystemPrompt in the same async flow.
  const memoryBlockRef = useRef('');
  // GOALS & PROGRESS block (proactive goal coaching) — same ref pattern as
  // memoryBlockRef: filled async in loadContextAndOpenChat, read synchronously
  // by buildSystemPrompt. Bounded ≤500 chars.
  const goalsBlockRef = useRef('');
  // In-flight request controller — Stop button aborts it (partial text kept).
  const abortRef = useRef<AbortController | null>(null);
  // AI-generated / user-set titles per conversation id — roamPersist prefers
  // these over the truncated-first-message fallback.
  const convTitlesRef = useRef<Record<string, string>>({});
  // Conversations we already attempted title generation for (one shot each).
  const titleGenAttemptedRef = useRef<Set<string>>(new Set());

  // Cross-device history roaming — upsert the current conversation (message
  // bodies as a JSONB blob) to the Supabase `conversations` table. Gated on the
  // memory/consent flag; silent on every failure so chat never breaks.
  const roamPersist = useCallback((msgs: Message[]) => {
    if (!userId || userId === 'dev-preview-user') return;
    if (loadAISettings().memoryEnabled === false) return;
    const userMsgs = msgs.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;
    const convId = activeConvIdRef.current;
    // Only roam UUID-shaped ids (the `conversations.id` column is uuid; legacy
    // "session-…" ids stay local-only via SESSIONS_KEY).
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convId)) return;
    const nowIso = new Date().toISOString();
    saveConversation({
      id: convId,
      userId,
      childId: userContext?.childId,
      title: convTitlesRef.current[convId] || userMsgs[0].content.slice(0, 90),
      messages: msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: (m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)).toISOString(),
        metadata: (m.imageUrl || m.imageUrls?.length) ? { hasImage: true } : undefined,
      })),
      messageCount: msgs.length,
      lastMessageAt: nowIso,
    }).catch(() => { /* silent — offline cache still holds it */ });
  }, [userId, userContext]);

  // Save session on close — auto-summarize if >= 4 messages for memory persistence
  const handleClose = useCallback(() => {
    if (roamSaveTimer.current) { clearTimeout(roamSaveTimer.current); roamSaveTimer.current = null; }
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length > 0) {
      const convId = activeConvIdRef.current;
      const preview = userMsgs[0].content.slice(0, 90);
      const existing = loadChatSessions().find(s => s.id === convId);
      persistChatSession({
        id: convId,
        timestamp: new Date().toISOString(),
        preview,
        messages,
        title: convTitlesRef.current[convId] || existing?.title,
        pinned: existing?.pinned,
      });
      setChatSessions(loadChatSessions());
      roamPersist(messages); // flush the roam upsert immediately on close
    }
    if (messages.length >= 4) {
      const summaryMessages = messages.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      }));
      generateConversationSummary(summaryMessages).then(() => {
        toast.success('Memory updated', { duration: 1500, position: 'bottom-center' });
      }).catch(() => {});
    }
    onClose();
  }, [messages, sessionId, onClose, roamPersist]);

  useEffect(() => {
    if (!isOpen) {
      hasGeneratedProactive.current = false;
    } else {
      setMessages([]);
      setAttachedImages([]);
      setPendingDoc(null);
      setDocUploading(null);
      setEditingMessageId(null);
      setHistorySearch('');
      setRenamingSessionId(null);
      setShowVaultPicker(false);
      setShowHistory(false);
      setShowSettings(false);
      setCustomInstructions(loadCustomInstructions());
      setInstructionsDirty(false);
      setChatSessions(loadChatSessions());
      // Fresh conversation id per open so each new chat is its own history entry.
      activeConvIdRef.current = newConversationId();
      setHasInteracted(false);
      // Hydrate the history list from Supabase (cross-device roaming), merged
      // with the local cache. Best-effort; local list already shown above.
      if (userId && userId !== 'dev-preview-user' && loadAISettings().memoryEnabled !== false) {
        loadConversationSummaries(userId, 25)
          .then(remote => {
            if (remote.length === 0) return;
            setChatSessions(prev => {
              const localIds = new Set(prev.map(s => s.id));
              const remoteOnly: ChatSession[] = remote
                .filter(r => !localIds.has(r.id))
                .map(r => ({
                  id: r.id,
                  timestamp: r.lastMessageAt,
                  preview: r.title,
                  messages: [], // lazy — bodies loaded when the session is opened
                }));
              return [...prev, ...remoteOnly].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
            });
          })
          .catch(() => { /* silent */ });
      }
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadContextAndOpenChat();
      fetchUsage();
    }
  }, [isOpen, userId, currentPath]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProactiveLoading]);

  // Debounced cross-device roaming — after each settled exchange, upsert the
  // conversation to Supabase so history survives a device switch. Waits for
  // the response to finish (isLoading=false) and debounces rapid edits.
  useEffect(() => {
    if (!isOpen || isLoading) return;
    if (messages.filter(m => m.role === 'user').length === 0) return;
    if (roamSaveTimer.current) clearTimeout(roamSaveTimer.current);
    roamSaveTimer.current = setTimeout(() => roamPersist(messages), 1500);
    return () => { if (roamSaveTimer.current) clearTimeout(roamSaveTimer.current); };
  }, [messages, isLoading, isOpen, roamPersist]);

  // AI-generated conversation titles — after the 2nd user turn, fire-and-forget
  // a tiny non-stream /ai/brain call (≤6 words, no quotes). Stored on the
  // session record + Supabase conversations row; fallback stays the truncated
  // first message everywhere.
  const generateConversationTitle = useCallback(async (convId: string, msgs: Message[]) => {
    try {
      const transcript = msgs
        .filter(m => !m.isUpgradePrompt)
        .slice(0, 6)
        .map(m => `${m.role === 'user' ? 'Parent' : 'Aminy'}: ${m.content.slice(0, 300)}`)
        .join('\n');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            userMessage: `Conversation so far:\n${transcript}\n\nReply with ONLY the title.`,
            conversationHistory: [],
            systemPrompt: 'You title conversations for a chat history list. Reply with a concise title of AT MOST 6 words. No quotes, no punctuation at the end, no explanations — just the title.',
            max_tokens: 30,
          }),
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      let title = String(data.message || data.response || '')
        .replace(/["'“”‘’]/g, '')
        .replace(/\n[\s\S]*$/, '')
        .trim();
      if (!title) return;
      title = title.split(/\s+/).slice(0, 6).join(' ').replace(/[.,;:!]+$/, '').slice(0, 60);
      convTitlesRef.current[convId] = title;
      // Update the drawer list + local session record if it exists already.
      setChatSessions(prev => prev.map(s => (s.id === convId ? { ...s, title } : s)));
      const existing = loadChatSessions().find(s => s.id === convId);
      if (existing) persistChatSession({ ...existing, title });
      // Roam to the Supabase conversations row (uuid ids only — same rule as roamPersist).
      if (userId && userId !== 'dev-preview-user' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convId)) {
        renameConversation(convId, userId, title).catch(() => {});
      }
    } catch { /* fallback title (truncated first message) stays */ }
  }, [userId]);

  useEffect(() => {
    if (!isOpen || isLoading || isStreaming) return;
    const convId = activeConvIdRef.current;
    if (titleGenAttemptedRef.current.has(convId)) return;
    if (convTitlesRef.current[convId]) return;
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length < 2) return;
    titleGenAttemptedRef.current.add(convId);
    generateConversationTitle(convId, messages);
  }, [messages, isLoading, isStreaming, isOpen, generateConversationTitle]);

  // S1 — build the "WHAT YOU REMEMBER" block: stored memory facts (bounded by
  // the tier's memory-inject depth) + child Ease/Junior activity from the
  // parent-junior bridge. Kept size-bounded so the system prompt stays lean.
  const buildMemoryPromptBlock = async (ctx: UserContext | null): Promise<string> => {
    const tier = (userTier as TierType) || 'free';
    const sections: string[] = [];

    if (loadAISettings().memoryEnabled !== false) {
      const injectDepth = getTierEntitlements(tier).memoryInjectDepth;
      const storedCap = getTierLimits(tier).memoryFacts ?? Number.POSITIVE_INFINITY;
      const depth = Math.max(1, Math.min(injectDepth, storedCap));
      const facts = await fetchMemories(userId, depth);
      const lines = (facts as unknown as Array<Record<string, unknown>>)
        .map(f => {
          const text = String(f.value ?? f.content ?? '').trim();
          if (!text) return null;
          return `- [${String(f.category || 'insight')}] ${text.slice(0, 200)}`;
        })
        .filter((l): l is string => !!l);
      if (lines.length > 0) {
        sections.push(
          `WHAT YOU REMEMBER ABOUT THIS FAMILY (from past conversations — weave in naturally, never recite):\n${lines.join('\n').slice(0, 2000)}`
        );
      }
    }

    // Child's Ease/Junior activity → parent chat context
    try {
      if (ctx?.childId) {
        const juniorBlock = buildParentAIContext(ctx.childId, tier);
        // buildParentAIContext always appends a usage-instruction line; only
        // inject when it actually contains data sections (marked with **).
        if (juniorBlock && juniorBlock.includes('**')) {
          sections.push(juniorBlock.slice(0, 1500));
        }
      }
    } catch { /* no Junior data yet — fine */ }

    return sections.length > 0 ? `\n\n${sections.join('\n\n')}` : '';
  };

  // GOALS & PROGRESS — active goals + the 2 most recent weekly check-ins, so
  // the AI can proactively coach on stalled or declining goals. Best-effort:
  // any failure returns '' and the chat works exactly as before.
  const buildGoalsPromptBlock = async (): Promise<string> => {
    try {
      const [goalsRes, eventsRes] = await Promise.all([
        supabase
          .from('goals')
          .select('title, name, progress, updated_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(3),
        supabase
          .from('outcome_events')
          .select('created_at, payload')
          .eq('user_id', userId)
          .eq('event_type', 'weekly_parent_checkin')
          .order('created_at', { ascending: false })
          .limit(2),
      ]);
      const goals = (goalsRes.data || []) as Array<{ title?: string; name?: string; progress?: number; updated_at?: string }>;
      const events = (eventsRes.data || []) as Array<{ created_at: string; payload?: Record<string, unknown> }>;
      if (goals.length === 0 && events.length === 0) return '';

      const now = Date.now();
      const goalLines = goals.map(g => {
        const label = (g.title || g.name || 'Goal').slice(0, 40);
        const days = g.updated_at ? Math.floor((now - new Date(g.updated_at).getTime()) / 86400000) : null;
        return `- ${label}: ${g.progress ?? 0}%${days !== null && isFinite(days) ? ` (updated ${days}d ago)` : ''}`;
      });
      const checkinLines = events.map(e => {
        const p = (e.payload || {}) as Record<string, unknown>;
        return `- ${String(e.created_at).slice(0, 10)}: freq ${p.target_behavior_frequency ?? '—'}, progress ${p.goal_progress_rating ?? '—'}/5, confidence ${p.parent_confidence_rating ?? '—'}/5`;
      });

      // Bound the whole section ≤500 chars — trim the DATA lines (the coaching
      // instruction at the end must never be truncated mid-sentence).
      const instruction = "If a goal has had no progress in 14+ days or recent check-ins show decline, gently proactively surface ONE concrete suggestion tied to that goal — even if the parent didn't ask. Never shame; frame as an experiment to try.";
      const header = '\n\nGOALS & PROGRESS:\n';
      const dataBudget = 500 - header.length - instruction.length - 1; // -1 for the \n before instruction
      let dataPart = `${goalLines.join('\n')}${checkinLines.length ? `\nRecent check-ins:\n${checkinLines.join('\n')}` : ''}`;
      if (dataPart.length > dataBudget) {
        // Drop whole lines from the end until it fits (never cut mid-line).
        const kept: string[] = [];
        let used = 0;
        for (const line of dataPart.split('\n')) {
          if (used + line.length + 1 > dataBudget) break;
          kept.push(line);
          used += line.length + 1;
        }
        dataPart = kept.join('\n');
      }
      return `${header}${dataPart}\n${instruction}`;
    } catch {
      return '';
    }
  };

  const loadContextAndOpenChat = async () => {
    const aiSettings = loadAISettings();
    setPersonality(aiSettings.personality);

    const context = await fetchUserContext(userId);
    if (userId && userId !== 'dev-preview-user') {
      logPHIView(userId, 'parent', '', 'ai_chat_context', userId, 'bevel-chat').catch(() => {});
    }
    setUserContext(context);
    const current = getCurrentContext(currentPath, context);
    setCurrentContext(current);

    // M1 — roaming preferences: profiles.ai_context is the source of truth
    // across devices; localStorage is the offline cache. Hydrate local from
    // server only when local is empty (fresh device / cleared storage).
    try {
      const remoteCi = context?.customInstructions;
      if (remoteCi && (remoteCi.aboutMe || remoteCi.responseStyle)) {
        const local = loadCustomInstructions();
        if (!local.aboutMe && !local.responseStyle) {
          const roamed = { aboutMe: remoteCi.aboutMe || '', responseStyle: remoteCi.responseStyle || '' };
          saveCustomInstructions(roamed);
          setCustomInstructions(roamed);
        }
      }
      const remoteSettings = context?.aiSettings;
      if (remoteSettings && !hasStoredAISettings()) {
        const merged = { ...aiSettings, ...remoteSettings } as AminyAISettings;
        saveAISettings(merged);
        if (merged.personality && AI_PERSONALITIES[merged.personality]) {
          setPersonality(merged.personality);
        }
      }
    } catch { /* roaming is best-effort */ }

    // S1 — stored memories + Junior activity into the system prompt (ref so the
    // sends below see it synchronously)
    try {
      memoryBlockRef.current = await buildMemoryPromptBlock(context);
    } catch {
      memoryBlockRef.current = '';
    }

    // Proactive goal coaching — GOALS & PROGRESS block (same sync-read ref pattern)
    try {
      goalsBlockRef.current = await buildGoalsPromptBlock();
    } catch {
      goalsBlockRef.current = '';
    }

    if (!hasGeneratedProactive.current) {
      hasGeneratedProactive.current = true;
      if (initialPrompt) {
        await sendMessageWithContext(initialPrompt, context, current, []);
      } else {
        await generateProactiveMessage(context, current);
      }
    }
  };

  const generateProactiveMessage = async (
    context: UserContext | null,
    current: CurrentContext | null
  ) => {
    setIsProactiveLoading(true);
    try {
      // Load nudges first — if any exist, surface them without making an AI call
      const nudges = userId && userId !== 'dev-preview-user'
        ? await getProactiveNudges(userId, userType).catch(() => [])
        : [];

      if (nudges.length > 0) {
        const nudgeText = formatNudgesForAI(nudges);
        setMessages([{
          id: 'proactive-nudges-' + Date.now(),
          role: 'assistant',
          content: nudgeText,
          timestamp: new Date(),
          chips: getFollowUpChips(context, currentPath, propChildName),
        }]);
        return;
      }

      const proactivePrompt = buildProactivePrompt(context, current, propChildName);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ userMessage: 'Open session', conversationHistory: [], systemPrompt: proactivePrompt })
        }
      );
      if (!response.ok) throw new Error('no response');
      const data = await response.json();
      const openingMessage: Message = {
        id: 'proactive-' + Date.now(),
        role: 'assistant',
        content: data.message || data.response || 'Hi! Ready to support you today.',
        timestamp: new Date(),
        chips: getFollowUpChips(context, currentPath, propChildName)
      };
      setMessages([openingMessage]);
    } catch {
      const name = context?.childName || propChildName || 'your child';
      setMessages([{
        id: 'proactive-fallback',
        role: 'assistant',
        content: `👋 Ready to help with ${name}'s treatment journey. What's on your mind today?`,
        timestamp: new Date(),
        chips: getFollowUpChips(context, currentPath, propChildName)
      }]);
    } finally {
      setIsProactiveLoading(false);
    }
  };

  const buildSystemPrompt = (ctxUser: UserContext | null, ctxCurrent: CurrentContext | null, personalityOverride?: AIPersonality) => {
    const contextString = ctxUser ? buildAIContextString(ctxUser) : '';
    const moduleCtx = ctxCurrent ? `Currently in: ${ctxCurrent.moduleName}. ${ctxCurrent.contextHint}` : '';
    const childName = ctxUser?.childName || propChildName || 'their child';
    const p = personalityOverride ?? loadAISettings().personality;
    const personalityBlock = getPersonalitySystemPrompt(p);
    const ci = loadCustomInstructions();
    const customBlock = (ci.aboutMe || ci.responseStyle) ? `
PARENT'S CUSTOM INSTRUCTIONS (highest priority — always follow these):
${ci.aboutMe ? `About this family: ${ci.aboutMe}` : ''}
${ci.responseStyle ? `How to communicate: ${ci.responseStyle}` : ''}` : '';
    // Deep screen awareness — what is literally visible to the parent right now.
    // Components publish this via useScreenState() from src/ai/screenStateRegistry.ts
    const screenBlock = buildScreenStateBlock();
    const liveScreenContext = screenBlock ? `

LIVE SCREEN AWARENESS (reference this naturally in your response):
${screenBlock}` : '';

    // State-specific context — injected so AI uses correct program names for the user's state
    const userStateAbbr = (() => {
      try {
        const simple = localStorage.getItem('aminy_user_state');
        if (simple) return simple;
        const jd = localStorage.getItem('aminy_just_diagnosed');
        if (jd) { const parsed = JSON.parse(jd); if (parsed?.state) return parsed.state; }
      } catch { /* ignore */ }
      return null;
    })();
    const stateCtx = userStateAbbr ? getStateAIContext(userStateAbbr) : '';
    const stateBlock = stateCtx ? `\n\n${stateCtx}` : '';

    return `You are Aminy — a board-certified behavioral analyst (BCBA) and developmental pediatrician combined into one deeply expert AI guide for families of neurodivergent children. You have 15+ years of clinical experience and you speak warmly, specifically, and practically.

FAMILY CONTEXT:
${contextString || `Supporting a family of a neurodivergent child.`}

CURRENT APP SECTION: ${moduleCtx || 'Dashboard'}

${personalityBlock}

TONE (always, regardless of personality style): Lead with empathy — acknowledge the parent's feeling before advice. Warm, plain language. "Gentle guidance. Meaningful progress."

YOUR CLINICAL KNOWLEDGE BASE:
• Behavioral assessment: VB-MAPP, ABLLS-R, AFLS, Vineland, ADOS-2, ABC behavior chains
• Function of behavior: escape/avoidance, attention-seeking, tangible access, automatic/sensory reinforcement
• Intervention frameworks: DTT, NET, PRT, EIBI, PBIS, PCIT, RUBI
• Prompting: most-to-least, least-to-most, time delay, graduated guidance, prompt fading
• Reinforcement: DRO, DRI, DRA, DRL, extinction, schedules of reinforcement, token economies
• Data: frequency/rate, duration, latency, IOA, ABC narrative, interval recording
• Regulation: co-regulation, interoception, proprioceptive input, sensory diet, zones of regulation
• School: IEP goal structure, LRE, accommodation vs modification, ESY services, 504 plans
• Crisis: NVCI, proactive vs reactive strategies, safety plans, environmental modification

RESPONSE RULES:
1. Adapt your tone to the personality style specified above
2. Be specific to ${childName}, not generic
3. Translate clinical terms into plain language unless the parent uses them first
4. Give 1 concrete, actionable strategy per response
5. Identify the likely FUNCTION of behavior before recommending a strategy
6. 3-5 sentences for most responses; longer only if explicitly asked
7. End with an insight or a single focused question
8. You are Aminy — an AI-powered behavioral wellness coach. You are NOT a licensed BCBA, therapist, or physician.
9. Frame all suggestions as "what tends to work based on ABA principles" — never as clinical prescriptions.
10. If a parent describes a CRISIS, EMERGENCY, danger to self/others, abuse, or medical symptom (seizure, medication reaction, injury), ALWAYS respond with: "This needs immediate professional help. Call 911 for emergencies or 988 for crisis support." — this overrides all other rules.
11. If a parent asks about medication, medical diagnoses, or treatment decisions, always end with: "Your child's pediatrician or BCBA should weigh in on this before you make changes."
12. If you notice a pattern, name it.

RICH FORMATTING (write markdown — it renders as real tables, headings, and lists):
• When you compare data across time, options, or categories (before/after, week-over-week, option A vs B, progress across multiple goals), present it as a GFM markdown TABLE:
  | Metric | Before | Since |
  |--------|--------|-------|
  | Sleep | 6.2 hrs | 7.8 hrs |
• Lead key takeaways with a **bold** phrase, then the detail — e.g. "**Sleep improved:** up ~1.5 hrs/night since the new routine."
• For multi-part analysis, use a short "## Heading" plus bullet (-) or numbered (1.) lists to stay scannable.
• Reserve this rich format for analytical / data / comparison answers. For a quick question or an emotional check-in, stay conversational (rule 6) — don't force a table.

CHART CAPABILITY: When showing data trends, you MAY embed a chart inline:
[CHART:{"type":"bar","title":"Sessions This Month","data":[{"week":"Wk1","sessions":3},{"week":"Wk2","sessions":5}],"xKey":"week","yKey":"sessions"}]
Types: "bar", "line", or "pie". Use sparingly — only when data genuinely clarifies your point.
When the user asks about progress, outcomes, trends, or anything quantitative over time, include a [CHART:...] block visualizing it.
REAL-DATA CHART: When a parent asks about progress, trends, or how things are going over time, you may include the token [CHART:weekly_trend] on its own line to show their real progress chart (their actual weekly check-in data, rendered by the app — you don't supply the numbers) — use it at most once per reply and only when discussing their data. Prefer it over a JSON chart when the question is about ${childName}'s own progress over time.

ACTION CAPABILITY: When a parent describes a behavior incident or you identify something worth saving, you MAY embed an action token (silently executed, confirmation shown to parent):
[ACTION:LOG_BEHAVIOR:{"behavior_type":"meltdown","trigger":"transition","intensity":3,"notes":"occurred after lunch","is_positive":false}]
[ACTION:SET_CALM_CUE:{"cue":"deep pressure vest + counting to 10"}]
[ACTION:ADD_WIN:{"win":"completed morning routine independently for first time"}]
[ACTION:ADD_STRUGGLE:{"struggle":"transition meltdowns after lunch"}]
[ACTION:ADD_APPOINTMENT:{"title":"BCBA session — Liam","provider":"Dr. Sarah Lee","service_type":"ABA","start_iso":"2026-05-20T14:00:00","duration_minutes":60,"location":"Telehealth","notes":"first session of the month"}]

APPOINTMENT DETECTION — CRITICAL: If the parent's message contains ANY future date/time + a session/visit/appointment/eval reference, you MUST emit an ADD_APPOINTMENT token. This is non-negotiable. Do not just acknowledge in text — fire the structured action so the parent gets one-tap Apple/Google/Outlook calendar buttons.

Examples that REQUIRE the token:
- "I have OT Thursday at 3" → fire ADD_APPOINTMENT
- "Liam's speech eval is next Monday morning" → fire
- "we just got assigned a BCBA for Wednesday at 4pm" → fire
- "we have a session tomorrow at 10" → fire
- ANY pattern of [day-of-week|tomorrow|next week] + time → fire

Resolve relative times against today's date. service_type values: ABA, PT, OT, ST, MentalHealth, Pediatrician, Other. If duration unclear, omit. After the action token, write a 1-sentence confirmation (the system already adds the calendar buttons below your text).

Only use action tokens when the parent has clearly described something worth persisting. Never invent data.
${stateBlock}${customBlock}${liveScreenContext}${memoryBlockRef.current}${goalsBlockRef.current}`;
  };

  const sendMessageWithContext = async (
    text: string,
    ctxUser: UserContext | null,
    ctxCurrent: CurrentContext | null,
    history: Message[]
  ) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    // Append — replacing the array here used to wipe any prior history (S3)
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const systemPrompt = buildSystemPrompt(ctxUser, ctxCurrent);
      const assistantId = (Date.now() + 1).toString();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            userMessage: text,
            conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
            systemPrompt,
            stream: true,
          }),
          signal: controller.signal,
        }
      );
      if (!response.ok) throw new Error('AI connection hiccup');

      const rawText = await readBrainStream(
        response,
        (accumulated, isFirst) => {
          if (isFirst) {
            setMessages(prev => [...prev, { id: assistantId, role: 'assistant' as const, content: accumulated, timestamp: new Date() }]);
          } else {
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m));
          }
        },
        () => setIsLoading(false)
      );
      const wasStopped = controller.signal.aborted;
      const { cleanText: aiText, actions } = parseSmartActions(
        wasStopped ? rawText.replace(/\[[A-Z_]*(:[^\]]*)?$/, '') : rawText
      );
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: aiText, stopped: wasStopped || undefined, chips: wasStopped ? undefined : getFollowUpChips(ctxUser, currentPath, propChildName) }
          : m
      ));
      if (wasStopped) return; // partial reply — skip actions + memory

      for (const action of actions) {
        try {
          const confirmation = await executeSmartAction(action, userId);
          if (confirmation) {
            setMessages(prev => [...prev, { id: Date.now().toString() + '-action', role: 'assistant' as const, content: confirmation, timestamp: new Date() }]);
          }
        } catch { toast.error('Could not save — try again?'); }
      }

      if (aiText.length > 50) {
        storeMemory(userId, { timestamp: new Date(), category: 'insight', content: aiText, context: { userQuery: text, module: ctxCurrent?.module } }).catch(() => {});
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError' && !controller.signal.aborted) {
        toast.error('Connection hiccup — try again?');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  // Core assistant turn — fetch + stream + smart actions. Shared by sendMessage
  // (new turn) and regenerateLast (re-run the same user turn). `excludeMsgId`
  // is the user message whose text is being sent — it must not also appear in
  // conversationHistory. `displayText` is what the parent typed; screen context
  // is only injected into the payload, never into the visible bubble.
  const runAssistantTurn = useCallback(async (
    payloadText: string,
    imgs: Array<{ name: string; dataUrl: string }>,
    excludeMsgId: string,
  ) => {
    setIsLoading(true);
    setIsStreaming(true);
    if (showThinkingSteps) {
      setActiveThinkingSteps(generateThinkingSteps(payloadText));
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const systemPrompt = buildSystemPrompt(userContext, currentContext, personality);

      // If images are attached, build Anthropic-format content blocks so Claude
      // actually sees them (vision). Otherwise just send the text.
      let messagePayload: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
      const imageBlocks = imgs
        .map(img => {
          const m = img.dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
          return m ? { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } } : null;
        })
        .filter((b): b is { type: string; source: { type: string; media_type: string; data: string } } => !!b);
      if (imageBlocks.length > 0) {
        messagePayload = [
          { type: 'text', text: payloadText || (imageBlocks.length > 1 ? 'Please look at these images and tell me what you see.' : 'Please look at this image and tell me what you see.') },
          ...imageBlocks,
        ];
      } else {
        messagePayload = payloadText;
      }

      const assistantId = (Date.now() + 1).toString();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            userMessage: messagePayload,
            // messagesRef (not the `messages` closure) — a stale memoized
            // callback would otherwise send truncated history (S3)
            conversationHistory: messagesRef.current
              .filter(m => m.id !== excludeMsgId)
              .map(m => ({ role: m.role, content: m.content })),
            systemPrompt,
            stream: imageBlocks.length === 0, // vision payloads fall back to synchronous path on the edge fn
          }),
          signal: controller.signal,
        }
      );
      if (!response.ok) throw new Error('AI connection hiccup');

      const rawText = await readBrainStream(
        response,
        (accumulated, isFirst) => {
          if (isFirst) {
            setMessages(prev => [...prev, { id: assistantId, role: 'assistant' as const, content: accumulated, timestamp: new Date() }]);
          } else {
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m));
          }
        },
        () => { setIsLoading(false); setActiveThinkingSteps([]); }
      );
      const wasStopped = controller.signal.aborted;
      // On stop, trim a dangling half-emitted [ACTION:… fragment before parsing.
      const { cleanText: aiText, actions } = parseSmartActions(
        wasStopped ? rawText.replace(/\[[A-Z_]*(:[^\]]*)?$/, '') : rawText
      );
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: aiText, stopped: wasStopped || undefined, chips: wasStopped ? undefined : getFollowUpChips(userContext, currentPath, propChildName) }
          : m
      ));
      if (wasStopped) return; // partial reply — skip actions + memory

      for (const action of actions) {
        try {
          const confirmation = await executeSmartAction(action, userId);
          if (confirmation) {
            setMessages(prev => [...prev, { id: Date.now().toString() + '-action', role: 'assistant' as const, content: confirmation, timestamp: new Date() }]);
          }
        } catch { toast.error('Could not save — try again?'); }
      }

      if (aiText.length > 50) {
        storeMemory(userId, { timestamp: new Date(), category: 'insight', content: aiText, context: { userQuery: payloadText, module: currentContext?.module } }).catch(() => {});
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError' && !controller.signal.aborted) {
        toast.error('Connection hiccup — try again?');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setActiveThinkingSteps([]);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [userContext, currentContext, currentPath, userId, personality, showThinkingSteps, propChildName]);

  const sendMessage = useCallback(async (text: string, imageData?: { name: string; dataUrl: string }) => {
    if (isLoading || isStreaming) return;

    const imgs = (imageData ? [...attachedImages, imageData] : attachedImages).slice(0, MAX_ATTACHED_IMAGES);
    const doc = pendingDoc;
    if (!text.trim() && imgs.length === 0 && !doc) return;

    // Free tier daily limit gate — only for sends that trigger an AI turn.
    const isFree = !userTier || userTier === 'free';
    if (isFree && (text.trim() || imgs.length > 0)) {
      const used = getFreeDailyCount(userId);
      if (used >= FREE_DAILY_LIMIT) {
        const limitMsg = {
          id: Date.now().toString() + '-limit',
          role: 'assistant' as const,
          content: `You've used your ${FREE_DAILY_LIMIT} free messages for today 💛\n\nUpgrade to **Core** for unlimited AI chat, Junior mode, and full memory — starting at $14.99/mo with a 7-day free trial.`,
          timestamp: new Date(),
          isUpgradePrompt: true,
        };
        setMessages(prev => [...prev, limitMsg]);
        setInput('');
        return;
      }
      const newCount = incrementFreeDailyCount(userId);
      const remaining = FREE_DAILY_LIMIT - newCount;
      if (remaining === 1 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        sendLocalNotification(
          '1 AI message left today',
          'Upgrade to Aminy Core for unlimited daily messages.',
          { route: '/upgrade' }
        );
      }
    }

    setAttachedImages([]);
    setPendingDoc(null);
    setInput('');
    setHasInteracted(true);

    // Pre-send PDF chip — upload to the vault FIRST so the RAG reference and
    // refreshed memory block exist before the AI turn sees the message.
    if (doc) {
      await uploadPendingDocument(doc);
    }
    if (!text.trim() && imgs.length === 0) return; // doc-only send — ack already in-chat

    // Edit-and-resend: replace the conversation tail from the edited user
    // message onward (the old reply and everything after it are discarded).
    if (editingMessageId) {
      const idx = messagesRef.current.findIndex(m => m.id === editingMessageId);
      if (idx >= 0) {
        const truncated = messagesRef.current.slice(0, idx);
        messagesRef.current = truncated;
        setMessages(truncated);
      }
      setEditingMessageId(null);
    }

    // Inject pending screen context into the payload only (not the bubble)
    let payloadText = text;
    if (pendingScreenContext) {
      payloadText = `[Screen context: ${pendingScreenContext}]\n\n${text}`;
      setPendingScreenContext(null);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      imageUrls: imgs.length > 0 ? imgs.map(i => i.dataUrl) : undefined,
    };
    // Sync the ref immediately — runAssistantTurn reads it before React re-renders.
    messagesRef.current = [...messagesRef.current, userMsg];
    setMessages(prev => [...prev, userMsg]);

    await runAssistantTurn(payloadText, imgs, userMsg.id);
  }, [isLoading, isStreaming, userTier, userId, attachedImages, pendingDoc, editingMessageId, pendingScreenContext, runAssistantTurn]);

  // Stop generation — aborts the in-flight request; readBrainStream keeps the
  // partial text and runAssistantTurn marks the message as stopped.
  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Regenerate — re-runs the LAST user turn; the old assistant reply (and any
  // action confirmations after it) are replaced.
  const regenerateLast = useCallback(async () => {
    if (isLoading || isStreaming) return;
    const msgs = messagesRef.current;
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx < 0) return;
    const userMsg = msgs[lastUserIdx];
    const truncated = msgs.slice(0, lastUserIdx + 1);
    messagesRef.current = truncated;
    setMessages(truncated);
    const imgs = (userMsg.imageUrls || (userMsg.imageUrl ? [userMsg.imageUrl] : []))
      .map((dataUrl, i) => ({ name: `image-${i + 1}`, dataUrl }));
    await runAssistantTurn(userMsg.content, imgs, userMsg.id);
  }, [isLoading, isStreaming, runAssistantTurn]);

  // Edit-and-resend entry point — prefills the input with the LAST user
  // message; sending replaces the conversation tail from that point.
  const startEditLastUser = useCallback((msg: Message) => {
    if (isLoading || isStreaming) return;
    setEditingMessageId(msg.id);
    setInput(msg.content);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isLoading, isStreaming]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setInput('');
  }, []);

  // Thumbs feedback — optimistic UI + fire-and-forget POST to the make-server
  // /ai/feedback route (session JWT when available, anon key otherwise).
  const sendFeedback = useCallback((messageId: string, rating: 'up' | 'down') => {
    setMessageRatings(prev => ({ ...prev, [messageId]: rating }));
    (async () => {
      try {
        let token: string | undefined;
        try {
          const { data } = await supabase.auth.getSession();
          token = data?.session?.access_token;
        } catch { /* anon fallback */ }
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/feedback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || publicAnonKey}` },
            body: JSON.stringify({ messageId, rating, conversationId: activeConvIdRef.current }),
          }
        );
      } catch { /* silent — feedback must never break chat */ }
    })();
  }, []);

  // ─── Voice input ──────────────────────────────────────────────────────────
  // Tap mic → records audio → on stop, sends to /ai/transcribe → fills input.
  // Parent can review/edit before sending. Designed for hands-busy moments
  // (mid-meltdown one-handed transcription).
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 500) {
          toast.error('Hold the mic longer — that was too short to hear.');
          return;
        }

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64Audio = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/transcribe`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
              body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
            }
          );

          if (!response.ok) throw new Error('Transcription failed');
          const data = await response.json();
          const transcript = (data.text || '').trim();

          if (transcript) {
            setInput(prev => prev ? `${prev} ${transcript}` : transcript);
            inputRef.current?.focus();
          } else {
            toast.error('Couldn\'t catch that — try again');
          }
        } catch {
          toast.error('Voice transcription unavailable');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      if ((err as Error).name === 'NotAllowedError') {
        toast.error('Microphone permission needed for voice input');
      } else {
        toast.error('Could not access microphone');
      }
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Images (camera + photo library) → held as attachments (up to 4), sent to
  // Claude vision on the next message. PDFs use handleDocumentSelect instead.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error('That file is a bit big — please keep images under 10 MB.');
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImages(prev => {
          if (prev.length >= MAX_ATTACHED_IMAGES) {
            toast.error(`Up to ${MAX_ATTACHED_IMAGES} images per message.`);
            return prev;
          }
          return [...prev, { name: file.name, dataUrl: reader.result as string }];
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // PDFs do NOT go to vision. They're held as a pre-send chip; on send they
  // mirror the Records Vault flow: upload → store a memory fact (so Aminy knows
  // it exists) → process-document (text → embeddings for RAG) → in-chat ack +
  // refresh of the injected memory block so the doc is referenceable in the
  // same conversation (and the same send, since upload is awaited first).
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('That document is a bit big — please keep files under 10 MB.');
      return;
    }
    if (!userId || userId === 'dev-preview-user') {
      toast.error('Please sign in to attach documents.');
      return;
    }
    setPendingDoc(file);
  };

  const uploadPendingDocument = useCallback(async (file: File): Promise<boolean> => {
    if (!userId || userId === 'dev-preview-user') {
      toast.error('Please sign in to attach documents.');
      return false;
    }

    setDocUploading({ name: file.name });
    try {
      const result = await uploadVaultFile(file, userId, {
        recordType: 'uploaded',
        source: 'parent-upload',
        childId: userContext?.childId,
        metadata: { title: file.name },
        tier: userTier,
      });

      if (!result.success) {
        toast.error(result.error || 'Could not save that document — try again?');
        return false;
      }

      // Vault → AI link 1: a memory fact (injected into the system prompt's
      // "WHAT YOU REMEMBER" block), so Aminy knows the doc exists.
      storeMemory(userId, {
        timestamp: new Date(),
        category: 'insight',
        content: `Parent shared a document "${file.name}" in chat on ${new Date().toLocaleDateString()}. It's saved in their records vault — reference it when relevant.`,
        context: { source: 'chat-upload', documentId: result.fileId || null },
      }).catch(() => {});

      // Vault → AI link 2: extract text → embeddings (RAG). Best-effort.
      if (result.fileId) {
        processVaultDocument(result.fileId)
          .then(p => { if (p.success) markVaultDocumentProcessed(result.fileId!).catch(() => {}); })
          .catch(() => {});
      }

      // Refresh the injected memory block so the new doc is in context for the
      // very next message in THIS conversation (not just future sessions).
      try { memoryBlockRef.current = await buildMemoryPromptBlock(userContext); } catch { /* keep prior block */ }

      // In-chat acknowledgment (ref synced immediately — a same-send AI turn
      // reads messagesRef before React re-renders).
      const ackMsg: Message = {
        id: `${Date.now()}-doc`,
        role: 'assistant',
        content: `Got it — I've read **${file.name}** and saved it to your vault. Ask me anything about it.`,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, ackMsg];
      setMessages(prev => [...prev, ackMsg]);
      setHasInteracted(true);
      return true;
    } catch {
      toast.error('Could not save that document — try again?');
      return false;
    } finally {
      setDocUploading(null);
    }
  }, [userId, userContext, userTier]);

  // Vault picker — attach an existing Records Vault document to the chat. This
  // mirrors the fresh-upload reference path exactly (memory fact + RAG
  // processing + refreshed memory block), minus the upload itself.
  const openVaultPicker = useCallback(async () => {
    setShowVaultPicker(true);
    setVaultLoading(true);
    try {
      const { documents } = await listVaultDocuments(userId, { limit: 50 });
      setVaultDocs(documents);
    } catch {
      setVaultDocs([]);
    } finally {
      setVaultLoading(false);
    }
  }, [userId]);

  const attachVaultDoc = useCallback(async (doc: VaultDocument) => {
    setShowVaultPicker(false);
    const displayName = doc.metadata?.title || doc.fileName;

    // Vault → AI link 1: memory fact so Aminy knows the doc is in play.
    storeMemory(userId, {
      timestamp: new Date(),
      category: 'insight',
      content: `Parent attached their vault document "${displayName}" to the chat on ${new Date().toLocaleDateString()}. Reference it when relevant.`,
      context: { source: 'chat-vault-attach', documentId: doc.id },
    }).catch(() => {});

    // Vault → AI link 2: ensure text → embeddings (RAG) exists. Best-effort;
    // already-processed docs are skipped via the ocrStatus flag.
    if (doc.metadata?.ocrStatus !== 'complete') {
      processVaultDocument(doc.id)
        .then(p => { if (p.success) markVaultDocumentProcessed(doc.id).catch(() => {}); })
        .catch(() => {});
    }

    // Refresh the injected memory block so the doc is in context immediately.
    try { memoryBlockRef.current = await buildMemoryPromptBlock(userContext); } catch { /* keep prior block */ }

    const ackMsg: Message = {
      id: `${Date.now()}-vaultdoc`,
      role: 'assistant',
      content: `Attached **${displayName}** from your vault. Ask me anything about it.`,
      timestamp: new Date(),
    };
    messagesRef.current = [...messagesRef.current, ackMsg];
    setMessages(prev => [...prev, ackMsg]);
    setHasInteracted(true);
  }, [userId, userContext]);

  const loadHistorySession = async (session: ChatSession) => {
    activeConvIdRef.current = session.id;
    setShowHistory(false);
    hasGeneratedProactive.current = true;
    setEditingMessageId(null);
    // Resumed sessions keep their existing title — don't regenerate.
    titleGenAttemptedRef.current.add(session.id);
    if (session.title) convTitlesRef.current[session.id] = session.title;

    // Bodies already present (local cache) — show immediately.
    if (session.messages && session.messages.length > 0) {
      setMessages(session.messages);
      return;
    }

    // Lazy-load message bodies for a roamed (remote-only) session.
    setMessages([]);
    try {
      const conv = await loadConversation(session.id, userId);
      const loaded: Message[] = (conv?.messages || []).map(m => ({
        id: m.id,
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
      setMessages(loaded);
    } catch {
      toast.error('Could not load that conversation.');
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChatSession(id);
    setChatSessions(prev => prev.filter(s => s.id !== id));
    // BUG FIX: also delete the Supabase `conversations` row — localStorage-only
    // deletion let roamed conversations resurrect cross-device on next open.
    if (userId && userId !== 'dev-preview-user') {
      deleteConversation(id, userId).catch(() => { /* offline — local copy is gone */ });
    }
  };

  const handleTogglePin = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = { ...session, pinned: !session.pinned };
    persistChatSession(next);
    setChatSessions(prev => prev.map(s => (s.id === session.id ? next : s)));
  };

  const startRenameSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(session.id);
    setRenameDraft(session.title || session.preview);
  };

  const commitRename = (session: ChatSession) => {
    const title = renameDraft.trim();
    setRenamingSessionId(null);
    if (!title || title === (session.title || session.preview)) return;
    const next = { ...session, title };
    persistChatSession(next);
    setChatSessions(prev => prev.map(s => (s.id === session.id ? next : s)));
    convTitlesRef.current[session.id] = title;
    if (userId && userId !== 'dev-preview-user' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.id)) {
      renameConversation(session.id, userId, title).catch(() => {});
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setShowHistory(false);
    setEditingMessageId(null);
    setAttachedImages([]);
    setPendingDoc(null);
    hasGeneratedProactive.current = false;
    // Fresh conversation id so the new chat is its own history entry.
    activeConvIdRef.current = newConversationId();
    loadContextAndOpenChat();
  };

  // M1 — save custom instructions locally AND roam them via profiles.ai_context
  const persistInstructions = (ci: CustomInstructions) => {
    saveCustomInstructions(ci);
    setInstructionsDirty(false);
    toast.success('Instructions saved');
    if (userId && userId !== 'dev-preview-user') {
      updateUserContext(userId, { customInstructions: ci }).catch(() => {});
    }
  };

  // M1 — persist an AI-settings change locally + roam via profiles.ai_context
  const persistAISettings = (next: AminyAISettings) => {
    try { saveAISettings(next); } catch { /* ignore */ }
    if (userId && userId !== 'dev-preview-user') {
      updateUserContext(userId, { aiSettings: next as unknown as Record<string, unknown> }).catch(() => {});
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100]"
            onClick={handleClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-[101] flex flex-col bg-white dark:bg-slate-900 overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 px-3 py-2.5 flex items-center gap-2 border-b border-[#E8E4DF]">
              {/* Hamburger — opens history */}
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6B7A] hover:bg-[#EDF4F7] transition-colors shrink-0"
                aria-label="Chat history"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Avatar + title */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)', boxShadow: '0 2px 8px rgba(42,125,153,0.35)' }}
                >
                  ✦
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100 leading-tight truncate">Aminy AI</p>
                  <p className="text-sm text-[#5A6B7A] leading-tight flex items-center gap-1 truncate">
                    {(() => {
                      const PersonalityIcon = PERSONALITY_ICONS[AI_PERSONALITIES[personality].icon] ?? Heart;
                      return <PersonalityIcon className="w-3 h-3 text-[#2A7D99] shrink-0" aria-hidden="true" />;
                    })()}
                    <span className="truncate">{isProactiveLoading ? 'Thinking…' : (currentContext?.moduleName || AI_PERSONALITIES[personality].name)}</span>
                  </p>
                </div>
              </div>

              {/* New chat — always visible (Claude-app parity) */}
              <button
                onClick={() => { setShowSettings(false); startNewChat(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6B7A] hover:bg-[#EDF4F7] transition-colors shrink-0"
                aria-label="New chat"
              >
                <SquarePen className="w-4 h-4" />
              </button>

              {/* Settings */}
              <button
                onClick={() => { setShowSettings(v => !v); setShowHistory(false); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6B7A] hover:bg-[#EDF4F7] transition-colors shrink-0"
                aria-label="Chat settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-[#EDF4F7] flex items-center justify-center hover:bg-[#E8E4DF] transition-colors shrink-0"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-[#5A6B7A]" />
              </button>
            </div>

            {/* Main content area — messages + history drawer */}
            <div className="flex-1 relative overflow-hidden">

              {/* ── History Drawer ── */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                    className="absolute inset-0 z-10 bg-white dark:bg-slate-900 flex flex-col"
                  >
                    {/* Drawer header */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#E8E4DF] dark:border-slate-700 shrink-0">
                      <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">Chat History</p>
                      <button
                        onClick={startNewChat}
                        className="flex items-center gap-1.5 text-xs text-[#6B9080] font-medium px-3 py-1.5 bg-[#6B9080]/10 rounded-full hover:bg-[#6B9080]/10 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Chat
                      </button>
                    </div>

                    {/* Pinned navigation */}
                    <div className="border-b border-[#E8E4DF] dark:border-slate-700">
                      {[
                        { icon: Folder, label: 'Records Vault', screen: 'records-vault' },
                        { icon: Bell, label: 'Check-ins', screen: 'notifications' },
                      ].map(item => (
                        <button
                          key={item.screen}
                          onClick={() => { setShowHistory(false); onNavigate?.(item.screen); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors text-left"
                        >
                          <item.icon className="w-4 h-4 text-[#6B9080]" />
                          <span className="text-sm text-[#132F43] dark:text-slate-100">{item.label}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                        </button>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="px-4 py-2 border-b border-[#E8E4DF] dark:border-slate-700 shrink-0">
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#F6FBFB] dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-600 rounded-xl">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                        <input
                          value={historySearch}
                          onChange={e => setHistorySearch(e.target.value)}
                          placeholder="Search conversations"
                          aria-label="Search conversations"
                          className="flex-1 min-w-0 bg-transparent text-sm text-[#132F43] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                        />
                        {historySearch && (
                          <button
                            onClick={() => setHistorySearch('')}
                            className="shrink-0 text-slate-400 hover:text-slate-600"
                            aria-label="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sessions list — grouped Today / Yesterday / Previous 7 days / Earlier */}
                    <div className="flex-1 overflow-y-auto">
                      {(() => {
                        const q = historySearch.trim().toLowerCase();
                        const filtered = q
                          ? chatSessions.filter(s =>
                              (s.title || s.preview).toLowerCase().includes(q) ||
                              (s.messages || []).some(m => (m.content || '').toLowerCase().includes(q)))
                          : chatSessions;

                        if (chatSessions.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
                              <div className="w-12 h-12 rounded-full bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-slate-400 dark:text-slate-300" />
                              </div>
                              <p className="text-sm text-[#5A6B7A] dark:text-slate-300">No previous chats yet.</p>
                              <p className="text-sm text-slate-400 dark:text-slate-400">Your conversations will appear here after you close the chat.</p>
                            </div>
                          );
                        }
                        if (filtered.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-2">
                              <Search className="w-5 h-5 text-slate-300" aria-hidden="true" />
                              <p className="text-sm text-[#5A6B7A] dark:text-slate-300">No conversations match &ldquo;{historySearch}&rdquo;</p>
                            </div>
                          );
                        }

                        return groupChatSessions(filtered).map(group => (
                          <div key={group.label}>
                            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide">
                              {group.label}
                            </p>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {group.sessions.map(session => (
                                <div
                                  key={session.id}
                                  className="flex items-center gap-0.5 pr-2 hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors"
                                >
                                  {renamingSessionId === session.id ? (
                                    <div className="flex-1 min-w-0 pl-4 pr-1 py-2.5">
                                      <input
                                        autoFocus
                                        value={renameDraft}
                                        onChange={e => setRenameDraft(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') commitRename(session);
                                          if (e.key === 'Escape') setRenamingSessionId(null);
                                        }}
                                        onBlur={() => commitRename(session)}
                                        aria-label="Conversation title"
                                        className="w-full text-sm text-[#132F43] dark:text-slate-100 bg-white dark:bg-slate-800 border border-[#2A7D99] rounded-lg px-2.5 py-1.5 focus:outline-none"
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => loadHistorySession(session)}
                                      className="flex-1 min-w-0 flex items-start pl-4 pr-1 py-3 text-left"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-[#132F43] dark:text-slate-200 leading-snug line-clamp-2">
                                          {session.title || session.preview}
                                        </p>
                                        <p className="text-sm text-slate-400 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                          {session.pinned && <Pin className="w-3 h-3 text-[#2A7D99] shrink-0" aria-hidden="true" />}
                                          {formatSessionTime(session.timestamp)}
                                        </p>
                                      </div>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleTogglePin(session, e)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-[#2A7D99] hover:bg-[#EDF4F7] transition-colors shrink-0"
                                    aria-label={session.pinned ? 'Unpin conversation' : 'Pin conversation'}
                                  >
                                    {session.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={(e) => startRenameSession(session, e)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-[#2A7D99] hover:bg-[#EDF4F7] transition-colors shrink-0"
                                    aria-label="Rename conversation"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                                    aria-label="Delete conversation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Settings Panel ── */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                    className="absolute inset-0 z-10 bg-white dark:bg-slate-900 flex flex-col"
                  >
                    {/* Panel header */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#E8E4DF] dark:border-slate-700 shrink-0">
                      <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">Aminy Settings</p>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-400 hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close settings"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto">

                      {/* ── Profile card ── */}
                      <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #2A7D9912 0%, #57759012 100%)', border: '1px solid #2A7D9925' }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)' }}
                          >
                            {(userContext?.childName || propChildName || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100 leading-tight">
                              {userContext?.childName || propChildName || 'Your child'}
                            </p>
                            {userContext?.childAge && (
                              <p className="text-sm text-[#5A6B7A]">{userContext.childAge}</p>
                            )}
                            {userContext?.diagnosis && (
                              <p className="text-sm text-[#6B9080] font-medium mt-0.5">{userContext.diagnosis}</p>
                            )}
                          </div>
                          <div className="ml-auto shrink-0 text-right">
                            <div
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: 'linear-gradient(135deg, #2A7D9922 0%, #57759022 100%)', color: '#2A7D99' }}
                            >
                              ✦ AI Active
                            </div>
                          </div>
                        </div>
                        {(userContext?.progressThisWeek?.sessionsCompleted ?? 0) > 0 && (
                          <div className="flex gap-3 mt-3 pt-3 border-t border-[#6B9080]/20">
                            <div className="text-center flex-1">
                              <p className="text-lg font-bold text-[#132F43] dark:text-slate-100">{userContext?.progressThisWeek?.sessionsCompleted}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-400 uppercase tracking-wide">Sessions</p>
                            </div>
                            <div className="text-center flex-1">
                              <p className="text-lg font-bold text-[#132F43] dark:text-slate-100">{userContext?.progressThisWeek?.calmMoments}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-400 uppercase tracking-wide">Calm moments</p>
                            </div>
                            <div className="text-center flex-1">
                              <p className="text-lg font-bold text-[#132F43] dark:text-slate-100">{userContext?.progressThisWeek?.newStrategies}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-400 uppercase tracking-wide">Strategies</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Personality ── */}
                      <div className="px-4 mt-5">
                        <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Communication Style</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.values(AI_PERSONALITIES) as typeof AI_PERSONALITIES[keyof typeof AI_PERSONALITIES][]).map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setPersonality(p.id);
                                // Persist to 'aminy-ai-settings' (the key loadAISettings
                                // actually reads) + roam via profiles.ai_context (M1).
                                // The old 'aminy-ai-personality' key was never read back.
                                try {
                                  persistAISettings({ ...loadAISettings(), personality: p.id });
                                } catch { /* ignore */ }
                              }}
                              className="flex items-start gap-2 p-3 rounded-xl border transition-all text-left"
                              style={personality === p.id ? {
                                background: 'linear-gradient(135deg, #2A7D9915 0%, #57759015 100%)',
                                borderColor: '#2A7D99',
                              } : {
                                background: 'white',
                                borderColor: '#e2e8f0',
                              }}
                            >
                              {(() => {
                                const PersonalityIcon = PERSONALITY_ICONS[p.icon] ?? Heart;
                                return (
                                  <span className="w-7 h-7 rounded-full bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                    <PersonalityIcon className="w-3.5 h-3.5 text-[#2A7D99]" aria-hidden="true" />
                                  </span>
                                );
                              })()}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">{p.name}</p>
                                  {personality === p.id && <Check className="w-3 h-3 text-[#6B9080] shrink-0" />}
                                </div>
                                <p className="text-sm text-[#5A6B7A] leading-tight mt-0.5 line-clamp-2">{p.tagline}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Usage ── */}
                      <div className="px-4 mt-5">
                        <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-3">Usage</p>
                        <UsageMeter
                          variant="full"
                          tier={userTier || 'free'}
                          messagesUsedToday={dailyUsage?.used ?? 0}
                          documentsUploaded={0}
                          memoryFactsStored={0}
                          onUpgrade={() => onUpgrade?.()}
                        />
                      </div>

                      {/* ── Customization ── */}
                      <div className="px-4 mt-5">
                        <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-3">Customization</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="pr-4">
                              <p className="text-sm font-medium text-[#132F43] dark:text-slate-100">Show thinking steps</p>
                              <p className="text-sm text-[#5A6B7A] leading-tight">Display reasoning steps while processing</p>
                            </div>
                            <Switch
                              checked={showThinkingSteps}
                              onCheckedChange={(v) => {
                                setShowThinkingSteps(v);
                                try { localStorage.setItem('aminy-show-thinking', String(v)); } catch {}
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="pr-4">
                              <p className="text-sm font-medium text-[#132F43] dark:text-slate-100">Suggested follow-ups</p>
                              <p className="text-sm text-[#5A6B7A] leading-tight">Show quick questions after each response</p>
                            </div>
                            <Switch
                              checked={showFollowUps}
                              onCheckedChange={(v) => {
                                setShowFollowUps(v);
                                try { localStorage.setItem('aminy-show-followups', String(v)); } catch {}
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── Custom Instructions ── */}
                      <div className="px-4 mt-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Custom Instructions</p>
                          {instructionsDirty && (
                            <button
                              onClick={() => persistInstructions(customInstructions)}
                              className="text-xs text-[#6B9080] font-semibold px-2.5 py-1 bg-[#6B9080]/10 rounded-full hover:bg-[#6B9080]/10 transition-colors"
                            >
                              Save
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-[#5A6B7A] mb-1.5 block">What Aminy should know about you and your family</label>
                            <textarea
                              value={customInstructions.aboutMe}
                              onChange={e => {
                                setCustomInstructions(prev => ({ ...prev, aboutMe: e.target.value }));
                                setInstructionsDirty(true);
                              }}
                              onBlur={() => {
                                if (instructionsDirty) {
                                  persistInstructions(customInstructions);
                                }
                              }}
                              placeholder="e.g. My son Liam is 7, has ASD level 2, and struggles most with transitions and unexpected changes. He loves dinosaurs and is highly motivated by screen time..."
                              className="w-full text-sm text-[#132F43] dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#6B9080]/30 focus:border-[#6B9080]"
                              rows={4}
                            />
                          </div>

                          <div>
                            <label className="text-sm text-[#5A6B7A] mb-1.5 block">How Aminy should communicate with you</label>
                            <textarea
                              value={customInstructions.responseStyle}
                              onChange={e => {
                                setCustomInstructions(prev => ({ ...prev, responseStyle: e.target.value }));
                                setInstructionsDirty(true);
                              }}
                              onBlur={() => {
                                if (instructionsDirty) {
                                  persistInstructions(customInstructions);
                                }
                              }}
                              placeholder="e.g. Keep responses brief and direct — I'm usually reading this in the middle of a meltdown. Give me 1 thing to try, not a list..."
                              className="w-full text-sm text-[#132F43] dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#6B9080]/30 focus:border-[#6B9080]"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── What Aminy knows ── */}
                      {userContext && (
                        <div className="px-4 mt-5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Brain className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                            <p className="text-xs font-semibold text-[#5A6B7A] dark:text-slate-300 uppercase tracking-wide">What Aminy Knows</p>
                          </div>
                          <div className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                            {userContext.strugglingWith && userContext.strugglingWith.length > 0 && (
                              <div className="px-3 py-2.5">
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-1">Working on</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {userContext.strugglingWith.map((s, i) => (
                                    <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {userContext.celebratingWins && userContext.celebratingWins.length > 0 && (
                              <div className="px-3 py-2.5">
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-1">Wins</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {userContext.celebratingWins.map((w, i) => (
                                    <span key={i} className="text-xs bg-[#6B9080]/10 text-[#6B9080] px-2 py-0.5 rounded-full">{w}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {userContext.lastCalmCue && (
                              <div className="px-3 py-2.5 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Last calm cue: <span className="font-medium text-[#132F43] dark:text-slate-100">{userContext.lastCalmCue}</span></p>
                              </div>
                            )}
                            {userContext.bestTimeOfDay && (
                              <div className="px-3 py-2.5">
                                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Best time of day: <span className="font-medium text-[#132F43] dark:text-slate-100 capitalize">{userContext.bestTimeOfDay}</span></p>
                              </div>
                            )}
                            {!userContext.strugglingWith?.length && !userContext.celebratingWins?.length && !userContext.lastCalmCue && !userContext.bestTimeOfDay && (
                              <div className="px-3 py-3 text-center">
                                <p className="text-sm text-slate-400">Chat with Aminy to build your family's memory</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Memory Browser ── */}
                      <div className="px-4 mt-5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Memory</p>
                          </div>
                          <button
                            onClick={async () => {
                              if (!userId || memoryLoading) return;
                              setMemoryLoading(true);
                              const facts = await getUserMemoryFacts(userId);
                              setMemoryFacts(facts);
                              setMemoryLoading(false);
                            }}
                            className="text-sm text-[#6B9080] hover:underline font-medium"
                          >
                            {memoryLoading ? 'Loading…' : memoryFacts.length === 0 ? 'Load' : 'Refresh'}
                          </button>
                        </div>
                        {memoryFacts.length > 0 ? (
                          <div className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                            {(() => {
                              const grouped = memoryFacts.reduce<Record<string, MemoryFact[]>>((acc, f) => {
                                (acc[f.category] = acc[f.category] || []).push(f);
                                return acc;
                              }, {});
                              return Object.entries(grouped).map(([cat, facts]) => (
                                <div key={cat} className="px-3 py-2.5">
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 capitalize">{cat.replace(/_/g, ' ')}</p>
                                  <div className="space-y-1.5">
                                    {facts.map(fact => (
                                      <div key={fact.id} className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <span className="text-sm text-[#5A6B7A] font-medium">{fact.key.replace(/_/g, ' ')}: </span>
                                          <span className="text-sm text-[#132F43] dark:text-slate-100">{fact.value}</span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            await deleteFact(fact.id);
                                            setMemoryFacts(prev => prev.filter(f => f.id !== fact.id));
                                          }}
                                          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                          aria-label="Delete memory"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 py-2">
                            {memoryLoading ? 'Loading memories…' : 'Tap Load to view saved memories'}
                          </p>
                        )}
                        {memoryFacts.length > 0 && (
                          <button
                            onClick={async () => {
                              if (!userId || !window.confirm('Delete all memories? This cannot be undone.')) return;
                              const { clearMemory } = await import('../lib/ai-memory-engine');
                              await clearMemory(userId);
                              setMemoryFacts([]);
                            }}
                            className="mt-2 w-full text-sm text-red-400 hover:text-red-500 py-1.5 text-center font-medium"
                          >
                            Delete all memories
                          </button>
                        )}
                      </div>

                      {/* ── Actions ── */}
                      <div className="px-4 mt-5 mb-6 space-y-2">
                        <button
                          onClick={() => { startNewChat(); setShowSettings(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#E8E4DF] text-sm text-[#3A4A57] hover:bg-[#F6FBFB] transition-colors text-left"
                        >
                          <RotateCcw className="w-4 h-4 text-slate-400" />
                          Start new conversation
                        </button>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Messages ── */}
              <div className="absolute inset-0 overflow-y-auto px-4 pt-2 pb-2 space-y-4">
                {/* AI disclaimer — shown once per session at top of chat */}
                {messages.length === 0 && !isProactiveLoading && (
                  <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed">
                    <span className="font-semibold">Educational guidance only.</span> Aminy AI provides ABA-informed support tools — not medical advice, diagnosis, or clinical therapy. For emergencies call 911 · For crisis support call 988.
                  </div>
                )}

                {isProactiveLoading && messages.length === 0 && (
                  <div className="flex flex-col gap-2 pt-4">
                    <div className="h-4 w-3/4 bg-[#EDF4F7] rounded-full animate-pulse" />
                    <div className="h-4 w-full bg-[#EDF4F7] rounded-full animate-pulse" />
                    <div className="h-4 w-2/3 bg-[#EDF4F7] rounded-full animate-pulse" />
                  </div>
                )}

                {(() => {
                  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant' && !m.isUpgradePrompt)?.id;
                  const lastUserId = [...messages].reverse().find(m => m.role === 'user')?.id;
                  return messages.map((msg) => (
                  <div key={msg.id}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'user' ? 'items-end gap-1.5' : ''}`}>
                      {/* Edit-and-resend — pencil on the LAST user message only */}
                      {msg.role === 'user' && msg.id === lastUserId && !isLoading && !isStreaming && (
                        <button
                          onClick={() => startEditLastUser(msg)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-[#2A7D99] hover:bg-[#EDF4F7] transition-colors shrink-0 mb-1"
                          aria-label="Edit and resend message"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {msg.role === 'assistant' && (
                        <div
                          className="w-6 h-6 rounded-full shrink-0 mr-2 mt-1 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)' }}
                        >
                          ✦
                        </div>
                      )}
                      <div
                        className={`max-w-[78%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                          msg.role === 'user'
                            ? 'bg-slate-900 text-white rounded-br-md'
                            : 'bg-[#F6FBFB] dark:bg-slate-800 text-[#132F43] dark:text-slate-100 rounded-bl-md border border-[#E8E4DF] dark:border-slate-700'
                        }`}
                      >
                        {/* Attached image(s) — imageUrls is the multi-attachment path,
                            imageUrl kept for legacy sessions */}
                        {msg.imageUrls && msg.imageUrls.length > 1 ? (
                          <div className="flex flex-wrap gap-1 p-1">
                            {msg.imageUrls.map((url, ii) => (
                              <img
                                key={ii}
                                src={url}
                                alt={`Attached ${ii + 1} of ${msg.imageUrls!.length}`}
                                // Explicit dimensions defeat index.css's attr-less
                                // img CLS min-height (100px) — CSS below still wins.
                                width={160}
                                height={110}
                                className="rounded-lg object-cover"
                                style={{ width: 'calc(50% - 2px)', height: '110px' }}
                              />
                            ))}
                          </div>
                        ) : (msg.imageUrls?.[0] || msg.imageUrl) && (
                          <img
                            src={msg.imageUrls?.[0] || msg.imageUrl}
                            alt="Attached"
                            className="w-full max-h-48 object-cover"
                          />
                        )}
                        <div className="px-4 py-3">
                          {msg.role === 'assistant' ? (
                            <>
                              {parseAIResponseParts(msg.content).map((part, pi) => {
                                if (part.type === 'chart')    return <AIChart key={pi} spec={part.content} />;
                                if (part.type === 'calendar') return (
                                  <div key={pi} className="my-2">
                                    <AddToCalendarButtons appointment={part.content} variant="inline" label="Add to your calendar" />
                                  </div>
                                );
                                if (part.type === 'navigate') return (
                                  <div key={pi} className="my-1.5">
                                    <button
                                      onClick={() => {
                                        onNavigate?.(part.content.screen, { tab: part.content.tab });
                                        onClose();
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#6B9080]/10 text-[#6B9080] hover:bg-[#6B9080]/20 border border-[#6B9080]/20 transition-colors"
                                    >
                                      {part.content.label || 'Go →'}
                                    </button>
                                  </div>
                                );
                                // Text segment — may still carry NAMED render tokens
                                // ([CHART:weekly_trend] → the user's REAL check-in data,
                                // queried client-side; unknown [TAG:name] tokens are
                                // stripped so they never leak into visible text).
                                return (
                                  <React.Fragment key={pi}>
                                    {splitInlineChartTokens(part.content).map((seg, si) =>
                                      seg.type === 'chart' ? (
                                        <InlineTrendChart
                                          key={`${pi}-${si}`}
                                          userId={userId}
                                          kind={seg.chart}
                                          childName={userContext?.childName || propChildName}
                                        />
                                      ) : (
                                        <div key={`${pi}-${si}`} className="leading-snug">{renderRichMarkdown(seg.content)}</div>
                                      )
                                    )}
                                  </React.Fragment>
                                );
                              })}
                              {msg.isUpgradePrompt && (
                                <button
                                  onClick={() => { onUpgrade?.(); onClose(); }}
                                  className="mt-3 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white"
                                  style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)' }}
                                >
                                  Start 7-day free trial →
                                </button>
                              )}
                              {msg.stopped && (
                                <p style={{ marginTop: '6px', fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                                  Stopped generating
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {msg.role === 'assistant' && msg.content && !isLoading && (
                      <div className="ml-8 mt-1 flex items-center gap-1">
                        <button
                          onClick={() => {
                            const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');
                            navigator.clipboard.writeText(stripHtml(msg.content)).then(() => {
                              toast.success('Copied to clipboard', { duration: 1500 });
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Copy message"
                          aria-label="Copy message to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={() => sendFeedback(msg.id, 'up')}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          aria-label="Rate this response as helpful"
                        >
                          <ThumbsUp
                            className="w-3.5 h-3.5"
                            style={messageRatings[msg.id] === 'up' ? { fill: '#2A7D99', color: '#2A7D99' } : undefined}
                          />
                        </button>
                        <button
                          onClick={() => sendFeedback(msg.id, 'down')}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          aria-label="Rate this response as unhelpful"
                        >
                          <ThumbsDown
                            className="w-3.5 h-3.5"
                            style={messageRatings[msg.id] === 'down' ? { fill: '#E07A5F', color: '#E07A5F' } : undefined}
                          />
                        </button>
                        {/* Regenerate — LAST assistant message only */}
                        {msg.id === lastAssistantId && !isStreaming && (
                          <button
                            onClick={() => regenerateLast()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Regenerate response"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    )}

                    {showFollowUps && msg.role === 'assistant' && msg.chips && msg.chips.length > 0 && !isLoading && (
                      <div className="ml-8 mt-2 space-y-1.5">
                        {msg.chips.map((chip, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(chip)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-600 rounded-xl text-left text-sm text-[#3A4A57] dark:text-slate-200 hover:border-slate-400 hover:bg-[#F6FBFB] dark:hover:bg-slate-700 active:bg-[#EDF4F7] transition-all"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                          >
                            <span className="leading-snug">{chip}</span>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  ));
                })()}

                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)' }}
                    >
                      ✦
                    </div>
                    {showThinkingSteps && activeThinkingSteps.length > 0 ? (
                      <div className="flex-1">
                        <ThinkingStepsDisplay steps={activeThinkingSteps} isExpanded={true} />
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-[#F6FBFB] border border-[#E8E4DF] rounded-2xl rounded-bl-md">
                        <div className="flex gap-1.5 items-center">
                          {[0, 0.15, 0.3].map((delay, i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-slate-400 rounded-full"
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div
              className="shrink-0 px-4 pt-3 pb-4 bg-white dark:bg-slate-900 border-t border-[#E8E4DF] dark:border-slate-700"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
              {/* Image preview strip — up to 4 images, per-item remove */}
              {attachedImages.length > 0 && (
                <div className="mb-2 flex items-center gap-2 px-1 overflow-x-auto scrollbar-hide" style={{ paddingTop: '8px', paddingRight: '8px' }}>
                  {attachedImages.map((img, idx) => (
                    <div key={`${img.name}-${idx}`} className="relative shrink-0">
                      <img
                        src={img.dataUrl}
                        alt={`Attachment preview: ${img.name}`}
                        // Explicit dimensions — index.css gives attr-less imgs a
                        // 100px CLS min-height that would override h-14.
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-xl object-cover border border-[#E8E4DF]"
                      />
                      <button
                        onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute rounded-full bg-slate-800 text-white flex items-center justify-center"
                        // Inline position + size: `-top-1.5`/`-right-1.5` are NOT in
                        // the precompiled CSS, and the mobile 44px tap-target rule
                        // would otherwise balloon this badge over the whole thumb.
                        style={{ top: '-7px', right: '-7px', width: '22px', height: '22px', minWidth: '22px', minHeight: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                        aria-label={`Remove attachment ${img.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {attachedImages.length > 1 && (
                    <p className="text-sm text-[#5A6B7A] shrink-0">{attachedImages.length}/{MAX_ATTACHED_IMAGES}</p>
                  )}
                </div>
              )}

              {/* Pending PDF chip — uploads to the vault when the message sends */}
              {pendingDoc && !docUploading && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl">
                  <FileText className="w-3.5 h-3.5 text-[#6B9080] shrink-0" />
                  <span className="text-sm text-[#3A4A57] dark:text-slate-200 truncate flex-1">{pendingDoc.name}</span>
                  <button
                    onClick={() => setPendingDoc(null)}
                    className="shrink-0 text-[#6B9080]/60 hover:text-[#6B9080]"
                    aria-label="Remove document"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Edit-and-resend chip */}
              {editingMessageId && (
                <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-[#EDF4F7] border border-[#2A7D99]/25 rounded-xl">
                  <Pencil className="w-3.5 h-3.5 text-[#2A7D99] shrink-0" />
                  <span className="text-sm text-[#2A7D99] font-medium flex-1">Editing message — sending replaces the reply</span>
                  <button
                    onClick={cancelEdit}
                    className="shrink-0 text-[#2A7D99]/60 hover:text-[#2A7D99]"
                    aria-label="Cancel editing"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Document upload chip — shows while a PDF is being read into the vault */}
              {docUploading && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl">
                  <Loader2 className="w-3.5 h-3.5 text-[#6B9080] animate-spin shrink-0" />
                  <FileText className="w-3.5 h-3.5 text-[#6B9080] shrink-0" />
                  <span className="text-sm text-[#3A4A57] dark:text-slate-200 truncate flex-1">Reading {docUploading.name}…</span>
                </div>
              )}

              {/* Empty-state suggestion chips — scrollable action starters */}
              {!hasInteracted && messages.length === 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {[
                    {
                      icon: BarChart2,
                      label: 'Behavior patterns',
                      sub: "This week's trends",
                      prompt: `What behavior patterns do you see this week for ${userContext?.childName || propChildName || 'my child'}?`,
                    },
                    {
                      icon: Brain,
                      label: 'ABA strategies',
                      sub: 'Tips for right now',
                      prompt: `What ABA strategy should I use right now with ${userContext?.childName || propChildName || 'my child'}?`,
                    },
                    {
                      icon: TrendingUp,
                      label: 'Progress report',
                      sub: 'How are we doing?',
                      prompt: `Give me a progress update on ${userContext?.childName || propChildName || 'my child'}'s ABA goals.`,
                    },
                    {
                      icon: Calendar,
                      label: 'Book session',
                      sub: 'Schedule ABA therapy',
                      navigate: 'booking' as const,
                    },
                    {
                      icon: FileText,
                      label: 'Log behavior',
                      sub: 'Track what happened',
                      navigate: 'behavior-log' as const,
                    },
                    {
                      icon: BookOpen,
                      label: 'Find resources',
                      sub: 'Articles & guides',
                      navigate: 'resource-library' as const,
                    },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => {
                        HAPTICS.light();
                        if ('navigate' in chip && chip.navigate) {
                          onNavigate?.(chip.navigate);
                          handleClose();
                        } else if ('prompt' in chip && chip.prompt) {
                          setInput(chip.prompt);
                          setHasInteracted(true);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }
                      }}
                      className="flex-shrink-0 flex items-start gap-2.5 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-600 rounded-xl text-left hover:bg-[#F6FBFB] dark:hover:bg-slate-700 hover:border-slate-400 transition-colors"
                      style={{ minWidth: '140px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    >
                      <chip.icon className="w-4 h-4 text-[#6B9080] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100 leading-tight">{chip.label}</p>
                        <p className="text-sm text-[#5A6B7A] leading-tight mt-0.5">{chip.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Screen context chip — shows when screen context is attached */}
              {pendingScreenContext && (
                <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl">
                  <Monitor className="w-3.5 h-3.5 text-[#6B9080]" />
                  <span className="text-sm text-[#6B9080] font-medium flex-1">Screen context attached</span>
                  <button onClick={() => setPendingScreenContext(null)} className="text-[#6B9080]/60 hover:text-[#6B9080]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Action sheet button */}
                <button
                  onClick={() => setShowActionSheet(true)}
                  className="w-10 h-10 rounded-full bg-[#EDF4F7] flex items-center justify-center text-[#5A6B7A] hover:bg-[#E8E4DF] transition-colors shrink-0 mb-0.5"
                  aria-label="More actions"
                >
                  <Plus className="w-5 h-5" />
                </button>
                {/* Photo library — multiple (up to 4 images per message) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {/* Camera capture (rear camera on mobile) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {/* Document (PDF) */}
                <input
                  ref={docInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleDocumentSelect}
                />

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Aminy anything…"
                    className="w-full px-4 py-3 pr-24 bg-[#F6FBFB] dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm text-[#132F43] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                      onClick={toggleRecording}
                      disabled={isTranscribing}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                      style={{
                        background: isRecording ? '#E07A5F' : 'transparent',
                        color: isRecording ? 'white' : '#94a3b8',
                      }}
                      aria-label={isRecording ? 'Stop recording' : 'Voice input'}
                    >
                      {isTranscribing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                      )}
                    </button>
                    {isStreaming ? (
                      /* Stop generation — replaces Send while a reply streams */
                      <button
                        onClick={() => { HAPTICS.light(); stopGeneration(); }}
                        aria-label="Stop generating"
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
                        style={{ background: '#132F43', boxShadow: '0 2px 8px rgba(19,47,67,0.35)' }}
                      >
                        <Square className="w-3 h-3 text-white" style={{ fill: 'white' }} />
                      </button>
                    ) : (
                      <button
                        onClick={() => { HAPTICS.medium(); sendMessage(input); }}
                        disabled={(!input.trim() && attachedImages.length === 0 && !pendingDoc) || isLoading}
                        aria-label="Send message"
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: (input.trim() || attachedImages.length > 0 || pendingDoc)
                            ? 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)'
                            : '#e2e8f0',
                          boxShadow: (input.trim() || attachedImages.length > 0 || pendingDoc) ? '0 2px 8px rgba(42,125,153,0.4)' : 'none'
                        }}
                      >
                        <ArrowUp className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Action Sheet ── */}
          <AnimatePresence>
            {showActionSheet && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9998] bg-black/40"
                  onClick={() => setShowActionSheet(false)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl pb-safe"
                >
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">Add to message</p>
                    <button onClick={() => setShowActionSheet(false)} className="w-7 h-7 rounded-full bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center" aria-label="Close menu">
                      <X className="w-4 h-4 text-[#5A6B7A]" />
                    </button>
                  </div>
                  <div className="px-2 pb-6">
                    {[
                      {
                        icon: Camera,
                        label: 'Take photo',
                        desc: 'Snap a photo with your camera',
                        action: () => { cameraInputRef.current?.click(); setShowActionSheet(false); },
                      },
                      {
                        icon: ImageIcon,
                        label: 'Photo library',
                        desc: 'Choose an existing image',
                        action: () => { fileInputRef.current?.click(); setShowActionSheet(false); },
                      },
                      {
                        icon: FileText,
                        label: 'Upload document',
                        desc: 'Share a PDF — I\'ll read and save it',
                        action: () => { docInputRef.current?.click(); setShowActionSheet(false); },
                      },
                      {
                        icon: Folder,
                        label: 'Attach from Vault',
                        desc: 'Reference a document already in your records',
                        action: () => { setShowActionSheet(false); openVaultPicker(); },
                      },
                      {
                        icon: Monitor,
                        label: 'Screen context',
                        desc: 'Attach current screen state to your message',
                        action: () => {
                          setPendingScreenContext(buildScreenStateBlock());
                          setShowActionSheet(false);
                        },
                      },
                      {
                        icon: FileText,
                        label: 'Log behavior',
                        desc: 'Track a behavior that just happened',
                        action: () => { onNavigate?.('behavior-log'); setShowActionSheet(false); },
                      },
                      {
                        icon: Calendar,
                        label: 'Book appointment',
                        desc: 'Schedule an ABA therapy session',
                        action: () => { onNavigate?.('booking'); setShowActionSheet(false); },
                      },
                      {
                        icon: Pill,
                        label: 'Medications',
                        desc: 'View or update medication list',
                        action: () => { onNavigate?.('medications'); setShowActionSheet(false); },
                      },
                      {
                        icon: Bell,
                        label: 'Create check-in',
                        desc: 'Schedule a recurring AI check-in',
                        action: () => { onNavigate?.('notifications'); setShowActionSheet(false); },
                      },
                      {
                        icon: BarChart2,
                        label: 'Impact analysis',
                        desc: 'What is affecting behavior patterns',
                        action: () => {
                          const childName = userContext?.childName || propChildName || 'my child';
                          setInput(`What is impacting ${childName}'s behavior patterns this week?`);
                          setShowActionSheet(false);
                          setTimeout(() => inputRef.current?.focus(), 100);
                        },
                      },
                      {
                        icon: TrendingUp,
                        label: 'Predictive modeling',
                        desc: 'Forecast ABA progress over 4 weeks',
                        action: () => {
                          const childName2 = userContext?.childName || propChildName || 'my child';
                          setInput(`Based on current ABA progress, what outcomes can we expect for ${childName2} over the next 4 weeks?`);
                          setShowActionSheet(false);
                          setTimeout(() => inputRef.current?.focus(), 100);
                        },
                      },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#6B9080]/10 flex items-center justify-center shrink-0">
                          <item.icon className="w-4 h-4 text-[#6B9080]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#132F43] dark:text-slate-100 leading-tight">{item.label}</p>
                          <p className="text-sm text-[#5A6B7A] leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Vault Picker Sheet ── */}
          <AnimatePresence>
            {showVaultPicker && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9998] bg-black/40"
                  onClick={() => setShowVaultPicker(false)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl pb-safe"
                  style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
                >
                  <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
                    <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">Attach from Vault</p>
                    <button
                      onClick={() => setShowVaultPicker(false)}
                      className="w-7 h-7 rounded-full bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center"
                      aria-label="Close vault picker"
                    >
                      <X className="w-4 h-4 text-[#5A6B7A]" />
                    </button>
                  </div>
                  <div className="px-2 pb-6 overflow-y-auto">
                    {vaultLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#5A6B7A]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#6B9080]" />
                        Loading your vault…
                      </div>
                    ) : vaultDocs.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 px-6 text-center">
                        <Folder className="w-6 h-6 text-slate-300" aria-hidden="true" />
                        <p className="text-sm text-[#5A6B7A] dark:text-slate-300">No documents in your vault yet.</p>
                        <p className="text-sm text-slate-400">Upload a PDF here in chat, or add records in your Records Vault.</p>
                      </div>
                    ) : (
                      vaultDocs.map(doc => (
                        <button
                          key={doc.id}
                          onClick={() => attachVaultDoc(doc)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F6FBFB] dark:hover:bg-slate-800 transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#6B9080]/10 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-[#6B9080]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#132F43] dark:text-slate-100 leading-tight truncate">
                              {doc.metadata?.title || doc.fileName}
                            </p>
                            <p className="text-sm text-[#5A6B7A] leading-tight mt-0.5 capitalize">
                              {doc.recordType.replace(/-/g, ' ')} · {new Date(doc.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
