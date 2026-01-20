import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Global disclaimer text constant - ABA-based behavioral wellness positioning
export const GLOBAL_DISCLAIMER_TEXT = "Aminy provides educational and behavioral wellness tools based on the principles of Applied Behavior Analysis (ABA) and adaptive AI personalization. It is not a medical device or provider of clinical therapy. For emergencies, call local emergency services.";

// Urgent help text constant
export const URGENT_HELP_TEXT = "Aminy isn't for crises. For immediate danger call 911. For mental health crises call/text 988 (US).";

interface GlobalDisclaimerProps {
  variant?: 'footer' | 'card' | 'modal' | 'inline';
  className?: string;
  showIcon?: boolean;
}

export function GlobalDisclaimer({ 
  variant = 'footer', 
  className = '', 
  showIcon = false 
}: GlobalDisclaimerProps) {
  
  const baseClasses = "text-xs leading-relaxed text-muted-foreground";
  
  const variantClasses = {
    footer: "text-center p-3 border-t border-gray-200 bg-gray-50/50",
    card: "p-3 bg-gray-50/50 border border-gray-200 rounded-lg",
    modal: "p-2 text-center",
    inline: "py-2"
  };
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;
  
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
    <div className="space-y-4">
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