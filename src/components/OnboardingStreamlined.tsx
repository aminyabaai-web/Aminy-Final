/**
 * Streamlined 5-Step Onboarding
 *
 * Flow:
 * 1. Welcome + Account (email, parent name)
 * 2. Your Child (name, age, primary concern)
 * 3. ✨ WOW MOMENT - Instant AI insight based on concern
 * 4. Clinical Context (diagnosis, communication, therapies) - framed as partnership
 * 5. Your Personalized Plan + Pricing
 *
 * Key principle: Show value BEFORE asking for more data
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  User,
  Baby,
  Brain,
  Heart,
  MessageSquare,
  Zap,
  Check,
  ChevronRight,
  AlertCircle,
  Loader2,
  Shield,
  RefreshCw,
  Target,
  Calendar,
  Clock,
  Volume2,
  Hand,
  Utensils,
  Moon,
  School,
  HelpCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';

// Types
interface OnboardingData {
  // Step 1
  email: string;
  password: string;
  parentName: string;

  // Step 2
  childName: string;
  childAge: number;
  primaryConcern: string;

  // Step 4 (after wow moment)
  diagnoses: string[];
  communicationLevel: string;
  currentTherapies: string[];

  // Generated
  instantInsight?: string;
  personalizedPlan?: string[];
}

interface OnboardingStreamlinedProps {
  onComplete: (data: OnboardingData) => void;
  initialEmail?: string;
}

// Concern options with icons
const CONCERN_OPTIONS = [
  { id: 'meltdowns', label: 'Meltdowns & behavior', icon: AlertCircle, color: 'text-red-500' },
  { id: 'communication', label: 'Communication & speech', icon: MessageSquare, color: 'text-blue-500' },
  { id: 'routines', label: 'Daily routines', icon: Clock, color: 'text-amber-500' },
  { id: 'anxiety', label: 'Anxiety & emotions', icon: Heart, color: 'text-purple-500' },
  { id: 'sensory', label: 'Sensory challenges', icon: Hand, color: 'text-green-500' },
  { id: 'sleep', label: 'Sleep issues', icon: Moon, color: 'text-indigo-500' },
  { id: 'school', label: 'School & learning', icon: School, color: 'text-cyan-500' },
  { id: 'other', label: 'Something else', icon: HelpCircle, color: 'text-gray-500' },
];

// Diagnosis options
const DIAGNOSIS_OPTIONS = [
  { id: 'autism', label: 'Autism spectrum' },
  { id: 'adhd', label: 'ADHD' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'speech_delay', label: 'Speech/language delay' },
  { id: 'sensory', label: 'Sensory processing' },
  { id: 'developmental', label: 'Developmental delay' },
  { id: 'exploring', label: 'Still exploring / Not sure' },
];

// Communication levels
const COMMUNICATION_OPTIONS = [
  { id: 'verbal', label: 'Fully verbal', description: 'Speaks in sentences' },
  { id: 'limited', label: 'Limited verbal', description: 'Words/short phrases' },
  { id: 'nonverbal', label: 'Nonverbal', description: 'Few or no words' },
  { id: 'aac', label: 'Uses AAC', description: 'Device or picture system' },
];

// Therapy options
const THERAPY_OPTIONS = [
  { id: 'aba', label: 'ABA therapy' },
  { id: 'speech', label: 'Speech therapy' },
  { id: 'ot', label: 'Occupational therapy' },
  { id: 'pt', label: 'Physical therapy' },
  { id: 'counseling', label: 'Counseling/therapy' },
  { id: 'none', label: 'None currently' },
];

// AI-generated insights based on concern + age
function generateInstantInsight(concern: string, age: number, childName: string): string {
  const insights: Record<string, string> = {
    meltdowns: `For ${age}-year-olds like ${childName}, meltdowns often happen when they're overwhelmed or can't communicate what they need. Research shows that **giving a 5-minute warning before transitions** can reduce meltdowns by up to 50%. Try saying: "In 5 minutes, we're going to [next activity]. What would you like to do for these last 5 minutes?"`,

    communication: `At age ${age}, children are still developing their communication skills. For ${childName}, try the **"wait and watch" technique**: when they want something, pause for 5-10 seconds before jumping in. This gives them space to attempt communication. Even a point or sound is progress worth celebrating!`,

    routines: `${age}-year-olds thrive on predictability. For ${childName}, a **visual schedule** can be transformative - it shows what's coming next and reduces anxiety about transitions. Start with just 3-4 pictures for your hardest routine (morning or bedtime).`,

    anxiety: `Anxiety in ${age}-year-olds often shows up as avoidance, clinginess, or physical complaints. For ${childName}, try the **"worry time" technique**: set aside 10 minutes daily where it's okay to talk about worries. Outside that time, gently redirect: "Let's save that for worry time."`,

    sensory: `Sensory needs are real and valid. For ${childName} at age ${age}, creating a **sensory toolkit** can help - a box with fidgets, headphones, sunglasses, chewy snacks. When overwhelmed, offer the toolkit instead of asking "what's wrong?"`,

    sleep: `Sleep challenges are incredibly common. For ${age}-year-olds like ${childName}, a **consistent 30-minute wind-down routine** (same activities, same order, same time) signals to the brain it's time for sleep. Dim lights 30 mins before bed to boost natural melatonin.`,

    school: `School challenges at age ${age} often stem from sensory overload, social confusion, or academic gaps. For ${childName}, try a **daily check-in ritual**: "What was the best part? What was hard?" This opens communication without pressure.`,

    other: `Every child is unique, and ${childName}'s challenges deserve personalized support. The key is consistency and patience. Let's learn more about what's going on so I can give you specific strategies that will actually help.`,
  };

  return insights[concern] || insights.other;
}

// Generate personalized plan based on all data
function generatePersonalizedPlan(data: OnboardingData): string[] {
  const plan: string[] = [];

  // Day 1-2: Based on primary concern
  if (data.primaryConcern === 'meltdowns') {
    plan.push('Day 1: Set up transition warnings - practice "5 more minutes" today');
    plan.push('Day 2: Create a simple calm-down corner with 3-4 comfort items');
  } else if (data.primaryConcern === 'communication') {
    plan.push('Day 1: Practice the "wait and watch" technique during one routine');
    plan.push('Day 2: Add simple choices to reduce frustration ("apple or banana?")');
  } else if (data.primaryConcern === 'routines') {
    plan.push('Day 1: Create a visual schedule for your hardest routine');
    plan.push('Day 2: Add a "first-then" board for transitions');
  } else {
    plan.push('Day 1: Observe and note triggers - what happened before challenges?');
    plan.push('Day 2: Try one small change based on your observations');
  }

  // Day 3-4: Based on communication level
  if (data.communicationLevel === 'nonverbal' || data.communicationLevel === 'limited') {
    plan.push('Day 3: Introduce visual supports for daily requests');
    plan.push('Day 4: Practice honoring all communication attempts');
  } else {
    plan.push('Day 3: Use emotion coaching - name feelings out loud');
    plan.push('Day 4: Practice "I notice" statements instead of questions');
  }

  // Day 5-7: Building habits
  plan.push('Day 5: Review what worked - celebrate small wins');
  plan.push('Day 6: Adjust strategies based on your observations');
  plan.push('Day 7: Weekly reflection + set one goal for next week');

  return plan;
}

export function OnboardingStreamlined({ onComplete, initialEmail = '' }: OnboardingStreamlinedProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true); // Start loading to check auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    email: initialEmail,
    password: '',
    parentName: '',
    childName: '',
    childAge: 0,
    primaryConcern: '',
    diagnoses: [],
    communicationLevel: '',
    currentTherapies: [],
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // User is already logged in - skip step 1
          setIsAuthenticated(true);
          updateData({
            email: user.email || '',
            parentName: user.user_metadata?.full_name || user.user_metadata?.name || '',
          });
          setStep(2); // Start at step 2 (child info)
        }
      } catch (e) {
        console.error('Auth check error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Generate insight when moving to step 3
  useEffect(() => {
    if (step === 3 && data.childName && data.childAge && data.primaryConcern && !data.instantInsight) {
      const insight = generateInstantInsight(data.primaryConcern, data.childAge, data.childName);
      updateData({ instantInsight: insight });
    }
  }, [step, data.childName, data.childAge, data.primaryConcern]);

  // Generate plan when moving to step 5
  useEffect(() => {
    if (step === 5 && !data.personalizedPlan) {
      const plan = generatePersonalizedPlan(data);
      updateData({ personalizedPlan: plan });
    }
  }, [step]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.email && data.password && data.password.length >= 6 && data.parentName;
      case 2:
        return data.childName && data.childAge > 0 && data.primaryConcern;
      case 3:
        return true; // Just viewing insight
      case 4:
        return data.communicationLevel; // Minimum for clinical value
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      // Create account
      setIsLoading(true);
      setError(null);

      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.parentName,
            }
          }
        });

        if (authError) throw authError;

        setStep(2);
      } catch (e: any) {
        setError(e.message || 'Failed to create account');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 5) {
      // Complete onboarding
      setIsLoading(true);

      try {
        // Save profile data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            name: data.parentName,
            has_completed_onboarding: true,
            onboarding_data: {
              childName: data.childName,
              childAge: data.childAge,
              primaryConcern: data.primaryConcern,
              diagnoses: data.diagnoses,
              communicationLevel: data.communicationLevel,
              currentTherapies: data.currentTherapies,
            }
          });

          // Create child record
          await supabase.from('children').insert({
            parent_id: user.id,
            name: data.childName,
            age_years: data.childAge,
            diagnoses: data.diagnoses,
            communication_level: data.communicationLevel,
            current_therapies: data.currentTherapies,
            is_primary: true,
          });
        }

        onComplete(data);
      } catch (e: any) {
        setError(e.message);
        setIsLoading(false);
      }
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    // Don't go back to step 1 if user is already authenticated
    const minStep = isAuthenticated ? 2 : 1;
    if (step > minStep) setStep(step - 1);
  };

  // Progress bar - for authenticated users, steps 2-5 become steps 1-4
  const totalSteps = isAuthenticated ? 4 : 5;
  const currentStep = isAuthenticated ? step - 1 : step;
  const progress = (currentStep / totalSteps) * 100;

  // Show loading while checking auth
  if (isLoading && step === 1 && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <motion.div
          className="h-full bg-teal-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        {(isAuthenticated ? step > 2 : step > 1) ? (
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: Account Creation */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to Aminy
                  </h1>
                  <p className="text-gray-600">
                    Your AI partner for calmer days and confident parenting
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your email
                    </label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Create a password
                    </label>
                    <input
                      type="password"
                      value={data.password}
                      onChange={(e) => updateData({ password: e.target.value })}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      What should I call you?
                    </label>
                    <input
                      type="text"
                      value={data.parentName}
                      onChange={(e) => updateData({ parentName: e.target.value })}
                      placeholder="Your first name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* STEP 2: Your Child */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Tell me about your child
                  </h1>
                  <p className="text-gray-600">
                    Just the basics so I can give you something helpful right away
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Child's first name
                    </label>
                    <input
                      type="text"
                      value={data.childName}
                      onChange={(e) => updateData({ childName: e.target.value })}
                      placeholder="Their first name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      How old are they?
                    </label>
                    <select
                      value={data.childAge || ''}
                      onChange={(e) => updateData({ childAge: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">Select age</option>
                      {[...Array(17)].map((_, i) => (
                        <option key={i + 2} value={i + 2}>{i + 2} years old</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      What's hardest right now?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONCERN_OPTIONS.map((concern) => {
                        const Icon = concern.icon;
                        const isSelected = data.primaryConcern === concern.id;
                        return (
                          <button
                            key={concern.id}
                            onClick={() => updateData({ primaryConcern: concern.id })}
                            className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
                              isSelected
                                ? 'bg-teal-50 border-2 border-teal-500'
                                : 'bg-white border-2 border-gray-200 hover:border-teal-300'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-teal-600' : concern.color}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>
                              {concern.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: WOW MOMENT - Instant Insight */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">
                    Here's something that might help
                  </h1>
                  <p className="text-sm text-gray-500">
                    Based on what you've shared about {data.childName}
                  </p>
                </div>

                <Card className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-800 leading-relaxed"
                         dangerouslySetInnerHTML={{
                           __html: data.instantInsight?.replace(/\*\*(.*?)\*\*/g, '<strong class="text-teal-700">$1</strong>') || ''
                         }}
                      />
                    </div>
                  </div>
                </Card>

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="font-medium text-gray-900">This is just the beginning</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    The more I learn about {data.childName}, the more personalized my suggestions become.
                    I'll remember everything and adapt as things change. <strong>We're partners in this.</strong>
                  </p>
                </div>

                <p className="text-center text-sm text-gray-500">
                  Ready for a more personalized plan? Just a few more questions.
                </p>
              </motion.div>
            )}

            {/* STEP 4: Clinical Context (after wow moment) */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h1 className="text-xl font-bold text-gray-900 mb-2">
                    Help me understand {data.childName} better
                  </h1>
                  <p className="text-sm text-gray-600">
                    This helps me give you strategies that actually work
                  </p>
                </div>

                {/* Diagnoses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Any diagnoses? <span className="text-gray-400">(select all that apply)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DIAGNOSIS_OPTIONS.map((dx) => {
                      const isSelected = data.diagnoses.includes(dx.id);
                      return (
                        <button
                          key={dx.id}
                          onClick={() => {
                            if (isSelected) {
                              updateData({ diagnoses: data.diagnoses.filter(d => d !== dx.id) });
                            } else {
                              updateData({ diagnoses: [...data.diagnoses, dx.id] });
                            }
                          }}
                          className={`px-3 py-2 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-teal-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {dx.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Communication Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How does {data.childName} communicate?
                  </label>
                  <div className="space-y-2">
                    {COMMUNICATION_OPTIONS.map((opt) => {
                      const isSelected = data.communicationLevel === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => updateData({ communicationLevel: opt.id })}
                          className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-teal-50 border-2 border-teal-500'
                              : 'bg-white border-2 border-gray-200 hover:border-teal-300'
                          }`}
                        >
                          <div>
                            <p className={`font-medium ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-gray-500">{opt.description}</p>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-teal-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Current Therapies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current support? <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {THERAPY_OPTIONS.map((therapy) => {
                      const isSelected = data.currentTherapies.includes(therapy.id);
                      return (
                        <button
                          key={therapy.id}
                          onClick={() => {
                            if (isSelected) {
                              updateData({ currentTherapies: data.currentTherapies.filter(t => t !== therapy.id) });
                            } else {
                              // Remove "none" if selecting a therapy, or remove therapies if selecting "none"
                              if (therapy.id === 'none') {
                                updateData({ currentTherapies: ['none'] });
                              } else {
                                updateData({ currentTherapies: [...data.currentTherapies.filter(t => t !== 'none'), therapy.id] });
                              }
                            }
                          }}
                          className={`px-3 py-2 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-teal-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {therapy.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Everything you share stays private and secure. I use this to personalize
                      your experience - not to judge. You can update this anytime.
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* STEP 5: Personalized Plan + Pricing */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">
                    {data.childName}'s 7-Day Starter Plan
                  </h1>
                  <p className="text-sm text-gray-500">
                    Personalized for a {data.childAge}-year-old with {data.primaryConcern.replace('_', ' ')} challenges
                  </p>
                </div>

                <Card className="p-4 bg-white">
                  <div className="space-y-3">
                    {data.personalizedPlan?.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          i < 2 ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className="text-xs font-medium">{i + 1}</span>
                        </div>
                        <p className="text-sm text-gray-700">{item.replace(/^Day \d+: /, '')}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-5 text-white">
                  <h3 className="font-semibold mb-2">Start your free trial</h3>
                  <ul className="space-y-2 text-sm opacity-90 mb-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      7 days of full access
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Personalized AI support 24/7
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Daily strategies for {data.childName}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Cancel anytime, no commitment
                    </li>
                  </ul>
                  <p className="text-xs opacity-75">
                    Then $14.99/month · HSA/FSA eligible
                  </p>
                </div>

                <p className="text-center text-xs text-gray-500">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer with CTA */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              step === 3
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                : step === 5
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600'
                : 'bg-teal-600 hover:bg-teal-700'
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {step === 1 ? 'Creating account...' : 'Saving...'}
              </span>
            ) : step === 1 ? (
              'Create Account'
            ) : step === 2 ? (
              'Show Me Something Helpful'
            ) : step === 3 ? (
              "Yes, Let's Personalize This"
            ) : step === 4 ? (
              'Create My Plan'
            ) : (
              'Start My Free Trial'
            )}
          </Button>

          {step === 3 && (
            <button
              onClick={() => setStep(5)}
              className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingStreamlined;
