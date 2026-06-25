// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Shield, Lock, Info } from 'lucide-react';
import { Card } from './ui/card';

interface LegalPrivacyFooterProps {
  variant?: 'full' | 'compact' | 'inline';
  showIcons?: boolean;
  className?: string;
}

export function LegalPrivacyFooter({ 
  variant = 'full', 
  showIcons = true,
  className = '' 
}: LegalPrivacyFooterProps) {
  
  if (variant === 'inline') {
    return (
      <div className={`text-sm text-[#5A6B7A] ${className}`}>
        <p>
          Aminy provides educational and behavioral wellness tools based on the principles of Applied Behavior Analysis (ABA). 
          It is not a medical device or provider of clinical therapy.
        </p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={`p-4 bg-[#FAF7F2] border-[#E8E4DF] ${className}`}>
        <div className="flex items-start gap-3">
          {showIcons && (
            <Shield className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="text-sm text-[#5A6B7A] leading-relaxed space-y-2">
            <p>
              <strong>Disclaimer:</strong> Aminy provides educational and behavioral wellness tools based on the principles of Applied Behavior Analysis (ABA) and adaptive AI personalization. It is not a medical device or provider of clinical therapy.
            </p>
            <p>
              <strong>Privacy:</strong> Your data supports your family's progress — never sold, always private.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Full variant - default
  return (
    <div className={`border-t border-[#E8E4DF] bg-[#FAF7F2] py-8 px-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
          
          {/* Legal Disclaimer */}
          <Card className="p-5 bg-white border-[#E8E4DF]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1B2733] mb-1">Important Disclosure</h3>
                <p className="text-sm text-[#5A6B7A]">What Aminy is and is not</p>
              </div>
            </div>
            
            <p className="text-sm text-[#3A4A57] leading-relaxed mb-3">
              Aminy provides <strong>educational and behavioral wellness tools</strong> based on the principles of 
              Applied Behavior Analysis (ABA) and adaptive AI personalization.
            </p>
            
            <p className="text-sm text-[#3A4A57] leading-relaxed">
              <strong>Aminy is not:</strong>
            </p>
            <ul className="text-sm text-[#5A6B7A] leading-relaxed ml-4 list-disc space-y-1 mt-2">
              <li>A medical device</li>
              <li>A provider of clinical therapy</li>
              <li>A substitute for professional medical advice, diagnosis, or treatment</li>
              <li>Emergency support (for crises, call 911 or 988)</li>
            </ul>
            
            <p className="text-sm text-[#5A6B7A] mt-4 italic">
              Always consult with qualified healthcare providers for medical concerns.
            </p>
          </Card>

          {/* Privacy Promise */}
          <Card className="p-5 bg-white border-[#E8E4DF]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1B2733] mb-1">Your Privacy & Data</h3>
                <p className="text-sm text-[#5A6B7A]">We take security seriously</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-[#3A4A57] leading-relaxed">
              <p>
                <strong>Your data supports your family's progress — never sold, always private.</strong>
              </p>
              
              <div className="bg-[#EEF4F8] rounded-lg p-3 text-sm">
                <p className="font-semibold text-blue-900 mb-2">We protect your family with:</p>
                <ul className="space-y-1 text-[#4A6478]">
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Industry-standard encryption (in transit & at rest)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>SOC 2 compliant infrastructure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>You own your data — delete anytime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Never shared without your explicit permission</span>
                  </li>
                </ul>
              </div>
              
              <p className="text-sm text-[#5A6B7A]">
                Read our <a href="/privacy" className="inline-flex min-h-11 items-center text-accent hover:underline">Privacy Policy</a> and{' '}
                <a href="/terms" className="inline-flex min-h-11 items-center text-accent hover:underline">Terms of Service</a> for full details.
              </p>
            </div>
          </Card>
        </div>

        {/* Footer Links */}
        <div className="mt-4 sm:mt-6 pt-6 border-t border-[#E8E4DF] text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm text-[#5A6B7A]">
            <a href="/about" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">About Aminy</a>
            <span>•</span>
            <a href="/privacy" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="/contact" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">Contact Us</a>
            <span>•</span>
            <a href="/support" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">Help Center</a>
          </div>
          
          <p className="text-sm text-slate-400 mt-4">
            © {new Date().getFullYear()} Aminy, LLC All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplified version for onboarding flows
 */
export function OnboardingLegalNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg ${className}`}>
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#5A6B7A] leading-relaxed space-y-1">
          <p>
            <strong>Disclaimer:</strong> Aminy provides educational and behavioral wellness tools based on ABA principles. 
            It is not clinical therapy or a medical device.
          </p>
          <p className="text-[#5A6B7A]">
            For emergencies, call 911. For mental health crises, call/text 988 (US).
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimalist version for page footers
 */
export function MinimalLegalFooter({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center text-sm text-[#5A6B7A] leading-relaxed ${className}`}>
      <p>
        Aminy provides educational and behavioral wellness tools based on the principles of Applied Behavior Analysis (ABA). 
        Not a medical device or provider of clinical therapy.
      </p>
      <p className="mt-2">
        Your data supports your family's progress — never sold, always private.
      </p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <a href="/privacy" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">Privacy</a>
        <span>•</span>
        <a href="/terms" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">Terms</a>
        <span>•</span>
        <a href="/contact" className="inline-flex min-h-11 items-center hover:text-accent transition-colors">Contact</a>
      </div>
    </div>
  );
}
