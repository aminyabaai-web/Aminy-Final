// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Get Care Mini-Intake Screen
 * Simple intake flow like One Medical: reason, who, state, visit type
 *
 * Design: Clean, minimal, with clear progression
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, MapPin, User, Users, Baby, ChevronDown, AlertTriangle, Video, Building2 } from 'lucide-react';
import {
  Concern,
  GetCareIntake,
  US_STATES,
  VisitFormat
} from '../../types/telehealth';

interface GetCareIntakeProps {
  onBack: () => void;
  onSubmit: (intake: GetCareIntake) => void;
  preselectedConcern?: Concern;
  defaultState?: string;
}

export function GetCareIntakeScreen({
  onBack,
  onSubmit,
  preselectedConcern,
  defaultState
}: GetCareIntakeProps) {
  // Form state
  const [visitReason, setVisitReason] = useState(preselectedConcern?.name || '');
  const [concernId, setConcernId] = useState(preselectedConcern?.id);
  const [whoIsThisFor, setWhoIsThisFor] = useState<'child' | 'parent' | 'family' | null>(null);
  const [userState, setUserState] = useState(defaultState || '');
  const [userCity, setUserCity] = useState('');
  const [visitFormat, setVisitFormat] = useState<VisitFormat>('remote');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  // Validation
  const isValid = visitReason.trim() && whoIsThisFor && userState;

  // Filter states by search
  const filteredStates = US_STATES.filter(s =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const handleSubmit = () => {
    if (!isValid || !whoIsThisFor) return;

    onSubmit({
      visitReason: visitReason.trim(),
      concernId,
      whoIsThisFor,
      userState,
      userCity: userCity.trim() || undefined,
      visitFormat,
      preferredVisitType: preselectedConcern?.recommendedVisitType
    });
  };

  const getStateName = (code: string) => {
    return US_STATES.find(s => s.code === code)?.name || code;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Get Care</h1>
            <p className="text-sm text-gray-500">Find a provider for your needs</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Step 1: Visit Reason */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would you like help with?
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="e.g., Meltdowns, Sleep issues, Parent burnout"
              value={visitReason}
              onChange={(e) => {
                setVisitReason(e.target.value);
                if (e.target.value !== preselectedConcern?.name) {
                  setConcernId(undefined);
                }
              }}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2] transition-all"
            />
          </div>
          {preselectedConcern && concernId === preselectedConcern.id && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl">{preselectedConcern.icon}</span>
              <span className="text-sm text-gray-600">{preselectedConcern.description}</span>
            </div>
          )}
        </section>

        {/* Step 2: Who is this for */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Who is this for?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <WhoButton
              icon={<Baby className="w-5 h-5" />}
              label="Child"
              selected={whoIsThisFor === 'child'}
              onClick={() => setWhoIsThisFor('child')}
            />
            <WhoButton
              icon={<User className="w-5 h-5" />}
              label="Parent"
              selected={whoIsThisFor === 'parent'}
              onClick={() => setWhoIsThisFor('parent')}
            />
            <WhoButton
              icon={<Users className="w-5 h-5" />}
              label="Family"
              selected={whoIsThisFor === 'family'}
              onClick={() => setWhoIsThisFor('family')}
            />
          </div>
        </section>

        {/* Step 3: Location */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Where are you located?
            <span className="text-gray-400 font-normal"> (required for provider matching)</span>
          </label>

          {/* State Selector */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button
              onClick={() => setShowStateDropdown(!showStateDropdown)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2] transition-all"
            >
              {userState ? getStateName(userState) : 'Select your state'}
            </button>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

            {/* State Dropdown */}
            {showStateDropdown && (
              <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg max-h-64 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Search states..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredStates.map((state) => (
                    <button
                      key={state.code}
                      onClick={() => {
                        setUserState(state.code);
                        setShowStateDropdown(false);
                        setStateSearch('');
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        userState === state.code ? 'bg-[#0891b2]/10 text-[#0891b2] font-medium' : 'text-gray-700'
                      }`}
                    >
                      {state.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* City (optional) */}
          <div className="mt-3">
            <input
              type="text"
              placeholder="City (optional)"
              value={userCity}
              onChange={(e) => setUserCity(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2] transition-all"
            />
          </div>
        </section>

        {/* Step 4: Visit Type */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Visit type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <VisitTypeButton
              icon={<Video className="w-5 h-5" />}
              label="Remote"
              sublabel="Video visit"
              selected={visitFormat === 'remote'}
              onClick={() => setVisitFormat('remote')}
            />
            <VisitTypeButton
              icon={<Building2 className="w-5 h-5" />}
              label="In Office"
              sublabel="Coming soon"
              selected={visitFormat === 'in-office'}
              onClick={() => {}}
              disabled
            />
          </div>
        </section>

        {/* Emergency Disclaimer */}
        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">
                <span className="font-medium">Emergency?</span>{' '}
                <a href="tel:911" className="underline font-semibold">Call 911</a>
              </p>
              <p className="text-xs text-red-600 mt-1">
                Aminy provides guidance and coaching, not medical care.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            isValid
              ? 'bg-[#0891b2] text-white hover:bg-[#466379] active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          See Available Times
        </button>
      </div>

      {/* Click-away for dropdown */}
      {showStateDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowStateDropdown(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface WhoButtonProps {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function WhoButton({ icon, label, selected, onClick }: WhoButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'bg-[#0891b2]/10 border-[#0891b2] text-[#0891b2]'
          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

interface VisitTypeButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function VisitTypeButton({
  icon,
  label,
  sublabel,
  selected,
  onClick,
  disabled
}: VisitTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
        disabled
          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
          : selected
          ? 'bg-[#0891b2]/10 border-[#0891b2] text-[#0891b2]'
          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {icon}
      <div className="text-left">
        <span className="text-sm font-medium block">{label}</span>
        <span className="text-xs opacity-70">{sublabel}</span>
      </div>
    </button>
  );
}

export default GetCareIntakeScreen;
