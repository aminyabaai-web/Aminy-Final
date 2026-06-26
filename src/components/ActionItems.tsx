// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Action Items Component
 *
 * Like OneMedical's action items - prompts for screenings, check-ins, and
 * data collection. But instead of forms, everything happens through
 * conversational AI chat.
 *
 * The AI organically collects clinical info while having a natural conversation.
 * This makes data collection feel helpful rather than like homework.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList,
  Heart,
  Brain,
  Moon,
  Utensils,
  Users,
  Sparkles,
  Check,
  ChevronRight,
  X,
  Send,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';
import { sendMessageToClaude, type ClaudeMessage, type ConversationContext } from '../lib/ai-engine/claude-client';
import { ShareInsightInline } from './ShareInsight';

// Action item types
export interface ActionItem {
  id: string;
  type: 'screening' | 'check-in' | 'profile' | 'goal';
  title: string;
  description: string;
  icon: typeof Heart;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string;
  data?: Record<string, any>;
  systemPrompt: string; // Custom prompt for this action item's conversation
}

// Default action items for new users
const DEFAULT_ACTION_ITEMS: Omit<ActionItem, 'id' | 'completed' | 'completedAt' | 'data'>[] = [
  {
    type: 'check-in',
    title: 'Daily energy check',
    description: "Quick check-in on how you're doing today",
    icon: Heart,
    priority: 'high',
    estimatedMinutes: 2,
    systemPrompt: `You are Aminy doing a brief parent wellbeing check-in.

YOUR GOAL: Understand how the parent is feeling today — emotionally and energy-wise.

APPROACH:
1. Ask how they're doing in a warm, casual way
2. Listen for signs of burnout, stress, or good days
3. Validate whatever they share
4. If they're struggling, offer ONE small self-care suggestion
5. If they're doing well, celebrate it

WHAT TO CAPTURE (organically, don't make it feel like a survey):
- Energy level (1-10 scale can emerge naturally)
- Primary emotion today
- Sleep quality last night
- Any specific stressors

Keep it to 2-3 exchanges max. Be warm and genuine. End by thanking them for checking in.`,
  },
  {
    type: 'screening',
    title: 'Caregiver stress assessment',
    description: 'Understanding your stress levels to better support you',
    icon: Brain,
    priority: 'medium',
    estimatedMinutes: 5,
    systemPrompt: `You are Aminy conducting a conversational caregiver stress assessment.

THIS IS NOT A CLINICAL INSTRUMENT - it's a warm conversation that gathers similar info.

YOUR APPROACH:
1. Explain you want to understand their experience better so you can help more
2. Ask about different areas of their life naturally
3. Listen for indicators of caregiver burden without making them feel judged
4. Validate their experiences throughout

AREAS TO EXPLORE (conversationally, not as a checklist):
- Time for themselves vs caregiving demands
- Support system (family, friends, professionals)
- Sleep and physical health impact
- Emotional wellbeing and coping
- Impact on relationships
- Financial stress from caregiving
- Hope and outlook for the future

AFTER GATHERING INFO:
- Summarize what you heard (reflection)
- Highlight their strengths
- Offer 1-2 specific resources or suggestions
- Explain how this helps you support them better

Keep it warm, not clinical. 4-6 exchanges is fine.`,
  },
  {
    type: 'profile',
    title: 'Sensory preferences',
    description: "Help me understand your child's sensory world",
    icon: Sparkles,
    priority: 'medium',
    estimatedMinutes: 5,
    systemPrompt: `You are Aminy learning about a child's sensory profile through conversation.

YOUR GOAL: Understand what sensory input the child seeks vs avoids, without feeling like a questionnaire.

APPROACH:
1. Frame it as getting to know their child better
2. Ask about everyday situations (not clinical terms)
3. Use their language, not jargon
4. Show genuine curiosity

EXPLORE NATURALLY:
- How they respond to loud noises, bright lights
- Clothing preferences (tags, textures, tight vs loose)
- Food textures they love or hate
- Physical activity preferences (climbing, spinning, stillness)
- Reaction to touch (hugs, messy play, grooming)
- Need for movement vs stillness

WHAT TO CAPTURE:
- Sensory seekers (craves input): what kinds?
- Sensory avoiders (overwhelmed by): what kinds?
- Calming inputs that help when dysregulated
- Triggers that lead to meltdowns

End by summarizing what you learned and how it helps you give better advice.`,
  },
  {
    type: 'profile',
    title: 'Communication style',
    description: "Learn how your child expresses themselves",
    icon: Users,
    priority: 'high',
    estimatedMinutes: 4,
    systemPrompt: `You are Aminy learning about a child's communication abilities.

YOUR GOAL: Understand how this child communicates so you can give appropriate strategies.

APPROACH:
1. Start by asking how the child lets them know what they want
2. Be curious, not evaluative
3. Celebrate whatever communication they have
4. Understand both expressive and receptive abilities

EXPLORE NATURALLY:
- How they ask for things (words, pointing, gestures, pulling you)
- Do they use words? How many? Sentences?
- Do they use any AAC (device, pictures)?
- Do they respond to their name?
- Can they follow directions? How complex?
- How do they show emotions?
- Do they engage in back-and-forth interaction?

CAPTURE:
- Expressive level (nonverbal, emerging words, phrases, sentences)
- Receptive level (understands single words, simple directions, complex)
- Primary communication mode
- Strengths and growth areas

Be encouraging and celebrate what the child CAN do. End with how this helps you.`,
  },
  {
    type: 'check-in',
    title: 'Sleep patterns',
    description: "How has sleep been going lately?",
    icon: Moon,
    priority: 'low',
    estimatedMinutes: 3,
    systemPrompt: `You are Aminy doing a quick sleep check-in for the child.

GOAL: Understand current sleep patterns to give better advice.

EXPLORE:
- Typical bedtime routine (how long, what's involved)
- Time to fall asleep
- Night wakings (frequency, duration, what helps)
- Wake time
- Naps if applicable
- Sleep environment

Keep it brief and conversational. 3-4 exchanges. Offer one helpful tip if appropriate.`,
  },
  {
    type: 'check-in',
    title: 'Eating & nutrition',
    description: "Quick check on mealtimes",
    icon: Utensils,
    priority: 'low',
    estimatedMinutes: 3,
    systemPrompt: `You are Aminy doing a quick check-in about eating and mealtimes.

GOAL: Understand feeding challenges to give better advice.

EXPLORE:
- Current food variety (how many foods accepted)
- Texture preferences or aversions
- Mealtime behaviors (sits at table, uses utensils)
- Stress level at mealtimes
- Any sensory aspects to eating

Keep it brief. 3-4 exchanges. Validate any struggles - feeding challenges are exhausting.`,
  },
];


