// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Calm Coins - Gamification & Rewards System
 * Child-friendly currency earned through activities and milestones
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Gift,
  Sparkles,
  Trophy,
  Target,
  Clock,
  Heart,
  Zap,
  CheckCircle,
  Lock,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { triggerHaptic } from '../lib/haptics';
import confetti from 'canvas-confetti';

interface CalmCoin {
  id: string;
  amount: number;
  reason: string;
  earnedAt: Date;
  category: 'timer' | 'routine' | 'activity' | 'streak' | 'milestone' | 'bonus';
}

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: 'screen_time' | 'activity' | 'treat' | 'privilege' | 'custom';
  redeemed?: boolean;
  redeemedAt?: Date;
}

interface CalmCoinsProps {
  userId?: string;
  childName?: string;
  balance?: number;
  onEarn?: (amount: number, reason: string) => void;
  onRedeem?: (reward: Reward) => void;
}

// Earning opportunities
const EARNING_OPPORTUNITIES = [
  {
    id: 'timer_complete',
    name: 'Complete a timer',
    coins: 1,
    icon: Clock,
    description: 'Wait patiently until the timer ends',
  },
  {
    id: 'routine_done',
    name: 'Finish a routine',
    coins: 2,
    icon: CheckCircle,
    description: 'Complete all steps in a routine',
  },
  {
    id: 'calm_moment',
    name: 'Stay calm',
    coins: 3,
    icon: Heart,
    description: 'Use a calming strategy successfully',
  },
  {
    id: 'new_skill',
    name: 'Try something new',
    coins: 5,
    icon: Sparkles,
    description: 'Practice a new skill or activity',
  },
  {
    id: 'streak_bonus',
    name: '3-day streak',
    coins: 10,
    icon: Zap,
    description: 'Use Aminy 3 days in a row',
  },
];

// Default rewards that families can customize
const DEFAULT_REWARDS: Reward[] = [
  {
    id: 'screen_15',
    name: '15 min screen time',
    description: 'Earn 15 minutes of tablet or TV time',
    cost: 10,
    icon: '📱',
    category: 'screen_time',
  },
  {
    id: 'screen_30',
    name: '30 min screen time',
    description: 'Earn 30 minutes of tablet or TV time',
    cost: 20,
    icon: '📺',
    category: 'screen_time',
  },
  {
    id: 'special_snack',
    name: 'Special snack',
    description: 'Choose a special treat',
    cost: 15,
    icon: '🍪',
    category: 'treat',
  },
  {
    id: 'choose_dinner',
    name: 'Choose dinner',
    description: 'Pick what the family has for dinner',
    cost: 25,
    icon: '🍕',
    category: 'privilege',
  },
  {
    id: 'extra_story',
    name: 'Extra bedtime story',
    description: 'Get an extra story at bedtime',
    cost: 8,
    icon: '📚',
    category: 'activity',
  },
  {
    id: 'park_trip',
    name: 'Trip to the park',
    description: 'Special outing to your favorite park',
    cost: 30,
    icon: '🏞️',
    category: 'activity',
  },
  {
    id: 'sticker',
    name: 'Special sticker',
    description: 'Add a sticker to your chart',
    cost: 5,
    icon: '⭐',
    category: 'treat',
  },
  {
    id: 'stay_up',
    name: 'Stay up 15 min late',
    description: 'Bedtime pushed back 15 minutes',
    cost: 20,
    icon: '🌙',
    category: 'privilege',
  },
];

