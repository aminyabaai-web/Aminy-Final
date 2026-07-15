// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * OnDemandTelehealth - Real people, right now, who get it
 *
 * When a parent needs help NOW — a meltdown at the grocery store, bedtime
 * spiraling, or just an "I can't do this alone" moment — this connects them
 * with a real provider in minutes. Not a chatbot. A human who understands.
 *
 * Providers loaded from Supabase only. Non-live availability is shown as limited launch.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshCw,
  Mic,
  MicOff,
  VideoOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { TelehealthConsent } from './TelehealthConsent';
import { supabase } from '../utils/supabase/client';
import {
  Provider as TelehealthProvider,
  PROVIDER_ROLE_DISPLAY
} from '../types/telehealth';
import {
  createVideoRoom,
  getMeetingToken,
  deleteRoom,
  loadDailySDK,
} from '../lib/daily-video';
import { isDailyConfigured } from '../lib/daily-config';
import { DailyVideoFrame, type DailyVideoFrameRef } from './DailyVideoFrame';
import { LaunchStateBadge } from './ui/LaunchStateBadge';
import { createDataProvenance, getSurfaceLaunchConfig, type DataProvenance } from '../lib/product-truth';
import { getDisplayPricingForProvider } from '../lib/telehealth-economics';
import { DataProvenanceBadge } from './ui/DataProvenanceBadge';

// On-demand display provider — adapter from rich Provider type
interface OnDemandProvider {
  id: string;
  name: string;
  title: string;
  photo?: string;
  bio?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  availabilityStatus: 'available' | 'busy' | 'offline';
  estimatedWait: number; // minutes
  baseRate: number; // per 30 min — uses consultPrice
}

