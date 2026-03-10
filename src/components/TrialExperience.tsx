/**
 * Trial Experience Component
 *
 * Tracks the free trial experience and triggers paywall at the right moment.
 * The key insight: Show value BEFORE asking for money.
 *
 * Strategy:
 * - Free users get 5 meaningful AI conversations
 * - Each conversation builds memory (user feels the personalization)
 * - Paywall triggers after they've experienced the magic
 * - Soft nudges along the way, not hard blocks
 */

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  MessageSquare,
  Crown,
  Gift,
  Zap,
  ChevronRight,
  X,
  Heart,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';
import { tierPricing } from '../lib/tier-utils';

// Trial configuration
const TRIAL_CONFIG = {
  freeConversations: 5, // Number of free AI conversations
  softNudgeAt: 3, // Show "loving it?" nudge after this many
  hardLimitAt: 5, // Require subscription after this many
  memoryRetentionDays: 14, // Keep memory for free users this long
};

interface TrialState {
  conversationsUsed: number;
  conversationsRemaining: number;
  isTrialActive: boolean;
  hasSeenNudge: boolean;
  trialStartDate: Date | null;
  lastConversationDate: Date | null;
  insights: Array<{ category: string; count: number }>;
}

interface TrialContextValue {
  trialState: TrialState;
  incrementConversation: () => Promise<void>;
  checkShouldShowPaywall: () => boolean;
  checkShouldShowNudge: () => boolean;
  dismissNudge: () => void;
  refreshTrialState: () => Promise<void>;
}

const TrialContext = createContext<TrialContextValue | null>(null);

export function useTrialExperience() {
  const context = useContext(TrialContext);
  if (!context) {
    throw new Error('useTrialExperience must be used within TrialProvider');
  }
  return context;
}

// Safe version that doesn't throw - for components that may be used outside TrialProvider
export function useTrialExperienceSafe() {
  return useContext(TrialContext);
}

interface TrialProviderProps {
  userId: string;
  userTier: string;
  children: React.ReactNode;
}

