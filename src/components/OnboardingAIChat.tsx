// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Onboarding AI Chat Step
 * Creates a WOW moment by having a brief, personalized conversation
 * This is the "magic moment" where parents feel truly understood
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Heart,
  ArrowRight,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { triggerHaptic } from '../lib/haptics';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface OnboardingAIChatProps {
  parentName: string;
  childName: string;
  childAge: number;
  primaryConcern: string;
  onComplete: (insights: OnboardingInsights) => void;
  onSkip: () => void;
}

interface OnboardingInsights {
  parentGoal: string;
  biggestChallenge: string;
  whatWorked: string;
  aiSummary: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Conversation flow - 3 quick questions that feel personal
const CONVERSATION_PROMPTS = [
  (name: string, child: string) =>
    `Hi ${name}! 💙 I'm so glad you're here. Before we set up ${child}'s personalized support, I'd love to learn a little more.\n\nWhat's your biggest hope for ${child} in the next few months? Don't overthink it - just the first thing that comes to mind.`,
  (name: string, child: string) =>
    `That's such a meaningful goal for ${child}. I can tell how much you care.\n\nNow, what's been the hardest part lately? The thing that leaves you feeling exhausted or frustrated?`,
  (name: string, child: string) =>
    `Thank you for sharing that - it takes courage. You're not alone in this.\n\nLast question: Has anything worked, even a little? A strategy, a moment of calm, or a small win you've had with ${child}?`,
];

export function OnboardingAIChat({
  parentName,
  childName,
  childAge,
  primaryConcern,
  onComplete,
  onSkip,
}: OnboardingAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStep, setConversationStep] = useState(0);
  const [insights, setInsights] = useState<Partial<OnboardingInsights>>({});
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Start conversation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      simulateTyping(CONVERSATION_PROMPTS[0](parentName, childName));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after AI responds
  useEffect(() => {
    if (!isTyping && conversationStep < 3) {
      inputRef.current?.focus();
    }
  }, [isTyping, conversationStep]);

  const simulateTyping = async (text: string) => {
    setIsTyping(true);

    // Simulate typing delay (feels more human)
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));

    setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
    setIsTyping(false);
    triggerHaptic('light');
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    triggerHaptic('light');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Store insight based on conversation step
    const insightKeys: (keyof OnboardingInsights)[] = [
      'parentGoal',
      'biggestChallenge',
      'whatWorked',
    ];
    setInsights((prev) => ({
      ...prev,
      [insightKeys[conversationStep]]: userMessage,
    }));

    const nextStep = conversationStep + 1;
    setConversationStep(nextStep);

    if (nextStep < 3) {
      // Continue conversation
      setTimeout(() => {
        simulateTyping(CONVERSATION_PROMPTS[nextStep](parentName, childName));
      }, 300);
    } else {
      // Generate AI summary
      await generateSummary({
        parentGoal: conversationStep === 0 ? userMessage : insights.parentGoal!,
        biggestChallenge: conversationStep === 1 ? userMessage : insights.biggestChallenge!,
        whatWorked: userMessage,
      });
    }
  };

  const generateSummary = async (finalInsights: Omit<OnboardingInsights, 'aiSummary'>) => {
    setIsGeneratingSummary(true);
    setIsTyping(true);

    try {
      // Call AI to generate personalized summary
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `You are Aminy, a warm and supportive AI companion for parents of children with developmental needs. Generate a brief, encouraging summary (2-3 sentences) that:
1. Acknowledges the parent's hope for their child
2. Validates their challenges
3. Affirms what has worked
4. Expresses confidence in their journey together

Be warm, genuine, and avoid clinical language. Use occasional emojis sparingly (💙, ✨, 🌟). Keep it under 100 words.`,
              },
              {
                role: 'user',
                content: `Parent: ${parentName}
Child: ${childName} (age ${childAge})
Primary concern: ${primaryConcern}

Parent's hope: "${finalInsights.parentGoal}"
Biggest challenge: "${finalInsights.biggestChallenge}"
What has worked: "${finalInsights.whatWorked}"

Generate a personalized summary for this parent.`,
              },
            ],
            stream: false,
          }),
        }
      );

      let summary = '';
      if (response.ok) {
        const data = await response.json();
        summary = data.response || data.choices?.[0]?.message?.content || '';
      }

      // Fallback if API fails
      if (!summary) {
        summary = `${parentName}, I hear you. Your love for ${childName} shines through - wanting "${finalInsights.parentGoal}" is such a meaningful goal. The exhaustion you feel around "${finalInsights.biggestChallenge}" is real, and you're not alone. The fact that "${finalInsights.whatWorked}" has helped, even a little, shows you're already doing more right than you know. 💙 Let's build on that together.`;
      }

      // Show the summary
      await new Promise((r) => setTimeout(r, 500));
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: summary },
      ]);

      setInsights((prev) => ({
        ...prev,
        aiSummary: summary,
      }));

      // Final message after summary
      await new Promise((r) => setTimeout(r, 1500));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I've created a personalized plan based on everything you've shared. Ready to see it? ✨`,
        },
      ]);
    } catch (error) {
      console.error('Error generating summary:', error);
      // Use fallback
      const fallbackSummary = `Thank you for sharing, ${parentName}. Based on what you've told me about ${childName}, I'm going to create a plan that focuses on your goals while being mindful of the challenges you're facing. Let's do this together. 💙`;
      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackSummary }]);
      setInsights((prev) => ({ ...prev, aiSummary: fallbackSummary }));
    } finally {
      setIsTyping(false);
      setIsGeneratingSummary(false);
    }
  };

  const handleComplete = () => {
    triggerHaptic('success');
    onComplete(insights as OnboardingInsights);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto px-1 sm:px-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#6B9080]/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#6B9080]" />
            </div>
            <div>
              <p className="font-medium text-sm sm:text-base text-[#1B2733]">Aminy</p>
              <p className="text-sm text-[#5A6B7A]">Getting to know you</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-sm sm:text-sm">
            Skip for now
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-lg mx-auto space-y-3 sm:space-y-3 sm:space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-white border shadow-sm rounded-bl-md'
                }`}
              >
                <p className="text-sm sm:text-base whitespace-pre-line leading-relaxed">{message.content}</p>
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white border shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t bg-white sticky bottom-0 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto">
          {conversationStep < 3 ? (
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                className="resize-none min-h-[44px] max-h-32 text-base"
                rows={1}
                disabled={isTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-primary hover:bg-[#216982] h-11 w-11 sm:h-auto sm:w-auto sm:px-4"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                onClick={handleComplete}
                disabled={isTyping || isGeneratingSummary}
                className="w-full bg-primary hover:bg-[#216982] py-4 sm:py-5 md:py-6 text-sm sm:text-base"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating your plan...
                  </>
                ) : (
                  <>
                    See My Personalized Plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Progress indicator */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${
                  i <= conversationStep ? 'bg-primary' : 'bg-[#E8E4DF]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingAIChat;
