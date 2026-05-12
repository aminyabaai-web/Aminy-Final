// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AIOnboarding — Bevel-style conversational onboarding
 *
 * Instead of forms, the parent talks to Aminy AI. The AI asks one
 * question at a time, extracts profile data from responses, and visibly
 * builds the child's profile as the conversation progresses.
 *
 * Flow:
 * 1. "What's your child's name?" → extracts childName
 * 2. "How old is [name]?" → extracts age
 * 3. "What are the biggest challenges right now?" → extracts concerns
 * 4. "Does [name] have a diagnosis?" → extracts diagnoses (optional)
 * 5. "What services is [name] currently receiving?" → extracts services
 * 6. Quick win: "Based on what you've told me, here's my first suggestion..."
 *
 * Total time: 2-3 minutes. Profile is complete. Parent feels heard.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Check, ArrowRight } from 'lucide-react';

interface AIOnboardingProps {
  onComplete: (profile: OnboardingProfile) => void;
  parentName?: string;
}

export interface OnboardingProfile {
  childName: string;
  childAge: number | null;
  concerns: string[];
  diagnoses: string[];
  currentServices: string[];
  insuranceMentioned: string | null;
  firstSuggestion: string;
}

interface Message {
  role: 'ai' | 'parent';
  text: string;
}

interface ProfileField {
  key: keyof OnboardingProfile;
  label: string;
  value: string;
  filled: boolean;
}

const ONBOARDING_QUESTIONS = [
  {
    key: 'childName',
    question: (parentName: string) =>
      `Hi${parentName ? ` ${parentName}` : ''}! I'm Aminy, and I'm here to support your family. What's your child's name?`,
    extract: (text: string) => {
      const cleaned = text.trim().replace(/[.!?,]/g, '');
      const words = cleaned.split(/\s+/);
      if (words.length <= 3) return cleaned;
      const nameMatch = cleaned.match(/(?:name is|called|it's|he's|she's|they're)\s+(\w+)/i);
      if (nameMatch) return nameMatch[1];
      return words[0];
    },
  },
  {
    key: 'childAge',
    question: (childName: string) =>
      `Great name! How old is ${childName}?`,
    extract: (text: string) => {
      const ageMatch = text.match(/(\d+)\s*(?:years?|yrs?|months?|mos?)/i);
      if (ageMatch) return ageMatch[1];
      const numMatch = text.match(/\b(\d{1,2})\b/);
      if (numMatch) return numMatch[1];
      return text.trim();
    },
  },
  {
    key: 'concerns',
    question: (childName: string) =>
      `What are the biggest challenges you and ${childName} are facing right now? Don't hold back — I've heard it all.`,
    extract: (text: string) => text.trim(),
  },
  {
    key: 'diagnoses',
    question: (childName: string) =>
      `Does ${childName} have any diagnoses? It's totally fine if not — many families start here before a formal diagnosis.`,
    extract: (text: string) => text.trim(),
  },
  {
    key: 'services',
    question: (childName: string) =>
      `Is ${childName} currently getting any therapy or services? (ABA, speech, OT, etc.) If not, no worries — that's what we're here for.`,
    extract: (text: string) => text.trim(),
  },
];

