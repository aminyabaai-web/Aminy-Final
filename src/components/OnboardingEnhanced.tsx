/**
 * Enhanced Onboarding Flow
 * Fixes all 8 critical issues:
 * 1. ✅ Wires in new components (mental health, capacity, wow moments)
 * 2. ✅ Progressive disclosure - shorter critical path
 * 3. ✅ Video/demo preview before forms
 * 4. ✅ Personalized tone DURING onboarding
 * 5. ✅ Quick Win before asking for more data
 * 6. ✅ Fixed branding/copywriting
 * 7. ✅ Referral loop at completion
 * 8. ✅ "What to Expect" preview at start
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  Sparkles,
  Clock,
  CheckCircle,
  Play,
  Users,
  Brain,
  Target,
  Calendar,
  MessageCircle,
  Star,
  Gift,
  Share2,
  ChevronRight,
  Zap,
  Shield,
  Sun,
  Coffee,
  X,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// Import new enhancement components
import { ChildMentalHealthScreen } from './ChildMentalHealthScreen';
import { ParentCapacityCheck } from './ParentCapacityCheck';
import {
  DiagnosisValidation,
  FocusAreaValidation,
  InsightSummaryWow,
  ResourcesTeaser,
  PlanGenerationProgress,
  OnboardingComplete,
  EmpathyMoment,
} from './OnboardingWowMoments';

// Tone configurations - changes voice throughout onboarding
const TONE_STYLES = {
  supportive: {
    greeting: "We're so glad you're here",
    encourage: "You're doing amazingly",
    nextStep: "When you're ready",
    celebrate: "That's wonderful!",
    empathy: "We understand how hard this can be",
  },
  direct: {
    greeting: "Let's get started",
    encourage: "Great progress",
    nextStep: "Next up",
    celebrate: "Excellent!",
    empathy: "This matters",
  },
  playful: {
    greeting: "Hey there, friend! 👋",
    encourage: "You're crushing it! 🎉",
    nextStep: "Ready for more?",
    celebrate: "Woohoo! 🌟",
    empathy: "We've got your back",
  },
};

type ToneType = keyof typeof TONE_STYLES;

interface OnboardingData {
  // Essential (collected in critical path)
  parentName: string;
  childName: string;
  childAge: number;
  primaryConcern: string;
  tone: ToneType;

  // Important (asked after quick win)
  email: string;
  diagnoses: string[];
  communicationLevel: string;
  focusAreas: string[];

  // Optional (can complete later)
  state?: string;
  insurance?: string;
  interests?: string[];
  triggers?: string[];

  // Mental health
  childMentalHealth?: any;
  parentCapacity?: any;

  // Generated
  quickWinTip?: string;
}

interface OnboardingEnhancedProps {
  onComplete: (data: OnboardingData) => void;
}

const STORAGE_KEY = 'aminy-onboarding-progress';

// Load saved progress from sessionStorage
function loadSavedProgress(): { step: number; data: Partial<OnboardingData> } | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate saved data has expected shape
      if (typeof parsed.step === 'number' && typeof parsed.data === 'object') {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading saved onboarding progress:', error);
  }
  return null;
}

// Save progress to sessionStorage
function saveProgress(step: number, data: Partial<OnboardingData>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data, savedAt: new Date().toISOString() }));
  } catch (error) {
    console.error('Error saving onboarding progress:', error);
  }
}

// Clear saved progress
export function clearOnboardingProgress() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing onboarding progress:', error);
  }
}

export function OnboardingEnhanced({ onComplete }: OnboardingEnhancedProps) {
  // Load saved progress on mount
  const savedProgress = loadSavedProgress();

  const [step, setStep] = useState(savedProgress?.step || 0);
  const [data, setData] = useState<Partial<OnboardingData>>(
    savedProgress?.data || { tone: 'supportive' }
  );
  const [showDemo, setShowDemo] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planStep, setPlanStep] = useState(0);

  const tone = TONE_STYLES[data.tone || 'supportive'];

  // Save progress whenever step or data changes
  useEffect(() => {
    saveProgress(step, data);
  }, [step, data]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    triggerHaptic('light');
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  // Generate quick win tip based on child info
  const generateQuickWin = (childName: string, age: number, concern: string): string => {
    const tips: Record<string, string> = {
      meltdowns: `Try this TODAY: Give ${childName} a 5-minute warning before any transition. Say "${childName}, in 5 minutes we're going to [activity]." This one change can reduce meltdowns by up to 40%.`,
      communication: `Try this TODAY: When ${childName} wants something, wait 3-5 seconds before helping. This "wait time" encourages communication attempts. Even pointing or reaching counts as progress!`,
      sleep: `Try this TONIGHT: Start ${childName}'s bedtime routine 30 minutes earlier than usual, in the same order every night. Predictability calms the nervous system.`,
      behavior: `Try this TODAY: Catch ${childName} being good 3 times today and say exactly what they did well. "I love how you waited patiently!" works better than "Good job!"`,
      focus: `Try this TODAY: Before asking ${childName} to focus, do 2 minutes of movement together (jumping, spinning, dancing). This "brain break" actually improves focus afterward.`,
      anxiety: `Try this TODAY: When ${childName} seems worried, try "Name 5 things you can see" together. This grounding technique interrupts the anxiety spiral.`,
      social: `Try this TODAY: Practice one social script with ${childName}: "Hi, my name is ${childName}. What's your name?" Role-play it 3 times with stuffed animals first.`,
      sensory: `Try this TODAY: Create a "calm down corner" with ${childName}'s favorite textures - a soft blanket, squishy toy, or weighted lap pad. Having a safe space ready prevents escalation.`,
      default: `Try this TODAY: Spend 5 minutes doing whatever ${childName} wants to do, with zero demands. This "child-led play" builds connection and cooperation.`,
    };

    const concernKey = Object.keys(tips).find(key =>
      concern.toLowerCase().includes(key)
    ) || 'default';

    return tips[concernKey];
  };

  // Total steps in critical path
  const criticalPathSteps = 8;
  const progress = Math.min((step / criticalPathSteps) * 100, 100);

  const renderStep = () => {
    switch (step) {
      // STEP 0: What to Expect (Fix #8)
      case 0:
        return (
          <WhatToExpectStep
            onNext={nextStep}
            onShowDemo={() => setShowDemo(true)}
          />
        );

      // STEP 1: Just your name (minimum friction start)
      case 1:
        return (
          <NameCollectionStep
            parentName={data.parentName || ''}
            onUpdate={(name) => updateData({ parentName: name })}
            onNext={nextStep}
            onBack={prevStep}
            tone={tone}
          />
        );

      // STEP 2: Child name + age (still minimal)
      case 2:
        return (
          <ChildBasicsStep
            childName={data.childName || ''}
            childAge={data.childAge || 0}
            onUpdate={(name, age) => updateData({ childName: name, childAge: age })}
            onNext={nextStep}
            onBack={prevStep}
            parentName={data.parentName || ''}
            tone={tone}
          />
        );

      // STEP 3: Primary concern (the ONE thing) - NO quick win yet, need more context
      case 3:
        return (
          <PrimaryConcernStep
            concern={data.primaryConcern || ''}
            childName={data.childName || ''}
            onUpdate={(concern) => {
              updateData({ primaryConcern: concern });
            }}
            onNext={nextStep}
            onBack={prevStep}
            tone={tone}
          />
        );

      // STEP 4: Tone selection (moved earlier, before collecting more data)
      case 4:
        return (
          <ToneSelectionStep
            currentTone={data.tone || 'supportive'}
            onSelect={(tone) => updateData({ tone })}
            onNext={nextStep}
            onBack={prevStep}
            parentName={data.parentName || ''}
          />
        );

      // STEP 5: Diagnosis + communication (with validation wow moment)
      case 5:
        return (
          <DiagnosisStep
            diagnoses={data.diagnoses || []}
            communicationLevel={data.communicationLevel || ''}
            childName={data.childName || ''}
            onUpdate={(diagnoses, commLevel) => updateData({
              diagnoses,
              communicationLevel: commLevel
            })}
            onNext={nextStep}
            onBack={prevStep}
            tone={tone}
          />
        );

      // STEP 6: Focus areas (with why-it-matters wow moment)
      case 6:
        return (
          <FocusAreasStep
            focusAreas={data.focusAreas || []}
            childName={data.childName || ''}
            onUpdate={(areas) => updateData({ focusAreas: areas })}
            onNext={nextStep}
            onBack={prevStep}
            tone={tone}
          />
        );

      // STEP 7: QUICK WIN REVEAL - Now shown AFTER we have context (diagnoses, communication, focus areas)
      case 7:
        // Generate quick win now that we have full context
        if (!data.quickWinTip && data.primaryConcern) {
          const quickWin = generateQuickWin(
            data.childName || 'your child',
            data.childAge || 5,
            data.primaryConcern
          );
          updateData({ quickWinTip: quickWin });
        }
        return (
          <QuickWinStep
            tip={data.quickWinTip || ''}
            childName={data.childName || ''}
            diagnoses={data.diagnoses || []}
            communicationLevel={data.communicationLevel || ''}
            focusAreas={data.focusAreas || []}
            onNext={nextStep}
            onBack={prevStep}
            tone={tone}
          />
        );

      // STEP 8: Parent capacity check (new component)
      case 8:
        return (
          <ParentCapacityCheck
            parentName={data.parentName || ''}
            childName={data.childName || ''}
            onComplete={(capacity) => {
              updateData({ parentCapacity: capacity });
              nextStep();
            }}
            onBack={prevStep}
          />
        );

      // STEP 9: Child mental health (new component - for ages 4+)
      case 9:
        if ((data.childAge || 0) < 4) {
          // Skip for very young children
          nextStep();
          return null;
        }
        return (
          <ChildMentalHealthScreen
            childName={data.childName || ''}
            childAge={data.childAge || 5}
            onComplete={(mentalHealth) => {
              updateData({ childMentalHealth: mentalHealth });
              nextStep();
            }}
            onBack={prevStep}
            onSkip={nextStep}
          />
        );

      // STEP 10: Email (needed for account) + Optional state/insurance
      // Skip this step if email was already captured during signup
      case 10:
        // If email already exists, skip straight to plan generation
        if (data.email && data.email.includes('@')) {
          setGeneratingPlan(true);
          nextStep();
          // Start plan generation timer
          let planStepCount = 0;
          const interval = setInterval(() => {
            planStepCount++;
            setPlanStep(planStepCount);
            if (planStepCount >= 5) {
              clearInterval(interval);
              setTimeout(() => {
                setGeneratingPlan(false);
              }, 500);
            }
          }, 800);
          return (
            <PlanGeneratingStep
              childName={data.childName || ''}
              planStep={planStep}
            />
          );
        }
        return (
          <AccountStep
            email={data.email || ''}
            state={data.state}
            insurance={data.insurance}
            childName={data.childName || ''}
            onUpdate={(email, state, insurance) => updateData({ email, state, insurance })}
            onNext={() => {
              setGeneratingPlan(true);
              // Simulate plan generation with progress
              let planStepCount = 0;
              const interval = setInterval(() => {
                planStepCount++;
                setPlanStep(planStepCount);
                if (planStepCount >= 5) {
                  clearInterval(interval);
                  setTimeout(() => {
                    setGeneratingPlan(false);
                    nextStep();
                  }, 500);
                }
              }, 800);
            }}
            onBack={prevStep}
            tone={tone}
          />
        );

      // STEP 11: Plan generation with progress visualization OR Completion
      case 11:
        // Always show generating step while generating
        if (generatingPlan) {
          return (
            <PlanGeneratingStep
              childName={data.childName || ''}
              planStep={planStep}
            />
          );
        }
        // Show completion step - ensure data is complete
        return (
          <CompletionStep
            data={{
              parentName: data.parentName || 'Friend',
              childName: data.childName || 'your child',
              childAge: data.childAge || 5,
              primaryConcern: data.primaryConcern || 'general support',
              tone: data.tone || 'supportive',
              email: data.email || '',
              diagnoses: data.diagnoses || [],
              communicationLevel: data.communicationLevel || 'conversational',
              focusAreas: data.focusAreas || [],
              ...data
            } as OnboardingData}
            onComplete={() => {
              clearOnboardingProgress(); // Clear saved progress on completion
              onComplete(data as OnboardingData);
            }}
            onReferFriend={() => {
              const referralUrl = `${window.location.origin}/join?ref=AMINY-${Date.now().toString(36).toUpperCase()}`;
              navigator.clipboard.writeText(referralUrl);
              toast.success('Referral link copied! Share it with a friend.');
            }}
            tone={tone}
          />
        );

      default:
        return null;
    }
  };

  // Video demo overlay (Fix #3)
  if (showDemo) {
    return (
      <DemoOverlay
        onClose={() => setShowDemo(false)}
        onGetStarted={() => {
          setShowDemo(false);
          nextStep();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-accent/5">
      {/* Progress bar (hidden on step 0) */}
      {step > 0 && step < 11 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {step <= criticalPathSteps ? `Step ${step} of ${criticalPathSteps}` : 'Almost done!'}
              </span>
              <span className="text-xs text-accent font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={cn(
        "px-4 pb-8",
        step > 0 && step < 11 ? "pt-20" : "pt-8"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

/**
 * Step 0: What to Expect (Fix #8)
 */
function WhatToExpectStep({
  onNext,
  onShowDemo,
}: {
  onNext: () => void;
  onShowDemo: () => void;
}) {
  return (
    <div className="max-w-md mx-auto pt-8">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-purple-100 mb-6"
        >
          <Sparkles className="w-10 h-10 text-accent" />
        </motion.div>

        <h1 className="text-3xl font-bold text-primary mb-4">
          You're not alone anymore
        </h1>
        <p className="text-lg text-muted-foreground">
          In just 5 minutes, you'll have a personalized daily plan for your child —
          and an expert AI companion available 24/7.
        </p>
      </div>

      {/* What you'll get */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-accent" />
          What you'll get today:
        </h3>
        <div className="space-y-3">
          {[
            { icon: Zap, text: 'One actionable tip you can try TODAY', time: '30 sec' },
            { icon: Target, text: 'Personalized daily activities for your child', time: '3 min' },
            { icon: MessageCircle, text: '24/7 access to Aminy AI — your expert companion', time: 'Always' },
            { icon: Calendar, text: 'A Living Plan that adapts as your child grows', time: 'Ongoing' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <item.icon className="w-4 h-4 text-accent" />
              </div>
              <span className="flex-1 text-sm text-primary">{item.text}</span>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Social proof */}
      <div className="flex items-center justify-center gap-2 mb-8 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>Trusted by <strong className="text-primary">10,000+ families</strong></span>
        <span className="mx-2">•</span>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <span>4.9</span>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <Button
          onClick={onNext}
          size="lg"
          className="w-full bg-accent hover:bg-accent/90 text-lg py-6"
        >
          Let's make life easier together
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <button
          onClick={onShowDemo}
          className="w-full flex items-center justify-center gap-2 py-3 text-accent hover:text-accent/80 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span className="text-sm font-medium">Watch how it works first</span>
        </button>
      </div>

      {/* Time estimate */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        <Clock className="w-3 h-3 inline mr-1" />
        Takes about 5 minutes • No credit card needed
      </p>
    </div>
  );
}

/**
 * Step 1: Parent Name (Fix #6 - improved copy)
 */
function NameCollectionStep({
  parentName,
  onUpdate,
  onNext,
  onBack,
  tone,
}: {
  parentName: string;
  onUpdate: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
  tone: typeof TONE_STYLES['supportive'];
}) {
  const [name, setName] = useState(parentName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onUpdate(name.trim());
      onNext();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2">
          {tone.greeting}! 👋
        </h2>
        <p className="text-muted-foreground">
          What should we call you?
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            className="text-lg py-6 text-center"
            autoFocus
          />
        </Card>

        <Button
          type="submit"
          disabled={!name.trim()}
          className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
          size="lg"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Step 2: Child basics
 */
function ChildBasicsStep({
  childName,
  childAge,
  onUpdate,
  onNext,
  onBack,
  parentName,
  tone,
}: {
  childName: string;
  childAge: number;
  onUpdate: (name: string, age: number) => void;
  onNext: () => void;
  onBack: () => void;
  parentName: string;
  tone: typeof TONE_STYLES['supportive'];
}) {
  const [name, setName] = useState(childName);
  const [age, setAge] = useState(childAge || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && age) {
      onUpdate(name.trim(), Number(age));
      onNext();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2">
          Nice to meet you, {parentName}!
        </h2>
        <p className="text-muted-foreground">
          Tell us about your child
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Child's first name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Their name"
              className="text-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Age
            </label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Years old"
              min="1"
              max="18"
              className="text-lg"
            />
          </div>
        </Card>

        <Button
          type="submit"
          disabled={!name.trim() || !age}
          className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
          size="lg"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Step 3: Primary Concern - THE ONE THING
 */
function PrimaryConcernStep({
  concern,
  childName,
  onUpdate,
  onNext,
  onBack,
  tone,
}: {
  concern: string;
  childName: string;
  onUpdate: (concern: string) => void;
  onNext: () => void;
  onBack: () => void;
  tone: typeof TONE_STYLES['supportive'];
}) {
  const concerns = [
    { id: 'meltdowns', label: 'Meltdowns & tantrums', Icon: Zap },
    { id: 'communication', label: 'Communication & speech', Icon: MessageCircle },
    { id: 'behavior', label: 'Challenging behaviors', Icon: Target },
    { id: 'social', label: 'Social skills & friendships', Icon: Users },
    { id: 'anxiety', label: 'Anxiety & worry', Icon: Heart },
    { id: 'focus', label: 'Focus & attention', Icon: Brain },
    { id: 'sleep', label: 'Sleep issues', Icon: Sun },
    { id: 'sensory', label: 'Sensory sensitivities', Icon: Shield },
  ];

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2">
          What's your biggest challenge with {childName} right now?
        </h2>
        <p className="text-muted-foreground">
          Pick the ONE thing that weighs on you most
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {concerns.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              triggerHaptic('selection');
              onUpdate(c.id);
            }}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              concern === c.id
                ? "border-accent bg-accent/5"
                : "border-gray-200 hover:border-accent/50"
            )}
          >
            <c.Icon className={cn(
              "w-6 h-6 mb-2",
              concern === c.id ? "text-accent" : "text-gray-400"
            )} />
            <span className="text-sm font-medium text-primary block">{c.label}</span>
          </button>
        ))}
      </div>

      <Button
        onClick={onNext}
        disabled={!concern}
        className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
        size="lg"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Step 7: QUICK WIN - Now shown AFTER we have full context
 * This is the "wow moment" where parents feel truly understood
 */
function QuickWinStep({
  tip,
  childName,
  diagnoses,
  communicationLevel,
  focusAreas,
  onNext,
  onBack,
  tone,
}: {
  tip: string;
  childName: string;
  diagnoses?: string[];
  communicationLevel?: string;
  focusAreas?: string[];
  onNext: () => void;
  onBack: () => void;
  tone: typeof TONE_STYLES['supportive'];
}) {
  // Generate a personalized context message based on what we learned
  const getContextMessage = () => {
    const parts: string[] = [];

    if (diagnoses && diagnoses.length > 0) {
      const diagList = diagnoses.slice(0, 2).join(' and ');
      parts.push(`understanding ${diagList}`);
    }

    if (communicationLevel) {
      const commMap: Record<string, string> = {
        'nonverbal': 'non-verbal communication support',
        'emerging': 'emerging speech development',
        'conversational': 'conversational skills',
      };
      if (commMap[communicationLevel]) {
        parts.push(commMap[communicationLevel]);
      }
    }

    if (focusAreas && focusAreas.length > 0) {
      const areaMap: Record<string, string> = {
        'communication': 'communication',
        'social': 'social skills',
        'emotional': 'emotional regulation',
        'sensory': 'sensory needs',
        'routines': 'daily routines',
        'behavior': 'behavior support',
      };
      const areas = focusAreas.slice(0, 2).map(a => areaMap[a] || a).join(' and ');
      parts.push(areas);
    }

    if (parts.length > 0) {
      return `Based on ${childName}'s ${parts.join(', ')}, here's a strategy that often works:`;
    }

    return `Based on what you shared about ${childName}, try this:`;
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 mb-4"
        >
          <Zap className="w-8 h-8 text-amber-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          Your First Personalized Tip
        </h2>
        <p className="text-muted-foreground text-sm px-4">
          {getContextMessage()}
        </p>
      </div>

      <Card className="p-6 mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <p className="text-primary leading-relaxed">{tip}</p>
      </Card>

      <EmpathyMoment
        message={`This is personalized for ${childName}. Your full plan will include daily activities, tracking, and 24/7 AI support.`}
        type="validation"
      />

      <div className="mt-6 space-y-3">
        <Button
          onClick={onNext}
          className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
          size="lg"
        >
          {tone.celebrate} Continue to my plan
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Step 5: Tone Selection (Fix #4)
 */
function ToneSelectionStep({
  currentTone,
  onSelect,
  onNext,
  onBack,
  parentName,
}: {
  currentTone: ToneType;
  onSelect: (tone: ToneType) => void;
  onNext: () => void;
  onBack: () => void;
  parentName: string;
}) {
  const tones = [
    {
      id: 'supportive' as ToneType,
      label: 'Warm & Supportive',
      description: 'Gentle encouragement and lots of validation',
      preview: '"You\'re doing amazingly. Let\'s take this one step at a time."',
      Icon: Heart,
    },
    {
      id: 'direct' as ToneType,
      label: 'Clear & Direct',
      description: 'Straight to the point with actionable advice',
      preview: '"Here\'s what to do: Step 1, Step 2, Step 3. Let\'s go."',
      Icon: Target,
    },
    {
      id: 'playful' as ToneType,
      label: 'Fun & Playful',
      description: 'Light-hearted with humor and celebration',
      preview: '"Woohoo! You crushed it! Ready for the next adventure?"',
      Icon: Sparkles,
    },
  ];

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2">
          How should Aminy talk to you, {parentName}?
        </h2>
        <p className="text-muted-foreground">
          We'll match your preferred communication style
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {tones.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              triggerHaptic('selection');
              onSelect(t.id);
            }}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              currentTone === t.id
                ? "border-accent bg-accent/5"
                : "border-gray-200 hover:border-accent/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                currentTone === t.id ? "bg-accent/20" : "bg-gray-100"
              )}>
                <t.Icon className={cn(
                  "w-5 h-5",
                  currentTone === t.id ? "text-accent" : "text-gray-400"
                )} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary">{t.label}</p>
                <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
                <p className="text-xs italic text-accent bg-accent/5 p-2 rounded-lg">
                  {t.preview}
                </p>
              </div>
              {currentTone === t.id && (
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
        size="lg"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Step 6: Diagnosis + Communication
 */
function DiagnosisStep({
  diagnoses,
  communicationLevel,
  childName,
  onUpdate,
  onNext,
  onBack,
  tone,
}: {
  diagnoses: string[];
  communicationLevel: string;
  childName: string;
  onUpdate: (diagnoses: string[], commLevel: string) => void;
  onNext: () => void;
  onBack: () => void;
  tone: typeof TONE_STYLES['supportive'];
}) {
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>(diagnoses);
  const [commLevel, setCommLevel] = useState(communicationLevel);

  const diagnosisOptions = [
    'Autism Spectrum (ASD)',
    'ADHD',
    'Anxiety',
    'Speech/Language Delay',
    'Sensory Processing',
    'Developmental Delay',
    'Not yet diagnosed',
    'Other',
  ];

  const commLevels = [
    { id: 'nonverbal', label: 'Non-verbal or pre-verbal', desc: 'Uses gestures, sounds, or AAC' },
    { id: 'emerging', label: 'Emerging speech', desc: 'Single words or short phrases' },
    { id: 'conversational', label: 'Conversational', desc: 'Speaks in sentences' },
  ];

  const toggleDiagnosis = (d: string) => {
    setSelectedDiagnoses(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleNext = () => {
    onUpdate(selectedDiagnoses, commLevel);
    onNext();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2">
          Tell us more about {childName}
        </h2>
        <p className="text-muted-foreground">
          This helps us personalize recommendations
        </p>
      </div>

      <Card className="p-4 mb-4">
        <label className="block text-sm font-medium text-primary mb-3">
          Diagnosis (select all that apply)
        </label>
        <div className="flex flex-wrap gap-2">
          {diagnosisOptions.map((d) => (
            <button
              key={d}
              onClick={() => toggleDiagnosis(d)}
              className={cn(
                "px-3 py-2 rounded-full text-sm transition-all",
                selectedDiagnoses.includes(d)
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-primary hover:bg-gray-200"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </Card>

      {/* Diagnosis validation wow moment */}
      {selectedDiagnoses.length > 0 && (
        <DiagnosisValidation diagnoses={selectedDiagnoses} childName={childName} />
      )}

      <Card className="p-4 mb-6 mt-4">
        <label className="block text-sm font-medium text-primary mb-3">
          Communication level
        </label>
        <div className="space-y-2">
          {commLevels.map((level) => (
            <button
              key={level.id}
              onClick={() => setCommLevel(level.id)}
              className={cn(
                "w-full p-3 rounded-lg border-2 text-left transition-all",
                commLevel === level.id
                  ? "border-accent bg-accent/5"
                  : "border-gray-200 hover:border-accent/50"
              )}
            >
              <p className="font-medium text-primary">{level.label}</p>
              <p className="text-xs text-muted-foreground">{level.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      <Button
        onClick={handleNext}
        disabled={!commLevel}
        className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
        size="lg"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Step 6: Focus Areas - Now with clear explanations
 */
function FocusAreasStep({
  focusAreas,
  childName,
  onUpdate,
  onNext,
  onBack,
  tone,
}: {
  focusAreas: string[];
  childName: string;
  onUpdate: (areas: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  tone: typeof TONE_STYLES['supportive'];
}) {
  const [selected, setSelected] = useState<string[]>(focusAreas);

  const areas = [
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageCircle,
      description: 'Speech, language, AAC support'
    },
    {
      id: 'social',
      label: 'Social Skills',
      icon: Users,
      description: 'Friendships, play, interactions'
    },
    {
      id: 'emotional',
      label: 'Emotional Regulation',
      icon: Heart,
      description: 'Managing big feelings, calm-down'
    },
    {
      id: 'sensory',
      label: 'Sensory Needs',
      icon: Zap,
      description: 'Over/under-sensitivity, sensory diet'
    },
    {
      id: 'routines',
      label: 'Daily Routines',
      icon: Calendar,
      description: 'Morning, meals, bedtime'
    },
    {
      id: 'behavior',
      label: 'Behavior Support',
      icon: Target,
      description: 'Reducing challenging behaviors'
    },
  ];

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    onUpdate(selected);
    onNext();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-primary mb-2">
          What matters most for {childName}?
        </h2>
        <p className="text-muted-foreground mb-2">
          These areas will personalize your daily activities
        </p>
        <p className="text-xs text-accent">
          Pick 1-3 priorities • You can change these anytime
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => toggle(area.id)}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              selected.includes(area.id)
                ? "border-accent bg-accent/5"
                : "border-gray-200 hover:border-accent/50"
            )}
          >
            <area.icon className={cn(
              "w-5 h-5 mb-2",
              selected.includes(area.id) ? "text-accent" : "text-gray-400"
            )} />
            <span className="text-sm font-medium text-primary block">{area.label}</span>
            <span className="text-xs text-muted-foreground">{area.description}</span>
          </button>
        ))}
      </div>

      {/* Selection feedback */}
      {selected.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mb-4">
          Tap the areas you want to focus on
        </p>
      )}

      {/* Focus area validation */}
      {selected.length > 0 && (
        <FocusAreaValidation focusAreas={selected} childName={childName} />
      )}

      <div className="mt-6">
        <Button
          onClick={handleNext}
          disabled={selected.length === 0}
          className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
          size="lg"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Step 10: Account + Optional Info
 */
function AccountStep({
  email,
  state,
  insurance,
  childName,
  onUpdate,
  onNext,
  onBack,
  tone,
}: {
  email: string;
  state?: string;
  insurance?: string;
  childName: string;
  onUpdate: (email: string, state?: string, insurance?: string) => void;
  onNext: () => void;
  onBack: () => void;
  tone: typeof TONE_STYLES['supportive'];
}) {
  const [emailValue, setEmailValue] = useState(email);
  const [stateValue, setStateValue] = useState(state || '');
  const [showOptional, setShowOptional] = useState(false);

  const handleNext = () => {
    onUpdate(emailValue, stateValue || undefined, insurance);
    onNext();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2">
          Almost there! Let's save your plan
        </h2>
        <p className="text-muted-foreground">
          Enter your email to access {childName}'s personalized plan anytime
        </p>
      </div>

      <Card className="p-6 mb-4">
        <label className="block text-sm font-medium text-primary mb-2">
          Email address
        </label>
        <Input
          type="email"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          placeholder="you@example.com"
          className="text-lg"
          autoFocus
        />
      </Card>

      {/* Optional fields toggle */}
      <button
        onClick={() => setShowOptional(!showOptional)}
        className="w-full text-left text-sm text-accent hover:text-accent/80 mb-4 flex items-center gap-2"
      >
        <ChevronRight className={cn(
          "w-4 h-4 transition-transform",
          showOptional && "rotate-90"
        )} />
        Add state/insurance for personalized resources (optional)
      </button>

      {showOptional && (
        <Card className="p-4 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              State (for local resources)
            </label>
            <Input
              value={stateValue}
              onChange={(e) => setStateValue(e.target.value)}
              placeholder="e.g., California"
            />
          </div>
        </Card>
      )}

      {stateValue && (
        <ResourcesTeaser state={stateValue} hasInsurance={!!insurance} />
      )}

      <div className="mt-6">
        <Button
          onClick={handleNext}
          disabled={!emailValue || !emailValue.includes('@')}
          className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
          size="lg"
        >
          Create my plan
          <Sparkles className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <button
        onClick={onBack}
        className="w-full mt-4 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        Back
      </button>
    </div>
  );
}

/**
 * Plan Generation Progress
 */
function PlanGeneratingStep({
  childName,
  planStep,
}: {
  childName: string;
  planStep: number;
}) {
  return (
    <div className="max-w-md mx-auto pt-12">
      <div className="text-center mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-6"
        >
          <Brain className="w-8 h-8 text-accent" />
        </motion.div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          Creating {childName}'s plan...
        </h2>
        <p className="text-muted-foreground">
          Our AI is analyzing everything you shared
        </p>
      </div>

      <Card className="p-6">
        <PlanGenerationProgress childName={childName} step={planStep} />
      </Card>
    </div>
  );
}

/**
 * Completion Step with Referral (Fix #7)
 */
function CompletionStep({
  data,
  onComplete,
  onReferFriend,
  tone,
}: {
  data: OnboardingData;
  onComplete: () => void;
  onReferFriend: () => void;
  tone: typeof TONE_STYLES['supportive'];
}) {
  return (
    <div className="max-w-md mx-auto">
      <OnboardingComplete
        parentName={data.parentName}
        childName={data.childName}
        dataPointsCollected={Object.keys(data).filter(k => data[k as keyof OnboardingData]).length * 3}
      />

      <div className="mt-6 space-y-3">
        <Button
          onClick={onComplete}
          className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
          size="lg"
        >
          See {data.childName}'s Plan
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Referral CTA (Fix #7) */}
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gift className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-primary text-sm">Know another parent who needs this?</p>
              <p className="text-xs text-muted-foreground">Share Aminy and get 1 month free</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onReferFriend}
              className="flex-shrink-0"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Demo Overlay (Fix #3)
 */
/**
 * Demo Video Overlay
 *
 * VIDEO URL PLACEHOLDER - Replace with your actual video URL
 * Supported formats:
 * - YouTube: https://www.youtube.com/embed/VIDEO_ID
 * - Vimeo: https://player.vimeo.com/video/VIDEO_ID
 * - Direct MP4: https://your-cdn.com/aminy-demo.mp4
 * - Loom: https://www.loom.com/embed/VIDEO_ID
 *
 * For Gemini Veo 3 generated video:
 * 1. Generate video with prompt (see DEMO_VIDEO_PROMPT below)
 * 2. Upload to YouTube/Vimeo/your CDN
 * 3. Replace DEMO_VIDEO_URL with the embed URL
 */

// ============================================
// 🎬 REPLACE THIS URL WITH YOUR ACTUAL VIDEO
// ============================================
const DEMO_VIDEO_URL = ''; // e.g., 'https://www.youtube.com/embed/YOUR_VIDEO_ID'

/**
 * DEMO VIDEO PROMPT - Full version in: src/assets/VEO3_DEMO_VIDEO_PROMPT.md
 *
 * Quick reference:
 * - Duration: 45-60 seconds
 * - Style: Headspace/Calm meets Pixar emotional storytelling
 * - Colors: Cream (#F5F5F5), Navy (#0D1B2A), Teal (#577590), Mint (#C9EAD9), Amber (#FFE2B6), Lavender (#E6E0F8)
 * - Story arc: Overwhelmed parent → discovers Aminy → gets personalized help → transformation → "You're not alone"
 * - Key scenes: Morning struggle, app discovery, AI response, child succeeds, peaceful evening
 *
 * See VEO3_DEMO_VIDEO_PROMPT.md for the complete 200+ line prompt with:
 * - Detailed scene-by-scene breakdown
 * - Character design specs
 * - Autism representation guidelines
 * - Color palette with hex codes
 * - Animation style notes
 * - Iteration prompts for refinement
 */

function DemoOverlay({
  onClose,
  onGetStarted,
}: {
  onClose: () => void;
  onGetStarted: () => void;
}) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(!DEMO_VIDEO_URL);
  const [fallbackStep, setFallbackStep] = useState(0);

  // Fallback slideshow content (used when no video URL is set)
  const fallbackSteps = [
    {
      title: "Tell us about your child",
      description: "Quick questions help us understand their unique needs",
      visual: "📋 → 🧠",
    },
    {
      title: "Get instant personalized tips",
      description: "Actionable strategies you can try TODAY",
      visual: "💡",
    },
    {
      title: "Ask Aminy anything, anytime",
      description: '"Why does my child do X?" — Get expert answers 24/7',
      visual: "💬",
    },
    {
      title: "Track progress together",
      description: "See growth, celebrate wins, adjust the plan",
      visual: "📈",
    },
  ];

  // Detect video type from URL
  const getVideoEmbed = () => {
    if (!DEMO_VIDEO_URL) return null;

    // YouTube
    if (DEMO_VIDEO_URL.includes('youtube.com') || DEMO_VIDEO_URL.includes('youtu.be')) {
      const videoId = DEMO_VIDEO_URL.includes('embed')
        ? DEMO_VIDEO_URL.split('/embed/')[1]?.split('?')[0]
        : DEMO_VIDEO_URL.split('v=')[1]?.split('&')[0] || DEMO_VIDEO_URL.split('youtu.be/')[1];
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          className="w-full aspect-video rounded-xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsVideoLoaded(true)}
        />
      );
    }

    // Vimeo
    if (DEMO_VIDEO_URL.includes('vimeo.com')) {
      const videoId = DEMO_VIDEO_URL.split('vimeo.com/')[1]?.split('/')[0];
      return (
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`}
          className="w-full aspect-video rounded-xl"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsVideoLoaded(true)}
        />
      );
    }

    // Loom
    if (DEMO_VIDEO_URL.includes('loom.com')) {
      return (
        <iframe
          src={DEMO_VIDEO_URL.replace('/share/', '/embed/')}
          className="w-full aspect-video rounded-xl"
          allowFullScreen
          onLoad={() => setIsVideoLoaded(true)}
        />
      );
    }

    // Direct MP4/video file
    if (DEMO_VIDEO_URL.match(/\.(mp4|webm|mov)$/i)) {
      return (
        <video
          src={DEMO_VIDEO_URL}
          className="w-full aspect-video rounded-xl"
          autoPlay
          controls
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
        >
          Your browser doesn't support video playback.
        </video>
      );
    }

    // Generic iframe embed
    return (
      <iframe
        src={DEMO_VIDEO_URL}
        className="w-full aspect-video rounded-xl"
        allowFullScreen
        onLoad={() => setIsVideoLoaded(true)}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
    >
      <div className="max-w-2xl w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            See How Aminy Works
          </h2>
          <p className="text-white/60 text-sm">
            {showFallback ? '30 seconds to understand how we help' : 'Watch how families like yours find support'}
          </p>
        </div>

        {/* Video or Fallback */}
        {showFallback ? (
          // Fallback slideshow when no video URL
          <Card className="p-6 mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={fallbackStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="text-5xl mb-4">{fallbackSteps[fallbackStep].visual}</div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  {fallbackSteps[fallbackStep].title}
                </h3>
                <p className="text-muted-foreground">
                  {fallbackSteps[fallbackStep].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {fallbackSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFallbackStep(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === fallbackStep ? "bg-accent w-6" : "bg-gray-300"
                  )}
                />
              ))}
            </div>
          </Card>
        ) : (
          // Actual video player
          <div className="mb-6 relative">
            {!isVideoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white/60 text-sm">Loading video...</p>
                </div>
              </div>
            )}
            {getVideoEmbed()}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-3">
          {showFallback && fallbackStep < fallbackSteps.length - 1 ? (
            <>
              <Button
                variant="outline"
                onClick={onGetStarted}
                className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Skip
              </Button>
              <Button
                onClick={() => setFallbackStep(prev => prev + 1)}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : (
            <Button
              onClick={onGetStarted}
              className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
              size="lg"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Time estimate */}
        <p className="text-center text-xs text-white/40 mt-4">
          Takes about 5 minutes • No credit card required
        </p>
      </div>
    </motion.div>
  );
}

export default OnboardingEnhanced;
