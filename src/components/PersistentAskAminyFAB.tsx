// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Mic, Brain, Calendar, Shield, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ChatCTA {
  type: 'book' | 'coverage' | 'crisis' | 'outcomes';
  label: string;
  screen: string;
  description: string;
}

interface ChatMsg {
  id: string;
  text: string;
  isUser: boolean;
  cta?: ChatCTA;
}

// Detect user intent from conversation text to surface relevant action CTAs
function detectIntent(userText: string, aiText: string): ChatCTA | null {
  const combined = (userText + ' ' + aiText).toLowerCase();

  // Crisis first — highest priority
  if (/\b(crisis|emergency|hurt|danger|harm|suicid|911|unsafe|meltdown.*severe|hurt.*self)\b/.test(combined)) {
    return { type: 'crisis', label: 'Crisis Resources', screen: 'crisis-resources', description: 'Get immediate support' };
  }

  // Schedule / booking
  if (/\b(schedule|book|appointment|session|telehealth|provider|therapist|bcba|see someone|meet with)\b/.test(combined)) {
    return { type: 'book', label: 'Book a Visit', screen: 'telehealth', description: 'Schedule time with an expert' };
  }

  // Coverage / insurance
  if (/\b(coverage|insurance|benefits|eligible|eligib|copay|deductible|claim|prior auth|authorization|pay for)\b/.test(combined)) {
    return { type: 'coverage', label: 'Check Coverage', screen: 'benefits', description: 'See your ABA benefits' };
  }

  // Progress / goals / outcomes
  if (/\b(goal|progress|data|outcome|report|tracking|how.*doing|improvement|measure)\b/.test(combined)) {
    return { type: 'outcomes', label: 'View Progress', screen: 'outcomes', description: 'See your child\'s outcomes' };
  }

  return null;
}

const CTA_ICONS: Record<string, React.ReactNode> = {
  book: <Calendar className="w-4 h-4" />,
  coverage: <Shield className="w-4 h-4" />,
  outcomes: <TrendingUp className="w-4 h-4" />,
  crisis: <AlertTriangle className="w-4 h-4" />,
};

const CTA_COLORS: Record<string, string> = {
  book: 'bg-[#6B9080]/10 text-[#6B9080] border-[#6B9080]/20 hover:bg-[#6B9080]/10',
  coverage: 'bg-[#EEF4F8] text-blue-700 border-[#C8DDE8] hover:bg-blue-100',
  outcomes: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  crisis: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
};

interface PersistentAskAminyFABProps {
  tier?: string;
  messagesLeft?: number;
  onPaywallTrigger?: () => void;
  position?: 'bottom-right' | 'bottom-left';
  childName?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigate?: (screen: string) => void;
}

// Build the conversation history for the AI endpoint
// Includes vault documents and child memories when available
async function buildApiMessages(messages: ChatMsg[], childName: string, userQuery?: string): Promise<Array<{ role: string; content: string }>> {
  // Fetch relevant vault documents and conversation memories for context
  let vaultContext = '';
  let memoryContext = '';
  try {
    // RAG search vault documents based on the user's latest message
    if (userQuery) {
      const { ragSearch } = await import('../lib/rag-engine');
      // ragSearch returns a pre-formatted string of relevant context
      const userId = localStorage.getItem('user-id') || '';
      if (userId) {
        const ragResult = await ragSearch(userQuery, userId);
        if (ragResult && ragResult.length > 10) {
          vaultContext = '\n\nRELEVANT DOCUMENTS FROM FAMILY VAULT:\n' + ragResult.slice(0, 1500);
        }
      }
    }
  } catch { /* RAG not available — skip silently */ }

  try {
    // Load recent conversation context for continuity
    const { loadRecentConversations } = await import('../lib/ai-engine/conversation-memory');
    const userId = localStorage.getItem('user-id') || '';
    if (userId) {
      const recent = await loadRecentConversations(userId, 3);
      if (recent && recent.length > 0) {
        const summaries = recent
          .filter((c: { summary?: string }) => c.summary)
          .map((c: { summary?: string }) => c.summary!)
          .slice(0, 3);
        if (summaries.length > 0) {
          memoryContext = '\n\nPREVIOUS CONVERSATION CONTEXT:\n' +
            summaries.map((s: string) => `- ${s}`).join('\n');
        }
      }
    }
  } catch { /* Memory not available — skip silently */ }

  const systemMsg = {
    role: 'system',
    content: `You are Aminy, a warm and knowledgeable AI companion for parents of neurodivergent children. You combine the expertise of a BCBA with the warmth of a best friend. Be brief (2-3 paragraphs max), actionable, and always end with encouragement. The child's name is ${childName}. Use their name naturally. Never recommend phone calls or scheduling appointments with yourself — you are an AI companion.

CRITICAL SAFETY RULES:
- You do NOT diagnose any condition (autism, ADHD, anxiety, etc.). You may explain what conditions involve, but never say a child "has" or "likely has" a condition.
- You do NOT replace a licensed clinician. Always recommend consulting their BCBA, pediatrician, or therapist for clinical decisions.
- If a parent describes a safety concern (self-harm, harm to others, abuse, neglect), immediately provide 911 and 988 Suicide & Crisis Lifeline and urge them to contact a professional — do not attempt to manage the crisis yourself.
- You do NOT recommend medication changes or dosage adjustments.
- You do NOT provide therapy. You provide psychoeducation, ABA-informed strategies, and emotional support.
- Be transparent that you are an AI. If asked "are you a real person" or similar, be honest.${vaultContext}${memoryContext}`,
  };

  const history = messages.map((m) => ({
    role: m.isUser ? 'user' : 'assistant',
    content: m.text,
  }));

  // Keep last 10 messages for context window efficiency
  return [systemMsg, ...history.slice(-10)];
}

