/**
 * Parent Capacity Check Component
 * Assesses parent burden, support system, and realistic capacity
 * Makes onboarding feel like partnership, not data extraction
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Clock,
  Users,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Sun,
  Coffee,
  Home,
  Briefcase,
  HandHeart,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

interface ParentCapacityResult {
  stressLevel: number; // 1-10
  availableMinutes: number;
  supportLevel: 'none' | 'some' | 'good' | 'strong';
  biggestConcern: string;
  whatWorked: string;
  whatFailed: string;
  completedAt: string;
}

interface ParentCapacityCheckProps {
  parentName: string;
  childName: string;
  onComplete: (result: ParentCapacityResult) => void;
  onBack?: () => void;
}

export function ParentCapacityCheck({
  parentName,
  childName,
  onComplete,
  onBack,
}: ParentCapacityCheckProps) {
  const [step, setStep] = useState(0);
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null);
  const [supportLevel, setSupportLevel] = useState<ParentCapacityResult['supportLevel'] | null>(null);
  const [biggestConcern, setBiggestConcern] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatFailed, setWhatFailed] = useState('');

  const totalSteps = 6;
  const progress = ((step + 1) / totalSteps) * 100;

  const handleComplete = () => {
    const result: ParentCapacityResult = {
      stressLevel,
      availableMinutes: availableMinutes || 15,
      supportLevel: supportLevel || 'some',
      biggestConcern,
      whatWorked,
      whatFailed,
      completedAt: new Date().toISOString(),
    };
    triggerHaptic('success');
    onComplete(result);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Intro
      case 1: return true; // Stress level always has default
      case 2: return availableMinutes !== null;
      case 3: return supportLevel !== null;
      case 4: return true; // Biggest concern is optional
      case 5: return true; // What worked/failed are optional
      default: return true;
    }
  };

  const nextStep = () => {
    if (step < totalSteps - 1) {
      triggerHaptic('light');
      setStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 mb-4">
                <HandHeart className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                Now let's talk about YOU, {parentName}
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                The best plan for {childName} is one you can actually do.
                Let's be realistic about what's possible.
              </p>
            </div>

            <Card className="p-6 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-100">
              <div className="flex items-start gap-3 sm:gap-4">
                <Sparkles className="w-6 h-6 text-rose-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-rose-700 mb-2">
                    Why we're asking this
                  </p>
                  <p className="text-sm text-rose-600 leading-relaxed">
                    Parents of neurodivergent children carry an incredible load.
                    We want to create a plan that supports you, not overwhelms you.
                    Your honest answers help us help you better.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-2 text-center">
              On a scale of 1-10, how stressed are you feeling right now
              about {childName}'s development?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-8">
              1 = Very calm, 10 = Completely overwhelmed
            </p>

            <div className="mb-8">
              {/* Visual stress meter */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Calm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Overwhelmed</span>
                  <Coffee className="w-5 h-5 text-rose-500" />
                </div>
              </div>

              {/* Stress slider */}
              <input
                type="range"
                min="1"
                max="10"
                value={stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value))}
                className="w-full h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-rose-200 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,
                    #86efac 0%,
                    #fde047 50%,
                    #fda4af 100%)`
                }}
              />

              {/* Number display */}
              <div className="flex justify-center mt-4">
                <div className={cn(
                  "px-6 py-3 rounded-xl font-bold text-2xl",
                  stressLevel <= 3 ? "bg-green-100 text-green-700" :
                  stressLevel <= 6 ? "bg-yellow-100 text-yellow-700" :
                  "bg-rose-100 text-rose-700"
                )}>
                  {stressLevel}
                </div>
              </div>
            </div>

            {/* Validation message */}
            <Card className={cn(
              "p-4",
              stressLevel <= 3 ? "bg-green-50 border-green-200" :
              stressLevel <= 6 ? "bg-yellow-50 border-yellow-200" :
              "bg-rose-50 border-rose-200"
            )}>
              <p className={cn(
                "text-sm",
                stressLevel <= 3 ? "text-green-700" :
                stressLevel <= 6 ? "text-yellow-700" :
                "text-rose-700"
              )}>
                {stressLevel <= 3 && (
                  <>That's wonderful! You seem to be managing well. We'll help you build on that foundation.</>
                )}
                {stressLevel > 3 && stressLevel <= 6 && (
                  <>That's completely normal. Many parents feel this way. We'll create a manageable plan together.</>
                )}
                {stressLevel > 6 && (
                  <>We hear you. That level of stress is hard. We'll focus on the most impactful, least overwhelming steps. And we're here for YOU too, not just {childName}.</>
                )}
              </p>
            </Card>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-2 text-center">
              How much time can you realistically dedicate to structured
              practice with {childName} each day?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Be honest — we'd rather give you a plan you'll actually do!
            </p>

            <div className="space-y-3">
              {[
                { value: 5, label: '5 minutes', sublabel: "I'm barely surviving", icon: BatteryLow },
                { value: 15, label: '10-15 minutes', sublabel: 'Realistic for most days', icon: BatteryMedium },
                { value: 30, label: '20-30 minutes', sublabel: 'I can make time', icon: BatteryFull },
                { value: 60, label: '30+ minutes', sublabel: 'I have good capacity', icon: Battery },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    triggerHaptic('selection');
                    setAvailableMinutes(option.value);
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    "hover:border-accent hover:bg-accent/5",
                    availableMinutes === option.value
                      ? "border-accent bg-accent/5"
                      : "border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      availableMinutes === option.value ? "bg-accent/20" : "bg-gray-100"
                    )}>
                      <option.icon className={cn(
                        "w-5 h-5",
                        availableMinutes === option.value ? "text-accent" : "text-gray-500"
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.sublabel}</p>
                    </div>
                    {availableMinutes === option.value && (
                      <CheckCircle className="w-5 h-5 text-accent" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {availableMinutes === 5 && (
              <Card className="mt-4 p-4 bg-rose-50 border-rose-200">
                <p className="text-sm text-rose-700">
                  <strong>That's okay!</strong> Even 5 minutes of intentional practice
                  makes a difference. We'll focus on high-impact, low-effort activities.
                  Self-care matters too.
                </p>
              </Card>
            )}
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-2 text-center">
              Do you have support at home?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-8">
              This helps us understand what's realistic for your situation
            </p>

            <div className="space-y-3">
              {[
                {
                  value: 'strong' as const,
                  label: 'Strong support',
                  sublabel: 'Partner, family, or caregiver actively helps daily',
                  icon: Users,
                },
                {
                  value: 'good' as const,
                  label: 'Some support',
                  sublabel: 'Help available sometimes (weekends, evenings)',
                  icon: Home,
                },
                {
                  value: 'some' as const,
                  label: 'Limited support',
                  sublabel: 'Occasional help from family/friends',
                  icon: Heart,
                },
                {
                  value: 'none' as const,
                  label: "I'm doing this alone",
                  sublabel: 'Single parent or primary caregiver',
                  icon: HandHeart,
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSupportLevel(option.value);
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    "hover:border-accent hover:bg-accent/5",
                    supportLevel === option.value
                      ? "border-accent bg-accent/5"
                      : "border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      supportLevel === option.value ? "bg-accent/20" : "bg-gray-100"
                    )}>
                      <option.icon className={cn(
                        "w-5 h-5",
                        supportLevel === option.value ? "text-accent" : "text-gray-500"
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.sublabel}</p>
                    </div>
                    {supportLevel === option.value && (
                      <CheckCircle className="w-5 h-5 text-accent" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {supportLevel === 'none' && (
              <Card className="mt-4 p-4 bg-accent/5 border-accent/20">
                <p className="text-sm text-primary">
                  <strong>You're not alone anymore.</strong> Aminy is here 24/7.
                  We'll be your thinking partner, your reminder system, and your
                  cheerleader. You've got this.
                </p>
              </Card>
            )}
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-2 text-center">
              What's your biggest concern right now about {childName}?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4 sm:mb-6">
              What keeps you up at night? (Optional, but helps us prioritize)
            </p>

            <Textarea
              value={biggestConcern}
              onChange={(e) => setBiggestConcern(e.target.value)}
              placeholder={`For example: "${childName} has meltdowns every day at school pickup and I don't know how to help..."`}
              className="min-h-32 text-base"
            />

            <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  <strong>This is just between us.</strong> Sharing your biggest
                  worry helps Aminy understand what matters most. We'll address
                  this in your personalized plan.
                </p>
              </div>
            </Card>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-2 text-center">
              Have you tried strategies before?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4 sm:mb-6">
              This helps us avoid suggesting what already didn't work
            </p>

            <div className="space-y-3 sm:space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  What has worked (even a little)?
                </label>
                <Textarea
                  value={whatWorked}
                  onChange={(e) => setWhatWorked(e.target.value)}
                  placeholder="e.g., Visual timers help with transitions, singing calms them down..."
                  className="min-h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  What have you tried that didn't work?
                </label>
                <Textarea
                  value={whatFailed}
                  onChange={(e) => setWhatFailed(e.target.value)}
                  placeholder="e.g., Time-outs made things worse, reward charts didn't motivate them..."
                  className="min-h-20"
                />
              </div>
            </div>

            <Card className="mt-4 p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  <strong>We learn from your experience.</strong> Knowing what's
                  already been tried helps us suggest fresh approaches that
                  might actually work for {childName}.
                </p>
              </div>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50/30 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={prevStep}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            About You • {step + 1} of {totalSteps}
          </span>
          <div className="w-9" />
        </div>

        {/* Progress */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-400 to-pink-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8">
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="w-full bg-accent hover:bg-accent/90"
          >
            {step === totalSteps - 1 ? 'Create My Plan' : 'Continue'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ParentCapacityCheck;
