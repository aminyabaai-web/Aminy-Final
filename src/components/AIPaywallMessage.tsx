// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { tierPricing } from '../lib/tier-utils';
import { 
  Sparkles, 
  MessageCircle,
  Video,
  TrendingUp,
  Check,
  ArrowRight
} from 'lucide-react';

interface AIPaywallMessageProps {
  childName: string;
  trigger: 'full_jr_request' | 'advanced_feature' | 'frequent_use' | 'quality_question' | 'video_request';
  onViewPlans: () => void;
  onDismiss?: () => void;
}

/**
 * AI-triggered paywall message that appears contextually in conversations
 * Aminy uses this to naturally guide parents to upgrade when they're getting value
 */
export function AIPaywallMessage({ 
  childName, 
  trigger,
  onViewPlans,
  onDismiss
}: AIPaywallMessageProps) {
  
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
