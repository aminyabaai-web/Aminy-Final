// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { logPHIView } from '../lib/security/hipaa-audit';
import { X, Mic, ArrowUp, ChevronRight, Menu, Plus, ImageIcon, Trash2, MessageSquare, Settings, ChevronDown, Brain, Sparkles, RotateCcw, Check, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  fetchUserContext,
  buildAIContextString,
  getCurrentContext,
  storeMemory,
  type UserContext,
  type CurrentContext
} from '../ai/contextLayer';
import { generateConversationSummary } from '../lib/ai-engine/conversation-memory';
import { buildScreenStateBlock } from '../ai/screenStateRegistry';
import { HAPTICS } from '../lib/mobile-experience-enhancer';
import { getStateAIContext } from '../lib/state-configs';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  loadAISettings,
  getPersonalitySystemPrompt,
  AI_PERSONALITIES,
  type AIPersonality
} from '../lib/ai-personality';
import { AIChart, parseAIResponseParts } from './AIChart';
import { AddToCalendarButtons } from './AddToCalendarButtons';
import { supabase } from '../utils/supabase/client';
import { updateUserContext } from '../ai/contextLayer';

import { renderRichMarkdown } from '../lib/chat-markdown';

// ─── Smart Action execution ──────────────────────────────────────────────────

type SmartAction =
  | { type: 'LOG_BEHAVIOR'; payload: { behavior_type: string; trigger?: string; intensity?: number; notes?: string; is_positive?: boolean } }
  | { type: 'SET_CALM_CUE'; payload: { cue: string } }
  | { type: 'ADD_WIN'; payload: { win: string } }
  | { type: 'ADD_STRUGGLE'; payload: { struggle: string } }
  | { type: 'ADD_APPOINTMENT'; payload: { title: string; provider?: string; service_type?: string; start_iso: string; duration_minutes?: number; location?: string; notes?: string } };

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
      });
      if (error) throw error;
      return `✓ Behavior logged: ${action.payload.behavior_type}`;
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
}

interface ChatSession {
  id: string;
  timestamp: string; // ISO string — safe to stringify
  preview: string;
  messages: Message[];
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
}

