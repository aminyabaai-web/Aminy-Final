// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TelehealthConsent.tsx
 *
 * Comprehensive telehealth consent and legal protection component.
 * Required before users can book or attend telehealth sessions.
 *
 * Key protections:
 * - Aminy is a platform/marketplace, not the clinical provider
 * - Providers are independently licensed professionals
 * - Explicit informed consent for telehealth services
 * - HIPAA acknowledgment
 * - Limitations and risks disclosure
 * - Emergency protocols
 */

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Shield,
  Video,
  AlertTriangle,
  CheckCircle,
  FileText,
  Lock,
  Phone,
  User,
  Scale,
  Heart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TelehealthConsentProps {
  onConsent: () => void;
  onDecline?: () => void;
  providerName?: string;
  sessionType?: string;
  variant?: 'full' | 'abbreviated' | 'renewal';
}

interface ConsentSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
  required: boolean;
}

export function TelehealthConsent({
  onConsent,
  onDecline,
  providerName,
  sessionType = 'telehealth coaching session',
  variant = 'full'
}: TelehealthConsentProps) {
  const [acceptedSections, setAcceptedSections] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    variant === 'full' ? new Set(['platform', 'telehealth', 'privacy']) : new Set()
  );
  const [showFullConsent, setShowFullConsent] = useState(variant === 'full');

  const consentSections: ConsentSection[] = [
    {
      id: 'platform',
      title: 'Platform & Provider Relationship',
      icon: Scale,
      required: true,
      content: (
        <div className="space-y-3 text-sm text-[#3A4A57]">
          <p>
            <strong>Aminy is a technology platform</strong> that connects families with independently licensed
            behavioral health professionals. Aminy is not a healthcare provider and does not provide
            medical advice, diagnosis, or treatment.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="font-medium text-amber-900 mb-2">I understand that:</p>
            <ul className="space-y-2 text-amber-800">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Providers on Aminy are <strong>independent contractors</strong>, not employees of Aminy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Each provider maintains their own <strong>professional licenses and liability insurance</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Providers are solely responsible for the <strong>clinical services they provide</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Aminy facilitates connections but does not control or direct provider clinical decisions</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'services',
      title: 'Nature of Services',
      icon: Heart,
      required: true,
      content: (
        <div className="space-y-3 text-sm text-[#3A4A57]">
          <p>
            Sessions booked through Aminy are <strong>parent coaching and wellness support services</strong>
            based on the principles of Applied Behavior Analysis (ABA).
          </p>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-900 mb-2">Services MAY include:</p>
              <ul className="space-y-1 text-green-800 text-sm">
                <li>• Parent coaching and training</li>
                <li>• Behavioral strategy guidance</li>
                <li>• Progress review and goal setting</li>
                <li>• Care plan development support</li>
                <li>• IEP preparation guidance</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-900 mb-2">Services DO NOT include:</p>
              <ul className="space-y-1 text-red-800 text-sm">
                <li>• Medical diagnosis or treatment</li>
                <li>• Prescription medications</li>
                <li>• Direct therapy with your child</li>
                <li>• Emergency or crisis intervention</li>
                <li>• Court-mandated evaluations</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'telehealth',
      title: 'Telehealth Consent',
      icon: Video,
      required: true,
      content: (
        <div className="space-y-3 text-sm text-[#3A4A57]">
          <p>
            I consent to receive services via <strong>telehealth</strong> (audio-visual technology).
            I understand the following about telehealth:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Sessions are conducted over <strong>encrypted, secure video</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>I am responsible for ensuring a <strong>private, quiet environment</strong> for sessions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Technology issues may occasionally <strong>disrupt sessions</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Sessions <strong>may be recorded</strong> for quality and training (with my consent)</span>
            </li>
          </ul>
          <div className="p-3 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
            <p className="text-[#4A6478] text-sm">
              <strong>Technical requirements:</strong> Stable internet connection, device with camera/microphone,
              current web browser or the Aminy app.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'privacy',
      title: 'Privacy & Confidentiality',
      icon: Lock,
      required: true,
      content: (
        <div className="space-y-3 text-sm text-[#3A4A57]">
          <p>I understand that:</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>My information is protected under applicable privacy laws</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>Session notes may be shared with my care team within Aminy (with my permission)</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>Providers are required to report suspected abuse, neglect, or danger to self/others</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>I can request copies of my session records at any time</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'emergency',
      title: 'Emergency Protocol',
      icon: AlertTriangle,
      required: true,
      content: (
        <div className="space-y-3 text-sm text-[#3A4A57]">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-900 mb-2">
              Aminy telehealth services are NOT for emergencies
            </p>
            <p className="text-red-800 mb-3">
              If you or your child are in immediate danger or experiencing a mental health crisis:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2 bg-white rounded border border-red-200">
                <p className="font-bold text-red-900">Emergency: 911</p>
                <p className="text-sm text-red-700">Immediate danger</p>
              </div>
              <div className="p-2 bg-white rounded border border-red-200">
                <p className="font-bold text-red-900">Crisis Line: 988</p>
                <p className="text-sm text-red-700">Mental health crisis</p>
              </div>
            </div>
          </div>
          <p>
            I confirm I have <strong>local emergency resources</strong> available and will not rely on
            Aminy or telehealth providers for crisis intervention.
          </p>
        </div>
      )
    },
    {
      id: 'payment',
      title: 'Payment & Cancellation',
      icon: FileText,
      required: true,
      content: (
        <div className="space-y-3 text-sm text-[#3A4A57]">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#132F43]">•</span>
              <span>Sessions are <strong>cash-pay</strong> unless otherwise specified</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#132F43]">•</span>
              <span>Payment is collected at time of booking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#132F43]">•</span>
              <span>Cancellations with <strong>24+ hours notice</strong> receive full refund</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#132F43]">•</span>
              <span>Late cancellations (&lt;24 hours) are charged at <strong>50% of the visit price</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#132F43]">•</span>
              <span>No-shows are charged the <strong>full visit amount</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#132F43]">•</span>
              <span>No-shows are charged in full</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#132F43]">•</span>
              <span>Prepaid session credits never expire</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'risks',
      title: 'Risks & Limitations',
      icon: AlertTriangle,
      required: true,
      content: (
        <div className="space-y-3 text-sm text-[#3A4A57]">
          <p>I acknowledge the following risks and limitations:</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-amber-500">⚠</span>
              <span>Results vary and are not guaranteed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-amber-500">⚠</span>
              <span>Telehealth may not be appropriate for all situations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-amber-500">⚠</span>
              <span>Technical difficulties may impact session quality</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-amber-500">⚠</span>
              <span>Behavioral strategies may take time to show results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-amber-500">⚠</span>
              <span>Sessions do not replace medical care, therapy, or education services</span>
            </li>
          </ul>
        </div>
      )
    }
  ];

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const toggleAcceptSection = (id: string) => {
    const newAccepted = new Set(acceptedSections);
    if (newAccepted.has(id)) {
      newAccepted.delete(id);
    } else {
      newAccepted.add(id);
    }
    setAcceptedSections(newAccepted);
  };

  const requiredSections = consentSections.filter(s => s.required);
  const allRequiredAccepted = requiredSections.every(s => acceptedSections.has(s.id));

  // Abbreviated version for returning users
  if (variant === 'abbreviated') {
    return (
      <Card className="p-6 max-w-lg mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-6 h-6 text-[#6B9080]" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#132F43]">Confirm Your Session</h2>
          {providerName && (
            <p className="text-[#5A6B7A] mt-1">with {providerName}</p>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="confirm-consent"
              checked={acceptedSections.has('quick')}
              onCheckedChange={() => toggleAcceptSection('quick')}
            />
            <Label htmlFor="confirm-consent" className="text-sm text-[#3A4A57] leading-relaxed cursor-pointer">
              I confirm I have previously read and agreed to the{' '}
              <button
                className="text-[#6B9080] underline hover:text-[#6B9080]"
                onClick={() => setShowFullConsent(true)}
              >
                Telehealth Consent & Terms
              </button>
              . I understand this is a coaching session, not medical treatment, and that the provider
              is an independent professional, not an employee of Aminy.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="confirm-emergency"
              checked={acceptedSections.has('emergency-quick')}
              onCheckedChange={() => toggleAcceptSection('emergency-quick')}
            />
            <Label htmlFor="confirm-emergency" className="text-sm text-[#3A4A57] leading-relaxed cursor-pointer">
              I confirm I have emergency resources available (911/988) and understand this session
              is not for crisis intervention.
            </Label>
          </div>
        </div>

        <div className="flex gap-3">
          {onDecline && (
            <Button variant="outline" onClick={onDecline} className="flex-1">
              Cancel
            </Button>
          )}
          <Button
            onClick={onConsent}
            disabled={!acceptedSections.has('quick') || !acceptedSections.has('emergency-quick')}
            className="flex-1 bg-primary hover:bg-[#216982]"
          >
            Continue to Session
          </Button>
        </div>

        {showFullConsent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <TelehealthConsent
                variant="full"
                onConsent={() => {
                  setShowFullConsent(false);
                  setAcceptedSections(new Set(['quick', 'emergency-quick']));
                }}
                onDecline={() => setShowFullConsent(false)}
              />
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Full consent form
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6 p-6 bg-gradient-to-br from-[#F6FBFB] to-cyan-50 rounded-xl">
        <div className="w-16 h-16 bg-[#6B9080]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-[#6B9080]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#132F43] mb-2">
          Telehealth Informed Consent
        </h1>
        <p className="text-[#5A6B7A]">
          Please review and acknowledge each section before your session
        </p>
        {providerName && (
          <Badge className="mt-3 bg-[#6B9080]/10 text-[#6B9080]">
            <User className="w-3 h-3 mr-1" />
            Session with {providerName}
          </Badge>
        )}
      </div>

      {/* Consent Sections */}
      <ScrollArea className="h-[50vh] pr-4">
        <div className="space-y-3 sm:space-y-4">
          {consentSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.has(section.id);
            const isAccepted = acceptedSections.has(section.id);

            return (
              <Card key={section.id} className={`overflow-hidden ${isAccepted ? 'border-green-200 bg-green-50/30' : ''}`}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#F6FBFB] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isAccepted ? 'bg-green-100' : 'bg-[#EDF4F7]'}`}>
                      <Icon className={`w-4 h-4 ${isAccepted ? 'text-green-600' : 'text-[#5A6B7A]'}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-[#132F43]">{section.title}</h3>
                      {section.required && !isAccepted && (
                        <span className="text-sm text-red-500">Required</span>
                      )}
                      {isAccepted && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#8A9BA8]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#8A9BA8]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#E8E4DF]">
                    <div className="pt-4 mb-4">
                      {section.content}
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#F6FBFB] rounded-lg">
                      <Checkbox
                        id={`accept-${section.id}`}
                        checked={isAccepted}
                        onCheckedChange={() => toggleAcceptSection(section.id)}
                      />
                      <Label
                        htmlFor={`accept-${section.id}`}
                        className="text-sm text-[#3A4A57] cursor-pointer"
                      >
                        I have read and understand this section
                      </Label>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Progress & Submit */}
      <div className="mt-4 sm:mt-6 pt-6 border-t border-[#E8E4DF]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[#5A6B7A]">
            {acceptedSections.size} of {requiredSections.length} required sections acknowledged
          </span>
          <div className="flex gap-1">
            {requiredSections.map((section) => (
              <div
                key={section.id}
                className={`w-2 h-2 rounded-full ${
                  acceptedSections.has(section.id) ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {onDecline && (
            <Button variant="outline" onClick={onDecline} className="flex-1">
              Decline & Cancel
            </Button>
          )}
          <Button
            onClick={onConsent}
            disabled={!allRequiredAccepted}
            className="flex-1 bg-primary hover:bg-[#216982] disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            I Consent & Agree
          </Button>
        </div>

        <p className="text-sm text-[#8A9BA8] text-center mt-4">
          By clicking "I Consent & Agree", you acknowledge that you have read, understood, and agree
          to all terms and conditions. A copy will be sent to your email.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact disclaimer for session cards/booking flows
 */
export function TelehealthMiniDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`text-sm text-[#5A6B7A] ${className}`}>
      <p>
        Sessions are parent coaching, not medical treatment. Providers are independent professionals,
        not Aminy employees. By booking, you agree to our{' '}
        <button className="text-[#6B9080] underline">Terms</button> and{' '}
        <button className="text-[#6B9080] underline">Telehealth Consent</button>.
      </p>
    </div>
  );
}

/**
 * Badge to show consent status
 */
export function ConsentStatusBadge({ hasConsent }: { hasConsent: boolean }) {
  if (hasConsent) {
    return (
      <Badge className="bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        Consent on File
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700">
      <AlertTriangle className="w-3 h-3 mr-1" />
      Consent Required
    </Badge>
  );
}
