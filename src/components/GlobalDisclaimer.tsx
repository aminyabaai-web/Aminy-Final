// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { AlertTriangle, Info, Stethoscope, Phone } from 'lucide-react';

// Global disclaimer text constant - ABA-based behavioral wellness positioning
export const GLOBAL_DISCLAIMER_TEXT = "Aminy provides educational and behavioral wellness tools based on the principles of Applied Behavior Analysis (ABA) and adaptive AI personalization. It is not a medical device or provider of clinical therapy. For emergencies, call local emergency services.";

// Urgent help text constant
export const URGENT_HELP_TEXT = "Aminy isn't for crises. For immediate danger call 911. For mental health crises call/text 988 (US).";

// Clinical scope disclaimer text
export const CLINICAL_SCOPE_TEXT = "Aminy is NOT a replacement for therapy, medical care, or clinical diagnosis. Always consult licensed professionals for clinical treatment.";

interface GlobalDisclaimerProps {
  variant?: 'footer' | 'card' | 'modal' | 'inline' | 'critical';
  className?: string;
  showIcon?: boolean;
}

export function GlobalDisclaimer({
  variant = 'footer',
  className = '',
  showIcon = false
}: GlobalDisclaimerProps) {

  const baseClasses = "text-xs leading-relaxed text-muted-foreground";

  const variantClasses: Record<string, string> = {
    footer: "text-center p-3 border-t border-gray-200 bg-[#FAF7F2]/50",
    card: "p-3 bg-[#FAF7F2]/50 border border-gray-200 rounded-lg",
    modal: "p-2 text-center",
    inline: "py-2",
    critical: "p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900"
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  // Critical variant has special styling
  if (variant === 'critical') {
    return (
      <div className={`flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl ${className}`}>
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-amber-900 text-sm mb-1">Important Notice</p>
          <p className="text-amber-800 text-xs leading-relaxed">{GLOBAL_DISCLAIMER_TEXT}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={combinedClasses}>
      {showIcon && (
        <div className="flex items-start gap-2 text-left">
          <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="flex-1">{GLOBAL_DISCLAIMER_TEXT}</p>
        </div>
      )}
      {!showIcon && (
        <p className="text-center">
          {GLOBAL_DISCLAIMER_TEXT.split('. ').map((sentence, index, array) => (
            <span key={index}>
              {sentence}{index < array.length - 1 ? '.' : ''}
              {index < array.length - 1 && <br />}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

/**
 * Clinical Scope Disclaimer
 * Shows before first AI chat message to set clear expectations
 */
interface ClinicalScopeDisclaimerProps {
  onAcknowledge?: () => void;
  showAcknowledgeButton?: boolean;
  compact?: boolean;
  className?: string;
}

export function ClinicalScopeDisclaimer({
  onAcknowledge,
  showAcknowledgeButton = false,
  compact = false,
  className = ''
}: ClinicalScopeDisclaimerProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs ${className}`}>
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-amber-800">{CLINICAL_SCOPE_TEXT}</span>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 text-sm mb-1">
            Understanding Aminy's Role
          </h4>
          <p className="text-amber-800 text-xs leading-relaxed mb-2">
            {CLINICAL_SCOPE_TEXT}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-600">Need clinical support?</span>
            <a
              href="#find-providers"
              className="text-amber-700 font-medium hover:text-amber-900 underline"
              onClick={(e) => {
                e.preventDefault();
                // Could navigate to provider marketplace
              }}
            >
              Find providers
            </a>
          </div>
        </div>
      </div>

      {showAcknowledgeButton && onAcknowledge && (
        <button
          onClick={onAcknowledge}
          className="mt-3 w-full py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 text-sm font-medium rounded-lg transition-colors"
        >
          I Understand
        </button>
      )}
    </div>
  );
}

/**
 * Chat Disclaimer Banner
 * Compact banner to show above chat input
 */
export function ChatDisclaimerBanner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-2 px-3 bg-[#FAF7F2] border-b border-gray-200 text-xs text-gray-500 ${className}`}>
      <Info className="w-3 h-3 flex-shrink-0" />
      <span>Aminy provides support, not clinical care. For emergencies, call 911 or 988.</span>
    </div>
  );
}

/**
 * First Message Disclaimer
 * Shows once before first AI message in a chat session
 */
export function FirstMessageDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`mx-4 my-2 p-3 bg-blue-50 border border-blue-200 rounded-xl ${className}`}>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="w-3 h-3 text-blue-600" />
        </div>
        <div className="flex-1 text-xs">
          <p className="text-blue-900 font-medium mb-1">Before we chat</p>
          <p className="text-blue-700 leading-relaxed">
            I'm here to support you with strategies, routines, and resources. For clinical therapy or diagnosis, please work with licensed professionals.
          </p>
          <div className="mt-2 flex items-center gap-3 text-blue-600">
            <a href="tel:911" className="flex items-center gap-1 hover:text-blue-800">
              <Phone className="w-3 h-3" />
              <span>Emergency: 911</span>
            </a>
            <a href="tel:988" className="flex items-center gap-1 hover:text-blue-800">
              <Phone className="w-3 h-3" />
              <span>Crisis: 988</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UrgentHelpDisclaimerProps {
  className?: string;
}

export function UrgentHelpDisclaimer({ className = '' }: UrgentHelpDisclaimerProps) {
  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-red-900 mb-1 text-sm">
            Emergency Notice
          </h4>
          <p className="text-red-800 text-xs leading-relaxed">
            {URGENT_HELP_TEXT}
          </p>
          <div className="mt-3 space-y-2">
            <a
              href="tel:911"
              className="flex items-center gap-2 text-red-800 text-sm font-medium hover:text-red-900 hover:underline"
            >
              🚨 Emergency: <span className="underline">911</span>
            </a>
            <a
              href="tel:988"
              className="flex items-center gap-2 text-red-800 text-sm font-medium hover:text-red-900 hover:underline"
            >
              💭 Mental Health Crisis: <span className="underline">988</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Crisis resources component for urgent help
export function CrisisResources() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <UrgentHelpDisclaimer />
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2 text-sm">
          Additional Crisis Resources
        </h4>
        <div className="space-y-3 text-blue-800 text-xs">
          <div>
            <p className="font-medium">National Suicide Prevention Lifeline</p>
            <a href="tel:988" className="underline hover:text-blue-900">Call or text: 988</a>
          </div>
          <div>
            <p className="font-medium">Crisis Text Line</p>
            <a href="sms:741741&body=HOME" className="underline hover:text-blue-900">Text HOME to 741741</a>
          </div>
          <div>
            <p className="font-medium">SAMHSA National Helpline</p>
            <a href="tel:18006624357" className="underline hover:text-blue-900">1-800-662-4357</a>
            <span className="text-blue-600"> (24/7, free, confidential)</span>
          </div>
          <div>
            <p className="font-medium">Childhelp National Child Abuse Hotline</p>
            <a href="tel:18004224453" className="underline hover:text-blue-900">1-800-422-4453</a>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-amber-800 text-xs font-medium text-center">
          Always contact emergency services for immediate safety concerns.
        </p>
      </div>
    </div>
  );
}