interface OnDemandSession {
  id: string;
  provider: OnDemandProvider;
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

/** Convert rich Provider type to display format */
function toOnDemandProvider(p: TelehealthProvider): OnDemandProvider {
  const pricing = getDisplayPricingForProvider(p.organization, p.consultPrice, p.deepReviewPrice);

  return {
    id: p.id,
    name: `${[p.firstName, p.lastName].filter(Boolean).join(' ')}${p.credentials ? ', ' + p.credentials : ''}`,
    title: p.roleDisplayName || PROVIDER_ROLE_DISPLAY[p.role] || p.role,
    photo: p.avatarUrl,
    bio: p.bio || undefined,
    specialties: p.referralTags || [p.role],
    rating: p.rating || 4.5,
    reviewCount: p.reviewCount || 0,
    availabilityStatus: p.isActive && p.acceptingNewPatients ? 'available' : 'offline',
    estimatedWait: 0,
    baseRate: pricing.consultPrice
  };
}

/** Fetch providers from Supabase only. */
async function fetchProviders(): Promise<OnDemandProvider[]> {
  try {
    const { data, error } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('is_active', true)
      .eq('is_accepting_patients', true);

    if (error) throw error;

    if (data && data.length > 0) {
      return data.map((row: Record<string, unknown>) => toOnDemandProvider({
        id: row.id as string,
        // Live provider_profiles stores a single name (full_name/name), not
        // first/last. Keep first_name/last_name as fallbacks for older rows.
        firstName: (row.full_name as string)
          || (row.name as string)
          || [row.first_name, row.last_name].filter(Boolean).join(' ')
          || 'Provider',
        lastName: '',
        credentials: (row.credentials as string) || '',
        role: (row.provider_type as TelehealthProvider['role']) || 'parent-coach',
        roleDisplayName: PROVIDER_ROLE_DISPLAY[row.provider_type as keyof typeof PROVIDER_ROLE_DISPLAY] || '',
        bio: (row.bio as string) || '',
        // Live column is photo_url; avatar_url kept as a fallback for older rows.
        avatarUrl: (row.photo_url as string | undefined) ?? (row.avatar_url as string | undefined),
        licensedStates: (row.states_licensed as string[]) || [],
        offersConsult: (row.offers_consult as boolean) ?? true,
        offersDeepReview: (row.offers_deep_review as boolean) ?? true,
        consultPrice: (row.consult_price as number) || 85,
        deepReviewPrice: (row.deep_review_price as number) || 165,
        organization: (row.organization as TelehealthProvider['organization']) || 'independent',
        referralTags: (row.referral_tags as string[] | undefined) ?? (row.specialties as string[] | undefined),
        rating: row.rating as number | undefined,
        reviewCount: row.review_count as number | undefined,
        isActive: (row.is_active as boolean) ?? true,
        acceptingNewPatients: (row.is_accepting_patients as boolean) ?? true,
        createdAt: (row.created_at as string) || new Date().toISOString(),
        updatedAt: (row.updated_at as string) || new Date().toISOString(),
      }));
    }
  } catch (error) {
    console.warn('[Telehealth] Failed to fetch providers from Supabase:', error);
  }

  return [];
}

function readStoredTelehealthConsent(): boolean {
  try {
    const consent = localStorage.getItem('aminy-telehealth-consent');
    if (!consent) return false;

    const parsed = JSON.parse(consent) as { accepted?: boolean };
    return parsed.accepted === true;
  } catch (_error) {
    return false;
  }
}

// Same-day availability fee
const URGENT_FEE = 50;

// Provider avatar — real photo when available, initials fallback (incl. broken URLs)
function OnDemandProviderAvatar({
  name,
  photo,
  sizeClass = 'w-14 h-14',
  textClass = 'text-lg sm:text-xl'
}: {
  name: string;
  photo?: string;
  sizeClass?: string;
  textClass?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (photo && !imageFailed) {
    return (
      <img
        src={photo}
        alt={name}
        onError={() => setImageFailed(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-[#E8E4DF]`}
      />
    );
  }

  return (
    <div className={`${sizeClass} bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-full flex items-center justify-center ${textClass} font-semibold text-accent flex-shrink-0`}>
      {name.split(' ').map(n => n[0]).join('').slice(0, 3)}
    </div>
  );
}

export function OnDemandTelehealth({
  onBack,
  onSessionStart,
  onSessionEnd,
  childName = 'your child',
  crisisType = 'general',
  userTier = 'core'
}: OnDemandTelehealthProps) {
  const [step, setStep] = useState<'browse' | 'confirm' | 'consent' | 'connecting' | 'session' | 'summary'>('browse');
  const [providers, setProviders] = useState<OnDemandProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<OnDemandProvider | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<15 | 30>(30);
  const [loading, setLoading] = useState(true);
  const [providerProvenance, setProviderProvenance] = useState<DataProvenance | null>(null);
  const launchConfig = getSurfaceLaunchConfig('on-demand-telehealth');
  const [session, setSession] = useState<OnDemandSession | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRating, setSessionRating] = useState(0);
  const [hasConsent, setHasConsent] = useState(() => readStoredTelehealthConsent());
  const [connectionProgress, setConnectionProgress] = useState(0);

  // ── Real video call state ──
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Parent');
  const [callError, setCallError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const videoFrameRef = useRef<DailyVideoFrameRef>(null);

  // Load available providers from Supabase.
  const loadProviders = useCallback(async () => {
    setLoading(true);

    const allProviders = await fetchProviders();

    if (allProviders.length > 0) {
      setProviderProvenance(createDataProvenance('live', 'Verified real-time provider availability', {
        isVerified: true,
        lastUpdatedAt: new Date().toISOString(),
      }));
    } else {
      setProviderProvenance(null);
    }

    // Sort by availability, then wait time
    const sorted = allProviders.sort((a, b) => {
      if (a.availabilityStatus === 'available' && b.availabilityStatus !== 'available') return -1;
      if (b.availabilityStatus === 'available' && a.availabilityStatus !== 'available') return 1;
      return a.estimatedWait - b.estimatedWait;
    });

    setProviders(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProviders();
  }, [crisisType, loadProviders]);

  // Session elapsed timer
  useEffect(() => {
    if (step !== 'session' || !session) return;
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, session]);

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Base session price (before same-day fee), rounded to a whole dollar so the
  // button, card, and breakdown always show the same integer.
  const sessionBasePrice = (provider: OnDemandProvider, duration: number) =>
    duration === 15 ? Math.round(provider.baseRate * 0.6) : provider.baseRate;

  // Calculate total cost
  const calculateCost = (provider: OnDemandProvider, duration: number) => {
    return sessionBasePrice(provider, duration) + URGENT_FEE;
  };

  // Handle provider selection
  const handleSelectProvider = (provider: OnDemandProvider) => {
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

  // Start real connection to provider via Daily.co
  const startConnection = async () => {
    if (!selectedProvider) return;

    setStep('connecting');
    setConnectionProgress(0);
    setCallError(null);

    // Check Daily.co configuration first
    if (!isDailyConfigured()) {
      setCallError('Video calling is being set up. Please try again shortly.');
      return;
    }

    try {
      // Step 1: Load Daily.co SDK
      setConnectionProgress(10);
      await loadDailySDK();

      // Step 2: Get current user
      setConnectionProgress(25);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || `anon-${Date.now()}`;
      const userName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split('@')[0]
        || 'Parent';
      setCurrentUserName(userName);

      // Step 3: Create secure video room
      setConnectionProgress(45);
      const sessionId = `ondemand-${Date.now()}`;
      const room = await createVideoRoom(sessionId, {
        privacy: 'private',
        expiryMinutes: selectedDuration + 15, // buffer time
        enableScreenShare: true,
        enableChat: true,
        enableRecording: false,
      });

      // Step 4: Get meeting token
      setConnectionProgress(65);
      const { token } = await getMeetingToken(
        room.name,
        userId,
        userName,
        false // parent is not provider
      );

      // Step 5: Store video room details
      setConnectionProgress(85);
      setRoomUrl(room.url);
      setRoomName(room.name);
      setMeetingToken(token);

      // Step 6: Create session record
      setElapsed(0);
      const newSession: OnDemandSession = {
        id: sessionId,
        provider: selectedProvider,
        status: 'active',
        startTime: new Date().toISOString(),
        duration: selectedDuration,
        totalCost: calculateCost(selectedProvider, selectedDuration)
      };
      setSession(newSession);

      setConnectionProgress(100);
      // Brief pause at 100% for UX, then show video
      setTimeout(() => setStep('session'), 400);

      onSessionStart?.(newSession);
    } catch (err: unknown) {
      console.error('Video connection failed:', err);
      const errMessage = err instanceof Error ? err.message : '';
      setCallError(
        errMessage.includes('Failed to create')
          ? 'Could not set up the video room. The service may be temporarily unavailable.'
          : errMessage.includes('Failed to get meeting token')
          ? 'Could not verify your session. Please try again.'
          : errMessage || 'Connection failed. Please try again.'
      );
    }
  };

  // End session — leave call + clean up room
  const handleEndSession = async () => {
    if (!session) return;

    // Leave the Daily.co call
    if (videoFrameRef.current) {
      try { await videoFrameRef.current.leave(); } catch (error) { console.warn('[Telehealth] Failed to leave video call:', error); }
    }

    // Clean up the room server-side
    if (roomName) {
      try { await deleteRoom(roomName); } catch (error) { console.warn('[Telehealth] Failed to delete video room:', error); }
    }

    const completedSession = { ...session, status: 'completed' as const };
    setSession(completedSession);
    setStep('summary');
  };

  // Called by DailyVideoFrame when participant leaves via Daily's built-in button
  const handleVideoLeave = useCallback(() => {
    if (step === 'session' && session) {
      // Clean up room and show summary
      if (roomName) {
        deleteRoom(roomName).catch(() => {});
      }
      setSession(prev => prev ? { ...prev, status: 'completed' as const } : null);
      setStep('summary');
    }
  }, [step, session, roomName]);

  // Complete and save summary
  const handleCompleteSummary = () => {
    if (session) {
      onSessionEnd?.(session, sessionNotes);
    }
    onBack?.();
  };

  // Crisis-specific messaging — CTCA: lead with empathy, not service description
  const getCrisisMessage = () => {
    switch (crisisType) {
      case 'meltdown':
        return {
          title: "We're here. Let's get through this together.",
          subtitle: `Someone who truly understands meltdowns is ready to help with ${childName}`
        };
      case 'anxiety':
        return {
          title: "You're not alone in this moment.",
          subtitle: `A specialist who gets anxiety in kids is ready to talk about ${childName}`
        };
      case 'overwhelm':
        return {
          title: "Take a breath. Help is right here.",
          subtitle: "A real person who understands your world is available now"
        };
      default:
        return {
          title: "Real people who get neurodivergent families",
          subtitle: "Connect with someone who understands — in minutes, not weeks"
        };
    }
  };

  const crisisMessage = getCrisisMessage();

  // Browse available providers
  if (step === 'browse') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-[#E8E4DF]">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-semibold text-[#132F43]">{crisisMessage.title}</h1>
                <p className="text-sm text-[#5A6B7A]">{crisisMessage.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Urgent Support Banner */}
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Private, encrypted video sessions</p>
              <p className="text-sm text-green-700/70">Secure video calls with licensed professionals. Your session stays private.</p>
            </div>
          </div>
        </div>

        <div className="border-b border-sky-200 bg-sky-50 px-4 py-3">
          <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-2">
            <LaunchStateBadge state={launchConfig.state} label={launchConfig.badgeLabel} />
            {providerProvenance ? <DataProvenanceBadge provenance={providerProvenance} className="min-w-0 h-auto whitespace-normal text-left leading-tight" /> : null}
            <p className="text-sm text-[#3A4A57]">{launchConfig.message}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
              <p className="text-[#5A6B7A]">Finding someone who can help right now...</p>
            </div>
          ) : providers.length === 0 ? (
            // No providers available
            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-[#EDF4F7] rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[#8A9BA8]" />
              </div>
              <h3 className="text-lg font-semibold text-[#132F43] mb-2">Verified expert support is not available right now</h3>
              <p className="text-[#5A6B7A] mb-4">
                Aminy only shows real-time expert availability during limited launch. If no provider appears here, we do not substitute demo coverage.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => loadProviders()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check again
                </Button>
                <Button onClick={onBack}>
                  <Brain className="w-4 h-4 mr-2" />
                  Get help from Aminy now
                </Button>
              </div>
            </Card>
          ) : (
            // Provider list
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-[#132F43]">Online now</h2>
                <Button variant="ghost" size="sm" onClick={() => loadProviders()}>
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
                      : 'border-[#E8E4DF] opacity-75'
                  }`}
                  onClick={() => provider.availabilityStatus === 'available' && handleSelectProvider(provider)}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Provider avatar */}
                    <OnDemandProviderAvatar name={provider.name} photo={provider.photo} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-[#132F43]">{provider.name}</h3>
                          <p className="text-sm text-[#5A6B7A]">{provider.title}</p>
                        </div>

                        {/* Availability badge — honest copy: we know they're online,
                            not that they'll pick up instantly. */}
                        {provider.availabilityStatus === 'available' ? (
                          <Badge className="bg-green-100 text-green-700">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Currently offline
                          </Badge>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium ml-1">{provider.rating}</span>
                        </div>
                        <span className="text-sm text-[#5A6B7A]">({provider.reviewCount} reviews)</span>
                      </div>

                      {/* Honest wait expectation */}
                      {provider.availabilityStatus === 'available' && (
                        <p className="text-sm text-[#5A6B7A] mt-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#8A9BA8]" />
                          Usually connects within a few minutes
                        </p>
                      )}

                      {/* Bio excerpt */}
                      {provider.bio && (
                        <p className="text-sm text-[#5A6B7A] mt-2 line-clamp-2">{provider.bio}</p>
                      )}

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-sm capitalize">
                            {specialty}
                          </Badge>
                        ))}
                      </div>

                      {/* Pricing */}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm text-[#5A6B7A]">
                          30 min: <span className="font-semibold text-[#132F43]">${calculateCost(provider, 30)}</span>
                          <span className="text-[#8A9BA8] ml-1">(incl. same-day fee)</span>
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
          <Card className="mt-4 sm:mt-6 p-4 bg-gradient-to-r from-[#F6FBFB] to-[#EDF4F7] border-[#C8DDE8]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Need help right this second?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Try our AI-guided {crisisType === 'meltdown' ? 'meltdown support' : 'calming strategies'} while you wait or instead of a session.
                </p>
                <Button variant="outline" size="sm" onClick={onBack} className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100">
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
      <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-[#E8E4DF]">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('browse')} aria-label="Go back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-semibold text-[#132F43]">You're almost connected</h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Provider summary */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <OnDemandProviderAvatar
                name={selectedProvider.name}
                photo={selectedProvider.photo}
                sizeClass="w-16 h-16"
                textClass="text-2xl"
              />
              <div>
                <h3 className="font-semibold text-[#132F43]">{selectedProvider.name}</h3>
                <p className="text-sm text-[#5A6B7A]">{selectedProvider.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{selectedProvider.rating}</span>
                </div>
                {selectedProvider.bio && (
                  <p className="text-sm text-[#5A6B7A] mt-1 line-clamp-2">{selectedProvider.bio}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Duration selection */}
          <div>
            <h3 className="font-medium text-[#132F43] mb-3">Session Length</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedDuration(15)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDuration === 15
                    ? 'border-accent bg-accent/5'
                    : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                }`}
              >
                <p className="font-semibold text-[#132F43]">15 minutes</p>
                <p className="text-lg font-bold text-accent mt-1">
                  ${calculateCost(selectedProvider, 15)}
                </p>
                <p className="text-sm text-[#5A6B7A]">Quick check-in</p>
              </button>

              <button
                onClick={() => setSelectedDuration(30)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDuration === 30
                    ? 'border-accent bg-accent/5'
                    : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                }`}
              >
                <p className="font-semibold text-[#132F43]">30 minutes</p>
                <p className="text-lg font-bold text-accent mt-1">
                  ${calculateCost(selectedProvider, 30)}
                </p>
                <p className="text-sm text-[#5A6B7A]">Full session (recommended)</p>
              </button>
            </div>
          </div>

          {/* Price breakdown */}
          <Card className="p-4 bg-[#F6FBFB]">
            <h3 className="font-medium text-[#132F43] mb-3">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Session ({selectedDuration} min)</span>
                <span className="text-[#132F43]">
                  ${sessionBasePrice(selectedProvider, selectedDuration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Same-day availability</span>
                <span className="text-[#132F43]">${URGENT_FEE}</span>
              </div>
              <div className="border-t border-[#E8E4DF] pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-[#132F43]">Total</span>
                <span className="text-accent">${calculateCost(selectedProvider, selectedDuration)}</span>
              </div>
            </div>
          </Card>

          {/* What to expect */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-[#132F43] mb-3">Here's what happens next</h3>
            <ul className="space-y-2 text-sm text-[#5A6B7A]">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Private, secure video call — just you and the provider</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Real strategies tailored to what {childName} is going through right now</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Everything discussed is saved — so you can refer back anytime</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Personalized next steps and resources sent after your session</span>
              </li>
            </ul>
          </Card>

          {/* Disclaimer */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
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
      <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-[#E8E4DF]">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('confirm')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-semibold text-[#132F43]">Consent Required</h1>
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

  // Connecting state — real progress through Daily.co setup
  if (step === 'connecting') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          {!callError ? (
            <>
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Video className="w-10 h-10 text-accent animate-pulse" />
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] mb-2">
                Connecting to {selectedProvider?.name}...
              </h2>
              <p className="text-[#5A6B7A] mb-4 sm:mb-6">
                Please stay on this screen. We're setting up your secure session.
              </p>

              {/* Progress bar */}
              <div className="w-full bg-[#E8E4DF] rounded-full h-2 mb-4">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-500"
                  style={{ width: `${connectionProgress}%` }}
                />
              </div>

              <p className="text-sm text-[#5A6B7A]">
                {connectionProgress < 20 && 'Loading secure video...'}
                {connectionProgress >= 20 && connectionProgress < 40 && 'Verifying your identity...'}
                {connectionProgress >= 40 && connectionProgress < 65 && 'Creating private room...'}
                {connectionProgress >= 65 && connectionProgress < 85 && 'Securing your session...'}
                {connectionProgress >= 85 && connectionProgress < 100 && 'Almost there!'}
                {connectionProgress >= 100 && 'Connected!'}
              </p>

              <Button
                variant="ghost"
                onClick={() => {
                  setStep('browse');
                  setConnectionProgress(0);
                }}
                className="mt-4 sm:mt-6 text-[#5A6B7A]"
              >
                Cancel
              </Button>
            </>
          ) : (
            /* Error state with retry */
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <WifiOff className="w-10 h-10 text-red-400" />
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] mb-2">
                Connection issue
              </h2>
              <p className="text-[#5A6B7A] mb-4 sm:mb-6">
                {callError}
              </p>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('browse');
                    setConnectionProgress(0);
                    setCallError(null);
                  }}
                >
                  Go Back
                </Button>
                <Button
                  onClick={() => {
                    setCallError(null);
                    startConnection();
                  }}
                  className="bg-accent hover:bg-accent/90"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Active session — real Daily.co video
  if (step === 'session' && session) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
        {/* Daily.co video area */}
        <div className="flex-1 relative min-h-0">
          {roomUrl && meetingToken ? (
            <DailyVideoFrame
              ref={videoFrameRef}
              roomUrl={roomUrl}
              token={meetingToken}
              userName={currentUserName}
              onLeave={handleVideoLeave}
              onError={(err) => {
                if (err === 'retry') {
                  // Re-attempt connection
                  startConnection();
                } else {
                  console.error('Video error:', err);
                }
              }}
            />
          ) : (
            /* Fallback if room data missing (shouldn't happen) */
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-semibold text-white">
                    {session.provider.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <p className="text-white/80">{session.provider.name}</p>
                <Badge className="mt-2 bg-yellow-500/20 text-yellow-300">
                  Waiting for video...
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Session controls bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
          <div className="max-w-md mx-auto">
            {/* Timer + session info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white/70 text-sm">
                  {session.provider.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-white font-mono text-lg">{formatElapsed(elapsed)}</p>
                <p className="text-white/50 text-sm">
                  of {session.duration} min session
                </p>
              </div>
            </div>

            {/* End session button */}
            <Button
              onClick={handleEndSession}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3"
            >
              <Phone className="w-4 h-4 mr-2 rotate-[135deg]" />
              End Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Session summary
  if (step === 'summary' && session) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-[#E8E4DF]">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <h1 className="text-lg font-semibold text-[#132F43]">Session Complete</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Success message */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] mb-2">Great session!</h2>
            <p className="text-[#5A6B7A]">
              Your session with {session.provider.name} has ended.
            </p>
          </div>

          {/* Session details */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-[#132F43] mb-3">Session Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Coach</span>
                <span className="text-[#132F43]">{session.provider.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Duration</span>
                <span className="text-[#132F43]">{session.duration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Total charged</span>
                <span className="text-[#132F43]">${session.totalCost}</span>
              </div>
            </div>
          </Card>

          {/* Session notes input */}
          <div>
            <h3 className="font-medium text-[#132F43] mb-2">Add your notes (optional)</h3>
            <p className="text-sm text-[#5A6B7A] mb-3">
              Jot down key takeaways or strategies to remember. These will be saved to your reports.
            </p>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="What worked? What will you try?"
              className="w-full h-32 p-3 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </div>

          {/* Rate provider */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-[#132F43] mb-3">How was your session?</h3>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSessionRating(rating)}
                  aria-label={`Rate ${rating} star${rating !== 1 ? 's' : ''}`}
                  aria-pressed={sessionRating === rating}
                  className={`w-10 h-10 rounded-full border-2 transition-colors flex items-center justify-center ${
                    rating <= sessionRating
                      ? 'border-yellow-400 bg-[#FDF9F0]'
                      : 'border-[#E8E4DF] hover:border-yellow-400 hover:bg-[#FDF9F0]'
                  }`}
                >
                  <Star className={`w-5 h-5 ${rating <= sessionRating ? 'text-yellow-400 fill-yellow-400' : 'text-[#8A9BA8]'}`} />
                </button>
              ))}
            </div>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (session) onSessionEnd?.(session, sessionNotes);
                setSession(null);
                setSelectedProvider(null);
                setSessionNotes('');
                setSessionRating(0);
                setStep('browse');
                loadProviders();
              }}
            >
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
