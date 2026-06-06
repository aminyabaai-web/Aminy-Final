// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Differentiation Callout Component
 * Highlights Aminy's unique value proposition through positive differentiation
 * Addresses: "Your defensible business is the workflow + data + healthcare integration"
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Brain,
  BarChart3,
  FileText,
  Shield,
  Bell,
  Users,
  Heart,
  Zap,
  CheckCircle,
  X,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface DifferentiationCalloutProps {
  variant?: 'full' | 'compact' | 'inline';
  context?: 'onboarding' | 'paywall' | 'dashboard' | 'general';
}

const DIFFERENTIATORS = [
  {
    icon: BarChart3,
    title: 'Structured Progress Tracking',
    description: 'ABA-style graphs and measurable outcomes, not just conversation logs',
    aminyAdvantage: 'Aminy tracks your progress automatically over time',
  },
  {
    icon: FileText,
    title: 'Healthcare Documentation',
    description: 'Payer-ready reports, CPT-aligned records, clinician viewer access',
    aminyAdvantage: 'Generate insurance-ready documentation with one click',
  },
  {
    icon: Bell,
    title: 'Proactive Support',
    description: 'Daily nudges, scheduled check-ins, automatic reminders',
    aminyAdvantage: 'Aminy reaches out to you—never lets you fall through the cracks',
  },
  {
    icon: Users,
    title: 'Care Team Collaboration',
    description: 'Share reports with BCBAs, therapists, and family members',
    aminyAdvantage: 'Share insights with your entire care team seamlessly',
  },
  {
    icon: Shield,
    title: 'HIPAA-Ready Infrastructure',
    description: 'Built for healthcare from day one, not retrofitted',
    aminyAdvantage: 'Built specifically for sensitive health data from day one',
  },
];

export function DifferentiationCallout({
  variant = 'full',
  context = 'general',
}: DifferentiationCalloutProps) {
  const getContextMessage = () => {
    switch (context) {
      case 'onboarding':
        return "Here's what makes Aminy uniquely powerful:";
      case 'paywall':
        return "Why Aminy is worth the subscription:";
      case 'dashboard':
        return "What makes Aminy different:";
      default:
        return "Built specifically for your family's journey:";
    }
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>This is tracked automatically.</strong> Only Aminy does this.
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-[#6B9080]/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#6B9080]/10 rounded-full flex-shrink-0">
            <Brain className="w-4 h-4 text-[#6B9080]" />
          </div>
          <div>
            <p className="font-medium text-teal-900 mb-2">
              More than just AI chat
            </p>
            <div className="space-y-1">
              {DIFFERENTIATORS.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-[#6B9080]">
                  <CheckCircle className="w-3 h-3 text-primary" />
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Full variant
  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="text-center">
        <Badge className="bg-[#6B9080]/10 text-teal-800 mb-3">
          Why Aminy Works
        </Badge>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          {getContextMessage()}
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Aminy isn't just another AI chatbot—it's a complete support system
          built specifically for families navigating neurodivergence.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {DIFFERENTIATORS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 bg-[#6B9080]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#6B9080]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 ml-2">
                        Aminy
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2 p-2 bg-[#6B9080]/10 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm text-[#6B9080]">
                        {item.aminyAdvantage}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Line */}
      <Card className="p-6 bg-gradient-to-r from-teal-600 to-blue-600 text-white text-center">
        <Heart className="w-8 h-8 mx-auto mb-3 text-teal-200" />
        <h3 className="text-xl font-bold mb-2">
          The companion is the hook.
          <br />
          The clinical utility is the moat.
        </h3>
        <p className="text-teal-100 max-w-md mx-auto">
          We're building the system of record that clinics and payers want to
          integrate with—not just another AI chatbot.
        </p>
      </Card>
    </div>
  );
}

/**
 * Quick Differentiator Badge - For use next to features
 * Shows what makes Aminy unique with positive framing
 */
export function AminyAdvantageBadge({ feature }: { feature: string }) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#6B9080]/10 border border-[#6B9080]/20 rounded text-xs text-[#6B9080]">
      <Zap className="w-3 h-3" />
      <span>Aminy {feature}</span>
    </div>
  );
}

/**
 * @deprecated Use AminyAdvantageBadge instead
 */
export const ChatGptCantBadge = AminyAdvantageBadge;

export default DifferentiationCallout;