function dedupeActionItems(items: ActionItem[]): ActionItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.title.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface ActionItemsProps {
  userId: string;
  childId: string;
  childName: string;
  childAge: number;
  parentName: string;
  onItemComplete?: (item: ActionItem) => void;
}

export function ActionItems({
  userId,
  childId,
  childName,
  childAge,
  parentName,
  onItemComplete,
}: ActionItemsProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [activeItem, setActiveItem] = useState<ActionItem | null>(null);
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load action items from storage
  useEffect(() => {
    loadActionItems();
  }, [userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Focus input when opening an item
  useEffect(() => {
    if (activeItem) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeItem]);

  async function loadActionItems() {
    setIsLoading(true);
    try {
      // Try to load from Supabase
      const { data: savedItems } = await supabase
        .from('action_items')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (savedItems && savedItems.length > 0) {
        setItems(dedupeActionItems(savedItems.map(item => ({
          ...item,
          icon: getIconForType(item.type),
        }))));
      } else {
        // Initialize with defaults
        const newItems: ActionItem[] = DEFAULT_ACTION_ITEMS.map((item, i) => ({
          ...item,
          id: crypto.randomUUID(),
          completed: false,
        }));
        setItems(dedupeActionItems(newItems));

        // Save to Supabase
        const { error: insertError } = await supabase.from('action_items').insert(
          newItems.map(item => ({
            id: item.id,
            user_id: userId,
            type: item.type,
            title: item.title,
            description: item.description,
            priority: item.priority,
            estimated_minutes: item.estimatedMinutes,
            completed: false,
            system_prompt: item.systemPrompt,
            metadata: {},
            updated_at: new Date().toISOString(),
          }))
        );

        if (insertError && import.meta.env.DEV) {
          console.warn('Action items running in local fallback mode:', insertError);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Falling back to local action items:', error);
      }
      // Fall back to defaults
      setItems(dedupeActionItems(DEFAULT_ACTION_ITEMS.map((item, i) => ({
        ...item,
        id: crypto.randomUUID(),
        completed: false,
      }))));
    } finally {
      setIsLoading(false);
    }
  }

  function getIconForType(type: string) {
    switch (type) {
      case 'screening': return Brain;
      case 'check-in': return Heart;
      case 'profile': return Sparkles;
      case 'goal': return ClipboardList;
      default: return ClipboardList;
    }
  }

  async function handleStartItem(item: ActionItem) {
    setActiveItem(item);
    setConversation([]);

    // Start with AI greeting
    setIsSending(true);
    try {
      const context: ConversationContext = {
        childName,
        childAge,
        parentName,
        concerns: [],
        goals: [],
        diagnoses: [],
        communicationLevel: 'developing',
        tier: 'starter',
      };

      const startPrompt = `${item.systemPrompt}

You're starting this check-in now. Begin with a warm greeting and your first question. Remember the parent's name is ${parentName} and their child is ${childName} (${childAge} years old).`;

      const response = await sendMessageToClaude(
        [{ role: 'user', content: 'Start the check-in' }],
        context,
        { systemPrompt: startPrompt, maxTokens: 400, temperature: 0.7 }
      );

      setConversation([{ role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error starting item:', error);
      setConversation([{
        role: 'assistant',
        content: `Hi ${parentName}! Let's talk about ${item.title.toLowerCase()}. How's this been going with ${childName} lately?`
      }]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendMessage() {
    const message = inputValue.trim();
    if (!message || isSending || !activeItem) return;

    const newConversation = [...conversation, { role: 'user' as const, content: message }];
    setConversation(newConversation);
    setInputValue('');
    setIsSending(true);

    try {
      const context: ConversationContext = {
        childName,
        childAge,
        parentName,
        concerns: [],
        goals: [],
        diagnoses: [],
        communicationLevel: 'developing',
        tier: 'starter',
      };

      // Check if conversation is nearing end (4+ exchanges)
      const isNearEnd = newConversation.length >= 6;
      const systemPrompt = isNearEnd
        ? `${activeItem.systemPrompt}\n\nThis conversation has had several exchanges. If you have enough information, wrap up naturally with a summary and thank them. Otherwise, ask one more focused question.`
        : activeItem.systemPrompt;

      const claudeMessages: ClaudeMessage[] = newConversation.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendMessageToClaude(claudeMessages, context, {
        systemPrompt,
        maxTokens: 400,
        temperature: 0.7,
      });

      setConversation([...newConversation, { role: 'assistant', content: response }]);

      // Check if AI indicated completion (looks for summary language)
      const completionIndicators = [
        'thank you for sharing',
        'thanks for telling me',
        'this helps me understand',
        'i appreciate you',
        "i've got a good sense",
        'this will help me',
      ];
      const isComplete = completionIndicators.some(phrase =>
        response.toLowerCase().includes(phrase)
      ) && newConversation.length >= 4;

      if (isComplete) {
        // Auto-complete after a delay
        setTimeout(() => handleCompleteItem(), 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setConversation([
        ...newConversation,
        { role: 'assistant', content: 'I had a small hiccup there. Could you tell me more?' }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleCompleteItem() {
    if (!activeItem) return;

    const updatedItem: ActionItem = {
      ...activeItem,
      completed: true,
      completedAt: new Date().toISOString(),
      data: { conversation },
    };

    // Update local state
    setItems(prev => prev.map(item =>
      item.id === activeItem.id ? updatedItem : item
    ));

    // Save to Supabase
    try {
      const { error: updateError } = await supabase
        .from('action_items')
        .update({
          completed: true,
          completed_at: updatedItem.completedAt,
          data: { conversation },
        })
        .eq('id', activeItem.id);

      if (updateError && import.meta.env.DEV) {
        console.warn('Action item completion is local-only for this account:', updateError);
      }

      // Also save the conversation to memory facts
      const { error: memoryFactError } = await supabase.from('memory_facts').insert({
        user_id: userId,
        child_id: childId,
        category: 'profile',
        content: `Completed ${activeItem.title}: ${conversation.map(m => `${m.role}: ${m.content}`).join(' | ')}`,
        source: 'action_item',
        confidence: 0.9,
      });

      if (memoryFactError && import.meta.env.DEV) {
        console.warn('Could not persist action-item memory fact:', memoryFactError);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Error saving action item completion:', error);
      }
    }

    onItemComplete?.(updatedItem);
    setActiveItem(null);
    setConversation([]);
  }

  function handleCloseItem() {
    // Save partial progress
    if (activeItem && conversation.length > 0) {
      supabase
        .from('action_items')
        .update({ data: { partial_conversation: conversation } })
        .eq('id', activeItem.id)
        .then(({ error }) => {
          if (error && import.meta.env.DEV) {
            console.warn('Could not save partial action item progress:', error);
          }
        });
    }
    setActiveItem(null);
    setConversation([]);
  }

  // Incomplete items first, sorted by priority
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const incompleteCount = items.filter(i => !i.completed).length;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-[#5A6B7A]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading action items...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Action Items List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DF] bg-gradient-to-r from-[#FAF7F2] to-cyan-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#6B9080]" />
              <h3 className="font-semibold text-[#132F43]">Action Items</h3>
            </div>
            {incompleteCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-medium">
                {incompleteCount}
              </span>
            )}
          </div>
          <p className="text-sm text-[#5A6B7A] mt-1">
            Quick check-ins help me give you better advice
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedItems.slice(0, 4).map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => !item.completed && handleStartItem(item)}
                disabled={item.completed}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                  item.completed
                    ? 'bg-[#FAF7F2] cursor-default'
                    : 'hover:bg-[#FAF7F2] cursor-pointer'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  item.completed
                    ? 'bg-green-100'
                    : item.priority === 'high'
                    ? 'bg-amber-100'
                    : 'bg-[#F0EDE8]'
                }`}>
                  {item.completed ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Icon className={`w-5 h-5 ${
                      item.priority === 'high' ? 'text-amber-600' : 'text-[#5A6B7A]'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${item.completed ? 'text-[#8A9BA8]' : 'text-[#132F43]'}`}>
                    {item.title}
                  </p>
                  <p className={`text-sm ${item.completed ? 'text-[#8A9BA8]' : 'text-[#5A6B7A]'}`}>
                    {item.completed ? 'Completed' : item.description}
                  </p>
                </div>
                {!item.completed && (
                  <div className="flex items-center gap-1 text-[#8A9BA8]">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{item.estimatedMinutes}m</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {items.length > 4 && (
          <div className="p-3 border-t border-[#E8E4DF] text-center">
            <button className="text-sm text-[#6B9080] hover:text-[#6B9080] font-medium">
              View all {items.length} items
            </button>
          </div>
        )}
      </Card>

      {/* Active Item Modal */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#E8E4DF]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6B9080]/10 flex items-center justify-center">
                    {React.createElement(activeItem.icon, { className: 'w-5 h-5 text-[#6B9080]' })}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#132F43]">{activeItem.title}</h3>
                    <p className="text-sm text-[#5A6B7A]">~{activeItem.estimatedMinutes} min</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseItem}
                  className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#5A6B7A]" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-[#F0EDE8] text-[#132F43]'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {/* Share button for assistant messages */}
                      {msg.role === 'assistant' && (
                        <div className="mt-2 pt-2 border-t border-[#E8E4DF]">
                          <ShareInsightInline
                            insight={msg.content}
                            childName={childName}
                            onShare={(platform) => { if (import.meta.env.DEV) console.log(`Shared via ${platform}`); }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-[#F0EDE8] rounded-2xl px-4 py-2.5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[#E8E4DF]">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your response..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E4DF] focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isSending}
                    className="h-10 w-10 rounded-xl bg-primary hover:bg-primary text-white disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Manual complete button */}
                {conversation.length >= 4 && (
                  <button
                    onClick={handleCompleteItem}
                    className="w-full mt-3 py-2 text-sm text-[#6B9080] hover:text-[#6B9080] font-medium"
                  >
                    Mark as complete
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ActionItems;
