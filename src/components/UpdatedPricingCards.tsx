// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Crown, Sparkles, Zap, Star } from 'lucide-react';
import { LiveAIVideoBadge } from './LiveAIVideoBadge';
import { tierPricing, type TierType } from '../lib/tier-utils';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

interface UpdatedPricingCardsProps {
  onSubscribe: (tierId: string) => void;
  currentTier?: string;
}

export function UpdatedPricingCards({ onSubscribe, currentTier }: UpdatedPricingCardsProps) {
  const tiers: PricingTier[] = [
    {
      id: 'core',
      name: 'Core',
      price: tierPricing.core.monthly,
      period: '/mo',
      features: [
        'AI Companion unlimited',
        'Live AI Video (short bursts)',
        'Weekly Outcomes PDF',
        'Aminy Jr (standard)',
        '2 caregivers'
      ],
      cta: 'Start Core'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: tierPricing.pro.monthly,
      period: '/mo',
      popular: true,
      features: [
        'Everything in Core, plus:',
        'Aminy Jr (unlimited)',
        'Provider-ready packet',
        'Provider invites',
        'Live AI Video (up to 10 min)',
        'Priority analysis'
      ],
      cta: 'Start Pro'
    },
    {
      id: 'pro-plus',
      name: 'Pro Plus',
      price: tierPricing.proplus.monthly,
      period: '/mo',
      features: [
        'Everything in Pro, plus:',
        'Monthly human credit',
        '(30m RBT or 15m BCBA)',
        'Use-it-or-lose-it',
        'Live AI Video (up to 20 min)',
        '48-hour coach SLA'
      ],
      cta: 'Start Pro Plus'
    }
  ];

  const jrOnlyTier = {
    id: 'jr-only',
    name: 'Jr-Only',
    price: '14.99-19.99',
    period: '/mo',
    features: [
      'Kid mode only',
      'Age-appropriate games',
      'Learning activities',
      'Progress tracking',
      'Upsell on exports/time caps'
    ],
    cta: 'Get Jr-Only'
  };

  const aLaCarte = {
    rbt: [
      { duration: '15m', price: 14.99 },
      { duration: '30m', price: 24.99 }
    ],
    bcba: [
      { duration: '15m', price: 29.99 },
      { duration: '30m', price: 49.99 }
    ],
    slp: [
      { duration: '15m', price: 34.99 },
      { duration: '30m', price: 59.99 }
    ],
    fourPacks: 'Save 10-15% with 4-packs'
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground">
          Professional support that fits your family
        </p>
      </div>

      {/* Main Subscription Tiers */}
      <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6 mb-12">
        {tiers.map((tier) => (
          <Card
            key={tier.id}
            className={`
              relative p-6 transition-all hover:shadow-xl
              ${tier.popular ? 'border-accent border-2 shadow-lg' : 'border-gray-200'}
            `}
          >
            {tier.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent">
                Most Popular
              </Badge>
            )}

            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>
              
              {/* Live AI Video Badge */}
              <div className="mt-3 flex justify-center">
                <LiveAIVideoBadge tier={tier.id as TierType} variant="minimal" />
              </div>
            </div>

            <ul className="space-y-3 mb-4 sm:mb-6">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  {feature.startsWith('Everything') ? (
                    <Star className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  ) : (
                    <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => onSubscribe(tier.id)}
              className={`w-full ${tier.popular ? 'bg-accent hover:bg-accent/90' : ''}`}
              variant={tier.popular ? 'default' : 'outline'}
            >
              {tier.cta}
            </Button>
          </Card>
        ))}
      </div>

      {/* Jr-Only Tier */}
      <div className="mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Kid-Focused Option</h2>
        <Card className="max-w-md mx-auto p-6 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{jrOnlyTier.name}</h3>
              <p className="text-sm text-muted-foreground">
                ${jrOnlyTier.price}{jrOnlyTier.period}
              </p>
            </div>
          </div>

          <ul className="space-y-2 mb-4 sm:mb-6">
            {jrOnlyTier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => onSubscribe(jrOnlyTier.id)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {jrOnlyTier.cta}
          </Button>
        </Card>
      </div>

      {/* A La Carte Pricing */}
      <div className="mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">A La Carte Sessions</h2>
        <Card className="max-w-4xl mx-auto p-6">
          <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
            {/* RBT */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                RBT
              </h3>
              {aLaCarte.rbt.map((session) => (
                <div key={session.duration} className="flex justify-between items-center mb-2">
                  <span className="text-sm">{session.duration}</span>
                  <span className="font-medium">${session.price}</span>
                </div>
              ))}
            </div>

            {/* BCBA */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                BCBA
              </h3>
              {aLaCarte.bcba.map((session) => (
                <div key={session.duration} className="flex justify-between items-center mb-2">
                  <span className="text-sm">{session.duration}</span>
                  <span className="font-medium">${session.price}</span>
                </div>
              ))}
            </div>

            {/* SLP */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                SLP
              </h3>
              {aLaCarte.slp.map((session) => (
                <div key={session.duration} className="flex justify-between items-center mb-2">
                  <span className="text-sm">{session.duration}</span>
                  <span className="font-medium">${session.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 sm:mt-6 p-4 bg-accent/5 rounded-lg text-center">
            <p className="text-sm font-medium text-accent">
              💡 {aLaCarte.fourPacks}
            </p>
          </div>
        </Card>
      </div>

      {/* Watermark Note */}
      <div className="text-center text-sm text-muted-foreground">
        <p>All exports watermarked, expire in 7 days</p>
      </div>
    </div>
  );
}