export function PersistentAskAminyFAB({
  tier = 'core',
  messagesLeft = 10,
  onPaywallTrigger,
  position = 'bottom-right',
  childName = 'your child',
  isOpen: isOpenProp,
  onOpenChange,
  onNavigate,
}: PersistentAskAminyFABProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = isOpenProp ?? localOpen;
  const setIsOpen = (value: boolean) => {
    setLocalOpen(value);
    onOpenChange?.(value);
  };
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const saved = localStorage.getItem('aminy-fab-history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isReplying, setIsReplying] = useState(false);

  // Persist conversation history (keep last 20 messages)
  useEffect(() => {
    if (messages.length > 0) {
      const toSave = messages.slice(-20).map(m => ({ id: m.id, text: m.text, isUser: m.isUser }));
      localStorage.setItem('aminy-fab-history', JSON.stringify(toSave));
    }
  }, [messages]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isReplying]);

  // Cleanup any in-flight request when component unmounts
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isReplying) return;

    if (tier === 'free' && messagesLeft <= 0) {
      onPaywallTrigger?.();
      return;
    }

    const userText = input.trim();
    const userMessage: ChatMsg = {
      id: Date.now().toString(),
      text: userText,
      isUser: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsReplying(true);

    // Abort any prior in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            messages: await buildApiMessages(updatedMessages, childName, userText),
            stream: false,
            context: { childName, tier },
          }),
          signal: controller.signal,
        }
      );

      let aiText = '';

      if (response.ok) {
        const data = await response.json();
        aiText =
          data.message ||
          data.response ||
          data.choices?.[0]?.message?.content ||
          '';
      }

      // Fallback if response empty or failed
      if (!aiText) {
        aiText = `That's a great question about ${childName}. While I'm having a brief connection hiccup, here's what I'd suggest: start with small, consistent steps and celebrate every bit of progress. I'll be back to full speed shortly!`;
      }

      const cta = detectIntent(userText, aiText);
      const aiResponse: ChatMsg = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        isUser: false,
        cta: cta ?? undefined,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // User sent a new message, ignore

      console.error('Ask Aminy AI error:', err);
      const fallback: ChatMsg = {
        id: (Date.now() + 1).toString(),
        text: `I'm having a moment — my connection hiccupped! In the meantime, know that consistency and patience are your superpowers. Try again in a sec?`,
        isUser: false,
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsReplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const positionClasses = position === 'bottom-right'
    ? 'right-4 sm:right-6'
    : 'left-4 sm:left-6';

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-20 sm:bottom-6 ${positionClasses} z-50 h-14 w-14 rounded-full bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-200`}
          aria-label="Aminy"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card
          className={`fixed bottom-20 sm:bottom-6 ${positionClasses} z-50 w-[90vw] sm:w-96 max-h-[70vh] flex flex-col shadow-2xl`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#E8E4DF] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Brain className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold dark:text-white">Aminy</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>I remember {childName}'s journey</span>
                </p>
                {tier === 'free' && (
                  <p className="text-xs text-muted-foreground">
                    {messagesLeft} messages left
                  </p>
                )}
                {tier !== 'free' && (
                  <Badge variant="outline" className="text-xs mt-0.5 bg-accent/10 text-accent border-accent/20">
                    Unlimited
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  How can I help you today?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['Routines', 'Behavior', 'Sleep', 'Speech'].map((topic) => (
                    <Button
                      key={topic}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(`Help me with ${topic.toLowerCase()}`)}
                    >
                      {topic}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.isUser
                      ? 'bg-accent text-white'
                      : 'bg-[#F0EDE8] dark:bg-slate-800 text-[#1B2733] dark:text-white'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
                {message.cta && onNavigate && (
                  <button
                    onClick={() => {
                      onNavigate(message.cta!.screen);
                      setIsOpen(false);
                    }}
                    className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${CTA_COLORS[message.cta.type]}`}
                  >
                    {CTA_ICONS[message.cta.type]}
                    <div className="text-left">
                      <div className="font-semibold">{message.cta.label}</div>
                      <div className="opacity-70">{message.cta.description}</div>
                    </div>
                    <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
                  </button>
                )}
              </div>
            ))}

            {isReplying && (
              <div className="flex justify-start">
                <div className="bg-[#F0EDE8] px-4 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#E8E4DF]">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about routines, behaviors, or activities..."
                  className="resize-none min-h-[44px] max-h-[120px] pr-10"
                  rows={1}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  aria-label="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isReplying}
                className="h-11 w-11 p-0 bg-accent hover:bg-accent/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Expert-quality guidance, always available
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
