/**
 * Differentiation Callout Component
 * Makes the ChatGPT differentiation crystal clear throughout the app
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
    chatGptCant: "ChatGPT doesn't track your progress over time",
  },
  {
    icon: FileText,
    title: 'Healthcare Documentation',
    description: 'Payer-ready reports, CPT-aligned records, clinician viewer access',
    chatGptCant: "ChatGPT can't generate insurance-compliant documentation",
  },
  {
    icon: Bell,
    title: 'Proactive Support',
    description: 'Daily nudges, scheduled check-ins, automatic reminders',
    chatGptCant: "ChatGPT only responds when you ask—it never reaches out",
  },
  {
    icon: Users,
    title: 'Care Team Collaboration',
    description: 'Share reports with BCBAs, therapists, and family members',
    chatGptCant: "ChatGPT conversations stay in your chat—can't share with providers",
  },
  {
    icon: Shield,
    title: 'HIPAA-Ready Infrastructure',
    description: 'Built for healthcare from day one, not retrofitted',
    chatGptCant: "ChatGPT isn't designed for sensitive health data",
  },
];

export function DifferentiationCallout({
  variant = 'full',
  context = 'general',
}: DifferentiationCalloutProps) {
  const getContextMessage = () => {
    switch (context) {
      case 'onboarding':
        return "Here's what makes Aminy different from just asking ChatGPT:";
      case 'paywall':
        return "Why Aminy is worth the subscription:";
      case 'dashboard':
        return "What you're getting that ChatGPT can't provide:";
      default:
        return "The parts ChatGPT will never do:";
    }
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>This is tracked automatically.</strong> ChatGPT can't do that.
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-100 rounded-full flex-shrink-0">
            <Brain className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="font-medium text-teal-900 mb-2">
              More than just AI chat
            </p>
            <div className="space-y-1">
              {DIFFERENTIATORS.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-teal-700">
                  <CheckCircle className="w-3 h-3 text-teal-500" />
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
    <div className="space-y-6">
      <div className="text-center">
        <Badge className="bg-amber-100 text-amber-800 mb-3">
          Why Not Just Use ChatGPT?
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {getContextMessage()}
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Yes, you can ask ChatGPT for parenting advice. But here's what it
          fundamentally cannot do—and why Aminy exists.
        </p>
      </div>

      <div className="space-y-4">
        {DIFFERENTIATORS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-teal-600" />
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

                    <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                      <X className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">
                        {item.chatGptCant}
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
 */
export function ChatGptCantBadge({ feature }: { feature: string }) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
      <Zap className="w-3 h-3" />
      <span>ChatGPT can't {feature}</span>
    </div>
  );
}

export default DifferentiationCallout;
