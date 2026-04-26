// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { 
  CheckCircle, Circle, ChevronRight, ExternalLink, 
  Package, Layout, MessageCircle, Settings, Accessibility,
  FileCheck, ArrowLeft
} from 'lucide-react';

/**
 * COMPLETION CHECKLIST
 * 
 * Interactive checklist showing all deliverables for the Aminy Design System
 * Tracks completion status and provides navigation to each component
 */

interface CompletionChecklistProps {
  onNavigate: (destination: string) => void;
  onBack?: () => void;
}

export function CompletionChecklist({ onNavigate, onBack }: CompletionChecklistProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('library');

  const checklistData = {
    library: {
      title: 'COMPONENT LIBRARY',
      items: [
        { id: 'buttons', label: 'Buttons (primary, secondary, tertiary, all sizes, all states)', complete: true, link: 'design-system' },
        { id: 'inputs', label: 'Inputs (text, select, chips, toggle, radio)', complete: true, link: 'design-system' },
        { id: 'cards', label: 'Cards (activity, report, plan)', complete: true, link: 'design-system' },
        { id: 'badges', label: 'Badges (trust, status)', complete: true, link: 'design-system' },
        { id: 'navigation', label: 'Navigation (bottom nav, tabs, stepper)', complete: true, link: 'design-system' },
        { id: 'feedback', label: 'Feedback (modals, toasts, skeleton loaders)', complete: true, link: 'design-system' },
        { id: 'tokens', label: 'Design tokens (colors, typography, spacing, radius, shadows)', complete: true, link: 'design-system' },
        { id: 'accessibility', label: 'Accessibility verified (contrast, focus, touch targets)', complete: true, link: 'design-system' }
      ]
    },
    flows: {
      title: 'AI-FIRST FLOWS',
      items: [
        { id: 'magic-setup', label: 'Magic Setup: Splash → Intake → Loading → AI Goals', complete: true, link: 'splash' },
        { id: 'today-plan', label: 'Today Plan: Do-now cards with reactions, "Why this?" tooltips', complete: true, link: 'dashboard' },
        { id: 'coach-mode', label: 'Coach Mode: Step-by-step, voice help, pause/skip, completion', complete: false, link: null },
        { id: 'reports', label: 'Reports: Daily/weekly summaries, charts, AI insights, share', complete: true, link: 'dashboard?tab=reports' },
        { id: 'reminders', label: 'Reminders: Adaptive timing, easy reschedule', complete: false, link: null },
        { id: 'collaboration', label: 'Collaboration: Family invite, provider invite', complete: false, link: null },
        { id: 'virality', label: 'Virality: Referral flow with rewards', complete: false, link: null },
        { id: 'pricing', label: 'Pricing: Paywall with trial, pricing tiers, SSO', complete: true, link: 'paywall' }
      ]
    },
    copywriting: {
      title: 'COPYWRITING',
      items: [
        { id: 'empathetic-copy', label: 'Empathetic, action-oriented copy throughout', complete: true, link: null },
        { id: 'trust-badges', label: 'Trust badges and transparency messaging', complete: true, link: 'splash' },
        { id: 'ai-explainer', label: 'AI explainer and privacy controls', complete: true, link: 'design-system' },
        { id: 'states', label: 'Error, success, empty, and loading states', complete: true, link: 'design-system' }
      ]
    },
    prototype: {
      title: 'PROTOTYPE',
      items: [
        { id: 'linked-screens', label: 'All screens linked in logical flows', complete: true, link: null },
        { id: 'delays', label: 'Realistic delays and transitions', complete: true, link: null },
        { id: 'animations', label: 'Animations and micro-interactions', complete: true, link: null },
        { id: 'reduced-motion', label: 'Reduced-motion annotations', complete: true, link: null }
      ]
    },
    accessibility: {
      title: 'ACCESSIBILITY',
      items: [
        { id: 'contrast', label: 'AA/AAA contrast verified', complete: true, link: null },
        { id: 'focus-order', label: 'Focus order and indicators', complete: true, link: null },
        { id: 'touch-targets', label: 'Touch targets 44x44px minimum', complete: true, link: null },
        { id: 'aria', label: 'ARIA annotations for engineers', complete: true, link: null },
        { id: 'keyboard', label: 'Keyboard navigation specified', complete: true, link: null }
      ]
    },
    deliverables: {
      title: 'DELIVERABLES',
      items: [
        { id: 'cover-page', label: 'Cover page with instructions', complete: true, link: 'cover' },
        { id: 'checklist', label: 'Completion checklist', complete: true, link: 'checklist' },
        { id: 'prototype-link', label: 'Shareable prototype link generated', complete: true, link: null },
        { id: 'organization', label: 'All components organized and named clearly', complete: true, link: null }
      ]
    }
  };

  const calculateProgress = (section: typeof checklistData[keyof typeof checklistData]) => {
    const complete = section.items.filter(item => item.complete).length;
    const total = section.items.length;
    return Math.round((complete / total) * 100);
  };

  const overallProgress = Math.round(
    Object.values(checklistData).reduce((acc, section) => {
      return acc + calculateProgress(section);
    }, 0) / Object.keys(checklistData).length
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-accent mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cover
            </button>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-primary mb-1">
                Completion Checklist
              </h1>
              <p className="text-sm text-gray-600">
                Track all deliverables for the Aminy Design System
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold text-accent">{overallProgress}%</div>
              <p className="text-xs text-gray-500">Overall Progress</p>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Sections */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-3 sm:space-y-4">
          {Object.entries(checklistData).map(([sectionId, section]) => {
            const progress = calculateProgress(section);
            const isExpanded = expandedSection === sectionId;

            return (
              <div key={sectionId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      progress === 100 ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {progress === 100 ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-primary">{section.title}</h3>
                      <p className="text-xs text-gray-500">
                        {section.items.filter(i => i.complete).length} of {section.items.length} complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-accent">{progress}%</div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`} />
                  </div>
                </button>

                {/* Section Items */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4 space-y-2">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 py-2 ${
                          item.link ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg' : ''
                        }`}
                        onClick={() => item.link && onNavigate?.(item.link)}
                      >
                        {item.complete ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm ${
                            item.complete ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {item.label}
                          </p>
                        </div>
                        {item.link && (
                          <ChevronRight className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Final Summary Card */}
        <div className="mt-8 bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border border-teal-200 p-6 text-center">
          <FileCheck className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">
            {overallProgress === 100 ? '🎉 All Complete!' : 'Great Progress!'}
          </h3>
          <p className="text-gray-700 mb-4">
            {overallProgress === 100 
              ? 'The Aminy Design System is fully implemented and ready for production.'
              : `${overallProgress}% of deliverables complete. Keep going!`
            }
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onNavigate('splash')}
              className="bg-accent text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-all"
            >
              Start Prototype
            </button>
            <button
              onClick={() => onNavigate('design-system')}
              className="border-2 border-accent text-accent font-semibold py-3 px-6 rounded-lg hover:bg-accent/10 transition-all"
            >
              View Components
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
