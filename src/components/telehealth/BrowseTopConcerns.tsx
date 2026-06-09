// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Browse Top Concerns Screen
 * One Medical-style grid of concern tiles that route to Get Care
 *
 * Design: Rounded cards with circular images/icons, organized by category
 */

import React, { useState } from 'react';
import { ArrowLeft, Search, AlertTriangle, ChevronRight } from 'lucide-react';
import {
  Concern,
  ConcernCategory,
  DEFAULT_CONCERNS,
  CONCERN_CATEGORIES
} from '../../types/telehealth';

interface BrowseTopConcernsProps {
  onBack: () => void;
  onSelectConcern: (concern: Concern) => void;
  userState?: string;
}

export function BrowseTopConcerns({
  onBack,
  onSelectConcern,
  userState
}: BrowseTopConcernsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingSafetyConcern, setPendingSafetyConcern] = useState<Concern | null>(null);

  // Group concerns by category
  const concernsByCategory = DEFAULT_CONCERNS.reduce((acc, concern) => {
    if (!acc[concern.category]) {
      acc[concern.category] = [];
    }
    acc[concern.category].push(concern);
    return acc;
  }, {} as Record<ConcernCategory, Concern[]>);

  // Filter concerns by search
  const filteredConcerns = searchQuery.trim()
    ? DEFAULT_CONCERNS.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleConcernClick = (concern: Concern) => {
    if (concern.requiresSafetyDisclaimer) {
      setPendingSafetyConcern(concern);
      setShowSafetyModal(true);
    } else {
      onSelectConcern(concern);
    }
  };

  const handleSafetyAcknowledge = () => {
    if (pendingSafetyConcern) {
      onSelectConcern(pendingSafetyConcern);
    }
    setShowSafetyModal(false);
    setPendingSafetyConcern(null);
  };

  const categoryOrder: ConcernCategory[] = ['most-common', 'autism-neurodivergence', 'caregiver-family'];

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#1B2733]">Browse Top Concerns</h1>
            <p className="text-sm text-[#5A6B7A]">Find the right support for your needs</p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-4 bg-white border-b border-[#E8E4DF]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8A9BA8]" />
          <input
            type="text"
            placeholder="Search concerns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#E8E4DF] rounded-xl text-[#1B2733] placeholder:text-[#5A6B7A] focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {/* Search Results */}
        {filteredConcerns ? (
          <div>
            <h2 className="text-sm font-medium text-[#5A6B7A] mb-3">
              {filteredConcerns.length} result{filteredConcerns.length !== 1 ? 's' : ''} for "{searchQuery}"
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredConcerns.map((concern) => (
                <ConcernTile
                  key={concern.id}
                  concern={concern}
                  onClick={() => handleConcernClick(concern)}
                />
              ))}
            </div>
            {filteredConcerns.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#5A6B7A] mb-2">No concerns match your search</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#6B9080] font-medium hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Category Sections */
          <div className="space-y-8">
            {categoryOrder.map((category) => {
              const concerns = concernsByCategory[category];
              const categoryInfo = CONCERN_CATEGORIES[category];

              if (!concerns || concerns.length === 0) return null;

              return (
                <section key={category}>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-[#1B2733]">
                      {categoryInfo.title}
                    </h2>
                    <p className="text-sm text-[#5A6B7A]">{categoryInfo.description}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {concerns.map((concern) => (
                      <ConcernTile
                        key={concern.id}
                        concern={concern}
                        onClick={() => handleConcernClick(concern)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Not seeing what you need */}
        <div className="mt-8 p-4 bg-white rounded-2xl border border-[#E8E4DF]">
          <h3 className="font-medium text-[#1B2733] mb-1">Not seeing what you need?</h3>
          <p className="text-sm text-[#5A6B7A] mb-3">
            Describe your concern and we'll match you with the right support.
          </p>
          <button
            onClick={() => onSelectConcern({
              id: 'other',
              name: 'Other',
              description: 'Describe your concern',
              category: 'most-common',
              recommendedProviderRoles: ['parent-coach'],
              recommendedVisitType: 'consult',
              urgencyLevel: 'routine'
            })}
            className="flex items-center gap-2 text-[#6B9080] font-medium text-sm hover:underline"
          >
            Describe a different concern
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Emergency disclaimer */}
        <div className="mt-4 sm:mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Medical Emergency?</p>
              <p className="text-sm text-red-700 mt-1">
                Call <a href="tel:911" className="font-semibold underline">911</a> immediately.
                Aminy provides guidance and coaching, not emergency medical care.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Modal */}
      {showSafetyModal && pendingSafetyConcern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[#1B2733] text-center mb-2">
              Safety First
            </h3>
            <p className="text-[#5A6B7A] text-center text-sm mb-4">
              {pendingSafetyConcern.safetyMessage}
            </p>
            <div className="space-y-3">
              <a
                href="tel:911"
                className="block w-full py-3 px-4 bg-red-500 text-white font-medium text-center rounded-xl hover:bg-red-600 transition-colors"
              >
                Call 911 (Emergency)
              </a>
              <a
                href="tel:988"
                className="block w-full py-3 px-4 bg-amber-500 text-white font-medium text-center rounded-xl hover:bg-amber-600 transition-colors"
              >
                Call 988 (Crisis Line)
              </a>
              <button
                onClick={handleSafetyAcknowledge}
                className="block w-full py-3 px-4 bg-[#6B9080] text-white font-medium text-center rounded-xl hover:bg-[#466379] transition-colors"
              >
                Continue to Book Support
              </button>
              <button
                onClick={() => {
                  setShowSafetyModal(false);
                  setPendingSafetyConcern(null);
                }}
                className="block w-full py-2 text-[#5A6B7A] font-medium text-center text-sm hover:text-[#3A4A57]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Concern Tile Component
// ============================================================================

interface ConcernTileProps {
  concern: Concern;
  onClick: () => void;
}

function ConcernTile({ concern, onClick }: ConcernTileProps) {
  const isUrgent = concern.urgencyLevel === 'urgent';

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 bg-white rounded-2xl border text-left
        hover:shadow-md hover:border-cyan-600/30 transition-all
        focus:outline-none focus:ring-2 focus:ring-cyan-600/20
        ${isUrgent ? 'border-amber-200' : 'border-[#E8E4DF]'}
      `}
    >
      {/* Icon */}
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3
        ${isUrgent ? 'bg-amber-50' : 'bg-[#FAF7F2]'}
      `}>
        {concern.icon || '💭'}
      </div>

      {/* Content */}
      <h3 className="font-medium text-[#1B2733] text-sm leading-tight mb-1">
        {concern.name}
      </h3>
      <p className="text-xs text-[#5A6B7A] line-clamp-2">
        {concern.description}
      </p>

      {/* Urgent badge */}
      {isUrgent && (
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            Urgent
          </span>
        </div>
      )}
    </button>
  );
}

export default BrowseTopConcerns;
