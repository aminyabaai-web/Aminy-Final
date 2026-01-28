/**
 * Conversational Onboarding
 *
 * A genuinely conversational experience that feels like talking to
 * the best developmental pediatrician/BCBA/therapist/friend.
 *
 * Flow:
 * 1. Account creation (skipped if authenticated)
 * 2. Child basics + FREE TEXT for what's hardest
 * 3. Real AI conversation - empathetic, insightful, asks follow-ups
 * 4. Value delivered - show we understand, then paywall
 *
 * Post-paywall: Action Items system collects data organically through chat
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
  Heart,
  Shield,
  Check,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';
import { sendMessageToClaude, type ClaudeMessage, type ConversationContext } from '../lib/ai-engine/claude-client';

// Types
interface OnboardingData {
  email: string;
  password: string;
  parentName: string;
  childName: string;
  childAge: number;
  initialConcern: string; // Free text, not button selection
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface OnboardingStreamlinedProps {
  onComplete: (data: OnboardingData) => void;
  initialEmail?: string;
}

// Build a special onboarding system prompt
function buildOnboardingSystemPrompt(childName: string, childAge: number, parentName: string): string {
  return `You are Aminy — meeting a parent for the very first time during onboarding.

YOUR ROLE RIGHT NOW:
You are the world's best developmental pediatrician, BCBA, therapist, and friend — all in one. This parent just shared something vulnerable with you. They're telling you what's hardest about parenting their ${childAge}-year-old, ${childName}.

YOUR GOALS FOR THIS FIRST INTERACTION:
1. MAKE THEM FEEL HEARD — Reflect back what they shared. Show you truly understand.
2. VALIDATE WITHOUT PATRONIZING — Their struggle is real. Don't minimize it.
3. SHOW YOUR EXPERTISE — Give ONE specific, actionable insight that proves you know what you're talking about.
4. BUILD TRUST — Make them feel like they've finally found someone who gets it.
5. ASK A SMART FOLLOW-UP — Show curiosity. Ask something that shows you want to understand deeper.

TONE:
- Warm but not saccharine
- Clinical knowledge worn lightly (you know your stuff but don't lecture)
- Like a brilliant friend who happens to be an expert
- Hopeful without being dismissive of the challenge

FORMAT:
- 2-3 short paragraphs MAX
- End with ONE thoughtful follow-up question
- Use ${childName}'s name naturally

WHAT NOT TO DO:
- Don't give a generic response that could apply to any child
- Don't list 5+ strategies (save that for later)
- Don't be overly formal or clinical
- Don't start with "I understand" — show understanding through specifics instead

The parent's name is ${parentName}. Speak to them directly and warmly.`;
}

// Build follow-up prompt for continuing conversation
function buildFollowUpSystemPrompt(childName: string, childAge: number, parentName: string): string {
  return `You are Aminy, continuing your first conversation with ${parentName} about their ${childAge}-year-old, ${childName}.

You're in onboarding — this is about building trust and showing value. Keep responses focused and warm.

GOALS:
1. Acknowledge what they just shared
2. Build on your previous response
3. Share ONE more insight or strategy
4. Either ask a follow-up OR transition naturally toward offering more structured support

Keep it to 2-3 paragraphs. Be warm, specific, and genuinely helpful.`;
}

export function OnboardingStreamlined({ onComplete, initialEmail = '' }: OnboardingStreamlinedProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showContinueButton, setShowContinueButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [data, setData] = useState<OnboardingData>({
    email: initialEmail,
    password: '',
    parentName: '',
    childName: '',
    childAge: 0,
    initialConcern: '',
    conversationHistory: [],
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          updateData({
            email: user.email || '',
            parentName: user.user_metadata?.full_name || user.user_metadata?.name || '',
          });
          setStep(2);
        }
      } catch (e) {
        console.error('Auth check error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data.conversationHistory]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.email && data.password && data.password.length >= 6 && data.parentName;
      case 2:
        return data.childName && data.childAge > 0;
      case 3:
        return data.conversationHistory.length >= 2; // At least one exchange
      default:
        return false;
    }
  };

  const handleCreateAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.parentName,
          }
        }
      });

      if (authError) throw authError;
      setStep(2);
    } catch (e: any) {
      setError(e.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConversation = () => {
    if (!data.childName || data.childAge <= 0) return;
    setStep(3);
  };

  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isSendingMessage) return;

    const isFirstMessage = data.conversationHistory.length === 0;

    // Add user message to history
    const newHistory = [
      ...data.conversationHistory,
      { role: 'user' as const, content: message }
    ];
    updateData({
      conversationHistory: newHistory,
      initialConcern: isFirstMessage ? message : data.initialConcern
    });
    setInputValue('');
    setIsSendingMessage(true);

    try {
      // Build context and messages for AI
      const context: ConversationContext = {
        childName: data.childName,
        childAge: data.childAge,
        parentName: data.parentName || 'there',
        concerns: [],
        goals: [],
        diagnoses: [],
        communicationLevel: 'developing',
        tier: 'free',
      };

      const systemPrompt = isFirstMessage
        ? buildOnboardingSystemPrompt(data.childName, data.childAge, data.parentName)
        : buildFollowUpSystemPrompt(data.childName, data.childAge, data.parentName);

      const claudeMessages: ClaudeMessage[] = newHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await sendMessageToClaude(claudeMessages, context, {
        systemPrompt,
        maxTokens: 600,
        temperature: 0.7,
      });

      // Add AI response to history
      updateData({
        conversationHistory: [
          ...newHistory,
          { role: 'assistant' as const, content: response }
        ]
      });

      // After 2+ exchanges, show continue button
      if (newHistory.length >= 1) {
        setShowContinueButton(true);
      }
    } catch (e: any) {
      console.error('AI error:', e);
      // Add a fallback response
      updateData({
        conversationHistory: [
          ...newHistory,
          {
            role: 'assistant' as const,
            content: `Thank you for sharing that about ${data.childName}. I can hear how much you care and how challenging this has been. You're clearly doing everything you can for your child.\n\nI'd love to learn more so I can give you the most helpful strategies. Tell me a bit more about what a typical difficult moment looks like?`
          }
        ]
      });
      setShowContinueButton(true);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          name: data.parentName,
          has_completed_onboarding: true,
          onboarding_data: {
            childName: data.childName,
            childAge: data.childAge,
            initialConcern: data.initialConcern,
            conversationSummary: data.conversationHistory.slice(0, 4),
          }
        });

        // Create child record
        await supabase.from('children').insert({
          parent_id: user.id,
          name: data.childName,
          age_years: data.childAge,
          is_primary: true,
        });
      }

      onComplete(data);
    } catch (e: any) {
      setError(e.message);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const minStep = isAuthenticated ? 2 : 1;
    if (step > minStep) {
      if (step === 3) {
        // Going back from conversation clears it
        updateData({ conversationHistory: [], initialConcern: '' });
        setShowContinueButton(false);
      }
      setStep(step - 1);
    }
  };

  // Progress calculation
  const totalSteps = isAuthenticated ? 3 : 4;
  const currentStep = isAuthenticated ? step - 1 : step;
  const progress = (currentStep / totalSteps) * 100;

  // Loading state
  if (isLoading && step === 1 && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <motion.div
          className="h-full bg-teal-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        {(isAuthenticated ? step > 2 : step > 1) ? (
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <span className="text-sm text-gray-500">
          {step === 3 ? 'Getting to know you' : `Step ${currentStep} of ${totalSteps}`}
        </span>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: Account Creation */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to Aminy
                  </h1>
                  <p className="text-gray-600">
                    Your AI partner for calmer days and confident parenting
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your email
                    </label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Create a password
                    </label>
                    <input
                      type="password"
                      value={data.password}
                      onChange={(e) => updateData({ password: e.target.value })}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      What should I call you?
                    </label>
                    <input
                      type="text"
                      value={data.parentName}
                      onChange={(e) => updateData({ parentName: e.target.value })}
                      placeholder="Your first name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* STEP 2: Child Basics */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Tell me about your child
                  </h1>
                  <p className="text-gray-600">
                    Just the basics — we'll have a real conversation next
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Child's first name
                    </label>
                    <input
                      type="text"
                      value={data.childName}
                      onChange={(e) => updateData({ childName: e.target.value })}
                      placeholder="Their first name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      How old are they?
                    </label>
                    <select
                      value={data.childAge || ''}
                      onChange={(e) => updateData({ childAge: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select age</option>
                      {[...Array(17)].map((_, i) => (
                        <option key={i + 2} value={i + 2}>{i + 2} years old</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Card className="p-4 bg-teal-50 border-teal-200">
                  <div className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-teal-800">
                      Next, I'll ask you what's hardest right now. Take your time — I'm here to really listen, not just collect data.
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* STEP 3: Conversational AI */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-[calc(100vh-200px)]"
              >
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                  {/* Initial prompt if no messages yet */}
                  {data.conversationHistory.length === 0 && (
                    <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 mb-2">Hi {data.parentName || 'there'}! 👋</p>
                          <p className="text-gray-700">
                            I'm Aminy — think of me as a friend who happens to be a developmental expert.
                          </p>
                          <p className="text-gray-700 mt-2">
                            Tell me: <strong>what's the hardest part right now</strong> with {data.childName}?
                          </p>
                          <p className="text-sm text-gray-500 mt-2 italic">
                            Don't worry about getting it "right" — just share what's on your mind.
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Conversation messages */}
                  {data.conversationHistory.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mr-2">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-teal-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isSendingMessage && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="border-t border-gray-200 pt-4 bg-white">
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        data.conversationHistory.length === 0
                          ? "Share what's on your mind..."
                          : "Reply to continue our conversation..."
                      }
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all min-h-[48px] max-h-[120px]"
                      rows={1}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isSendingMessage}
                      className="h-12 w-12 rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      {isSendingMessage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>

                  {/* Continue button appears after conversation */}
                  {showContinueButton && data.conversationHistory.length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4"
                    >
                      <Button
                        onClick={handleComplete}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white transition-all"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Getting things ready...
                          </span>
                        ) : (
                          "I'm ready — show me my dashboard"
                        )}
                      </Button>
                      <p className="text-center text-xs text-gray-500 mt-2">
                        We'll continue this conversation inside. There's so much more to explore together.
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer CTA - only for steps 1 and 2 */}
      {step !== 3 && (
        <div className="border-t border-gray-200 bg-white px-4 py-4">
          <div className="max-w-md mx-auto">
            <Button
              onClick={step === 1 ? handleCreateAccount : handleStartConversation}
              disabled={!canProceed() || isLoading}
              className="w-full py-4 rounded-xl font-semibold text-lg bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {step === 1 ? 'Creating account...' : 'Loading...'}
                </span>
              ) : step === 1 ? (
                'Create Account'
              ) : (
                "Let's Talk"
              )}
            </Button>

            {step === 2 && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                <span>Private & secure. I never share what you tell me.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OnboardingStreamlined;
