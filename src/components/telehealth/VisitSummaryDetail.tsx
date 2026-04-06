// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Visit Summary Detail Screen
 * Full view of a visit summary with all details
 */

import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Video,
  Share2,
  Download,
  CheckCircle,
  ClipboardList,
  BarChart3,
  CalendarPlus
} from 'lucide-react';
import { VisitSummary, Provider } from '../../types/telehealth';

interface VisitSummaryDetailProps {
  summary: VisitSummary;
  provider: Provider;
  onBack: () => void;
  onBookFollowUp: () => void;
  onShare?: () => void;
  onExport?: () => void;
}

export function VisitSummaryDetailScreen({
  summary,
  provider,
  onBack,
  onBookFollowUp,
  onShare,
  onExport
}: VisitSummaryDetailProps) {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Visit Summary</h1>
              <p className="text-sm text-gray-500">{formatDate(summary.createdAt)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                onClick={onShare}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Export"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-32 space-y-3 sm:space-y-4">
        {/* Provider Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {provider.avatarUrl ? (
                <img
                  src={provider.avatarUrl}
                  alt={`${provider.firstName} ${provider.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0891b2] to-[#466379] flex items-center justify-center text-white font-semibold">
                  {provider.firstName[0]}{provider.lastName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {provider.firstName} {provider.lastName}, {provider.credentials}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Video className="w-4 h-4" />
                Remote Visit
              </p>
            </div>
          </div>
        </div>

        {/* Reason for Visit */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Reason for Visit
          </h3>
          <p className="text-gray-900">{summary.reasonForVisit}</p>
        </section>

        {/* What We Discussed */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            What We Discussed
          </h3>
          <ul className="space-y-3">
            {summary.whatWeDiscussed.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-[#0891b2] font-medium">•</span>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Your Plan for Next 7 Days */}
        <section className="bg-[#0891b2]/5 rounded-2xl border border-[#0891b2]/20 p-4">
          <h3 className="text-sm font-medium text-[#0891b2] mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Your Plan for the Next 7 Days
          </h3>
          <ol className="space-y-3">
            {summary.planForNext7Days.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-6 h-6 bg-[#0891b2] text-white text-sm font-medium rounded-full flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* What to Track */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            What to Track
          </h3>
          <ul className="space-y-2">
            {summary.whatToTrack.map((item, index) => (
              <li key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-[#0891b2] rounded-full" />
                <span className="text-gray-700 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Follow-up Recommendation */}
        {summary.followUpRecommendation && (
          <section className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
            <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" />
              Follow-up Recommendation
            </h3>
            <p className="text-amber-900">{summary.followUpRecommendation}</p>
          </section>
        )}

        {/* Legal Disclaimer */}
        <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
          <p className="font-medium text-gray-600 mb-1">Important Note</p>
          <p>
            This summary is for informational purposes and reflects the guidance provided during your
            consultation. It is not a substitute for medical advice, diagnosis, or treatment.
            Always seek the advice of qualified healthcare providers with questions about medical conditions.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <button
          onClick={onBookFollowUp}
          className="w-full py-4 bg-[#0891b2] text-white font-semibold text-lg rounded-xl hover:bg-[#466379] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <CalendarPlus className="w-5 h-5" />
          Book Follow-up
        </button>
      </div>
    </div>
  );
}

export default VisitSummaryDetailScreen;
