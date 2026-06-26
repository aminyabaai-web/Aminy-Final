// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Telehealth Flow Container
 * Orchestrates the complete Get Care booking flow
 *
 * Flow:
 * 1. Home/Entry → Browse Concerns OR Get Care
 * 2. Browse Concerns → Get Care (with concern pre-selected)
 * 3. Get Care → Book Visit (with intake data)
 * 4. Book Visit → Appointment Confirmation
 * 5. Appointment Confirmation → Success → Care Plan
 */

import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Shield, Clock, Zap, Heart, ChevronRight, CheckCircle } from 'lucide-react';
import {
  Concern,
  Provider,
  TimeSlot,
  VisitType,
  GetCareIntake,
  BookingState,
  MOCK_PROVIDERS
} from '../../types/telehealth';

import { BrowseTopConcerns } from './BrowseTopConcerns';
import { getCashPayVisitEconomics, type TelehealthVisitClass } from '../../lib/telehealth-economics';
import { GetCareIntakeScreen } from './GetCareIntake';
import { BookVisitScreen } from './BookVisit';
import { AppointmentConfirmationScreen } from './AppointmentConfirmation';
import { CarePlanTabScreen } from './CarePlanTab';
import { VisitSummaryDetailScreen } from './VisitSummaryDetail';
import { VideoCall } from './VideoCallRoom';

// Flow steps
type TelehealthStep =
  | 'choose-path'
  | 'browse-concerns'
  | 'get-care'
  | 'verify-insurance'
  | 'book-visit'
  | 'confirm'
  | 'care-plan'
  | 'summary-detail'
  | 'pre-call-check'
  | 'video-call';

type BookingPath = 'quick-consult' | 'start-services' | null;

// Derive the public cash-pay menu from the economics config's isPublicMenu flag
// so deferred/non-self-serve visits (e.g. diagnostic_deep_review) never surface here.
const PUBLIC_CASH_PAY_CLASSES: TelehealthVisitClass[] = ['quick_consult', 'standard_session', 'diagnostic_deep_review', 'follow_up'];
const publicCashPayVisits = PUBLIC_CASH_PAY_CLASSES
  .map(getCashPayVisitEconomics)
  .filter((v) => v.isPublicMenu);
const publicCashPayPrices = publicCashPayVisits.map((v) => v.basePriceCents / 100);
const publicCashPayRange = `$${Math.min(...publicCashPayPrices)}–$${Math.max(...publicCashPayPrices)}`;
const publicCashPayLabels = publicCashPayVisits.map((v) => v.publicLabel);
const cashPayMenuSummary =
  publicCashPayLabels.length > 1
    ? `${publicCashPayLabels.slice(0, -1).join(', ')} and ${publicCashPayLabels[publicCashPayLabels.length - 1]}`
    : publicCashPayLabels[0] ?? '';

// Pre-call check component (inline in TelehealthFlow)
function PreCallCheck({ onReady, onBack }: { onReady: () => void; onBack: () => void }) {
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check camera and microphone permissions
    async function checkDevices() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraReady(true);
        setMicReady(true);
        // Stop tracks immediately - we just needed to check access
        stream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.warn('Device check failed:', err);
        // Try individual checks
        try {
          const video = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraReady(true);
          video.getTracks().forEach(t => t.stop());
        } catch { setCameraReady(false); }
        try {
          const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicReady(true);
          audio.getTracks().forEach(t => t.stop());
        } catch { setMicReady(false); }
      }
      setChecking(false);
    }
    checkDevices();
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-xl font-bold text-center">Pre-Call Check</h2>
      <p className="text-center text-[#5A6B7A]">Let's make sure everything is ready for your visit</p>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F6FBFB]">
          <span className="text-2xl">{checking ? '\u23F3' : cameraReady ? '\u2705' : '\u274C'}</span>
          <div>
            <p className="font-medium">Camera</p>
            <p className="text-sm text-[#5A6B7A]">{checking ? 'Checking...' : cameraReady ? 'Ready' : 'Not available - check permissions'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F6FBFB]">
          <span className="text-2xl">{checking ? '\u23F3' : micReady ? '\u2705' : '\u274C'}</span>
          <div>
            <p className="font-medium">Microphone</p>
            <p className="text-sm text-[#5A6B7A]">{checking ? 'Checking...' : micReady ? 'Ready' : 'Not available - check permissions'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F6FBFB]">
          <span className="text-2xl">{'connection' in navigator ? '\u2705' : '\u26A0\uFE0F'}</span>
          <div>
            <p className="font-medium">Internet Connection</p>
            <p className="text-sm text-[#5A6B7A]">{navigator.onLine ? 'Connected' : 'No connection detected'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="flex-1 py-3 px-4 rounded-lg border border-[#E8E4DF] font-medium">
          Back
        </button>
        <button
          onClick={onReady}
          disabled={checking}
          className="flex-1 py-3 px-4 rounded-lg bg-primary text-white font-medium disabled:opacity-50"
        >
          {cameraReady && micReady ? 'Join Call' : 'Continue Anyway'}
        </button>
      </div>
    </div>
  );
}

