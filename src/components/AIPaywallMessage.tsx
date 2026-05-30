// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { tierPricing } from '../lib/tier-utils';
import type { MonetizationMode } from '../lib/monetization-mode';
import {
  Sparkles,
  MessageCircle,
  Video,
  TrendingUp,
  Check,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';

interface AIPaywallMessageProps {
  childName: string;
  trigger: 'full_jr_request' | 'advanced_feature' | 'frequent_use' | 'quality_question' | 'video_request';
  onViewPlans: () => void;
  onDismiss?: () => void;
  /**
   * Payer-type-aware funnel mode. 'cash' (default) keeps the upgrade nudge
   * UNCHANGED. 'insured' softens it: the primary CTA routes to the existing
   * coverage tools with honest "check your coverage" language, and View Plans
   * becomes the secondary option. Defaults to 'cash'.
   */
  monetizationMode?: MonetizationMode;
  /**
   * Routes the insured user to the existing coverage/benefits screen
   * (App.tsx "benefits"). Only used when monetizationMode === 'insured';
   * falls back to onViewPlans if not provided.
   */
  onCheckCoverage?: () => void;
}

/**
 * AI-triggered paywall message that appears contextually in conversations
 * Aminy uses this to naturally guide parents to upgrade when they're getting value
 */
export function AIPaywallMessage({
  childName,
  trigger,
  onViewPlans,
  onDismiss,
  monetizationMode = 'cash',
  onCheckCoverage
}: AIPaywallMessageProps) {

  const isInsured = monetizationMode === 'insured';
  const handleCheckCoverage = onCheckCoverage ?? onViewPlans;

  const messages = {
    full_jr_request: {
      message: `I can see ${childName} would really benefit from the full Aminy Jr suite! Right now you're on the Free plan which includes just 1 calming exercise, but Core gives you access to all our speech and calming activities.`,
      feature: 'Full Aminy Jr suite with unlimited activities',
      tier: `Core ($${tierPricing.core.monthly}/mo)`,
      icon: Sparkles
    },
    advanced_feature: {
      message: `Great question! I have deep insights about ${childName} that I'd love to share, but that level of analysis is available with the Core plan. With unlimited AI chat, I can dive much deeper into personalized strategies.`,
      feature: 'Unlimited AI chat with advanced reasoning',
      tier: `Core ($${tierPricing.core.monthly}/mo)`,
      icon: MessageCircle
    },
    frequent_use: {
      message: `I notice you're finding a lot of value in our conversations! You're currently on Free which has basic AI responses. With Core, you get unlimited chat access and I can provide much more detailed, personalized guidance.`,
      feature: 'Unlimited conversations with deeper insights',
      tier: `Core ($${tierPricing.core.monthly}/mo)`,
      icon: TrendingUp
    },
    quality_question: {
      message: `That's exactly the kind of nuanced question where I can really help! The Core plan lets me give you detailed, personalized strategies that adapt as ${childName} grows. No limits, just continuous support.`,
      feature: 'Advanced AI analysis and adaptive plans',
      tier: `Core ($${tierPricing.core.monthly}/mo)`,
      icon: MessageCircle
    },
    video_request: {
      message: `Live video AI support is available with Family! I can analyze what's happening in real-time and give you immediate guidance. Plus you get monthly BCBA consults to review ${childName}'s progress.`,
      feature: 'Live AI video + monthly BCBA consultation',
      tier: `Family ($${tierPricing.proplus.monthly}/mo)`,
      icon: Video
    }
  };

  const content = messages[trigger];
  const IconComponent = content.icon;

  // Insured families are NOT hard-paywalled. Soften the nudge: lead with the
  // existing coverage tools using honest "may cover / check" language (never a
  // guarantee, never a "book a covered visit" promise), and keep subscribe as
  // a secondary option.
  if (isInsured) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-md">
          {/* AI Avatar/Indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-primary">Aminy</span>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
              Coverage tip
            </Badge>
          </div>

          {/* Coverage-first Card */}
          <Card className="p-4 bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-blue-200 shadow-md">
            <p className="text-sm text-primary leading-relaxed mb-4">
              I'd love to go deeper for {childName}. Before you pay out of pocket —
              your plan may cover therapy and assessments. Coverage varies, so it's
              worth checking your benefits first. I can't guarantee coverage, but I
              can help you find out.
            </p>

            {/* Coverage callout */}
            <div className="bg-white/80 rounded-lg p-3 mb-4 border border-blue-200">
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-blue-100 rounded-full flex-shrink-0 mt-0.5">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-blue-900 mb-1">Check your coverage</div>
                  <div className="text-xs text-blue-800">See what your plan may cover — no guarantees, just clarity.</div>
                </div>
              </div>
            </div>

            {/* CTAs — coverage primary, subscribe secondary */}
            <div className="flex gap-2">
              <Button
                onClick={handleCheckCoverage}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                size="sm"
              >
                Check your coverage
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Not now
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={onViewPlans}
              className="w-full mt-2 text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
            >
              Or subscribe to Aminy instead
            </button>
          </Card>

          {/* Subtle note */}
          <p className="text-xs text-muted-foreground mt-2 ml-10 italic">
            Checking coverage is free — I'll be here either way.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-md">
        {/* AI Avatar/Indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-primary">Aminy</span>
          <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs">
            Upgrade suggestion
          </Badge>
        </div>

        {/* Message Card */}
        <Card className="p-4 bg-gradient-to-br from-teal-50 via-white to-cyan-50 border-teal-200 shadow-md">
          {/* AI Message */}
          <p className="text-sm text-primary leading-relaxed mb-4">
            {content.message}
          </p>

          {/* Feature Highlight */}
          <div className="bg-white/80 rounded-lg p-3 mb-4 border border-teal-200">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-teal-100 rounded-full flex-shrink-0 mt-0.5">
                <IconComponent className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-teal-900 mb-1">{content.tier}</div>
                <div className="text-xs text-teal-800">{content.feature}</div>
              </div>
            </div>
          </div>

          {/* Quick Benefits */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">7-day free trial, no credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">Cancel anytime, no commitment</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-2">
            <Button 
              onClick={onViewPlans}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
              size="sm"
            >
              View Plans
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            {onDismiss && (
              <Button 
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Not now
              </Button>
            )}
          </div>
        </Card>

        {/* Subtle note */}
        <p className="text-xs text-muted-foreground mt-2 ml-10 italic">
          I'll always be here to help, but upgrading lets me give you my best.
        </p>
      </div>
    </div>
  );
}
