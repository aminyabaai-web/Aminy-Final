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
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#1B2733]">Visit Summary</h1>
              <p className="text-sm text-[#5A6B7A]">{formatDate(summary.createdAt)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                onClick={onShare}
                className="p-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5 text-[#5A6B7A]" />
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="p-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
                aria-label="Export"
              >
                <Download className="w-5 h-5 text-[#5A6B7A]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-32 space-y-3 sm:space-y-4">
        {/* Provider Card */}
        <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#E8E4DF] overflow-hidden flex-shrink-0">
              {provider.avatarUrl ? (
                <img
                  src={provider.avatarUrl}
                  alt={`${provider.firstName} ${provider.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-600 to-[#466379] flex items-center justify-center text-white font-semibold">
                  {provider.firstName[0]}{provider.lastName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-[#1B2733]">
                {provider.firstName} {provider.lastName}, {provider.credentials}
              </p>
              <p className="text-sm text-[#5A6B7A] flex items-center gap-1">
                <Video className="w-4 h-4" />
                Remote Visit
              </p>
            </div>
          </div>
        </div>

        {/* Reason for Visit */}
        <section className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
          <h3 className="text-sm font-medium text-[#5A6B7A] mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Reason for Visit
          </h3>
          <p className="text-[#1B2733]">{summary.reasonForVisit}</p>
        </section>

        {/* What We Discussed */}
        <section className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
          <h3 className="text-sm font-medium text-[#5A6B7A] mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            What We Discussed
          </h3>
          <ul className="space-y-3">
            {summary.whatWeDiscussed.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-[#6B9080] font-medium">•</span>
                <span className="text-[#3A4A57]">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Your Plan for Next 7 Days */}
        <section className="bg-[#6B9080]/5 rounded-2xl border border-cyan-600/20 p-4">
          <h3 className="text-sm font-medium text-[#6B9080] mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Your Plan for the Next 7 Days
          </h3>
          <ol className="space-y-3">
            {summary.planForNext7Days.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-6 h-6 bg-primary text-white text-sm font-medium rounded-full flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-[#3A4A57]">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* What to Track */}
        <section className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
          <h3 className="text-sm font-medium text-[#5A6B7A] mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            What to Track
          </h3>
          <ul className="space-y-2">
            {summary.whatToTrack.map((item, index) => (
              <li key={index} className="flex items-center gap-3 p-2 bg-[#FAF7F2] rounded-lg">
                <div className="w-2 h-2 bg-[#6B9080] rounded-full" />
                <span className="text-[#3A4A57] text-sm">{item}</span>
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
        <div className="p-4 bg-[#FAF7F2] rounded-xl text-xs text-[#5A6B7A]">
          <p className="font-medium text-[#5A6B7A] mb-1">Important Note</p>
          <p>
            This summary is for informational purposes and reflects the guidance provided during your
            consultation. It is not a substitute for medical advice, diagnosis, or treatment.
            Always seek the advice of qualified healthcare providers with questions about medical conditions.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E4DF] safe-area-bottom">
        <button
          onClick={onBookFollowUp}
          className="w-full py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-[#466379] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <CalendarPlus className="w-5 h-5" />
          Book Follow-up
        </button>
      </div>
    </div>
  );
}

export default VisitSummaryDetailScreen;
