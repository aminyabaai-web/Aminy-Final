/**
 * UpgradeNudge - Strategic upgrade prompts throughout the app
 *
 * Designed to:
 * - Show value of paid tiers without being annoying
 * - Create natural desire to upgrade
 * - Celebrate what users have while showing what's possible
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Sparkles,
  Lock,
  MessageSquare,
  FileText,
  Video,
  Brain,
  Star,
  ChevronRight,
  X,
  Zap,
  Heart,
  Shield
} from 'lucide-react';
import type { TierType } from '../lib/tier-utils';

interface UpgradeNudgeProps {
  currentTier: TierType;
  triggerType: 'message-limit' | 'vault-limit' | 'feature-locked' | 'memory-preview' | 'soft-prompt';
  messagesUsed?: number;
  messagesLimit?: number;
  documentsUsed?: number;
  documentsLimit?: number;
  lockedFeature?: string;
  onUpgrade: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'modal' | 'banner' | 'card';
}

export function UpgradeNudge({
  currentTier,
  triggerType,
  messagesUsed = 0,
  messagesLimit = 10,
  documentsUsed = 0,
  documentsLimit = 0,
  lockedFeature,
  onUpgrade,
  onDismiss,
  variant = 'card'
}: UpgradeNudgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Message limit warning
  if (triggerType === 'message-limit') {
    const remaining = messagesLimit - messagesUsed;
    const urgency = remaining <= 2 ? 'high' : remaining <= 5 ? 'medium' : 'low';

    return (
      <div className={`
        rounded-lg p-4 border
        ${urgency === 'high' ? 'bg-amber-50 border-amber-200' :
          urgency === 'medium' ? 'bg-blue-50 border-blue-200' :
          'bg-gray-50 border-gray-200'}
      `}>
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg
            ${urgency === 'high' ? 'bg-amber-100' : 'bg-blue-100'}
          `}>
            <MessageSquare className={`w-5 h-5 ${urgency === 'high' ? 'text-amber-600' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <p className={`font-medium ${urgency === 'high' ? 'text-amber-900' : 'text-gray-900'}`}>
              {remaining <= 0
                ? "You've reached your daily message limit"
                : `${remaining} message${remaining !== 1 ? 's' : ''} left today`}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {remaining <= 0
                ? "Upgrade to keep the conversation going - your family's progress matters!"
                : "Upgrade for unlimited conversations with Aminy. We're here whenever you need support."}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Button size="sm" onClick={onUpgrade} className="bg-accent hover:bg-accent/90">
                <Sparkles className="w-4 h-4 mr-1" />
                Unlock Unlimited
              </Button>
              {onDismiss && remaining > 0 && (
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Maybe later
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vault document limit
  if (triggerType === 'vault-limit') {
    return (
      <Card className="p-4 border-purple-200 bg-purple-50/50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {documentsUsed >= documentsLimit
                ? "Document vault is full"
                : `${documentsLimit - documentsUsed} document slots remaining`}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Upgrade to store more documents. Aminy learns from each one to give you better, more personalized guidance.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={onUpgrade} className="bg-purple-600 hover:bg-purple-700">
                <Zap className="w-4 h-4 mr-1" />
                Get More Storage
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Feature locked preview
  if (triggerType === 'feature-locked') {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-10 flex flex-col items-center justify-end p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {lockedFeature || 'Premium Feature'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Available on Core and Pro plans
            </p>
            <Button onClick={onUpgrade} className="bg-accent hover:bg-accent/90">
              <Star className="w-4 h-4 mr-2" />
              Try Free for 7 Days
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Memory preview - show what AI would remember on higher tier
  if (triggerType === 'memory-preview') {
    return (
      <Card className="p-4 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-teal-100">
              <Brain className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-gray-900">AI Memory Preview</p>
                <Badge className="bg-teal-100 text-teal-700 text-xs">Pro Feature</Badge>
              </div>
              <p className="text-sm text-gray-600">
                With Pro, Aminy remembers everything about your family - triggers, strategies that work, progress milestones, and more.
              </p>
              <div className="mt-3 p-3 bg-white/60 rounded-lg border border-teal-100">
                <p className="text-xs text-teal-700 italic">
                  "I remember that Alex responds well to visual schedules and needs extra time for transitions.
                  Last week, the morning routine went smoothly when you used the timer.
                  Should we build on that success?"
                </p>
              </div>
              <Button size="sm" onClick={onUpgrade} className="mt-3 bg-teal-600 hover:bg-teal-700">
                <Heart className="w-4 h-4 mr-1" />
                Get Personalized Memory
              </Button>
            </div>
          </div>
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Soft prompt - gentle reminder of value
  if (triggerType === 'soft-prompt') {
    return (
      <div className="p-4 bg-gradient-to-r from-accent/5 to-purple-500/5 rounded-lg border border-accent/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">You're doing amazing!</span> Upgrade for unlimited support,
              AI memory that never forgets, and direct access to BCBAs.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onUpgrade} className="shrink-0">
            See Plans
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Tier comparison for upgrade decision
 */