export function AIOnboarding({ onComplete, parentName = '' }: AIOnboardingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<Partial<OnboardingProfile>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Send first question on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstQ = ONBOARDING_QUESTIONS[0].question(parentName);
      setMessages([{ role: 'ai', text: firstQ }]);
    }, 800);
    return () => clearTimeout(timer);
  }, [parentName]);

  const getChildName = () => (profile.childName as string) || 'your child';

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping || isComplete) return;

    const userText = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [...prev, { role: 'parent', text: userText }]);

    // Extract data from response
    const step = ONBOARDING_QUESTIONS[currentStep];
    const extracted = step.extract(userText);

    // Update profile
    const updatedProfile = { ...profile };
    if (step.key === 'childName') {
      updatedProfile.childName = extracted;
    } else if (step.key === 'childAge') {
      updatedProfile.childAge = parseInt(extracted) || null;
    } else if (step.key === 'concerns') {
      updatedProfile.concerns = [extracted];
    } else if (step.key === 'diagnoses') {
      const noDiagnosis = /no|none|not yet|don't have|haven't/i.test(userText);
      updatedProfile.diagnoses = noDiagnosis ? [] : [extracted];
      // Check for insurance mentions
      const insuranceMatch = userText.match(/BCBS|Blue Cross|UHC|United|Aetna|Cigna|AHCCCS|Medicaid/i);
      if (insuranceMatch) updatedProfile.insuranceMentioned = insuranceMatch[0];
    } else if (step.key === 'services') {
      const noServices = /no|none|not yet|don't have|haven't started/i.test(userText);
      updatedProfile.currentServices = noServices ? [] : [extracted];
    }

    setProfile(updatedProfile);
    setShowProfile(true);

    // Next question or finish
    const nextStep = currentStep + 1;

    setIsTyping(true);
    setTimeout(() => {
      if (nextStep < ONBOARDING_QUESTIONS.length) {
        const childName = updatedProfile.childName || 'your child';
        const nextQ = ONBOARDING_QUESTIONS[nextStep].question(childName);
        setMessages(prev => [...prev, { role: 'ai', text: nextQ }]);
        setCurrentStep(nextStep);
      } else {
        // Generate first suggestion based on everything we learned
        const suggestion = generateFirstSuggestion(updatedProfile);
        updatedProfile.firstSuggestion = suggestion;

        setMessages(prev => [...prev, {
          role: 'ai',
          text: `I already know enough to help. Here's my first suggestion for tonight:\n\n${suggestion}\n\nYour profile is set up. Let's get started.`,
        }]);
        setIsComplete(true);
        setProfile(updatedProfile);
      }
      setIsTyping(false);
    }, 1200);
  }, [input, isTyping, isComplete, currentStep, profile]);

  const handleFinish = () => {
    onComplete({
      childName: profile.childName || '',
      childAge: profile.childAge || null,
      concerns: profile.concerns || [],
      diagnoses: profile.diagnoses || [],
      currentServices: profile.currentServices || [],
      insuranceMentioned: profile.insuranceMentioned || null,
      firstSuggestion: profile.firstSuggestion || '',
    });
  };

  const profileFields: ProfileField[] = [
    { key: 'childName', label: 'Name', value: (profile.childName as string) || '', filled: !!profile.childName },
    { key: 'childAge', label: 'Age', value: profile.childAge ? `${profile.childAge} years` : '', filled: !!profile.childAge },
    { key: 'concerns', label: 'Challenges', value: (profile.concerns as string[])?.join(', ') || '', filled: (profile.concerns as string[])?.length > 0 },
    { key: 'diagnoses', label: 'Diagnosis', value: (profile.diagnoses as string[])?.length ? (profile.diagnoses as string[]).join(', ') : 'None yet', filled: profile.diagnoses !== undefined },
    { key: 'currentServices', label: 'Services', value: (profile.currentServices as string[])?.length ? (profile.currentServices as string[]).join(', ') : 'None yet', filled: profile.currentServices !== undefined },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#F0EDE8] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#1B2733]">Setting up your profile</h1>
              <p className="text-xs text-[#8E9BAA]">
                Step {Math.min(currentStep + 1, ONBOARDING_QUESTIONS.length)} of {ONBOARDING_QUESTIONS.length}
              </p>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {ONBOARDING_QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-[#6B9080]' : 'bg-[#F0EDE8]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Profile card (slides in after first answer) */}
      <AnimatePresence>
        {showProfile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="border-b border-[#F0EDE8] bg-white/50 overflow-hidden"
          >
            <div className="max-w-lg mx-auto px-4 py-3">
              <p className="text-xs font-semibold text-[#8E9BAA] uppercase tracking-wider mb-2">
                Building {getChildName()}'s profile
              </p>
              <div className="flex flex-wrap gap-2">
                {profileFields.filter(f => f.filled).map(field => (
                  <div
                    key={field.key}
                    className="flex items-center gap-1.5 bg-[#6B9080]/10 text-[#6B9080] px-2.5 py-1 rounded-full text-xs font-medium"
                  >
                    <Check className="w-3 h-3" />
                    <span>{field.label}: {field.value.substring(0, 25)}{field.value.length > 25 ? '...' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'parent' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'parent'
                    ? 'bg-[#6B9080] text-white rounded-br-md'
                    : 'bg-white text-[#1B2733] rounded-bl-md shadow-sm border border-[#F0EDE8]'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-[#F0EDE8]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#8E9BAA] rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-[#8E9BAA] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-[#8E9BAA] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input or finish button */}
      <div className="sticky bottom-0 bg-[#FAF7F2] border-t border-[#F0EDE8] px-4 py-3"
           style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto">
          {isComplete ? (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleFinish}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] text-white py-3.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              Let's go
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your answer..."
                className="flex-1 bg-white border border-[#F0EDE8] rounded-xl px-4 py-3 text-sm text-[#1B2733] placeholder-[#8E9BAA] focus:outline-none focus:ring-2 focus:ring-[#6B9080]/30 focus:border-[#6B9080]"
                disabled={isTyping}
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-11 h-11 rounded-xl bg-[#6B9080] text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateFirstSuggestion(profile: Partial<OnboardingProfile>): string {
  const childName = profile.childName || 'your child';
  const concerns = ((profile.concerns as string[]) || []).join(' ').toLowerCase();

  if (/meltdown|tantrum|outburst|anger|aggression/i.test(concerns)) {
    return `Try a "calm-down kit" tonight: put 3 items ${childName} finds soothing (a soft toy, a fidget, headphones) in a small bag. When things escalate, hand them the bag and say "Here's your calm kit." No other words needed. Kids often self-regulate faster when given tools instead of instructions.`;
  }
  if (/sleep|bedtime|won't go to bed|night/i.test(concerns)) {
    return `Start a "bedtime runway" tonight: 30 minutes before bed, dim the lights, turn off screens, and do the same 3 things in the same order (brush teeth, story, song). ${childName}'s brain needs predictability to wind down. Even one night of consistency helps.`;
  }
  if (/transition|change|switching|moving between/i.test(concerns)) {
    return `Try the "first-then" technique tonight: before any transition, say "First we [current thing], then we [next thing]." Show it visually if you can (two pictures or even just point). Give a 5-minute and 1-minute warning. ${childName}'s brain needs advance notice.`;
  }
  if (/speech|language|talk|communicate|words/i.test(concerns)) {
    return `Tonight at dinner, try "sabotage": put ${childName}'s favorite food in a closed container they can't open alone. Wait. Don't prompt. When they gesture or vocalize, model the word once ("open!") and immediately help. This creates natural motivation to communicate.`;
  }
  if (/school|classroom|teacher|expelled|suspended/i.test(concerns)) {
    return `Write down 2 specific things that happened at school this week. Bring them to your next meeting with the teacher. The more specific you are ("he hit another child at 2pm during transition to recess"), the easier it is to build a plan. Vague concerns get vague responses.`;
  }

  return `Tonight, spend 5 uninterrupted minutes with ${childName} doing whatever THEY choose. No agenda, no teaching, no correcting. Just follow their lead. This builds connection and trust — the foundation everything else is built on.`;
}

export default AIOnboarding;