export function BevelChatOverlay({
  isOpen,
  onClose,
  userId,
  currentPath,
  childName: propChildName,
  initialPrompt
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
  const [attachedImage, setAttachedImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [customInstructions, setCustomInstructions] = useState<CustomInstructions>(loadCustomInstructions);
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasGeneratedProactive = useRef(false);

  // Save session on close — auto-summarize if >= 4 messages for memory persistence
  const handleClose = useCallback(() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length > 0) {
      const preview = userMsgs[0].content.slice(0, 90);
      persistChatSession({ id: sessionId, timestamp: new Date().toISOString(), preview, messages });
      setChatSessions(loadChatSessions());
    }
    if (messages.length >= 4) {
      generateConversationSummary(messages).then(() => {
        toast.success('Memory updated', { duration: 1500, position: 'bottom-center' });
      }).catch(() => {});
    }
    onClose();
  }, [messages, sessionId, onClose]);

  useEffect(() => {
    if (!isOpen) {
      hasGeneratedProactive.current = false;
    } else {
      setMessages([]);
      setAttachedImage(null);
      setShowHistory(false);
      setShowSettings(false);
      setCustomInstructions(loadCustomInstructions());
      setInstructionsDirty(false);
      setChatSessions(loadChatSessions());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && userId) {
      loadContextAndOpenChat();
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
8. Never say "consult a professional" — YOU are the expert
9. Never say "I'm just an AI" — you are Aminy
10. If you notice a pattern, name it

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
${stateBlock}${customBlock}${liveScreenContext}`;
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
    setMessages([userMsg]);
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(ctxUser, ctxCurrent);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            userMessage: text,
            conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
            systemPrompt
          })
        }
      );
      if (!response.ok) throw new Error('AI connection hiccup');
      const data = await response.json();
      const rawText = data.message || data.response || '';
      const { cleanText: aiText, actions } = parseSmartActions(rawText);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        chips: getFollowUpChips(ctxUser, currentPath, propChildName)
      };
      setMessages(prev => [...prev, aiMsg]);

      for (const action of actions) {
        try {
          const confirmation = await executeSmartAction(action, userId);
          if (confirmation) {
            setMessages(prev => [...prev, { id: Date.now().toString() + '-action', role: 'assistant', content: confirmation, timestamp: new Date() }]);
          }
        } catch { toast.error('Could not save — try again?'); }
      }

      if (aiText.length > 50) {
        storeMemory(userId, { timestamp: new Date(), category: 'insight', content: aiText, context: { userQuery: text, module: ctxCurrent?.module } }).catch(() => {});
      }
    } catch {
      toast.error('Connection hiccup — try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async (text: string, imageData?: { name: string; dataUrl: string }) => {
    if (!text.trim() || isLoading) return;

    const img = imageData || attachedImage;
    setAttachedImage(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      imageUrl: img?.dataUrl
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(userContext, currentContext, personality);

      // If an image is attached, build Anthropic-format content blocks so Claude
      // actually sees the image (vision). Otherwise just send the text.
      let messagePayload: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
      if (img) {
        const m = img.dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
        if (m) {
          messagePayload = [
            { type: 'text', text: text || 'Please look at this image and tell me what you see.' },
            { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          ];
        } else {
          messagePayload = text;
        }
      } else {
        messagePayload = text;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            userMessage: messagePayload,
            conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
            systemPrompt
          })
        }
      );
      if (!response.ok) throw new Error('AI connection hiccup');
      const data = await response.json();
      const rawText = data.message || data.response || '';
      const { cleanText: aiText, actions } = parseSmartActions(rawText);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        chips: getFollowUpChips(userContext, currentPath, propChildName)
      };
      setMessages(prev => [...prev, aiMsg]);

      for (const action of actions) {
        try {
          const confirmation = await executeSmartAction(action, userId);
          if (confirmation) {
            setMessages(prev => [...prev, { id: Date.now().toString() + '-action', role: 'assistant', content: confirmation, timestamp: new Date() }]);
          }
        } catch { toast.error('Could not save — try again?'); }
      }

      if (aiText.length > 50) {
        storeMemory(userId, { timestamp: new Date(), category: 'insight', content: aiText, context: { userQuery: text, module: currentContext?.module } }).catch(() => {});
      }
    } catch {
      toast.error('Connection hiccup — try again?');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, userContext, currentContext, currentPath, userId, personality, attachedImage]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachedImage({ name: file.name, dataUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const loadHistorySession = (session: ChatSession) => {
    setMessages(session.messages);
    setShowHistory(false);
    hasGeneratedProactive.current = true;
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChatSession(id);
    setChatSessions(prev => prev.filter(s => s.id !== id));
  };

  const startNewChat = () => {
    setMessages([]);
    setShowHistory(false);
    hasGeneratedProactive.current = false;
    loadContextAndOpenChat();
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
            className="fixed inset-0 z-[101] flex flex-col bg-white overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 px-3 py-2.5 flex items-center gap-2 border-b border-[#E8E4DF]">
              {/* Hamburger — opens history */}
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6B7A] hover:bg-[#F0EDE8] transition-colors shrink-0"
                aria-label="Chat history"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Avatar + title */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)', boxShadow: '0 2px 8px rgba(67,170,139,0.35)' }}
                >
                  ✦
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1B2733] leading-tight truncate">Aminy AI</p>
                  <p className="text-xs text-[#5A6B7A] leading-tight flex items-center gap-1 truncate">
                    <span className="shrink-0">{AI_PERSONALITIES[personality].emoji}</span>
                    <span className="truncate">{isProactiveLoading ? 'Thinking…' : (currentContext?.moduleName || AI_PERSONALITIES[personality].name)}</span>
                  </p>
                </div>
              </div>

              {/* Settings */}
              <button
                onClick={() => { setShowSettings(v => !v); setShowHistory(false); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6B7A] hover:bg-[#F0EDE8] transition-colors shrink-0"
                aria-label="Chat settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center hover:bg-[#E8E4DF] transition-colors shrink-0"
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
                    className="absolute inset-0 z-10 bg-white flex flex-col"
                  >
                    {/* Drawer header */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#E8E4DF] shrink-0">
                      <p className="text-sm font-semibold text-[#1B2733]">Chat History</p>
                      <button
                        onClick={startNewChat}
                        className="flex items-center gap-1.5 text-xs text-[#6B9080] font-medium px-3 py-1.5 bg-[#6B9080]/10 rounded-full hover:bg-[#6B9080]/10 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Chat
                      </button>
                    </div>

                    {/* Sessions list */}
                    <div className="flex-1 overflow-y-auto">
                      {chatSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm text-[#5A6B7A]">No previous chats yet.</p>
                          <p className="text-xs text-slate-400">Your conversations will appear here after you close the chat.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {chatSessions.map(session => (
                            <button
                              key={session.id}
                              onClick={() => loadHistorySession(session)}
                              className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-[#FAF7F2] transition-colors text-left"
                            >
                              <div
                                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                                style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
                              >
                                ✦
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#1B2733] leading-snug line-clamp-2">{session.preview}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{formatSessionTime(session.timestamp)}</p>
                              </div>
                              <button
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 mt-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </button>
                          ))}
                        </div>
                      )}
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
                    className="absolute inset-0 z-10 bg-white flex flex-col"
                  >
                    {/* Panel header */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#E8E4DF] shrink-0">
                      <p className="text-sm font-semibold text-[#1B2733]">Aminy Settings</p>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#F0EDE8] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto">

                      {/* ── Profile card ── */}
                      <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #43AA8B12 0%, #57759012 100%)', border: '1px solid #43AA8B25' }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                            style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
                          >
                            {(userContext?.childName || propChildName || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1B2733] leading-tight">
                              {userContext?.childName || propChildName || 'Your child'}
                            </p>
                            {userContext?.childAge && (
                              <p className="text-xs text-[#5A6B7A]">{userContext.childAge}</p>
                            )}
                            {userContext?.diagnosis && (
                              <p className="text-xs text-[#6B9080] font-medium mt-0.5">{userContext.diagnosis}</p>
                            )}
                          </div>
                          <div className="ml-auto shrink-0 text-right">
                            <div
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: 'linear-gradient(135deg, #43AA8B22 0%, #57759022 100%)', color: '#43AA8B' }}
                            >
                              ✦ AI Active
                            </div>
                          </div>
                        </div>
                        {(userContext?.progressThisWeek?.sessionsCompleted ?? 0) > 0 && (
                          <div className="flex gap-3 mt-3 pt-3 border-t border-[#6B9080]/20">
                            <div className="text-center flex-1">
                              <p className="text-lg font-bold text-[#1B2733]">{userContext?.progressThisWeek?.sessionsCompleted}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Sessions</p>
                            </div>
                            <div className="text-center flex-1">
                              <p className="text-lg font-bold text-[#1B2733]">{userContext?.progressThisWeek?.calmMoments}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Calm moments</p>
                            </div>
                            <div className="text-center flex-1">
                              <p className="text-lg font-bold text-[#1B2733]">{userContext?.progressThisWeek?.newStrategies}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Strategies</p>
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
                                try { localStorage.setItem('aminy-ai-personality', p.id); } catch {}
                              }}
                              className="flex items-start gap-2 p-3 rounded-xl border transition-all text-left"
                              style={personality === p.id ? {
                                background: 'linear-gradient(135deg, #43AA8B15 0%, #57759015 100%)',
                                borderColor: '#43AA8B',
                              } : {
                                background: 'white',
                                borderColor: '#e2e8f0',
                              }}
                            >
                              <span className="text-lg shrink-0 mt-0.5">{p.emoji}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-[#1B2733]">{p.name}</p>
                                  {personality === p.id && <Check className="w-3 h-3 text-[#6B9080] shrink-0" />}
                                </div>
                                <p className="text-[10px] text-[#5A6B7A] leading-tight mt-0.5 line-clamp-2">{p.tagline}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Custom Instructions ── */}
                      <div className="px-4 mt-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Custom Instructions</p>
                          {instructionsDirty && (
                            <button
                              onClick={() => {
                                saveCustomInstructions(customInstructions);
                                setInstructionsDirty(false);
                                toast.success('Instructions saved');
                              }}
                              className="text-xs text-[#6B9080] font-semibold px-2.5 py-1 bg-[#6B9080]/10 rounded-full hover:bg-[#6B9080]/10 transition-colors"
                            >
                              Save
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-[#5A6B7A] mb-1.5 block">What Aminy should know about you and your family</label>
                            <textarea
                              value={customInstructions.aboutMe}
                              onChange={e => {
                                setCustomInstructions(prev => ({ ...prev, aboutMe: e.target.value }));
                                setInstructionsDirty(true);
                              }}
                              onBlur={() => {
                                if (instructionsDirty) {
                                  saveCustomInstructions(customInstructions);
                                  setInstructionsDirty(false);
                                  toast.success('Instructions saved');
                                }
                              }}
                              placeholder="e.g. My son Liam is 7, has ASD level 2, and struggles most with transitions and unexpected changes. He loves dinosaurs and is highly motivated by screen time..."
                              className="w-full text-sm text-[#1B2733] placeholder-slate-400 border border-[#E8E4DF] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#6B9080]/30 focus:border-[#6B9080]"
                              rows={4}
                            />
                          </div>

                          <div>
                            <label className="text-xs text-[#5A6B7A] mb-1.5 block">How Aminy should communicate with you</label>
                            <textarea
                              value={customInstructions.responseStyle}
                              onChange={e => {
                                setCustomInstructions(prev => ({ ...prev, responseStyle: e.target.value }));
                                setInstructionsDirty(true);
                              }}
                              onBlur={() => {
                                if (instructionsDirty) {
                                  saveCustomInstructions(customInstructions);
                                  setInstructionsDirty(false);
                                  toast.success('Instructions saved');
                                }
                              }}
                              placeholder="e.g. Keep responses brief and direct — I'm usually reading this in the middle of a meltdown. Give me 1 thing to try, not a list..."
                              className="w-full text-sm text-[#1B2733] placeholder-slate-400 border border-[#E8E4DF] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#6B9080]/30 focus:border-[#6B9080]"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── What Aminy knows ── */}
                      {userContext && (
                        <div className="px-4 mt-5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Brain className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">What Aminy Knows</p>
                          </div>
                          <div className="rounded-xl border border-[#E8E4DF] divide-y divide-slate-100 overflow-hidden">
                            {userContext.strugglingWith && userContext.strugglingWith.length > 0 && (
                              <div className="px-3 py-2.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Working on</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {userContext.strugglingWith.map((s, i) => (
                                    <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {userContext.celebratingWins && userContext.celebratingWins.length > 0 && (
                              <div className="px-3 py-2.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Wins</p>
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
                                <p className="text-xs text-[#5A6B7A]">Last calm cue: <span className="font-medium text-[#1B2733]">{userContext.lastCalmCue}</span></p>
                              </div>
                            )}
                            {userContext.bestTimeOfDay && (
                              <div className="px-3 py-2.5">
                                <p className="text-xs text-[#5A6B7A]">Best time of day: <span className="font-medium text-[#1B2733] capitalize">{userContext.bestTimeOfDay}</span></p>
                              </div>
                            )}
                            {!userContext.strugglingWith?.length && !userContext.celebratingWins?.length && !userContext.lastCalmCue && !userContext.bestTimeOfDay && (
                              <div className="px-3 py-3 text-center">
                                <p className="text-xs text-slate-400">Chat with Aminy to build your family's memory</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Actions ── */}
                      <div className="px-4 mt-5 mb-6 space-y-2">
                        <button
                          onClick={() => { startNewChat(); setShowSettings(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#E8E4DF] text-sm text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors text-left"
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
                {isProactiveLoading && messages.length === 0 && (
                  <div className="flex flex-col gap-2 pt-4">
                    <div className="h-4 w-3/4 bg-[#F0EDE8] rounded-full animate-pulse" />
                    <div className="h-4 w-full bg-[#F0EDE8] rounded-full animate-pulse" />
                    <div className="h-4 w-2/3 bg-[#F0EDE8] rounded-full animate-pulse" />
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div
                          className="w-6 h-6 rounded-full shrink-0 mr-2 mt-1 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
                        >
                          ✦
                        </div>
                      )}
                      <div
                        className={`max-w-[78%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                          msg.role === 'user'
                            ? 'bg-slate-900 text-white rounded-br-md'
                            : 'bg-[#FAF7F2] text-[#1B2733] rounded-bl-md border border-[#E8E4DF]'
                        }`}
                      >
                        {/* Attached image */}
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Attached"
                            className="w-full max-h-48 object-cover"
                          />
                        )}
                        <div className="px-4 py-3">
                          {msg.role === 'assistant' ? (
                            parseAIResponseParts(msg.content).map((part, pi) => {
                              if (part.type === 'chart')    return <AIChart key={pi} spec={part.content} />;
                              if (part.type === 'calendar') return (
                                <div key={pi} className="my-2">
                                  <AddToCalendarButtons appointment={part.content} variant="inline" label="Add to your calendar" />
                                </div>
                              );
                              return <div key={pi} className="leading-snug">{renderRichMarkdown(part.content)}</div>;
                            })
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {msg.role === 'assistant' && msg.chips && msg.chips.length > 0 && !isLoading && (
                      <div className="ml-8 mt-2 space-y-1.5">
                        {msg.chips.map((chip, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(chip)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-600 rounded-xl text-left text-sm text-[#3A4A57] dark:text-slate-200 hover:border-slate-400 hover:bg-[#FAF7F2] dark:hover:bg-slate-700 active:bg-[#F0EDE8] transition-all"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                          >
                            <span className="leading-snug">{chip}</span>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
                    >
                      ✦
                    </div>
                    <div className="px-4 py-3 bg-[#FAF7F2] border border-[#E8E4DF] rounded-2xl rounded-bl-md">
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
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div
              className="shrink-0 px-4 pt-3 pb-4 bg-white border-t border-[#E8E4DF]"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
              {/* Image preview strip */}
              {attachedImage && (
                <div className="mb-2 flex items-center gap-2 px-1">
                  <div className="relative">
                    <img
                      src={attachedImage.dataUrl}
                      alt="Attachment preview"
                      className="w-14 h-14 rounded-xl object-cover border border-[#E8E4DF]"
                    />
                    <button
                      onClick={() => setAttachedImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-[#5A6B7A] truncate">{attachedImage.name}</p>
                </div>
              )}

              {/* Smart action chips — show only when conversation is empty, collapsed after first message */}
              {messages.length === 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {[
                    { emoji: '📊', label: 'Log behavior', starter: 'Log behavior: ' },
                    { emoji: '🎯', label: 'Log a win', starter: 'Log a win: ' },
                    { emoji: '📅', label: 'Add appointment', starter: 'Add appointment: ' },
                    { emoji: '😌', label: 'Set calm cue', starter: 'Set calm cue: ' },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => {
                        HAPTICS.light();
                        setInput(chip.starter);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#F0EDE8] hover:bg-[#E8E4DF] text-[#3A4A57] rounded-full text-xs font-medium transition-colors"
                    >
                      <span>{chip.emoji}</span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Attachment button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center text-[#5A6B7A] hover:bg-[#E8E4DF] transition-colors shrink-0 mb-0.5"
                  aria-label="Attach image"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Aminy anything…"
                    className="w-full px-4 py-3 pr-24 bg-[#FAF7F2] border border-[#E8E4DF] rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm placeholder:text-slate-400"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                      onClick={toggleRecording}
                      disabled={isTranscribing}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
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
                    <button
                      onClick={() => { HAPTICS.medium(); sendMessage(input); }}
                      disabled={(!input.trim() && !attachedImage) || isLoading}
                      aria-label="Send message"
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: (input.trim() || attachedImage)
                          ? 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)'
                          : '#e2e8f0',
                        boxShadow: (input.trim() || attachedImage) ? '0 2px 8px rgba(67,170,139,0.4)' : 'none'
                      }}
                    >
                      <ArrowUp className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
