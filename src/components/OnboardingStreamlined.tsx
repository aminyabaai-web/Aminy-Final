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
  Mic,
  MicOff,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';
import { sendMessageToClaude, type ClaudeMessage, type ConversationContext } from '../lib/ai-engine/claude-client';
import { useVoiceInput } from '../hooks/useVoiceInput';

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

// Build a special onboarding system prompt - SALES FOCUSED
function buildOnboardingSystemPrompt(childName: string, childAge: number, parentName: string): string {
  return `You are Aminy — meeting ${parentName} for the first time. They're sharing about their ${childAge}-year-old, ${childName}.

YOUR #1 GOAL: Get them excited to subscribe to Aminy. You are the world's best salesperson who also happens to be a brilliant child development expert.

RESPONSE FORMAT (CRITICAL - FOLLOW EXACTLY):
- MAX 3-4 sentences total. Be punchy. No rambling.
- First: Show you GET IT in one powerful sentence that proves expertise
- Second: Drop ONE compelling insight that makes them think "wow, this AI knows its stuff"
- Third: Tease that Aminy has specific tools/features that can help with this exact issue
- End with a short follow-up question

WHAT TO TEASE (pick 1-2 relevant ones):
- "Inside Aminy, I can create a personalized behavior plan for ${childName}..."
- "Aminy has a routine builder that's perfect for this..."
- "I can set up tracking to spot patterns in ${childName}'s behavior..."
- "Aminy's visual schedule creator was made for situations like this..."
- "I have specific ABA strategies I can walk you through step-by-step inside..."

TONE: Confident, warm, brief. Like a friend who's also a genius and knows exactly how to help.

NEVER:
- Write more than 4-5 sentences
- Give away all the strategies (save that for subscribers!)
- Suggest phone calls or in-person meetings
- Be generic or rambling`;
}

// Build follow-up prompt for continuing conversation - CLOSE THE SALE
function buildFollowUpSystemPrompt(childName: string, childAge: number, parentName: string): string {
  return `You are Aminy, continuing with ${parentName} about ${childName}. This is your 2nd or 3rd message.

YOUR MISSION: Close the sale. Make them click "I'm ready" to subscribe.

RESPONSE FORMAT (MAX 3-4 SENTENCES):
1. Quick acknowledgment of what they said (half a sentence)
2. One more expert insight that builds anticipation
3. SELL AMINY HARD - mention specific features that will solve their problem:
   - Behavior tracking dashboard to spot triggers
   - Personalized daily routines built for ${childName}
   - Step-by-step ABA strategies customized to their situation
   - Progress tracking so they can see ${childName} improving
   - 24/7 access to expert guidance whenever they need it
   - Visual schedules, social stories, reward systems
4. Create urgency: "Ready to get started? Click 'I'm ready' and let's build ${childName}'s plan together."

TONE: Excited, confident, like you can't wait to help them. Make Aminy sound like the answer to their prayers.

THE CLOSE (use one of these):
- "I'm ready to build a complete plan for ${childName}. Just click 'I'm ready' below and we'll get started."
- "Everything you need is inside. Hit 'I'm ready' and let's do this together."
- "Let's turn this around for ${childName}. Click 'I'm ready' to unlock your personalized dashboard."

NEVER: Ramble, be generic, mention phone/video calls, or write more than 4 sentences.`;
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

  // Voice dictation
  const {
    isListening,
    isSupported: isVoiceSupported,
    toggleListening,
    resetTranscript,
  } = useVoiceInput({
    continuous: true,
    interimResults: true,
    onResult: (transcript, isFinal) => {
      if (isFinal && transcript.trim()) {
        setInputValue(prev => prev ? prev + ' ' + transcript.trim() : transcript.trim());
      }
    },
  });

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

  // Check if user is already authenticated and has existing data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);

          // Check for existing profile and child data
          const [profileResult, childResult] = await Promise.all([
            supabase.from('profiles').select('name, has_completed_onboarding, onboarding_data').eq('id', user.id).single(),
            supabase.from('children').select('name, age_years').eq('parent_id', user.id).eq('is_primary', true).single()
          ]);

          const profile = profileResult.data;
          const child = childResult.data;

          // If user has completed onboarding before, load their data
          if (profile?.has_completed_onboarding && child) {
            updateData({
              email: user.email || '',
              parentName: profile.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
              childName: child.name || '',
              childAge: child.age_years || 0,
              initialConcern: profile.onboarding_data?.initialConcern || '',
            });
            // Skip to step 3 since they already have child info
            setStep(3);
          } else {
            updateData({
              email: user.email || '',
              parentName: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
            });
            setStep(2);
          }
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
        maxTokens: 250, // Keep responses SHORT and punchy
        temperature: 0.8,
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
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // No user session - this shouldn't happen but handle gracefully
        console.error('No user session found');
        onComplete(data);
        return;
      }

      // Update profile - use correct column names matching profiles table schema
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        parent_name: data.parentName,
        child_name: data.childName,
        has_completed_onboarding: true,
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Check if child already exists, if so update, otherwise insert
      const { data: existingChild } = await supabase
        .from('children')
        .select('id')
        .eq('parent_id', user.id)
        .eq('is_primary', true)
        .single();

      if (existingChild) {
        // Update existing child
        await supabase.from('children').update({
          name: data.childName,
          age_years: data.childAge,
        }).eq('id', existingChild.id);
      } else {
        // Create new child record
        await supabase.from('children').insert({
          parent_id: user.id,
          name: data.childName,
          age_years: data.childAge,
          is_primary: true,
        });
      }

      onComplete(data);
    } catch (e: any) {
      console.error('handleComplete error:', e);
      // Still try to proceed even if DB operations failed
      onComplete(data);
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
                className="flex flex-col"
                style={{ height: 'calc(100dvh - 120px)', minHeight: '400px' }}
              >
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 -mx-4 px-4">
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

                {/* Input area - fixed at bottom, premium design */}
                <div className="pt-3 sticky bottom-0 -mx-4 px-4 bg-gradient-to-t from-white via-white to-transparent" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
                  <div className="flex gap-2 items-end">
                    {/* Mic button */}
                    {isVoiceSupported && (
                      <button
                        onClick={() => {
                          resetTranscript();
                          toggleListening();
                        }}
                        className={`h-12 w-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                          isListening
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-500 hover:text-teal-600 hover:bg-teal-50'
                        }`}
                        title={isListening ? 'Stop recording' : 'Voice input'}
                      >
                        {isListening ? (
                          <MicOff className="w-5 h-5" />
                        ) : (
                          <Mic className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    <div className="flex-1">
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
                          isListening
                            ? "Listening..."
                            : data.conversationHistory.length === 0
                            ? "Share what's on your mind..."
                            : "Type your reply..."
                        }
                        className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none resize-none transition-all min-h-[48px] max-h-[120px] text-[16px] leading-relaxed placeholder:text-gray-400 scrollbar-hide"
                        style={{
                          lineHeight: '1.5',
                        }}
                        rows={1}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isSendingMessage}
                      className="h-12 w-12 rounded-full bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0 shadow-md hover:shadow-lg"
                    >
                      {isSendingMessage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>

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
                        className="w-full py-4 rounded-xl font-semibold text-lg bg-teal-500 hover:bg-teal-600 text-white transition-all shadow-sm"
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
