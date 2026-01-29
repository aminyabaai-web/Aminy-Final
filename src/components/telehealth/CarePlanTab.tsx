/**
 * Care Plan Tab
 * One Medical-style Care Plan with Visit Summaries and Action Items
 *
 * Features:
 * - Visit Summary list (most recent on top)
 * - Action Items checklist
 * - Book follow-up CTA
 *
 * Connected to Supabase via care-plan service
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  ChevronRight,
  Video,
  ClipboardList,
  PartyPopper,
  Plus,
  Target,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCarePlan,
  VisitSummary,
  ActionItem
} from '../../lib/care-plan';
import {
  Provider,
  MOCK_PROVIDERS,
} from '../../types/telehealth';

interface CarePlanTabProps {
  userId: string;
  onBack: () => void;
  onBookFollowUp: () => void;
  onViewSummary: (summaryId: string) => void;
}

export function CarePlanTabScreen({
  userId,
  onBack,
  onBookFollowUp,
  onViewSummary
}: CarePlanTabProps) {
  const [activeTab, setActiveTab] = useState<'summaries' | 'actions'>('summaries');

  // Use the care plan hook for data
  const {
    visitSummaries,
    actionItems,
    isLoading,
    error,
    refresh,
    toggleItem
  } = useCarePlan(userId);

  const pendingActions = actionItems.filter(a => !a.completed);
  const completedActions = actionItems.filter(a => a.completed);

  const handleToggleAction = async (actionId: string) => {
    try {
      await toggleItem(actionId);
      toast.success('Action item updated');
    } catch (err) {
      toast.error('Failed to update action item');
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRelativeDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return 'Last week';
    return formatDate(isoString);
  };

  // Helper to get a default provider when not joined from database
  const getDefaultProvider = (providerId?: string): Provider => {
    const found = MOCK_PROVIDERS.find(p => p.id === providerId);
    return found || {
      id: providerId || 'unknown',
      firstName: 'Provider',
      lastName: '',
      title: 'Healthcare Provider',
      specialty: '',
      bio: '',
      credentials: [],
      languages: ['English'],
      rating: 5,
      reviewCount: 0,
      availability: [],
      acceptsInsurance: true,
      pricePerSession: 0,
      avatarUrl: undefined,
    };
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
            <h1 className="text-lg font-semibold text-gray-900">Care Plan</h1>
            <p className="text-sm text-gray-500">Your visit history and action items</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('summaries')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'summaries'
                ? 'bg-[#577590] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Visit Summaries
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'actions'
                ? 'bg-[#577590] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Action Items
            {pendingActions.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'actions'
                  ? 'bg-white/20'
                  : 'bg-[#577590]/10 text-[#577590]'
              }`}>
                {pendingActions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#577590]" />
            <span className="ml-2 text-gray-600">Loading care plan...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#577590] text-white rounded-lg hover:bg-[#466379]"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !error && activeTab === 'summaries' ? (
          /* Visit Summaries Tab */
          <div className="space-y-3 sm:space-y-4">
            {visitSummaries.length === 0 ? (
              <EmptyVisitSummaries onBookVisit={onBookFollowUp} />
            ) : (
              visitSummaries.map((summary) => (
                <VisitSummaryCard
                  key={summary.id}
                  summary={summary}
                  provider={summary.provider || getDefaultProvider(summary.providerId)}
                  onClick={() => onViewSummary(summary.id)}
                  formatDate={formatRelativeDate}
                />
              ))
            )}
          </div>
        ) : !isLoading && !error && (
          /* Action Items Tab */
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Pending Actions */}
            {pendingActions.length > 0 ? (
              <section>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  To Do ({pendingActions.length})
                </h3>
                <div className="space-y-2">
                  {pendingActions.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggleAction(item.id)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <NoActionItems />
            )}

            {/* Completed Actions */}
            {completedActions.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Completed ({completedActions.length})
                </h3>
                <div className="space-y-2">
                  {completedActions.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggleAction(item.id)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Floating Book Follow-up Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <button
          onClick={onBookFollowUp}
          className="w-full py-4 bg-[#577590] text-white font-semibold text-lg rounded-xl hover:bg-[#466379] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Book Follow-up
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Visit Summary Card
// ============================================================================

interface VisitSummaryCardProps {
  summary: VisitSummary;
  provider: Provider;
  onClick: () => void;
  formatDate: (iso: string) => string;
}

function VisitSummaryCard({ summary, provider, onClick, formatDate }: VisitSummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#577590]/30 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Provider Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {provider.avatarUrl ? (
            <img
              src={provider.avatarUrl}
              alt={`${provider.firstName} ${provider.lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#577590] to-[#466379] flex items-center justify-center text-white text-sm font-semibold">
              {provider.firstName[0]}{provider.lastName[0]}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-900 truncate">
              {provider.firstName} {provider.lastName}
            </p>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Video className="w-3 h-3" />
            Remote Visit Summary
          </p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(summary.createdAt)}</p>
        </div>
      </div>

      {/* Reason Preview */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-600 line-clamp-2">{summary.reasonForVisit}</p>
        <p className="text-xs text-[#577590] mt-2">
          {summary.planForNext7Days.length} action items
        </p>
      </div>
    </button>
  );
}

// ============================================================================
// Action Item Card
// ============================================================================

interface ActionItemCardProps {
  item: ActionItem;
  onToggle: () => void;
  formatDate: (iso: string) => string;
}

function ActionItemCard({ item, onToggle, formatDate }: ActionItemCardProps) {
  const isOverdue = item.dueDate && !item.completed && new Date(item.dueDate) < new Date();

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${
      item.completed ? 'border-gray-100 opacity-60' : 'border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="mt-0.5 flex-shrink-0"
          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300 hover:text-[#577590] transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {item.title}
          </p>
          {item.description && (
            <p className={`text-sm mt-1 ${item.completed ? 'text-gray-400' : 'text-gray-500'}`}>
              {item.description}
            </p>
          )}
          {item.dueDate && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${
              isOverdue ? 'text-red-500' : 'text-gray-400'
            }`}>
              <Clock className="w-3 h-3" />
              {item.completed ? `Completed ${formatDate(item.completedAt!)}` : `Due ${formatDate(item.dueDate)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty States
// ============================================================================

function EmptyVisitSummaries({ onBookVisit }: { onBookVisit: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No visit summaries yet</h3>
      <p className="text-gray-500 mb-4">
        After your first consultation, your visit summary will appear here.
      </p>
      <button
        onClick={onBookVisit}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#577590] text-white font-medium rounded-xl hover:bg-[#466379] transition-colors"
      >
        <Video className="w-5 h-5" />
        Book Your First Visit
      </button>
    </div>
  );
}

function NoActionItems() {
  return (
    <div className="text-center py-12 bg-green-50 rounded-2xl">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <PartyPopper className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
      <p className="text-gray-600">
        You've completed all your action items. Great work!
      </p>
    </div>
  );
}

export default CarePlanTabScreen;
