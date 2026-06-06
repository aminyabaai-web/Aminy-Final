// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Conversational Booking Flow
 * Inspired by One Medical's AI-driven "Book a Visit" chat experience
 * Replaces form-based scheduling with natural conversation
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Calendar,
  User,
  Clock,
  ChevronRight,
  ArrowLeft,
  Check,
  MessageSquare,
  Target,
  Heart,
  Brain,
  Dumbbell,
  HelpCircle,
  Video,
  Phone,
  MapPin,
  Loader2
} from 'lucide-react';
import { AvailabilityPicker, TimeSlot } from './AvailabilityPicker';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from '../lib/demo-seed';
import { toast } from 'sonner';
import { SESSION_PRICING } from '../lib/pricing';
import { checkEligibility, type EligibilityResult } from '../lib/benefits-service';
import { createOneTimePayment } from '../lib/stripe-service';
import { Shield, FileText, DollarSign } from 'lucide-react';

// Types
type BookingStep = 'concern' | 'history' | 'provider-pref' | 'insurance-check' | 'time-select' | 'details' | 'confirm';

interface BookingState {
  step: BookingStep;
  concern?: ConcernType;
  isNewConcern?: boolean;
  relatedGoal?: string;
  providerPreference?: 'assigned' | 'any-available';
  selectedProvider?: Provider;
  selectedSlot?: TimeSlot;
  visitType?: 'video' | 'phone';
  notes?: string;
}

interface ConcernType {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  mapsTo: 'bcba' | 'slp' | 'ot' | 'parent-coach' | 'any';
}

interface Provider {
  id: string;
  name: string;
  title: string;
  specialty: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  nextAvailable: string;
  isAssigned?: boolean;
}

interface Goal {
  id: string;
  title: string;
  status: 'active' | 'completed';
}

interface ConversationalBookingProps {
  childName: string;
  assignedProvider?: Provider;
  childGoals?: Goal[];
  onComplete?: (booking?: BookingState) => void;
  onCancel?: () => void;
  onBack?: () => void;
  userId?: string;
  childId?: string;
}

// Concern Options
const CONCERN_OPTIONS: ConcernType[] = [
  {
    id: 'behavior',
    label: 'Behavior concern',
    icon: <Target className="w-5 h-5" />,
    description: 'Meltdowns, aggression, self-injury, or challenging behaviors',
    mapsTo: 'bcba',
  },
  {
    id: 'speech',
    label: 'Speech & Communication',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Language delays, articulation, AAC, or social communication',
    mapsTo: 'slp',
  },
  {
    id: 'motor',
    label: 'Motor Skills',
    icon: <Dumbbell className="w-5 h-5" />,
    description: 'Fine motor, gross motor, sensory processing, or daily living skills',
    mapsTo: 'ot',
  },
  {
    id: 'parent-support',
    label: 'Parent Coaching',
    icon: <Heart className="w-5 h-5" />,
    description: 'General guidance, stress management, or family strategies',
    mapsTo: 'parent-coach',
  },
  {
    id: 'other',
    label: 'Something else',
    icon: <HelpCircle className="w-5 h-5" />,
    description: 'Not sure or multiple concerns',
    mapsTo: 'any',
  },
];

const LIVE_TELEHEALTH_STATES = new Set(['AZ', 'MT', 'TX']);

// Sample providers — shown ONLY in demo mode (investor/partner walk-throughs).
// In production an empty/error result yields [] + a real empty state so a fake
// provider id can never reach Stripe checkout.
const FALLBACK_PROVIDERS: Provider[] = [
  {
    id: 'bcba-1',
    name: 'Dr. Sarah Chen',
    title: 'BCBA-D',
    specialty: 'Behavior Analysis',
    rating: 4.9,
    reviewCount: 47,
    nextAvailable: 'Licensed in AZ',
    isAssigned: true,
  },
];

/**
 * Calculate session price based on provider type and duration
 */