export function TrialProvider({ userId, userTier, children }: TrialProviderProps) {
  const [trialState, setTrialState] = useState<TrialState>({
    conversationsUsed: 0,
    conversationsRemaining: TRIAL_CONFIG.freeConversations,
    isTrialActive: true,
    hasSeenNudge: false,
    trialStartDate: null,
    lastConversationDate: null,
    insights: [],
  });

  // Load trial state on mount
  useEffect(() => {
    if (userId && userTier === 'free') {
      loadTrialState();
    } else if (userTier !== 'free') {
      // Paid user - no limits
      setTrialState(prev => ({
        ...prev,
        isTrialActive: false,
        conversationsRemaining: Infinity,
      }));
    }
  }, [userId, userTier]);

  async function loadTrialState() {
    try {
      const { data } = await supabase
        .from('trial_tracking')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setTrialState({
          conversationsUsed: data.conversations_used || 0,
          conversationsRemaining: Math.max(0, TRIAL_CONFIG.freeConversations - (data.conversations_used || 0)),
          isTrialActive: (data.conversations_used || 0) < TRIAL_CONFIG.freeConversations,
          hasSeenNudge: data.has_seen_nudge || false,
          trialStartDate: data.trial_start_date ? new Date(data.trial_start_date) : null,
          lastConversationDate: data.last_conversation_date ? new Date(data.last_conversation_date) : null,
          insights: data.insights || [],
        });
      } else {
        // Initialize trial tracking
        await supabase.from('trial_tracking').insert({
          user_id: userId,
          conversations_used: 0,
          trial_start_date: new Date().toISOString(),
          has_seen_nudge: false,
        });
      }
    } catch (error) {
      console.error('Error loading trial state:', error);
    }
  }

  const incrementConversation = useCallback(async () => {
    const newCount = trialState.conversationsUsed + 1;

    setTrialState(prev => ({
      ...prev,
      conversationsUsed: newCount,
      conversationsRemaining: Math.max(0, TRIAL_CONFIG.freeConversations - newCount),
      isTrialActive: newCount < TRIAL_CONFIG.freeConversations,
      lastConversationDate: new Date(),
    }));

    try {
      await supabase
        .from('trial_tracking')
        .update({
          conversations_used: newCount,
          last_conversation_date: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating trial:', error);
    }
  }, [trialState.conversationsUsed, userId]);

  const checkShouldShowPaywall = useCallback(() => {
    if (userTier !== 'free') return false;
    return trialState.conversationsUsed >= TRIAL_CONFIG.hardLimitAt;
  }, [trialState.conversationsUsed, userTier]);

  const checkShouldShowNudge = useCallback(() => {
    if (userTier !== 'free') return false;
    if (trialState.hasSeenNudge) return false;
    return trialState.conversationsUsed >= TRIAL_CONFIG.softNudgeAt;
  }, [trialState.conversationsUsed, trialState.hasSeenNudge, userTier]);

  const dismissNudge = useCallback(async () => {
    setTrialState(prev => ({ ...prev, hasSeenNudge: true }));

    try {
      await supabase
        .from('trial_tracking')
        .update({ has_seen_nudge: true })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error dismissing nudge:', error);
    }
  }, [userId]);

  const refreshTrialState = useCallback(async () => {
    await loadTrialState();
  }, [userId]);

  return (
    <TrialContext.Provider
      value={{
        trialState,
        incrementConversation,
        checkShouldShowPaywall,
        checkShouldShowNudge,
        dismissNudge,
        refreshTrialState,
      }}
    >
      {children}
    </TrialContext.Provider>
  );
}

/**
 * Trial Progress Banner - Shows in dashboard for free users
 */
interface TrialProgressBannerProps {
  onUpgrade: () => void;
}

export function TrialProgressBanner({ onUpgrade }: TrialProgressBannerProps) {
  const context = useTrialExperienceSafe();

  // If no TrialProvider, use default state (treat as beginning of trial)
  const trialState = context?.trialState ?? {
    conversationsUsed: 0,
    conversationsRemaining: TRIAL_CONFIG.freeConversations,
    isTrialActive: true,
    hasSeenNudge: false,
    trialStartDate: null,
    lastConversationDate: null,
    insights: [],
  };

  if (!trialState.isTrialActive && trialState.conversationsRemaining === Infinity) {
    // Paid user
    return null;
  }

  const progress = (trialState.conversationsUsed / TRIAL_CONFIG.freeConversations) * 100;
  const remaining = trialState.conversationsRemaining;

  return (
    <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Gift className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {remaining > 0 ? (
                <>Free trial: <span className="text-purple-600">{remaining} conversations left</span></>
              ) : (
                <span className="text-purple-600">Trial complete!</span>
              )}
            </p>
            <div className="w-32 h-1.5 bg-purple-200 rounded-full mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={onUpgrade}
          size="sm"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          <Crown className="w-4 h-4 mr-1" />
          Upgrade
        </Button>
      </div>
    </Card>
  );
}

/**
 * Soft Nudge Modal - Shows after 3 meaningful conversations
 */
interface SoftNudgeModalProps {
  childName: string;
  insightsCount: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function SoftNudgeModal({ childName, insightsCount, onUpgrade, onDismiss }: SoftNudgeModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white text-center relative">
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Loving Aminy?</h2>
          <p className="text-teal-100 mt-1">You've had {insightsCount} great conversations!</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">I'm learning about {childName}</p>
                <p className="text-sm text-gray-600">Every conversation helps me give better advice</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Premium unlocks everything</p>
                <p className="text-sm text-gray-600">Unlimited chats, telehealth access, care team</p>
              </div>
            </div>
          </div>

          <Button
            onClick={onUpgrade}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold"
          >
            <Crown className="w-5 h-5 mr-2" />
            Upgrade Now - 7 Days Free
          </Button>

          <button
            onClick={onDismiss}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            I'll keep exploring first
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Hard Paywall Modal - Shows when free trial is exhausted
 */
interface HardPaywallModalProps {
  childName: string;
  onUpgrade: () => void;
}

export function HardPaywallModal({ childName, onUpgrade }: HardPaywallModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-teal-900/95 to-slate-900/95 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 flex items-center justify-center">
          <Crown className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          You've experienced the magic!
        </h1>

        <p className="text-teal-100 text-lg mb-8">
          You've used all {TRIAL_CONFIG.freeConversations} free conversations.
          I've learned so much about {childName} — let's keep going together.
        </p>

        <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
          <p className="text-white/90 font-medium mb-3">Upgrade includes:</p>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Unlimited AI conversations
            </li>
            <li className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Full memory of {childName}'s journey
            </li>
            <li className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Sleep + behavior insights
            </li>
            <li className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Access to BCBA telehealth
            </li>
          </ul>
        </div>

        <Button
          onClick={onUpgrade}
          className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-900"
        >
          Start 7-Day Free Trial
        </Button>

        <p className="text-white/50 text-sm mt-4">
          ${tierPricing.core.monthly}/month after trial · Cancel anytime · HSA/FSA eligible
        </p>
      </motion.div>
    </motion.div>
  );
}

export default TrialProvider;
