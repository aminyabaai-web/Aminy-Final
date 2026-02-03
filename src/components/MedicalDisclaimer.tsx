/**
 * MedicalDisclaimer - Standard medical/therapy disclaimer
 *
 * Required disclaimer that Aminy is not a replacement for
 * professional medical advice or therapy.
 */

import React from 'react';
import { Info } from 'lucide-react';

interface MedicalDisclaimerProps {
  variant?: 'inline' | 'banner' | 'footer';
  className?: string;
}

export function MedicalDisclaimer({ variant = 'footer', className = '' }: MedicalDisclaimerProps) {
  if (variant === 'inline') {
    return (
      <p className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        Aminy™ provides educational support and is not a substitute for professional medical advice,
        diagnosis, or treatment from qualified healthcare providers.
      </p>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Important Notice
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Aminy™ is an AI-powered educational tool designed to support parents and caregivers.
              It is not intended to replace professional medical advice, diagnosis, or treatment from
              qualified healthcare providers, including licensed BCBAs, therapists, or physicians.
              Always seek the guidance of your healthcare provider with any questions you may have
              regarding your child's health or treatment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Footer variant (default)
  return (
    <div className={`text-center py-4 px-4 ${className}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
        <strong>Medical Disclaimer:</strong> Aminy™ is an AI-powered educational tool and is not intended
        to provide medical advice, diagnosis, or treatment. The information provided should not be used
        as a substitute for professional advice from a qualified healthcare provider, BCBA, or therapist.
        Always consult with appropriate professionals regarding your child's specific needs.
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        © {new Date().getFullYear()} Aminy, LLC All rights reserved. Aminy™ is a trademark of Aminy, LLC
      </p>
    </div>
  );
}

export default MedicalDisclaimer;