interface TelehealthFlowProps {
  initialStep?: TelehealthStep;
  onClose: () => void;
  defaultState?: string;
  // Analytics callback
  onAnalytics?: (event: string, data?: Record<string, any>) => void;
}

export function TelehealthFlow({
  initialStep = 'choose-path',
  onClose,
  defaultState,
  onAnalytics
}: TelehealthFlowProps) {
  // Flow state
  const [currentStep, setCurrentStep] = useState<TelehealthStep>(initialStep);
  const [bookingPath, setBookingPath] = useState<BookingPath>(null);
  const [booking, setBooking] = useState<BookingState>({});
  const [selectedConcern, setSelectedConcern] = useState<Concern | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType>('consult');
  const [viewingSummaryId, setViewingSummaryId] = useState<string | null>(null);

  // Track analytics
  const trackEvent = useCallback((event: string, data?: Record<string, any>) => {
    onAnalytics?.(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }, [onAnalytics]);

  // Validate current step and redirect if missing required data
  useEffect(() => {
    if (currentStep === 'verify-insurance' && !booking.intake) {
      setCurrentStep('get-care');
    } else if (currentStep === 'book-visit' && !booking.intake) {
      setCurrentStep('get-care');
    } else if (currentStep === 'confirm' && (!selectedProvider || !selectedSlot || !booking.intake)) {
      setCurrentStep('book-visit');
    }
  }, [currentStep, booking.intake, selectedProvider, selectedSlot]);

  // =========================================================================
  // Navigation handlers
  // =========================================================================

  // Path selection handlers
  const handleChooseQuickConsult = () => {
    setBookingPath('quick-consult');
    trackEvent('booking_path_selected', { path: 'quick-consult' });
    setCurrentStep('browse-concerns');
  };

  const handleChooseStartServices = () => {
    setBookingPath('start-services');
    trackEvent('booking_path_selected', { path: 'start-services' });
    setCurrentStep('browse-concerns');
  };

  const handleSelectConcern = (concern: Concern) => {
    setSelectedConcern(concern);
    trackEvent('concern_selected', { concernId: concern.id, concernName: concern.name });
    setCurrentStep('get-care');
  };

  const handleIntakeSubmit = (intake: GetCareIntake) => {
    setBooking(prev => ({ ...prev, intake }));
    trackEvent('get_care_submitted', {
      visitReason: intake.visitReason,
      userState: intake.userState,
      visitFormat: intake.visitFormat,
      bookingPath,
    });
    // Start Services path goes through insurance verification first
    if (bookingPath === 'start-services') {
      setCurrentStep('verify-insurance');
    } else {
      setCurrentStep('book-visit');
    }
  };

  const handleSelectSlot = (provider: Provider, slot: TimeSlot, visitType: VisitType) => {
    setSelectedProvider(provider);
    setSelectedSlot(slot);
    setSelectedVisitType(visitType);
    setBooking(prev => ({
      ...prev,
      selectedProviderId: provider.id,
      selectedSlotId: slot.id,
      selectedSlot: slot
    }));
    trackEvent('slot_selected', {
      providerId: provider.id,
      slotTime: slot.startTime,
      visitType
    });
    setCurrentStep('confirm');
  };

  const handleJoinWaitlist = (provider?: Provider) => {
    trackEvent('waitlist_joined', { providerId: provider?.id });
    // In production, show waitlist modal or redirect
    toast.success('Added to waitlist!', {
      description: 'We\'ll notify you when appointments become available.',
    });
  };

  // 72-Hour Fallback Handlers
  const handleRequestLocalCare = () => {
    trackEvent('local_care_requested', { userState: defaultState });
    // In production, navigate to Find Care screen or show modal
    toast.success('Local care support requested', {
      description: 'We\'ll help you find providers in your area.',
    });
  };

  const handleStartHomeProgram = () => {
    trackEvent('home_program_started', { userState: defaultState });
    // In production, navigate to Home Program onboarding
    toast.success('Welcome to Aminy Home Program!', {
      description: 'We\'ll support you at home while you wait for telehealth.',
    });
  };

  const handleExportReferralPacket = () => {
    trackEvent('referral_packet_exported', { userState: defaultState });
    // In production, trigger PDF generation and download
    toast.success('Referral packet downloaded!', {
      description: 'Share this with local providers to help them understand your needs.',
    });
  };

  const handleAppointmentComplete = (appointmentId: string) => {
    setBooking(prev => ({ ...prev, appointmentId }));
    trackEvent('appointment_confirmed', { appointmentId });
    setCurrentStep('care-plan');
  };

  const handleJoinVideoCall = () => {
    trackEvent('joined_video_call', { appointmentId: booking.appointmentId });
    setCurrentStep('pre-call-check');
  };

  const handleBookFollowUp = () => {
    // Reset booking state and start fresh
    setBooking({});
    setSelectedConcern(null);
    setSelectedProvider(null);
    setSelectedSlot(null);
    setCurrentStep('browse-concerns');
  };

  const handleViewSummary = (summaryId: string) => {
    setViewingSummaryId(summaryId);
    setCurrentStep('summary-detail');
  };

  // Insurance verification complete handler
  const handleInsuranceVerified = () => {
    trackEvent('insurance_verified', { bookingPath });
    setCurrentStep('book-visit');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'choose-path':
        onClose();
        break;
      case 'browse-concerns':
        setCurrentStep('choose-path');
        break;
      case 'get-care':
        if (selectedConcern) {
          setCurrentStep('browse-concerns');
        } else {
          setCurrentStep('choose-path');
        }
        break;
      case 'verify-insurance':
        setCurrentStep('get-care');
        break;
      case 'book-visit':
        if (bookingPath === 'start-services') {
          setCurrentStep('verify-insurance');
        } else {
          setCurrentStep('get-care');
        }
        break;
      case 'confirm':
        setCurrentStep('book-visit');
        break;
      case 'care-plan':
        onClose();
        break;
      case 'summary-detail':
        setCurrentStep('care-plan');
        break;
      case 'pre-call-check':
        setCurrentStep('care-plan');
        break;
      default:
        onClose();
    }
  };

  // =========================================================================
  // Render current step
  // =========================================================================

  switch (currentStep) {
    case 'choose-path':
      return (
        <div className="min-h-screen bg-mist">
          <header className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF] px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-[#EDF4F7]">
                <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-[#132F43]">Get Care</h1>
                <p className="text-sm text-[#5A6B7A]">Choose how you'd like to get started</p>
              </div>
            </div>
          </header>
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            {/* Quick Consult Card */}
            <button onClick={handleChooseQuickConsult} className="w-full text-left">
              <div className="bg-white rounded-2xl border-2 border-[#E8E4DF] p-5 hover:border-[#C8DDE8] hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EEF4F8] flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[#132F43]">Quick Consult</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEF4F8] text-blue-700">Cash Pay</span>
                    </div>
                    <p className="text-sm text-[#5A6B7A] mb-3">
                      Book a session right away — no insurance needed. Perfect for one-time questions or ongoing self-pay.
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Book as soon as today</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{publicCashPayRange} across {cashPayMenuSummary}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Verified experts in supported telehealth states</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8A9BA8] mt-1 flex-shrink-0" />
                </div>
              </div>
            </button>

            {/* Start Services Card */}
            <button onClick={handleChooseStartServices} className="w-full text-left">
              <div className="bg-white rounded-2xl border-2 border-[#E8E4DF] p-5 hover:border-emerald-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[#132F43]">Start Services</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Insurance</span>
                    </div>
                    <p className="text-sm text-[#5A6B7A] mb-3">
                      Use your insurance where Aminy has a supported lane. We'll verify coverage, explain any authorization steps, and route you to the right next step.
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Insurance eligibility verified before booking</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Matched to supported in-network or partner-billed lanes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Intake and claim-ready context built from your Aminy profile</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8A9BA8] mt-1 flex-shrink-0" />
                </div>
              </div>
            </button>

            {/* Nudge for cash-pay users */}
            <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">Not sure?</span> Start with a Quick Consult — you can always add insurance later. We'll even check if your plan covers the services you need.
              </p>
            </div>
          </div>
        </div>
      );

    case 'browse-concerns':
      return (
        <BrowseTopConcerns
          onBack={handleBack}
          onSelectConcern={handleSelectConcern}
          userState={defaultState}
        />
      );

    case 'get-care':
      return (
        <GetCareIntakeScreen
          onBack={handleBack}
          onSubmit={handleIntakeSubmit}
          preselectedConcern={selectedConcern || undefined}
          defaultState={defaultState}
        />
      );

    case 'verify-insurance':
      return (
        <div className="min-h-screen bg-mist">
          <header className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF] px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-[#EDF4F7]">
                <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-[#132F43]">Verify Insurance</h1>
                <p className="text-sm text-[#5A6B7A]">We'll check your coverage before matching providers</p>
              </div>
            </div>
          </header>
          <div className="p-4 max-w-lg mx-auto space-y-4">
            <div className="bg-white rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#132F43]">Insurance Eligibility Check</h3>
                  <p className="text-sm text-[#5A6B7A]">Takes about 30 seconds</p>
                </div>
              </div>
              <p className="text-sm text-[#5A6B7A]">
                We'll verify your insurance covers the services you need and find in-network providers. Your intake paperwork will be auto-generated from your Aminy profile.
              </p>
              <div className="space-y-2">
                {['Coverage verified in real-time', 'In-network providers highlighted', 'Prior authorization tracked', 'Intake auto-populated'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#3A4A57]">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleInsuranceVerified}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                Verify My Insurance
              </button>
              <button
                onClick={() => {
                  setBookingPath('quick-consult');
                  trackEvent('switched_to_cash_pay', { fromStep: 'verify-insurance' });
                  setCurrentStep('book-visit');
                }}
                className="w-full py-2 text-sm text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
              >
                Skip — I'll pay out of pocket
              </button>
            </div>
          </div>
        </div>
      );

    case 'book-visit':
      // If intake is missing, useEffect will redirect - show nothing while redirecting
      if (!booking.intake) {
        return null;
      }
      return (
        <BookVisitScreen
          onBack={handleBack}
          onSelectSlot={handleSelectSlot}
          onJoinWaitlist={handleJoinWaitlist}
          onRequestLocalCare={handleRequestLocalCare}
          onStartHomeProgram={handleStartHomeProgram}
          onExportReferralPacket={handleExportReferralPacket}
          intake={booking.intake}
        />
      );

    case 'confirm':
      // If required data is missing, useEffect will redirect - show nothing while redirecting
      if (!selectedProvider || !selectedSlot || !booking.intake) {
        return null;
      }
      return (
        <AppointmentConfirmationScreen
          provider={selectedProvider}
          slot={selectedSlot}
          visitType={selectedVisitType}
          intake={booking.intake}
          onBack={handleBack}
          onComplete={handleAppointmentComplete}
          onJoinVideo={handleJoinVideoCall}
        />
      );

    case 'care-plan':
      return (
        <CarePlanTabScreen
          onBack={onClose}
          onBookFollowUp={handleBookFollowUp}
          onViewSummary={handleViewSummary}
        />
      );

    case 'summary-detail':
      // Visit summary — will be loaded from Supabase in production
      const visitSummary = {
        id: viewingSummaryId || 'vs-1',
        appointmentId: booking.appointmentId || 'apt-1',
        providerId: selectedProvider?.id || 'provider-1',
        userId: 'user-1',
        reasonForVisit: booking.intake?.visitReason || 'Assessment pending',
        whatWeDiscussed: [
          'Review care plan with provider',
          'Follow up in 2 weeks'
        ],
        planForNext7Days: [
          'Review care plan with provider',
          'Follow up in 2 weeks'
        ],
        whatToTrack: [
          'Session summary will be available after provider completes notes'
        ],
        followUpRecommendation: 'Scheduled follow-up available in My Appointments',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return (
        <VisitSummaryDetailScreen
          summary={visitSummary}
          provider={MOCK_PROVIDERS[0]}
          onBack={handleBack}
          onBookFollowUp={handleBookFollowUp}
          onShare={() => trackEvent('visit_summary_shared', { summaryId: viewingSummaryId })}
          onExport={() => trackEvent('visit_summary_exported', { summaryId: viewingSummaryId })}
        />
      );

    case 'pre-call-check':
      return (
        <PreCallCheck
          onReady={() => {
            trackEvent('pre_call_check_passed', { appointmentId: booking.appointmentId });
            setCurrentStep('video-call');
          }}
          onBack={handleBack}
        />
      );

    case 'video-call':
      return (
        <VideoCall
          sessionId={booking.appointmentId || `session-${Date.now()}`}
          userId="user-1"
          userName="Parent"
          providerName={selectedProvider ? `${selectedProvider.firstName} ${selectedProvider.lastName}` : 'Provider'}
          sessionType={selectedVisitType === 'consult' ? '25min' : '50min'}
          onCallEnd={() => {
            trackEvent('video_call_ended', { appointmentId: booking.appointmentId });
            setCurrentStep('summary-detail');
          }}
          onError={(err) => {
            toast.error('Video Call Error', { description: err });
            setCurrentStep('care-plan');
          }}
        />
      );

    default:
      return null;
  }
}

export default TelehealthFlow;
