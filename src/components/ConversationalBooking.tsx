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
  MapPin
} from 'lucide-react';
import { AvailabilityPicker, TimeSlot } from './AvailabilityPicker';

// Types
type BookingStep = 'concern' | 'history' | 'provider-pref' | 'time-select' | 'details' | 'confirm';

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
  onComplete: (booking: BookingState) => void;
  onCancel: () => void;
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

// Mock Providers
const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'bcba-1',
    name: 'Dr. Sarah Chen',
    title: 'BCBA-D',
    specialty: 'Behavior Analysis',
    rating: 4.9,
    reviewCount: 47,
    nextAvailable: 'Tomorrow',
    isAssigned: true,
  },
  {
    id: 'bcba-2',
    name: 'Dr. Michael Torres',
    title: 'BCBA',
    specialty: 'Early Intervention',
    rating: 4.8,
    reviewCount: 32,
    nextAvailable: 'Today',
  },
  {
    id: 'slp-1',
    name: 'Dr. Emily Watson',
    title: 'SLP-CCC',
    specialty: 'Speech-Language Pathology',
    rating: 4.9,
    reviewCount: 56,
    nextAvailable: 'Wednesday',
  },
];

// Mock Goals
const MOCK_GOALS: Goal[] = [
  { id: '1', title: 'Morning routine transitions', status: 'active' },
  { id: '2', title: 'Reduce mealtime difficulties', status: 'active' },
  { id: '3', title: 'Improve sibling interactions', status: 'active' },
];

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
            ? 'bg-white border border-gray-200 text-gray-800'
            : 'bg-teal-600 text-white'
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
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-all ${
        selected
          ? 'bg-teal-600 text-white border-2 border-teal-600'
          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50'
      }`}
    >
      {icon && <span className={selected ? 'text-white' : 'text-teal-600'}>{icon}</span>}
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
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
        selected
          ? 'bg-teal-50 border-2 border-teal-500'
          : 'bg-white border-2 border-gray-200 hover:border-teal-300'
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
        {provider.name.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 truncate">{provider.name}</p>
          {provider.isAssigned && (
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
              Your Provider
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{provider.title} · {provider.specialty}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-amber-600">★ {provider.rating}</span>
          <span className="text-xs text-gray-400">({provider.reviewCount} reviews)</span>
          <span className="text-xs text-teal-600 ml-auto">Next: {provider.nextAvailable}</span>
        </div>
      </div>
      {selected && <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />}
    </motion.button>
  );
}

// Main Component
export function ConversationalBooking({
  childName,
  assignedProvider = MOCK_PROVIDERS[0],
  childGoals = MOCK_GOALS,
  onComplete,
  onCancel
}: ConversationalBookingProps) {
  const [state, setState] = useState<BookingState>({ step: 'concern' });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.step, state.concern, state.selectedProvider]);

  const updateState = (updates: Partial<BookingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goBack = () => {
    const steps: BookingStep[] = ['concern', 'history', 'provider-pref', 'time-select', 'details', 'confirm'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex > 0) {
      updateState({ step: steps[currentIndex - 1] });
    } else {
      onCancel();
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
      step: 'time-select'
    });
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    updateState({ selectedSlot: slot, step: 'details' });
  };

  const handleDetailsSubmit = (visitType: 'video' | 'phone', notes?: string) => {
    updateState({ visitType, notes, step: 'confirm' });
  };

  const handleConfirm = () => {
    onComplete(state);
  };

  // Get recommended providers based on concern
  const getRecommendedProviders = () => {
    if (!state.concern) return MOCK_PROVIDERS;
    return MOCK_PROVIDERS.filter(p => {
      if (state.concern?.mapsTo === 'any') return true;
      if (state.concern?.mapsTo === 'bcba') return p.specialty.includes('Behavior');
      if (state.concern?.mapsTo === 'slp') return p.specialty.includes('Speech');
      return true;
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button
          onClick={goBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">Book a Session</h2>
          <p className="text-sm text-gray-500">for {childName}</p>
        </div>
        <div className="flex items-center gap-1">
          {['concern', 'history', 'provider-pref', 'time-select', 'details', 'confirm'].map((step, i) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                ['concern', 'history', 'provider-pref', 'time-select', 'details', 'confirm'].indexOf(state.step) >= i
                  ? 'bg-teal-600'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:space-y-4">
        {/* Step 1: Concern Selection */}
        <ChatMessage isAI>
          <p className="font-medium">Hi! I'd love to help you book a session. 👋</p>
          <p className="text-gray-600 mt-1">What would you like to discuss?</p>
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
                <p>Got it! Is this something new, or are we following up on something we've been working on?</p>
              </ChatMessage>

              <div className="space-y-2 ml-11">
                <OptionChip
                  selected={state.isNewConcern === true}
                  onClick={() => handleHistorySelect(true)}
                >
                  This is a new concern
                </OptionChip>

                {childGoals.length > 0 && (
                  <>
                    <p className="text-sm text-gray-500 ml-1">Or select a current goal:</p>
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
                )}
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Step 3: Provider Preference */}
        <AnimatePresence>
          {(state.isNewConcern !== undefined || state.relatedGoal) && state.step !== 'concern' && state.step !== 'history' && (
            <>
              <ChatMessage isAI={false}>
                <p>{state.isNewConcern ? 'This is new' : `Follow-up on: ${childGoals.find(g => g.id === state.relatedGoal)?.title}`}</p>
              </ChatMessage>

              <ChatMessage isAI>
                <p>
                  Would you like to meet with{' '}
                  <strong>{assignedProvider.name}</strong> ({assignedProvider.title}),
                  or are you open to any available provider?
                </p>
              </ChatMessage>

              <div className="space-y-2 ml-11">
                <ProviderCardMini
                  provider={assignedProvider}
                  selected={state.providerPreference === 'assigned'}
                  onClick={() => handleProviderPrefSelect('assigned', assignedProvider)}
                />

                <button
                  onClick={() => handleProviderPrefSelect('any-available')}
                  className={`w-full p-3 rounded-xl text-center transition-all ${
                    state.providerPreference === 'any-available'
                      ? 'bg-teal-50 border-2 border-teal-500 text-teal-700'
                      : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-teal-300'
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

        {/* Step 4: Time Selection */}
        <AnimatePresence>
          {state.selectedProvider && state.step !== 'concern' && state.step !== 'history' && state.step !== 'provider-pref' && (
            <>
              <ChatMessage isAI={false}>
                <p>Book with {state.selectedProvider.name}</p>
              </ChatMessage>

              <ChatMessage isAI>
                <p>Great choice! Here's {state.selectedProvider.name}'s availability:</p>
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
                <p>Perfect! One last thing - how would you like to meet?</p>
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
                <p className="font-medium">Here's your booking summary:</p>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{state.selectedProvider?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{state.concern?.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
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
                      <Video className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Phone className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm capitalize">{state.visitType} call</span>
                  </div>
                </div>
              </ChatMessage>

              <div className="ml-11">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirm Booking
                </motion.button>

                <p className="text-xs text-center text-gray-500 mt-3">
                  You'll receive a confirmation email with video call details
                </p>
              </div>
            </>
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

export default ConversationalBooking;
