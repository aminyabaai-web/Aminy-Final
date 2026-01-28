/**
 * Care Plan Tab
 * One Medical-style Care Plan with Visit Summaries and Action Items
 *
 * Features:
 * - Visit Summary list (most recent on top)
 * - Action Items checklist
 * - Book follow-up CTA
 */

import React, { useState } from 'react';
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
  Target
} from 'lucide-react';
import {
  VisitSummary,
  ActionItem,
  Provider,
  MOCK_PROVIDERS,
  VISIT_TYPES
} from '../../types/telehealth';

interface CarePlanTabProps {
  onBack: () => void;
  onBookFollowUp: () => void;
  onViewSummary: (summaryId: string) => void;
}

// Mock data for demo
const MOCK_VISIT_SUMMARIES: (VisitSummary & { provider: Provider })[] = [
  {
    id: 'vs-1',
    appointmentId: 'apt-1',
    providerId: 'provider-1',
    userId: 'user-1',
    provider: MOCK_PROVIDERS[0],
    reasonForVisit: 'Meltdowns during transitions',
    whatWeDiscussed: [
      'Identified triggers: sudden changes and sensory overwhelm',
      'Current routine review showed gaps in visual supports',
      'Discussed proactive strategies vs reactive responses',
      'Reviewed "First-Then" board technique'
    ],
    planForNext7Days: [
      'Create a visual schedule for morning routine',
      'Give 5-minute and 2-minute warnings before transitions',
      'Practice "First-Then" language during calm moments',
      'Track meltdown frequency in Aminy app',
      'Celebrate successful transitions with specific praise'
    ],
    whatToTrack: [
      'Number of meltdowns per day',
      'Successful transitions (count)',
      'Warning effectiveness (did warnings help?)'
    ],
    followUpRecommendation: 'Check-in in 2 weeks to review progress and adjust strategies',
    createdAt: '2025-01-10T14:30:00Z',
    updatedAt: '2025-01-10T14:30:00Z'
  },
  {
    id: 'vs-2',
    appointmentId: 'apt-2',
    providerId: 'provider-3',
    userId: 'user-1',
    provider: MOCK_PROVIDERS[2],
    reasonForVisit: 'Parent burnout and self-care',
    whatWeDiscussed: [
      'Acknowledged the exhaustion and emotional weight',
      'Explored sources of support (or lack thereof)',
      'Discussed the "oxygen mask" principle',
      'Identified small moments for self-care'
    ],
    planForNext7Days: [
      'Schedule 15 minutes of alone time daily (non-negotiable)',
      'Reach out to one supportive person this week',
      'Try one "micro-break" technique when overwhelmed',
      'Journal for 5 minutes before bed'
    ],
    whatToTrack: [
      'Daily self-care minutes',
      'Energy level (1-10) morning and evening',
      'Support interactions'
    ],
    followUpRecommendation: 'Follow-up in 2-3 weeks to build on progress',
    createdAt: '2024-12-15T10:00:00Z',
    updatedAt: '2024-12-15T10:00:00Z'
  }
];

const MOCK_ACTION_ITEMS: ActionItem[] = [
  {
    id: 'ai-1',
    userId: 'user-1',
    visitSummaryId: 'vs-1',
    title: 'Create visual schedule for morning routine',
    description: 'Use pictures or icons to show each step of the morning',
    dueDate: '2025-01-17T00:00:00Z',
    completed: true,
    completedAt: '2025-01-14T09:00:00Z',
    source: 'visit-summary',
    createdAt: '2025-01-10T14:30:00Z',
    updatedAt: '2025-01-14T09:00:00Z'
  },
  {
    id: 'ai-2',
    userId: 'user-1',
    visitSummaryId: 'vs-1',
    title: 'Practice 5-minute and 2-minute warnings',
    description: 'Give warnings before any transition happens',
    dueDate: '2025-01-17T00:00:00Z',
    completed: false,
    source: 'visit-summary',
    createdAt: '2025-01-10T14:30:00Z',
    updatedAt: '2025-01-10T14:30:00Z'
  },
  {
    id: 'ai-3',
    userId: 'user-1',
    visitSummaryId: 'vs-1',
    title: 'Track meltdowns in Aminy app',
    description: 'Log each meltdown with time and trigger if known',
    dueDate: '2025-01-24T00:00:00Z',
    completed: false,
    source: 'visit-summary',
    createdAt: '2025-01-10T14:30:00Z',
    updatedAt: '2025-01-10T14:30:00Z'
  },
  {
    id: 'ai-4',
    userId: 'user-1',
    visitSummaryId: 'vs-2',
    title: 'Schedule 15 minutes of alone time daily',
    description: 'Non-negotiable self-care time',
    dueDate: '2024-12-22T00:00:00Z',
    completed: true,
    completedAt: '2024-12-20T08:00:00Z',
    source: 'visit-summary',
    createdAt: '2024-12-15T10:00:00Z',
    updatedAt: '2024-12-20T08:00:00Z'
  }
];

export function CarePlanTabScreen({
  onBack,
  onBookFollowUp,
  onViewSummary
}: CarePlanTabProps) {
  const [activeTab, setActiveTab] = useState<'summaries' | 'actions'>('summaries');
  const [actionItems, setActionItems] = useState(MOCK_ACTION_ITEMS);

  const pendingActions = actionItems.filter(a => !a.completed);
  const completedActions = actionItems.filter(a => a.completed);

  const toggleActionComplete = (actionId: string) => {
    setActionItems(prev => prev.map(item => {
      if (item.id === actionId) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date().toISOString() : undefined
        };
      }
      return item;
    }));
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
        {activeTab === 'summaries' ? (
          /* Visit Summaries Tab */
          <div className="space-y-3 sm:space-y-4">
            {MOCK_VISIT_SUMMARIES.length === 0 ? (
              <EmptyVisitSummaries onBookVisit={onBookFollowUp} />
            ) : (
              MOCK_VISIT_SUMMARIES.map((summary) => (
                <VisitSummaryCard
                  key={summary.id}
                  summary={summary}
                  provider={summary.provider}
                  onClick={() => onViewSummary(summary.id)}
                  formatDate={formatRelativeDate}
                />
              ))
            )}
          </div>
        ) : (
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
                      onToggle={() => toggleActionComplete(item.id)}
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
                      onToggle={() => toggleActionComplete(item.id)}
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