export function CalmCoins({
  userId,
  childName = 'Your child',
  balance = 0,
  onEarn,
  onRedeem,
}: CalmCoinsProps) {
  const [currentBalance, setCurrentBalance] = useState(balance);
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS);
  const [showEarnAnimation, setShowEarnAnimation] = useState(false);
  const [earnAmount, setEarnAmount] = useState(0);
  const [activeTab, setActiveTab] = useState<'earn' | 'spend'>('earn');
  const [recentEarnings, setRecentEarnings] = useState<CalmCoin[]>([]);

  // Simulate earning coins
  const earnCoins = (amount: number, reason: string) => {
    setEarnAmount(amount);
    setShowEarnAnimation(true);

    triggerHaptic('success');

    // Celebration effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#fbbf24', '#f59e0b', '#d97706'],
    });

    setTimeout(() => {
      setCurrentBalance((prev) => prev + amount);
      setShowEarnAnimation(false);

      // Add to recent earnings
      setRecentEarnings((prev) => [
        {
          id: Date.now().toString(),
          amount,
          reason,
          earnedAt: new Date(),
          category: 'activity',
        },
        ...prev.slice(0, 9),
      ]);

      onEarn?.(amount, reason);
    }, 1500);
  };

  const redeemReward = (reward: Reward) => {
    if (currentBalance < reward.cost) {
      triggerHaptic('error');
      return;
    }

    triggerHaptic('medium');
    setCurrentBalance((prev) => prev - reward.cost);

    // Mark reward as redeemed
    setRewards((prev) =>
      prev.map((r) =>
        r.id === reward.id
          ? { ...r, redeemed: true, redeemedAt: new Date() }
          : r
      )
    );

    onRedeem?.(reward);
  };

  // Progress to next milestone
  const nextMilestone = Math.ceil(currentBalance / 25) * 25;
  const progressToMilestone = ((currentBalance % 25) / 25) * 100;

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Balance Display */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <Star className="w-7 h-7 text-amber-600 fill-amber-400" />
            </div>
            <div>
              <p className="text-sm text-amber-700">Calm Coins</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-amber-900">
                  {currentBalance}
                </span>
                <span className="text-amber-600 text-sm">coins</span>
              </div>
            </div>
          </div>
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>

        {/* Progress to next milestone */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-amber-700">Next milestone</span>
            <span className="font-medium text-amber-900">{nextMilestone} coins</span>
          </div>
          <Progress value={progressToMilestone} className="h-2 bg-amber-200" />
        </div>
      </Card>

      {/* Earn Animation Overlay */}
      <AnimatePresence>
        {showEarnAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="bg-white rounded-3xl p-8 text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="w-20 h-20 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center"
              >
                <Star className="w-10 h-10 text-amber-600 fill-amber-400" />
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#132F43] mb-2">
                +{earnAmount} Calm Coins!
              </h2>
              <p className="text-[#5A6B7A]">Great job! 🎉</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-[#EDF4F7] rounded-lg">
        <button
          onClick={() => setActiveTab('earn')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'earn'
              ? 'bg-white shadow-sm text-[#132F43]'
              : 'text-[#5A6B7A] hover:text-[#132F43]'
          }`}
        >
          Earn Coins
        </button>
        <button
          onClick={() => setActiveTab('spend')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'spend'
              ? 'bg-white shadow-sm text-[#132F43]'
              : 'text-[#5A6B7A] hover:text-[#132F43]'
          }`}
        >
          Spend Coins
        </button>
      </div>

      {/* Earn Tab */}
      {activeTab === 'earn' && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-[#132F43]">Ways to Earn</h3>
          {EARNING_OPPORTUNITIES.map((opportunity) => (
            <Card
              key={opportunity.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => earnCoins(opportunity.coins, opportunity.name)}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 bg-[#6B9080]/10 rounded-xl flex items-center justify-center">
                  <opportunity.icon className="w-6 h-6 text-[#6B9080]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#132F43]">{opportunity.name}</p>
                  <p className="text-sm text-[#5A6B7A]">{opportunity.description}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700">
                  +{opportunity.coins}
                </Badge>
              </div>
            </Card>
          ))}

          {/* Recent Earnings */}
          {recentEarnings.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <h3 className="font-semibold text-[#132F43] mb-3">Recent Earnings</h3>
              <div className="space-y-2">
                {recentEarnings.slice(0, 5).map((earning) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between py-2 border-b border-[#E8E4DF]"
                  >
                    <span className="text-sm text-[#5A6B7A]">{earning.reason}</span>
                    <span className="text-sm font-medium text-amber-600">
                      +{earning.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spend Tab */}
      {activeTab === 'spend' && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-[#132F43]">Rewards Shop</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {rewards.map((reward) => {
              const canAfford = currentBalance >= reward.cost;
              return (
                <Card
                  key={reward.id}
                  className={`p-4 ${
                    canAfford
                      ? 'hover:shadow-md cursor-pointer'
                      : 'opacity-60'
                  }`}
                  onClick={() => canAfford && redeemReward(reward)}
                >
                  <div className="text-center">
                    <span className="text-3xl block mb-2">{reward.icon}</span>
                    <p className="font-medium text-[#132F43] text-sm mb-1">
                      {reward.name}
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="font-medium text-amber-700">
                        {reward.cost}
                      </span>
                    </div>
                    {!canAfford && (
                      <div className="flex items-center justify-center gap-1 mt-2 text-sm text-[#5A6B7A]">
                        <Lock className="w-3 h-3" />
                        Need {reward.cost - currentBalance} more
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Add Custom Reward */}
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Reward
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Calm Coins Badge for display in headers
 */
export function CalmCoinsBadge({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full">
      <Star className="w-4 h-4 text-amber-600 fill-amber-400" />
      <span className="font-medium text-amber-700">{balance}</span>
    </div>
  );
}

export default CalmCoins;
