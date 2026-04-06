// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Compass, Shield, Eye, Lock } from 'lucide-react';

interface MemoryConsentScreenProps {
  onComplete: (consentGiven: boolean) => void;
  defaultConsent?: boolean;
}

export const MemoryConsentScreen: React.FC<MemoryConsentScreenProps> = ({
  onComplete,
  defaultConsent = true
}) => {
  const [memoryEnabled, setMemoryEnabled] = useState(defaultConsent);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">

        {/* Header - Simple & Centered */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-medium mb-2">Help Aminy remember</h1>
          <p className="text-slate-600">
            Aminy works better when it remembers your family's unique needs.
          </p>
        </div>

        {/* Main Toggle - Clean & Minimal */}
        <div className="border border-slate-200 rounded-xl p-5 mb-8">
          <label className="flex flex-row items-center justify-between cursor-pointer">
            <div className="space-y-1 pr-4">
              <h3 className="font-medium leading-none text-slate-900">Save helpful memories</h3>
              <p className="text-sm text-slate-600 pt-1">
                Remembers important details like your child's name, preferences, and routines.
              </p>
            </div>
            <Switch
              checked={memoryEnabled}
              onCheckedChange={setMemoryEnabled}
              className="data-[state=checked]:bg-indigo-600"
              id="memory-consent"
            />
          </label>
        </div>

        {/* What's Saved */}
        <div className="mb-8">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2 text-slate-700">
            <Eye className="w-4 h-4" />
            What Aminy remembers
          </h3>

          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex gap-3">
              <span>•</span>
              <div>
                <span className="font-medium text-slate-900">Essential info:</span> Child's name, age, activities
              </div>
            </div>

            <div className="flex gap-3">
              <span>•</span>
              <div>
                <span className="font-medium text-slate-900">Patterns:</span> What calms your child, successful routines
              </div>
            </div>

            <div className="flex gap-3">
              <span>•</span>
              <div>
                <span className="font-medium text-slate-900">Goals:</span> Family priorities, therapy goals
              </div>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="mb-8">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2 text-slate-700">
            <Shield className="w-4 h-4" />
            Privacy & safety
          </h3>

          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex gap-3">
              <span>•</span>
              <div>
                <span className="font-medium text-slate-900">Never stored:</span> Medical diagnoses, addresses, payment info
              </div>
            </div>

            <div className="flex gap-3">
              <span>•</span>
              <div>
                <span className="font-medium text-slate-900">Full control:</span> View, edit, or delete memories anytime
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button - Minimal & Clean */}
        <Button
          onClick={() => onComplete(memoryEnabled)}
          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium"
        >
          Continue
        </Button>

        {/* Fine Print */}
        <p className="text-xs text-center text-slate-500 mt-6">
          <a href="/privacy" className="hover:text-slate-900">Privacy Policy</a>
          {' · '}
          <a href="/terms" className="hover:text-slate-900">Terms</a>
        </p>
      </div>
    </div>
  );
};