function getSessionPrice(providerType: string, duration: number = 60): { price: number; providerPay: number } {
  // Map provider type to session pricing
  const typeMap: Record<string, string> = {
    'bcba': duration <= 60 ? 'bcba_consult' : 'bcba_assessment',
    'bcba-d': duration <= 60 ? 'bcba_consult' : 'bcba_assessment',
    'rbt': duration <= 30 ? 'rbt_session' : 'rbt_extended',
    'lpc': duration <= 45 ? 'therapist_45' : 'therapist_60',
    'lcsw': duration <= 45 ? 'therapist_45' : 'therapist_60',
    'slp': 'slp_session',
    'ot': 'ot_session',
  };

  const sessionType = typeMap[providerType.toLowerCase()] || 'bcba_consult';
  const pricing = SESSION_PRICING[sessionType as keyof typeof SESSION_PRICING];

  return pricing ? { price: pricing.price, providerPay: pricing.providerPay } : { price: 149, providerPay: 60 };
}

/**
 * Save booking to database
 */
async function saveBookingToDatabase(booking: {
  userId: string;
  providerId: string;
  childId?: string;
  sessionType: string;
  scheduledAt: string;
  concern: string;
  notes?: string;
  visitType: 'video' | 'phone';
  price: number;
  providerPay: number;
}): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    const platformFee = booking.price - booking.providerPay;

    const { data, error } = await supabase
      .from('marketplace_bookings')
      .insert({
        user_id: booking.userId,
        provider_id: booking.providerId,
        child_id: booking.childId || null,
        session_type: booking.sessionType,
        session_duration_minutes: 60,
        scheduled_at: booking.scheduledAt,
        concern: booking.concern,
        notes: booking.notes,
        status: 'confirmed',
        price: booking.price,
        provider_payout: booking.providerPay,
        platform_fee: platformFee,
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving booking:', error);
      return { success: false, error: error.message };
    }

    return { success: true, bookingId: data.id };
  } catch (e: unknown) {
    console.error('Booking save failed:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Chat Message Component
function ChatMessage({
  isAI,
  children,
  animate = true
}: {
  isAI: boolean;
  children: React.ReactNode;
  animate?: boolean;
}) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
    >
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isAI
            ? 'border border-[#E8E4DF] bg-white/95 text-[#1B2733] shadow-sm'
            : 'bg-primary text-white shadow-sm'
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

// Quick Option Chip
function OptionChip({
  selected,
  onClick,
  children,
  icon
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all shadow-sm ${
        selected
          ? 'border-2 border-[#6B9080] bg-primary text-white'
          : 'border border-[#E8E4DF] bg-[#FAF7F2] text-[#3A4A57] hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10'
      }`}
    >
      {icon && <span className={selected ? 'text-white' : 'text-[#6B9080]'}>{icon}</span>}
      <span className="font-medium">{children}</span>
      {selected && <Check className="w-4 h-4 ml-auto" />}
    </motion.button>
  );
}

// Provider Card Mini
function ProviderCardMini({
  provider,
  selected,
  onClick
}: {
  provider: Provider;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all shadow-sm ${
        selected
          ? 'border-2 border-[#6B9080] bg-[#6B9080]/10'
          : 'border border-[#E8E4DF] bg-white/95 hover:border-[#6B9080]/20 hover:bg-[#6B9080]/10/70'
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6B9080] to-[#43AA8B] flex items-center justify-center text-white font-bold text-lg">
        {provider.name.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[#1B2733] truncate">{provider.name}</p>
          {provider.isAssigned && (
            <span className="text-xs bg-[#6B9080]/10 text-[#6B9080] px-2 py-0.5 rounded-full">
              Your Provider
            </span>
          )}
        </div>
        <p className="text-sm text-[#5A6B7A]">{provider.title} · {provider.specialty}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-amber-600">★ {provider.rating}</span>
          <span className="text-xs text-[#8A9BA8]">({provider.reviewCount} reviews)</span>
          <span className="text-xs text-[#6B9080] ml-auto">Next: {provider.nextAvailable}</span>
        </div>
      </div>
      {selected && <Check className="w-5 h-5 text-[#6B9080] flex-shrink-0" />}
    </motion.button>
  );
}

// Main Component
export function ConversationalBooking({
  childName,
  assignedProvider: propAssignedProvider,
  childGoals: propChildGoals,
  onComplete,
  onCancel,
  userId,
  childId
}: ConversationalBookingProps & { userId?: string; childId?: string }) {
  const [state, setState] = useState<BookingState>({ step: 'concern' });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [childGoals, setChildGoals] = useState<Goal[]>(propChildGoals || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [insuranceResult, setInsuranceResult] = useState<EligibilityResult | null>(null);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [generateSuperbill, setGenerateSuperbill] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load providers from database
  useEffect(() => {
    async function loadProviders() {
      try {
        const { data, error } = await supabase
          .from('provider_profiles')
          .select(`
            id,
            full_name,
            name,
            credentials,
            provider_type,
            specialties,
            bio,
            rating,
            review_count,
            verified,
            accepting_new_patients,
            offers_telehealth,
            license_state,
            state,
            hourly_rate
          `)
          .eq('verified', true)
          .eq('accepting_new_patients', true)
          .eq('offers_telehealth', true)
          .limit(20);

        if (error) {
          console.error('Error loading providers:', error.message);
          setProviders(isDemoMode() ? FALLBACK_PROVIDERS : []);
        } else if (data && data.length > 0) {
          const supportedProviders = data
            .filter((provider: { license_state?: string | null; state?: string | null }) => {
              const providerState = (provider.license_state || provider.state || '').toUpperCase();
              return LIVE_TELEHEALTH_STATES.has(providerState);
            })
            .map((p: {
              id: string;
              full_name?: string | null;
              name?: string | null;
              credentials?: string | null;
              provider_type?: string | null;
              specialties?: string[] | null;
              rating?: number | string | null;
              review_count?: number | null;
              license_state?: string | null;
              state?: string | null;
            }) => ({
              id: p.id,
              name: p.full_name || p.name || 'Provider',
              title: p.credentials || 'Provider',
              specialty: p.specialties?.[0] || p.provider_type || 'General',
              rating: typeof p.rating === 'number' ? p.rating : parseFloat(String(p.rating || 4.8)) || 4.8,
              reviewCount: p.review_count || 0,
              nextAvailable: p.license_state || p.state ? `Licensed in ${(p.license_state || p.state)?.toUpperCase()}` : 'Telehealth available',
              isAssigned: false,
            }));

          setProviders(supportedProviders.length > 0 ? supportedProviders : (isDemoMode() ? FALLBACK_PROVIDERS : []));
        } else {
          setProviders(isDemoMode() ? FALLBACK_PROVIDERS : []);
        }
      } catch (e) {
        console.error('Failed to load providers:', e);
        setProviders(isDemoMode() ? FALLBACK_PROVIDERS : []);
      } finally {
        setIsLoading(false);
      }
    }

    loadProviders();
  }, []);

  // Load goals if we have a child ID
  useEffect(() => {
    async function loadGoals() {
      if (!childId) return;

      try {
        const { data } = await supabase
          .from('goals')
          .select('id, title, status')
          .eq('child_id', childId)
          .eq('status', 'active')
          .limit(10);

        if (data && data.length > 0) {
          setChildGoals(data.map(g => ({
            id: g.id,
            title: g.title,
            status: g.status as 'active' | 'completed',
          })));
        }
      } catch (e) {
        console.error('Failed to load goals:', e);
      }
    }

    loadGoals();
  }, [childId]);

  const assignedProvider = propAssignedProvider?.isAssigned ? propAssignedProvider : undefined;

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.step, state.concern, state.selectedProvider]);

  const updateState = (updates: Partial<BookingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goBack = () => {
    const steps: BookingStep[] = ['concern', 'history', 'provider-pref', 'insurance-check', 'time-select', 'details', 'confirm'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex > 0) {
      updateState({ step: steps[currentIndex - 1] });
    } else {
      onCancel?.();
    }
  };

  const handleConcernSelect = (concern: ConcernType) => {
    updateState({ concern, step: 'history' });
  };

  const handleHistorySelect = (isNew: boolean, goalId?: string) => {
    updateState({
      isNewConcern: isNew,
      relatedGoal: goalId,
      step: 'provider-pref'
    });
  };

  const handleProviderPrefSelect = (pref: 'assigned' | 'any-available', provider?: Provider) => {
    updateState({
      providerPreference: pref,
      selectedProvider: provider || (pref === 'assigned' ? assignedProvider : undefined),
      step: 'insurance-check'
    });

    // Run insurance eligibility check in background
    runInsuranceCheck();
  };

  const runInsuranceCheck = async () => {
    setInsuranceLoading(true);
    try {
      // Load user's state + insurance from Supabase profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('state, child_age')
          .eq('id', user.id)
          .single();

        if (profile?.state) {
          const result = await checkEligibility(
            profile.state,
            profile.child_age || 8,
            []
          );
          setInsuranceResult(result);
          return;
        }
      }
      // No profile data — show self-pay option
      setInsuranceResult(null);
    } catch (e) {
      console.error('Insurance check failed:', e);
      setInsuranceResult(null);
    } finally {
      setInsuranceLoading(false);
    }
  };

  const handleInsuranceNext = () => {
    updateState({ step: 'time-select' });
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    updateState({ selectedSlot: slot, step: 'details' });
  };

  const handleDetailsSubmit = (visitType: 'video' | 'phone', notes?: string) => {
    updateState({ visitType, notes, step: 'confirm' });
  };

  const handleConfirm = async () => {
    if (!state.selectedProvider || !state.selectedSlot) {
      toast.error('Please select a provider and time slot');
      return;
    }

    setIsSaving(true);

    try {
      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }

      if (!currentUserId) {
        toast.error('Please sign in to book a session');
        setIsSaving(false);
        return;
      }

      // Calculate pricing based on provider type
      const { price, providerPay } = getSessionPrice(state.selectedProvider.title, 60);

      // Save to database
      const result = await saveBookingToDatabase({
        userId: currentUserId,
        providerId: state.selectedProvider.id,
        childId: childId,
        sessionType: state.visitType || 'video',
        scheduledAt: state.selectedSlot.startTime,
        concern: state.concern?.label || 'General consultation',
        notes: state.notes,
        visitType: state.visitType || 'video',
        price,
        providerPay,
      });

      if (result.success && result.bookingId) {
        // Redirect to Stripe Checkout to collect payment for the just-created booking.
        // Webhook (checkout.session.completed) will mark payment_status='paid' once
        // the user completes checkout.
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const email = user?.email;
          if (!email) {
            toast.error('Could not load your account email — please refresh and try again.');
            return;
          }
          const origin = window.location.origin;
          const { url } = await createOneTimePayment({
            userId: currentUserId,
            email,
            amount: Math.round(price * 100), // cents
            description: `${state.selectedProvider.title} with ${state.selectedProvider.name}`,
            metadata: {
              type: 'marketplace_booking',
              booking_id: result.bookingId,
              provider_id: state.selectedProvider.id,
              session_type: state.visitType || 'video',
              scheduled_at: state.selectedSlot.startTime,
            },
            successUrl: `${origin}/?screen=my-appointments&payment=success`,
            cancelUrl: `${origin}/?screen=conversational-booking&payment=cancelled`,
          });
          if (url) {
            window.location.href = url;
            return;
          }
          toast.error('Could not start payment. Your booking is held — please contact support.');
        } catch (payErr) {
          console.error('Stripe checkout failed:', payErr);
          toast.error('Payment setup failed. Your booking is held — please contact support.');
        }
      } else {
        toast.error(result.error || 'Failed to book session. Please try again.');
      }
    } catch (e: unknown) {
      console.error('Booking failed:', e);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get recommended providers based on concern
  const getRecommendedProviders = () => {
    const availableProviders = providers.length > 0 ? providers : FALLBACK_PROVIDERS;
    if (!state.concern) return availableProviders;
    return availableProviders.filter(p => {
      if (state.concern?.mapsTo === 'any') return true;
      if (state.concern?.mapsTo === 'bcba') return p.specialty.toLowerCase().includes('behavior') || p.title.toLowerCase().includes('bcba');
      if (state.concern?.mapsTo === 'slp') return p.specialty.toLowerCase().includes('speech') || p.title.toLowerCase().includes('slp');
      if (state.concern?.mapsTo === 'ot') return p.specialty.toLowerCase().includes('occupational') || p.title.toLowerCase().includes('ot');
      return true;
    });
  };

  const recommendedProviders = getRecommendedProviders();
  const featuredProvider = assignedProvider || recommendedProviders[0] || providers[0] || (isDemoMode() ? FALLBACK_PROVIDERS[0] : undefined);
  const hasAssignedProvider = Boolean(assignedProvider?.isAssigned);
  const stepOrder: BookingStep[] = ['concern', 'history', 'provider-pref', 'insurance-check', 'time-select', 'details', 'confirm'];
  const currentStepIndex = stepOrder.indexOf(state.step);

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background:
          'radial-gradient(circle at top, rgba(153,246,228,0.22), transparent 42%), linear-gradient(180deg,#f5fbfa 0%,#ffffff 38%,#f8fafc 100%)',
      }}
    >
      {/* Header */}
      <div className="border-b border-[#E8E4DF]/80 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-start gap-3">
          <button
            onClick={goBack}
            className="rounded-2xl border border-[#E8E4DF] bg-white p-2.5 transition-colors hover:bg-[#FAF7F2]"
          >
            <ArrowLeft className="h-5 w-5 text-[#5A6B7A]" />
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B9080]">Guided booking</p>
                <h2 className="text-lg font-semibold text-[#1B2733] sm:text-xl">Book calm, supportive care</h2>
                <p className="mt-1 text-sm text-[#5A6B7A]">
                  We will keep this simple for {childName} and only show providers available in supported states.
                </p>
              </div>
              <div className="ml-auto rounded-2xl border border-[#E8E4DF] bg-[#6B9080]/10/80 px-3 py-2 text-xs text-[#6B9080]">
                AZ, MT, and TX cash-pay telehealth are available now.
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {stepOrder.map((step, i) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    currentStepIndex >= i ? 'bg-primary' : 'bg-[#E8E4DF]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
        {/* Step 1: Concern Selection */}
        <ChatMessage isAI>
          <p className="font-medium">Let&apos;s match today&apos;s concern to the right kind of support.</p>
          <p className="mt-1 text-[#5A6B7A]">Choose what feels most urgent right now. You can still change it in the next step.</p>
        </ChatMessage>

        <div className="grid gap-2 ml-11">
          {CONCERN_OPTIONS.map((concern) => (
            <OptionChip
              key={concern.id}
              selected={state.concern?.id === concern.id}
              onClick={() => handleConcernSelect(concern)}
              icon={concern.icon}
            >
              <div>
                <p className="font-medium">{concern.label}</p>
                <p className="text-xs opacity-80">{concern.description}</p>
              </div>
            </OptionChip>
          ))}
        </div>

        {/* Step 2: History */}
        <AnimatePresence>
          {state.concern && state.step !== 'concern' && (
            <>
              <ChatMessage isAI={false}>
                <p>{state.concern.label}</p>
              </ChatMessage>

              <ChatMessage isAI>
                <p>Is this something new, or are you following up on something already in progress?</p>
              </ChatMessage>

              <div className="space-y-2 ml-11">
                <OptionChip
                  selected={state.isNewConcern === true}
                  onClick={() => handleHistorySelect(true)}
                >
                  This is a new concern
                </OptionChip>

                {childGoals.length > 0 ? (
                  <>
                    <p className="text-sm text-[#5A6B7A] ml-1">Or select a current goal:</p>
                    {childGoals.filter(g => g.status === 'active').map((goal) => (
                      <OptionChip
                        key={goal.id}
                        selected={state.relatedGoal === goal.id}
                        onClick={() => handleHistorySelect(false, goal.id)}
                        icon={<Target className="w-4 h-4" />}
                      >
                        Follow-up: {goal.title}
                      </OptionChip>
                    ))}
                  </>
                ) : (
                  <OptionChip
                    selected={state.isNewConcern === false}
                    onClick={() => handleHistorySelect(false)}
                  >
                    Following up on something ongoing
                  </OptionChip>
                )}
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Step 3: Provider Preference */}
        <AnimatePresence>
          {(state.isNewConcern !== undefined || state.relatedGoal) && state.step !== 'concern' && state.step !== 'history' && !featuredProvider && (
            <ChatMessage isAI>
              <p>
                We don't have providers available in your area just yet. Aminy is in active expansion —
                we'll notify you the moment a verified provider opens availability near you. In the meantime,
                your AI companion is here 24/7 and you can keep building your child's plan.
              </p>
            </ChatMessage>
          )}
          {(state.isNewConcern !== undefined || state.relatedGoal) && state.step !== 'concern' && state.step !== 'history' && featuredProvider && (
            <>
              <ChatMessage isAI={false}>
                <p>{state.isNewConcern ? 'This is new' : `Follow-up on: ${childGoals.find(g => g.id === state.relatedGoal)?.title}`}</p>
              </ChatMessage>

              <ChatMessage isAI>
                <p>
                  {hasAssignedProvider ? (
                    <>
                      You can stay with{' '}
                      <strong>{featuredProvider.name}</strong> ({featuredProvider.title}),
                      or browse the next available provider who fits this concern.
                    </>
                  ) : (
                    <>
                      A strong match for this concern is <strong>{featuredProvider.name}</strong> ({featuredProvider.title}).
                      You can start there or browse the rest of the available providers.
                    </>
                  )}
                </p>
              </ChatMessage>

              <div className="space-y-2 ml-11">
                <ProviderCardMini
                  provider={{ ...featuredProvider, isAssigned: hasAssignedProvider }}
                  selected={state.providerPreference === 'assigned'}
                  onClick={() => handleProviderPrefSelect('assigned', featuredProvider)}
                />

                <button
                  onClick={() => handleProviderPrefSelect('any-available')}
                  className={`w-full rounded-2xl p-4 text-center transition-all shadow-sm ${
                    state.providerPreference === 'any-available'
                      ? 'border-2 border-[#6B9080] bg-[#6B9080]/10 text-[#6B9080]'
                      : 'border border-[#E8E4DF] bg-white/95 text-[#5A6B7A] hover:border-[#6B9080]/20 hover:bg-[#6B9080]/10/70'
                  }`}
                >
                  Show me all available providers
                </button>

                {state.providerPreference === 'any-available' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-2 mt-2"
                  >
                    {getRecommendedProviders().filter(p => !p.isAssigned).map((provider) => (
                      <ProviderCardMini
                        key={provider.id}
                        provider={provider}
                        selected={state.selectedProvider?.id === provider.id}
                        onClick={() => updateState({ selectedProvider: provider, step: 'time-select' })}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Step 3.5: Insurance Coverage Check */}
        <AnimatePresence>
          {state.selectedProvider && (state.step === 'insurance-check' || state.step === 'time-select' || state.step === 'details' || state.step === 'confirm') && (
            <>
              <ChatMessage isAI>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-[#6B9080]" />
                  <p className="font-medium">Coverage Coach check</p>
                </div>
                {insuranceLoading ? (
                  <div className="flex items-center gap-2 text-[#5A6B7A]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Checking whether insurance changes today&apos;s best route...</span>
                  </div>
                ) : insuranceResult?.eligible ? (
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
                      <p className="text-sm font-medium text-emerald-800">Insurance may help cover this visit</p>
                      <div className="mt-2 space-y-1">
                        {insuranceResult.programs.slice(0, 2).map((prog, i) => (
                          <p key={i} className="text-xs text-green-700">
                            {prog.name}: {prog.summary.slice(0, 80)}...
                          </p>
                        ))}
                      </div>
                      {insuranceResult.coveredServices.filter(s => s.covered).length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Covered: {insuranceResult.coveredServices.filter(s => s.covered).map(s => s.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[#5A6B7A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generateSuperbill}
                        onChange={(e) => setGenerateSuperbill(e.target.checked)}
                        className="w-4 h-4 rounded border-[#E8E4DF] text-[#6B9080] focus:ring-teal-500"
                      />
                      <FileText className="w-4 h-4" />
                      Prepare a superbill after the visit for reimbursement support
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
                      <p className="text-sm text-amber-800">We could not verify coverage cleanly, so the safest route today is self-pay.</p>
                      <p className="mt-1 text-xs text-amber-700">You can still book now and keep a reimbursement packet for later.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[#5A6B7A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generateSuperbill}
                        onChange={(e) => setGenerateSuperbill(e.target.checked)}
                        className="w-4 h-4 rounded border-[#E8E4DF] text-[#6B9080] focus:ring-teal-500"
                      />
                      <FileText className="w-4 h-4" />
                      Prepare a superbill for you to submit later
                    </label>
                  </div>
                )}
              </ChatMessage>

              {state.step === 'insurance-check' && (
                <div className="ml-11">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInsuranceNext}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-white shadow-sm transition-colors hover:bg-[#6B9080]"
                  >
                    <Calendar className="w-4 h-4" />
                    See available times
                  </motion.button>
                </div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* Step 4: Time Selection */}
        <AnimatePresence>
          {state.selectedProvider && state.step !== 'concern' && state.step !== 'history' && state.step !== 'provider-pref' && state.step !== 'insurance-check' && (
            <>
              <ChatMessage isAI={false}>
                <p>Book with {state.selectedProvider.name}</p>
              </ChatMessage>

              <ChatMessage isAI>
                <p>Here are the next openings for {state.selectedProvider.name}. Pick the calmest time for your family.</p>
              </ChatMessage>

              <div className="ml-11">
                <AvailabilityPicker
                  providerId={state.selectedProvider.id}
                  providerName={state.selectedProvider.name}
                  sessionType={state.concern?.label || 'Consultation'}
                  sessionDuration={30}
                  selectedSlot={state.selectedSlot}
                  onSelectSlot={handleTimeSelect}
                />
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Step 5: Visit Details */}
        <AnimatePresence>
          {state.selectedSlot && (state.step === 'details' || state.step === 'confirm') && (
            <>
              <ChatMessage isAI>
                <p>Last step before confirmation. Choose how you would like to meet.</p>
              </ChatMessage>

              <div className="space-y-2 ml-11">
                <OptionChip
                  selected={state.visitType === 'video'}
                  onClick={() => handleDetailsSubmit('video')}
                  icon={<Video className="w-5 h-5" />}
                >
                  Video Call (Recommended)
                </OptionChip>

                <OptionChip
                  selected={state.visitType === 'phone'}
                  onClick={() => handleDetailsSubmit('phone')}
                  icon={<Phone className="w-5 h-5" />}
                >
                  Phone Call
                </OptionChip>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Step 6: Confirmation */}
        <AnimatePresence>
          {state.visitType && state.step === 'confirm' && (
            <>
              <ChatMessage isAI={false}>
                <p>{state.visitType === 'video' ? 'Video Call' : 'Phone Call'}</p>
              </ChatMessage>

              <ChatMessage isAI>
                <p className="font-medium">Here is your booking summary.</p>
                <div className="mt-3 space-y-2 rounded-2xl border border-[#E8E4DF] bg-[#FAF7F2]/90 p-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#8A9BA8]" />
                    <span className="text-sm">{state.selectedProvider?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#8A9BA8]" />
                    <span className="text-sm">{state.concern?.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8A9BA8]" />
                    <span className="text-sm">
                      {state.selectedSlot && new Intl.DateTimeFormat('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      }).format(state.selectedSlot.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.visitType === 'video' ? (
                      <Video className="w-4 h-4 text-[#8A9BA8]" />
                    ) : (
                      <Phone className="w-4 h-4 text-[#8A9BA8]" />
                    )}
                    <span className="text-sm capitalize">{state.visitType} call</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#E8E4DF] mt-2">
                    <DollarSign className="w-4 h-4 text-[#8A9BA8]" />
                    <span className="text-sm font-medium">
                      ${getSessionPrice(state.selectedProvider?.title || '', 60).price}
                    </span>
                    {insuranceResult?.eligible && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Insurance may cover
                      </span>
                    )}
                  </div>
                  {generateSuperbill && (
                    <div className="flex items-center gap-2 mt-1">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs text-[#6B9080]">Superbill will be prepared after the session</span>
                    </div>
                  )}
                  <div className="rounded-xl border border-[#E8E4DF] bg-white/90 px-3 py-2 text-xs text-[#5A6B7A]">
                    Free changes at least 24 hours ahead. Late changes and no-shows can reduce the refund amount.
                  </div>
                </div>
              </ChatMessage>

              <div className="ml-11">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                >
                  <Check className="w-5 h-5" />
                  Confirm Booking
                </motion.button>

                <p className="mt-3 text-center text-xs text-[#5A6B7A]">
                  You will receive a confirmation email, reminder, and secure video-room link.
                </p>
              </div>
            </>
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
}

export default ConversationalBooking;
