/**
 * Quick Start Onboarding (3 Steps to Value)
 *
 * Radically shortened onboarding that gets parents to their first
 * "WOW" moment in under 60 seconds:
 *
 * Step 1: "What's your child's first name?" + age slider
 * Step 2: "What's your biggest concern right now?" (3 quick-pick buttons)
 * Step 3: IMMEDIATE Junior activity OR Ask Aminy chat
 *
 * All remaining data (email, diagnosis, goals, focus areas, insurance)
 * is collected progressively through:
 * - Post-first-activity signup prompt
 * - AI conversation fact extraction
 * - Settings/profile completion nudges
 *
 * This replaces the 8-12 step OnboardingEnhanced for new users.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  Sparkles,
  MessageCircle,
  Gamepad2,
  Heart,
  Brain,
  Volume2,
  HandHeart,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface QuickStartData {
  childName: string;
  childAge: number;
  primaryConcern: string;
  destination: 'junior' | 'chat';
}

interface OnboardingQuickStartProps {
  onComplete: (data: QuickStartData) => void;
  onSkipToLogin?: () => void;
  isAuthenticated?: boolean;
}

const CONCERNS = [
  { id: 'speech', label: 'Speech & Communication', icon: Volume2, color: 'from-blue-500 to-cyan-500' },
  { id: 'behavior', label: 'Behavior & Meltdowns', icon: Brain, color: 'from-purple-500 to-pink-500' },
  { id: 'social', label: 'Social Skills', icon: HandHeart, color: 'from-teal-500 to-green-500' },
  { id: 'daily', label: 'Daily Routines', icon: Heart, color: 'from-orange-500 to-amber-500' },
];

export function OnboardingQuickStart({
  onComplete,
  onSkipToLogin,
  isAuthenticated = false,
}: OnboardingQuickStartProps) {
  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState(5);
  const [concern, setConcern] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input
  useEffect(() => {
    if (step === 1) {
      setTimeout(() => nameInputRef.current?.focus(), 300);
    }
  }, [step]);

  const handleNameSubmit = useCallback(() => {
    if (childName.trim().length >= 1) {
      setStep(2);
    }
  }, [childName]);

  const handleConcernSelect = useCallback((concernId: string) => {
    setConcern(concernId);
    setStep(3);
  }, []);

  const handleDestination = useCallback((dest: 'junior' | 'chat') => {
    onComplete({
      childName: childName.trim(),
      childAge,
      primaryConcern: concern,
      destination: dest,
    });
  }, [childName, childAge, concern, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex flex-col">
      {/* Progress indicator */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-2 max-w-xs mx-auto">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-teal-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        {onSkipToLogin && !isAuthenticated && (
          <div className="text-center mt-2">
            <button
              onClick={onSkipToLogin}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Already have an account? Log in
            </button>
          </div>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* STEP 1: Child's name + age */}
        {step === 1 && (
          <div className="w-full max-w-sm text-center animate-in fade-in slide-in-from-right duration-500">
            {/* Aminy logo/icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Let&apos;s meet your child
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Just two quick things to get started
            </p>

            <div className="space-y-6">
              {/* Child name */}
              <div>
                <label htmlFor="child-name" className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Your child&apos;s first name
                </label>
                <input
                  ref={nameInputRef}
                  id="child-name"
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  placeholder="e.g., Alex"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-lg transition-all"
                  autoComplete="off"
                  aria-describedby="name-hint"
                />
                <p id="name-hint" className="text-xs text-gray-400 mt-1 text-left">
                  First name only — we keep everything private
                </p>
              </div>

              {/* Age slider */}
              <div>
                <label htmlFor="child-age" className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Age: <span className="text-teal-600 font-bold">{childAge} years old</span>
                </label>
                <input
                  id="child-age"
                  type="range"
                  min={2}
                  max={18}
                  value={childAge}
                  onChange={(e) => setChildAge(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  aria-valuemin={2}
                  aria-valuemax={18}
                  aria-valuenow={childAge}
                  aria-label={`Child's age: ${childAge} years`}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>2</span>
                  <span>18</span>
                </div>
              </div>

              {/* Continue */}
              <button
                onClick={handleNameSubmit}
                disabled={childName.trim().length < 1}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Primary concern */}
        {step === 2 && (
          <div className="w-full max-w-sm text-center animate-in fade-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              What&apos;s on your mind most?
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              About {childName} — pick the biggest one
            </p>

            <div className="space-y-3">
              {CONCERNS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleConcernSelect(c.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all active:scale-[0.98] text-left group"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <c.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-gray-800">{c.label}</span>
                  <ArrowRight size={16} className="ml-auto text-gray-400 group-hover:text-teal-500 transition-colors" />
                </button>
              ))}
            </div>

            {/* Back button */}
            <button
              onClick={() => setStep(1)}
              className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {/* STEP 3: Choose destination */}
        {step === 3 && (
          <div className="w-full max-w-sm text-center animate-in fade-in slide-in-from-right duration-500">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Perfect. Let&apos;s start helping {childName}.
              </h2>
              <p className="text-gray-500 text-sm">
                Pick how you&apos;d like to begin
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Junior activity */}
              <button
                onClick={() => handleDestination('junior')}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white text-left hover:from-cyan-600 hover:to-teal-700 transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20"
              >
                <div className="flex items-start gap-3">
                  <Gamepad2 className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-base">Start an Activity</div>
                    <div className="text-sm text-white/80 mt-0.5">
                      Fun, evidence-based games for {childName} — takes 2 minutes
                    </div>
                  </div>
                </div>
                <div className="text-xs text-white/60 mt-3 flex items-center gap-1">
                  <Sparkles size={12} /> Recommended for first visit
                </div>
              </button>

              {/* Option 2: Talk to Aminy */}
              <button
                onClick={() => handleDestination('chat')}
                className="w-full p-5 rounded-2xl bg-white border-2 border-gray-200 text-left hover:border-teal-300 hover:bg-teal-50/30 transition-all active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900 text-base">Talk to Aminy AI</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      Get personalized guidance about {concern === 'speech' ? 'speech' : concern === 'behavior' ? 'behavior' : concern === 'social' ? 'social skills' : 'routines'}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Privacy note */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Shield size={12} />
              <span>HIPAA-encrypted • No data shared without consent</span>
            </div>

            {/* Back button */}
            <button
              onClick={() => setStep(2)}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingQuickStart;
