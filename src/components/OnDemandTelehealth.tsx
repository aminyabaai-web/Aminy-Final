/**
 * OnDemandTelehealth - Immediate coaching for crisis moments
 *
 * Per spec: Users trigger from AI chat/dashboard during crisis
 * → see "available now" providers → book/pay for instant 15-30 min session
 * → get de-escalation tips (ABA-lite strategies)
 *
 * Premium pricing: Standard rate + $50 for on-demand urgency
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Video,
  Phone,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Zap,
  Brain,
  Heart,
  MessageSquare,
  X,
  RefreshCw
} from 'lucide-react';
import { TelehealthConsent } from './TelehealthConsent';

// Types
interface Provider {
  id: string;
  name: string;
  title: string;
  photo?: string;
  specialties: ('autism' | 'anxiety' | 'adhd' | 'meltdowns' | 'transitions' | 'sensory')[];
  rating: number;
  reviewCount: number;
  availabilityStatus: 'available' | 'busy' | 'offline';
  estimatedWait: number; // minutes
  baseRate: number; // per 30 min
}

interface OnDemandSession {
  id: string;
  provider: Provider;
  status: 'pending' | 'connecting' | 'active' | 'completed' | 'cancelled';
  startTime?: string;
  duration: number; // minutes
  totalCost: number;
}

interface OnDemandTelehealthProps {
  onBack?: () => void;
  onSessionStart?: (session: OnDemandSession) => void;
  onSessionEnd?: (session: OnDemandSession, summary: string) => void;
  childName?: string;
  crisisType?: 'meltdown' | 'anxiety' | 'overwhelm' | 'general';
  userTier?: string;
}

// Mock providers - would come from real-time database
const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'provider-1',
    name: 'Dr. Sarah Chen',
    title: 'BCBA, Autism Specialist',
    specialties: ['autism', 'meltdowns', 'transitions'],
    rating: 4.9,
    reviewCount: 127,
    availabilityStatus: 'available',
    estimatedWait: 0,
    baseRate: 100
  },
  {
    id: 'provider-2',
    name: 'Marcus Johnson',
    title: 'RBT, Behavior Specialist',
    specialties: ['adhd', 'anxiety', 'sensory'],
    rating: 4.8,
    reviewCount: 89,
    availabilityStatus: 'available',
    estimatedWait: 2,
    baseRate: 75
  },
  {
    id: 'provider-3',
    name: 'Dr. Emily Rodriguez',
    title: 'BCBA, Anxiety & ADHD',
    specialties: ['anxiety', 'adhd', 'meltdowns'],
    rating: 4.9,
    reviewCount: 156,
    availabilityStatus: 'busy',
    estimatedWait: 15,
    baseRate: 120
  }
];

// On-demand premium fee
const URGENT_FEE = 50;

export function OnDemandTelehealth({
  onBack,
  onSessionStart,
  onSessionEnd,
  childName = 'your child',
  crisisType = 'general',
  userTier = 'core'
}: OnDemandTelehealthProps) {
  const [step, setStep] = useState<'browse' | 'confirm' | 'consent' | 'connecting' | 'session' | 'summary'>('browse');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<15 | 30>(30);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<OnDemandSession | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);

  // Check for existing consent
  useEffect(() => {
    const consent = localStorage.getItem('aminy-telehealth-consent');
    if (consent) {
      try {
        const parsed = JSON.parse(consent);
        setHasConsent(parsed.accepted);
      } catch (e) {
        setHasConsent(false);
      }
    }
  }, []);

  // Simulate loading available providers
  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      // Filter available providers based on crisis type
      const available = MOCK_PROVIDERS.filter(p => {
        if (crisisType === 'meltdown') {
          return p.specialties.includes('meltdowns') || p.specialties.includes('autism');
        }
        if (crisisType === 'anxiety') {
          return p.specialties.includes('anxiety');
        }
        return true;
      }).sort((a, b) => {
        // Sort by availability, then wait time
        if (a.availabilityStatus === 'available' && b.availabilityStatus !== 'available') return -1;
        if (b.availabilityStatus === 'available' && a.availabilityStatus !== 'available') return 1;
        return a.estimatedWait - b.estimatedWait;
      });

      setProviders(available);
      setLoading(false);
    };

    loadProviders();
  }, [crisisType]);

  // Calculate total cost
  const calculateCost = (provider: Provider, duration: number) => {
    const baseForDuration = duration === 15 ? provider.baseRate * 0.6 : provider.baseRate;
    return baseForDuration + URGENT_FEE;
  };

  // Handle provider selection
  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setStep('confirm');
  };

  // Handle booking confirmation
  const handleConfirmBooking = () => {
    if (!hasConsent) {
      setStep('consent');
    } else {
      startConnection();
    }
  };

  // Handle consent acceptance
  const handleConsentAccept = () => {
    const consentRecord = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem('aminy-telehealth-consent', JSON.stringify(consentRecord));
    setHasConsent(true);
    startConnection();
  };

  // Start connection to provider
  const startConnection = () => {
    if (!selectedProvider) return;

    setStep('connecting');
    setConnectionProgress(0);

    // Simulate connection process
    const interval = setInterval(() => {
      setConnectionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Start session
          const newSession: OnDemandSession = {
            id: `session-${Date.now()}`,
            provider: selectedProvider,
            status: 'active',
            startTime: new Date().toISOString(),
            duration: selectedDuration,
            totalCost: calculateCost(selectedProvider, selectedDuration)
          };
          setSession(newSession);
          setStep('session');
          onSessionStart?.(newSession);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  // End session
  const handleEndSession = () => {
    if (!session) return;

    const completedSession = { ...session, status: 'completed' as const };
    setSession(completedSession);
    setStep('summary');
  };

  // Complete and save summary
  const handleCompleteSummary = () => {
    if (session) {
      onSessionEnd?.(session, sessionNotes);
    }
    onBack?.();
  };

  // Get crisis-specific messaging
  const getCrisisMessage = () => {
    switch (crisisType) {
      case 'meltdown':
        return {
          title: "Let's get you help right now",
          subtitle: "Connect with a coach who specializes in meltdown support"
        };
      case 'anxiety':
        return {
          title: "We're here to help",
          subtitle: "Connect with an anxiety support specialist"
        };
      case 'overwhelm':
        return {
          title: "You don't have to handle this alone",
          subtitle: "Get immediate support from a trained coach"
        };
      default:
        return {
          title: "Immediate coaching available",
          subtitle: "Connect with a specialist in minutes"
        };
    }
  };

  const crisisMessage = getCrisisMessage();

  // Browse available providers
  if (step === 'browse') {
    return (
      <div className="min-h-screen bg-white pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{crisisMessage.title}</h1>
                <p className="text-sm text-gray-600">{crisisMessage.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Urgent banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-900">
              <strong>On-demand sessions</strong> connect you with a coach immediately.
              +${URGENT_FEE} urgent fee applies.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
              <p className="text-gray-600">Finding available coaches...</p>
            </div>
          ) : providers.length === 0 ? (
            // No providers available
            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No coaches available right now</h3>
              <p className="text-gray-600 mb-4">
                All our coaches are currently in sessions. You can join the waitlist or try our AI-guided support.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline">
                  Join Waitlist
                </Button>
                <Button onClick={onBack}>
                  <Brain className="w-4 h-4 mr-2" />
                  Use AI Guide Instead
                </Button>
              </div>
            </Card>
          ) : (
            // Provider list
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-gray-900">Available Now</h2>
                <Button variant="ghost" size="sm" onClick={() => setLoading(true)}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>

              {providers.map((provider) => (
                <Card
                  key={provider.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    provider.availabilityStatus === 'available'
                      ? 'border-green-200 hover:border-green-300'
                      : 'border-gray-200 opacity-75'
                  }`}
                  onClick={() => provider.availabilityStatus === 'available' && handleSelectProvider(provider)}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Provider avatar */}
                    <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-full flex items-center justify-center text-lg sm:text-xl font-semibold text-accent">
                      {provider.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                          <p className="text-sm text-gray-600">{provider.title}</p>
                        </div>

                        {/* Availability badge */}
                        {provider.availabilityStatus === 'available' ? (
                          <Badge className="bg-green-100 text-green-700">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                            Available Now
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            ~{provider.estimatedWait} min wait
                          </Badge>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium ml-1">{provider.rating}</span>
                        </div>
                        <span className="text-sm text-gray-500">({provider.reviewCount} reviews)</span>
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs capitalize">
                            {specialty}
                          </Badge>
                        ))}
                      </div>

                      {/* Pricing */}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          30 min: <span className="font-semibold text-gray-900">${calculateCost(provider, 30)}</span>
                          <span className="text-gray-400 ml-1">(incl. ${URGENT_FEE} urgent fee)</span>
                        </p>
                        {provider.availabilityStatus === 'available' && (
                          <Button size="sm" className="bg-accent hover:bg-accent/90">
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* AI fallback option */}
          <Card className="mt-4 sm:mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Need help right this second?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Try our AI-guided {crisisType === 'meltdown' ? 'meltdown support' : 'calming strategies'} while you wait or instead of a session.
                </p>
                <Button variant="outline" size="sm" className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Get AI Support Now
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Confirm booking
  if (step === 'confirm' && selectedProvider) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('browse')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">Confirm Session</h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Provider summary */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-full flex items-center justify-center text-2xl font-semibold text-accent">
                {selectedProvider.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedProvider.name}</h3>
                <p className="text-sm text-gray-600">{selectedProvider.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{selectedProvider.rating}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Duration selection */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Session Length</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedDuration(15)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDuration === 15
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">15 minutes</p>
                <p className="text-lg font-bold text-accent mt-1">
                  ${calculateCost(selectedProvider, 15)}
                </p>
                <p className="text-xs text-gray-500">Quick check-in</p>
              </button>

              <button
                onClick={() => setSelectedDuration(30)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDuration === 30
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">30 minutes</p>
                <p className="text-lg font-bold text-accent mt-1">
                  ${calculateCost(selectedProvider, 30)}
                </p>
                <p className="text-xs text-gray-500">Full session (recommended)</p>
              </button>
            </div>
          </div>

          {/* Price breakdown */}
          <Card className="p-4 bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-3">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Session ({selectedDuration} min)</span>
                <span className="text-gray-900">
                  ${selectedDuration === 15 ? (selectedProvider.baseRate * 0.6).toFixed(0) : selectedProvider.baseRate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">On-demand urgent fee</span>
                <span className="text-gray-900">${URGENT_FEE}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-gray-900">Total</span>
                <span className="text-accent">${calculateCost(selectedProvider, selectedDuration)}</span>
              </div>
            </div>
          </Card>

          {/* What to expect */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-3">What to Expect</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Secure video call through the Aminy app</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Immediate strategies tailored to {childName}'s needs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Session notes saved to your progress reports</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Follow-up tips and resources after session</span>
              </li>
            </ul>
          </Card>

          {/* Disclaimer */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                This is wellness coaching, not emergency services. If there's immediate danger,
                please call <a href="tel:911" className="underline font-medium">911</a>.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('browse')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleConfirmBooking} className="flex-1 bg-accent hover:bg-accent/90">
              <Video className="w-4 h-4 mr-2" />
              Connect Now — ${calculateCost(selectedProvider, selectedDuration)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Consent step
  if (step === 'consent') {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('confirm')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">Consent Required</h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <TelehealthConsent
            onConsent={handleConsentAccept}
            onDecline={() => setStep('confirm')}
            providerName={selectedProvider?.name}
            sessionType="on-demand coaching session"
          />
        </div>
      </div>
    );
  }

  // Connecting state
  if (step === 'connecting') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Video className="w-10 h-10 text-accent animate-pulse" />
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Connecting to {selectedProvider?.name}...
          </h2>
          <p className="text-gray-600 mb-4 sm:mb-6">
            Please stay on this screen. We're setting up your secure session.
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${connectionProgress}%` }}
            />
          </div>

          <p className="text-sm text-gray-500">
            {connectionProgress < 30 && 'Initializing secure connection...'}
            {connectionProgress >= 30 && connectionProgress < 60 && 'Verifying session details...'}
            {connectionProgress >= 60 && connectionProgress < 90 && 'Notifying coach...'}
            {connectionProgress >= 90 && 'Almost there!'}
          </p>

          <Button
            variant="ghost"
            onClick={() => {
              setStep('browse');
              setConnectionProgress(0);
            }}
            className="mt-4 sm:mt-6 text-gray-500"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Active session
  if (step === 'session' && session) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Video area (simulated) */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl font-semibold text-white">
                  {session.provider.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <p className="text-white/80">{session.provider.name}</p>
              <Badge className="mt-2 bg-green-500/20 text-green-300">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
                Session Active
              </Badge>
            </div>
          </div>

          {/* Self-view (simulated) */}
          <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-700 rounded-lg border-2 border-white/20 flex items-center justify-center">
            <span className="text-white/60 text-sm">You</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 px-4 py-6">
          <div className="max-w-md mx-auto">
            {/* Timer */}
            <div className="text-center mb-4">
              <p className="text-white/60 text-sm">Session in progress</p>
              <p className="text-white text-2xl font-mono">
                {session.duration}:00
              </p>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                onClick={handleEndSession}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              >
                <Phone className="w-6 h-6 rotate-[135deg]" />
              </button>
              <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Video className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Session summary
  if (step === 'summary' && session) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <h1 className="text-lg font-semibold text-gray-900">Session Complete</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Success message */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Great session!</h2>
            <p className="text-gray-600">
              Your session with {session.provider.name} has ended.
            </p>
          </div>

          {/* Session details */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-3">Session Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Coach</span>
                <span className="text-gray-900">{session.provider.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="text-gray-900">{session.duration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total charged</span>
                <span className="text-gray-900">${session.totalCost}</span>
              </div>
            </div>
          </Card>

          {/* Session notes input */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Add your notes (optional)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Jot down key takeaways or strategies to remember. These will be saved to your reports.
            </p>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="What worked? What will you try?"
              className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </div>

          {/* Rate provider */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-3">How was your session?</h3>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 transition-colors flex items-center justify-center"
                >
                  <Star className="w-5 h-5 text-gray-400 hover:text-yellow-400" />
                </button>
              ))}
            </div>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              Book Follow-up
            </Button>
            <Button onClick={handleCompleteSummary} className="flex-1 bg-accent hover:bg-accent/90">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default OnDemandTelehealth;