interface TierComparisonProps {
  currentTier: TierType;
  onSelectTier: (tier: TierType) => void;
}

export function TierComparisonNudge({ currentTier, onSelectTier }: TierComparisonProps) {
  const tiers = [
    {
      id: 'starter' as TierType,
      name: 'Starter',
      price: '$9.99/mo',
      features: ['50 messages/day', '30-day memory', '5 vault documents', 'Basic AI coaching'],
      highlight: currentTier === 'free'
    },
    {
      id: 'core' as TierType,
      name: 'Core',
      price: '$19.99/mo',
      features: ['200 messages/day', '90-day memory', '25 vault documents', 'Advanced AI coaching', 'Progress reports'],
      highlight: currentTier === 'starter',
      popular: true
    },
    {
      id: 'pro' as TierType,
      name: 'Pro',
      price: '$39.99/mo',
      features: ['Unlimited messages', 'Unlimited memory', 'Unlimited vault', 'BCBA sessions included', 'Priority support'],
      highlight: currentTier === 'core'
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
      {tiers.map((tier) => (
        <Card
          key={tier.id}
          className={`p-4 relative ${tier.popular ? 'border-accent ring-2 ring-accent/20' : ''}`}
        >
          {tier.popular && (
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent">
              Most Popular
            </Badge>
          )}
          <h3 className="font-semibold text-lg text-gray-900">{tier.name}</h3>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{tier.price}</p>
          <ul className="mt-4 space-y-2">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <Sparkles className="w-4 h-4 text-accent" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => onSelectTier(tier.id)}
            className={`w-full mt-4 ${tier.popular ? 'bg-accent hover:bg-accent/90' : ''}`}
            variant={tier.popular ? 'default' : 'outline'}
          >
            {tier.highlight ? 'Upgrade Now' : 'Select Plan'}
          </Button>
        </Card>
      ))}
    </div>
  );
}

/**
 * Progress celebration with upgrade hook
 */
interface ProgressCelebrationProps {
  milestone: string;
  description: string;
  currentTier: TierType;
  onUpgrade?: () => void;
}

export function ProgressCelebration({ milestone, description, currentTier, onUpgrade }: ProgressCelebrationProps) {
  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 text-center">
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-2">{milestone}</h3>
      <p className="text-green-700 mb-4">{description}</p>

      {currentTier === 'free' && onUpgrade && (
        <div className="mt-4 pt-4 border-t border-green-200">
          <p className="text-sm text-green-700 mb-3">
            Track all your wins with detailed progress reports on Core
          </p>
          <Button onClick={onUpgrade} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
            <Star className="w-4 h-4 mr-2" />
            Unlock Progress Reports
          </Button>
        </div>
      )}
    </div>
  );
}

export default UpgradeNudge;
