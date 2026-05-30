// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Sparkles,
  Target,
  Heart,
  Check,
  Shield,
  ArrowRight
} from 'lucide-react';
// Prices SOURCE OF TRUTH: src/lib/tier-utils.ts (tierPricing). Never hardcode
// per-tier prices here — they drift (this file previously showed $19/$69/$229).
import { tierPricing } from '../lib/tier-utils';

interface InlinePaywallPromoProps {
  childName: string;
  reason?: string; // Why Aminy is suggesting upgrade (e.g., "to unlock full Jr suite")
  highlightTier?: 'starter' | 'core' | 'pro';
  onViewPlans: () => void;
  compact?: boolean;
}

export function InlinePaywallPromo({ 
  childName, 
  reason, 
  highlightTier = 'core',
  onViewPlans,
  compact = false 
}: InlinePaywallPromoProps) {
  
  // Prices derived from tier-utils (single source of truth). 'starter' is a
  // legacy alias that maps to Core, so it carries Core's price.
  const tiers = {
    starter: {
      name: 'Starter',
      price: tierPricing.starter.monthly,
      icon: Heart,
      color: 'gray',
      benefits: ['3 daily activities', 'Basic tracking', '1 Jr calming exercise']
    },
    core: {
      name: 'Core',
      price: tierPricing.core.monthly,
      icon: Target,
      color: 'teal',
      benefits: ['Unlimited AI chat', 'Full Jr suite', 'Adaptive plans']
    },
    pro: {
      name: 'Pro Plus',
      price: tierPricing.proplus.monthly,
      icon: Sparkles,
      color: 'gray',
      benefits: ['Live video AI', 'Monthly BCBA consult', 'Priority support']
    }
  };

  const highlighted = tiers[highlightTier];
  const IconComponent = highlighted.icon;

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-300 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-full flex-shrink-0">
            <Sparkles className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-900 mb-1">
              {reason || `Ready to unlock more for ${childName}?`}
            </p>
            <p className="text-xs text-teal-700">
              Plans start at just ${tierPricing.core.monthly}/mo • No credit card required
            </p>
          </div>
          <Button 
            onClick={onViewPlans}
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0"
          >
            View Plans
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-white via-teal-50/30 to-white border-teal-200 shadow-md">
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className={`p-2 bg-${highlighted.color === 'teal' ? 'teal' : 'gray'}-100 rounded-full`}>
            <IconComponent className={`w-6 h-6 text-${highlighted.color === 'teal' ? 'teal' : 'gray'}-600`} />
          </div>
          <Badge className={`bg-${highlighted.color === 'teal' ? 'teal' : 'gray'}-100 text-${highlighted.color === 'teal' ? 'teal' : 'gray'}-700 border-${highlighted.color === 'teal' ? 'teal' : 'gray'}-200 font-semibold`}>
            Recommended for you
          </Badge>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">
          {reason || `Unlock everything I can do for ${childName}`}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          I've already shown you what I know about {childName}. Here's how I can help even more:
        </p>
      </div>

      {/* Quick Tier Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {Object.entries(tiers).map(([key, tier]) => {
          const TierIcon = tier.icon;
          const isHighlighted = key === highlightTier;
          
          return (
            <div 
              key={key}
              className={`p-3 rounded-xl border-2 transition-all ${
                isHighlighted 
                  ? 'border-teal-400 bg-teal-50 shadow-md' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`p-2 ${isHighlighted ? 'bg-teal-100' : 'bg-gray-100'} rounded-full mb-2`}>
                  <TierIcon className={`w-4 h-4 ${isHighlighted ? 'text-teal-600' : 'text-gray-600'}`} />
                </div>
                <div className="font-semibold text-xs text-primary mb-0.5">{tier.name}</div>
                <div className="font-bold text-sm text-primary">${tier.price}<span className="text-xs text-muted-foreground">/mo</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Highlighted Tier Benefits */}
      <div className="bg-white/70 rounded-xl p-4 mb-5 border border-teal-200">
        <div className="font-semibold text-sm text-primary mb-3 text-center">
          With {highlighted.name}, you get:
        </div>
        <div className="space-y-2">
          {highlighted.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="p-0.5 bg-green-100 rounded-full flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* No Risk Messaging */}
      <div className="flex items-center justify-center gap-2 mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-green-700">
          No credit card required • Cancel anytime
        </span>
      </div>

      {/* CTA */}
      <Button 
        onClick={onViewPlans}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-md"
        size="lg"
      >
        View All Plans & Start Free Trial
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <p className="text-xs text-center text-muted-foreground mt-3">
        Plans start at ${tierPricing.core.monthly}/mo • Try any tier free for 7 days
      </p>
    </Card>
  );
}
