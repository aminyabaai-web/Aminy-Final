// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, ArrowUp, ChevronRight } from 'lucide-react';
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
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chips?: string[];
}

interface BevelChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPath: string;
  childName?: string;
  initialPrompt?: string;
}

// Generate contextual follow-up chips based on screen and child's context
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

  // Dashboard / default
  return [
    `How is ${name} doing with their goals this week?`,
    `What should I focus on with ${name} today?`,
    `What can I do right now to support ${name}?`
  ];
}

// Build the proactive opening prompt
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasGeneratedProactive = useRef(false);

  // Reset state when opened or closed
  useEffect(() => {
    if (!isOpen) {
      hasGeneratedProactive.current = false;
    } else {
      // Fresh start each time the overlay opens
      setMessages([]);
    }
  }, [isOpen]);

  // Load context then fire proactive message
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
    const context = await fetchUserContext(userId);
    setUserContext(context);
    const current = getCurrentContext(currentPath, context);
    setCurrentContext(current);

    if (!hasGeneratedProactive.current) {
      hasGeneratedProactive.current = true;
      if (initialPrompt) {
        // When an initialPrompt is provided, send it directly as the first user message
        // Pass freshly-loaded context so we don't rely on state update timing
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            userMessage: 'Open session',
            conversationHistory: [],
            systemPrompt: proactivePrompt
          })
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
      // Graceful fallback — still show chips even if AI call fails
      const name = context?.childName || propChildName || 'your child';
      const fallback: Message = {
        id: 'proactive-fallback',
        role: 'assistant',
        content: `👋 Ready to help with ${name}'s treatment journey. What's on your mind today?`,
        timestamp: new Date(),
        chips: getFollowUpChips(context, currentPath, propChildName)
      };
      setMessages([fallback]);
    } finally {
      setIsProactiveLoading(false);
    }
  };

  // Internal helper: send a message using freshly-loaded context (bypasses state timing issues)
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
      const contextString = ctxUser ? buildAIContextString(ctxUser) : '';
      const moduleCtx = ctxCurrent
        ? `Currently in: ${ctxCurrent.moduleName}. ${ctxCurrent.contextHint}`
        : '';
      const childName = ctxUser?.childName || propChildName || 'their child';

      const systemPrompt = `You are Aminy — a board-certified behavioral analyst (BCBA) and developmental pediatrician combined into one deeply expert AI guide for families of neurodivergent children. You have 15+ years of clinical experience and you speak warmly, specifically, and practically.

FAMILY CONTEXT:
${contextString || `Supporting a family of a neurodivergent child.`}

CURRENT APP SECTION: ${moduleCtx || 'Dashboard'}

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
1. Always validate the parent's emotional experience before giving strategies
2. Be specific to ${childName}, not generic
3. Translate clinical terms into plain language unless the parent uses them first
4. Give 1 concrete, actionable strategy per response
5. Identify the likely FUNCTION of behavior before recommending a strategy
6. 3-5 sentences for most responses; longer only if explicitly asked
7. End with an insight or a single focused question
8. Never say "consult a professional" — YOU are the expert
9. Never say "I'm just an AI" — you are Aminy
10. If you notice a pattern, name it`;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            userMessage: text,
            conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
            systemPrompt
          })
        }
      );

      if (!response.ok) throw new Error('AI connection hiccup');

      const data = await response.json();
      const aiText = data.message || data.response || '';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        chips: getFollowUpChips(ctxUser, currentPath, propChildName)
      };
      setMessages(prev => [...prev, aiMsg]);

      if (aiText.length > 50) {
        storeMemory(userId, {
          timestamp: new Date(),
          category: 'insight',
          content: aiText,
          context: { userQuery: text, module: ctxCurrent?.module }
        }).catch(() => {});
      }
    } catch {
      toast.error('Connection hiccup — try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const contextString = userContext ? buildAIContextString(userContext) : '';
      const moduleCtx = currentContext
        ? `Currently in: ${currentContext.moduleName}. ${currentContext.contextHint}`
        : '';

      const childName = userContext?.childName || propChildName || 'their child';
      const systemPrompt = `You are Aminy — a board-certified behavioral analyst (BCBA) and developmental pediatrician combined into one deeply expert AI guide for families of neurodivergent children. You have 15+ years of clinical experience and you speak warmly, specifically, and practically.

FAMILY CONTEXT:
${contextString || `Supporting a family of a neurodivergent child.`}

CURRENT APP SECTION: ${moduleCtx || 'Dashboard'}

YOUR CLINICAL KNOWLEDGE BASE:
• Behavioral assessment: VB-MAPP, ABLLS-R, AFLS, Vineland, ADOS-2, ABC behavior chains
• Function of behavior: escape/avoidance, attention-seeking, tangible access, automatic/sensory reinforcement
• Intervention frameworks: DTT (Discrete Trial Training), NET (Natural Environment Teaching), PRT (Pivotal Response Treatment), EIBI, PBIS, PCIT, RUBI
• Prompting: most-to-least, least-to-most, time delay, graduated guidance, prompt fading
• Reinforcement: differential reinforcement (DRO, DRI, DRA, DRL), extinction, schedules of reinforcement, token economies
• Data: frequency/rate, duration, latency, IOA, ABC narrative, interval recording (whole, partial, momentary)
• Regulation strategies: co-regulation, interoception, proprioceptive input, sensory diet, zones of regulation
• School: IEP goal structure, LRE, accommodation vs modification, ESY services, 504 plans
• Crisis: NVCI, proactive vs reactive strategies, safety plans, environmental modification

RESPONSE RULES:
1. Always validate the parent's emotional experience before giving strategies — they're under enormous stress
2. Be specific to ${childName}, not generic platitudes
3. Translate clinical terms into plain language unless the parent uses them first
4. Give 1 concrete, actionable strategy per response — not a list of 10
5. When behavior context is described, identify the likely FUNCTION before recommending a strategy
6. 3-5 sentences for most responses; longer only if parent explicitly asks for detail
7. End responses with an insight or a single focused question that deepens understanding
8. Never say "consult a professional" — YOU are the expert they're consulting
9. Never say "I'm just an AI" — you are Aminy, their trusted behavioral wellness guide
10. If you notice a pattern across what they've shared, name it — parents value insight over information`;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            userMessage: text,
            conversationHistory: messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            systemPrompt
          })
        }
      );

      if (!response.ok) throw new Error('AI connection hiccup');

      const data = await response.json();
      const aiText = data.message || data.response || '';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        chips: getFollowUpChips(userContext, currentPath, propChildName)
      };
      setMessages(prev => [...prev, aiMsg]);

      if (aiText.length > 50) {
        storeMemory(userId, {
          timestamp: new Date(),
          category: 'insight',
          content: aiText,
          context: { userQuery: text, module: currentContext?.module }
        }).catch(() => {});
      }
    } catch {
      toast.error('Connection hiccup — try again?');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, userContext, currentContext, currentPath, userId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
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
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col bg-white rounded-t-3xl"
            style={{
              height: '82vh',
              maxHeight: '82vh',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="shrink-0 px-5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Aminy avatar — salmon/coral gradient matching Bevel's style */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)',
                    boxShadow: '0 2px 8px rgba(67,170,139,0.35)'
                  }}
                >
                  ✦
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-tight">Aminy Intelligence</p>
                  <p className="text-xs text-slate-500 leading-tight">
                    {isProactiveLoading ? 'Thinking…' : (currentContext?.moduleName || 'New chat')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2 space-y-4">
              {/* Proactive loading skeleton */}
              {isProactiveLoading && messages.length === 0 && (
                <div className="flex flex-col gap-2 pt-4">
                  <div className="h-4 w-3/4 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-4 w-full bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded-full animate-pulse" />
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id}>
                  {/* Message bubble */}
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
                      className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-md'
                          : 'bg-slate-50 text-slate-900 rounded-bl-md border border-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>

                  {/* Follow-up chips — only on assistant messages */}
                  {msg.role === 'assistant' && msg.chips && msg.chips.length > 0 && !isLoading && (
                    <div className="ml-8 mt-2 space-y-1.5">
                      {msg.chips.map((chip, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(chip)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-left text-sm text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 transition-all"
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

              {/* AI typing indicator */}
              {isLoading && (
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
                  >
                    ✦
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md">
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

            {/* Input area */}
            <div
              className="shrink-0 px-4 pt-3 pb-4 bg-white border-t border-slate-100"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Aminy anything…"
                    className="w-full px-4 py-3 pr-24 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm placeholder:text-slate-400"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    {/* Mic button */}
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                      <Mic className="w-4 h-4" />
                    </button>
                    {/* Send button */}
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: input.trim()
                          ? 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)'
                          : '#e2e8f0',
                        boxShadow: input.trim() ? '0 2px 8px rgba(67,170,139,0.4)' : 'none'
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
    </AnimatePresence>
  );
}
