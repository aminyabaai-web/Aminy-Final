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

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Circle,
  Clock,
  ChevronRight,
  Video,
  ClipboardList,
  PartyPopper,
  Plus,
  Target,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Pause,
  Play,
  Award,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCarePlan,
  VisitSummary,
  ActionItem,
  CarePlanGoal,
  updateGoalProgress,
  updateGoalStatus,
  reorderGoals
} from '../../lib/care-plan';
import { SortableGoalList } from './SortableGoalList';
import {
  Provider,
  MOCK_PROVIDERS,
} from '../../types/telehealth';

interface CarePlanTabProps {
  userId?: string;
  onBack: () => void;
  onBookFollowUp?: () => void;
  onViewSummary?: (summaryId: string) => void;
}

export function CarePlanTabScreen({
  userId,
  onBack,
  onBookFollowUp,
  onViewSummary
}: CarePlanTabProps) {
  const [activeTab, setActiveTab] = useState<'summaries' | 'actions' | 'goals'>('summaries');

  // Use the care plan hook for data
  const {
    visitSummaries,
    actionItems,
    goals,
    isLoading,
    error,
    refresh,
    toggleItem
  } = useCarePlan(userId || '');

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
    return found || ({
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
    } as unknown as Provider);
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
            <h1 className="text-lg font-semibold text-gray-900">My Plan</h1>
            <p className="text-sm text-gray-500">Goals, routines, and progress</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'goals'
                ? 'bg-[#0891b2] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Target className="w-4 h-4" />
            Goals
            {goals.filter(g => g.status === 'active').length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'goals'
                  ? 'bg-white/20'
                  : 'bg-[#0891b2]/10 text-[#0891b2]'
              }`}>
                {goals.filter(g => g.status === 'active').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('summaries')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'summaries'
                ? 'bg-[#0891b2] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Visits
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'actions'
                ? 'bg-[#0891b2] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Actions
            {pendingActions.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'actions'
                  ? 'bg-white/20'
                  : 'bg-[#0891b2]/10 text-[#0891b2]'
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
            <Loader2 className="w-8 h-8 animate-spin text-[#0891b2]" />
            <span className="ml-2 text-gray-600">Loading care plan...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0891b2] text-white rounded-lg hover:bg-[#466379]"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Goals Tab */}
        {!isLoading && !error && activeTab === 'goals' && (
          <GoalsTabContent
            goals={goals}
            userId={userId || ''}
            onRefresh={refresh}
          />
        )}

        {/* Visit Summaries Tab */}
        {!isLoading && !error && activeTab === 'summaries' && (
          <div className="space-y-3 sm:space-y-4">
            {visitSummaries.length === 0 ? (
              <EmptyVisitSummaries onBookVisit={onBookFollowUp ?? (() => {})} />
            ) : (
              visitSummaries.map((summary) => (
                <VisitSummaryCard
                  key={summary.id}
                  summary={summary}
                  provider={(summary.provider || getDefaultProvider(summary.providerId)) as Provider}
                  onClick={() => onViewSummary?.(summary.id)}
                  formatDate={formatRelativeDate}
                />
              ))
            )}
          </div>
        )}

        {/* Action Items Tab */}
        {!isLoading && !error && activeTab === 'actions' && (
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
          className="w-full py-4 bg-[#0891b2] text-white font-semibold text-lg rounded-xl hover:bg-[#466379] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#0891b2]/30 transition-all"
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
            <div className="w-full h-full bg-gradient-to-br from-[#0891b2] to-[#466379] flex items-center justify-center text-white text-sm font-semibold">
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
        <p className="text-xs text-[#0891b2] mt-2">
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
            <Circle className="w-6 h-6 text-gray-300 hover:text-[#0891b2] transition-colors" />
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
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#0891b2] text-white font-medium rounded-xl hover:bg-[#466379] transition-colors"
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

// ============================================================================
// Goals Tab Content — SMART Goals with Progress Tracking
// ============================================================================

interface GoalsTabContentProps {
  goals: CarePlanGoal[];
  userId: string;
  onRefresh: () => void;
}

function GoalsTabContent({ goals, userId, onRefresh }: GoalsTabContentProps) {
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const handleProgressUpdate = async (goalId: string, newProgress: number) => {
    try {
      await updateGoalProgress(goalId, userId, newProgress);
      onRefresh();
      toast.success('Progress updated');
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  const handleStatusChange = async (goalId: string, newStatus: CarePlanGoal['status']) => {
    try {
      await updateGoalStatus(goalId, userId, newStatus);
      onRefresh();
      toast.success(`Goal ${newStatus === 'completed' ? 'completed! 🎉' : newStatus === 'paused' ? 'paused' : 'updated'}`);
    } catch (err) {
      toast.error('Failed to update goal');
    }
  };

  const handleReorder = async (goalIds: string[]) => {
    try {
      await reorderGoals(userId, goalIds);
      onRefresh();
    } catch (err) {
      toast.error('Failed to save goal order');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'communication': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'social': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      'daily-routine': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      'sensory': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
      'behavior': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'self-care': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'academic': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      'motor': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    };
    return colors[category] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'communication': 'Communication',
      'social': 'Social Skills',
      'daily-routine': 'Daily Routine',
      'sensory': 'Sensory',
      'behavior': 'Behavior',
      'self-care': 'Self-Care',
      'academic': 'Academic',
      'motor': 'Motor Skills',
      'other': 'Other',
    };
    return labels[category] || category;
  };

  if (goals.length === 0) {
    return <EmptyGoals />;
  }

  return (
    <div className="space-y-6">
      {/* Clinical disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Goals are suggested starting points. Review and customize with your child's BCBA or therapist for best results.
        </p>
      </div>

      {/* Summary banner */}
      {activeGoals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#0891b2]/10 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#0891b2]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {activeGoals.length} Active Goal{activeGoals.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-500">
                {completedGoals.length > 0 ? `${completedGoals.length} completed · ` : ''}
                Average progress: {activeGoals.length > 0 ? Math.round(activeGoals.reduce((sum, g) => sum + (g.targetProgress > 0 ? (g.currentProgress / g.targetProgress) * 100 : 0), 0) / activeGoals.length) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drag-and-drop sortable goal list (grouped by status) */}
      <SortableGoalList
        goals={goals}
        onReorder={handleReorder}
        renderGoalCard={(goal, dragHandle) => (
          <GoalCard
            goal={goal}
            categoryColor={getCategoryColor(goal.category)}
            categoryLabel={getCategoryLabel(goal.category)}
            onProgressUpdate={(newProgress) => handleProgressUpdate(goal.id, newProgress)}
            onStatusChange={(newStatus) => handleStatusChange(goal.id, newStatus)}
            isCompleted={goal.status === 'completed'}
            dragHandle={dragHandle}
          />
        )}
      />
    </div>
  );
}

// ============================================================================
// Goal Card — Individual SMART Goal with Progress
// ============================================================================

interface GoalCardProps {
  goal: CarePlanGoal;
  categoryColor: { bg: string; text: string; border: string };
  categoryLabel: string;
  onProgressUpdate: (newProgress: number) => void;
  onStatusChange: (newStatus: CarePlanGoal['status']) => void;
  isCompleted?: boolean;
  /** Drag handle element provided by SortableGoalList */
  dragHandle?: React.ReactNode;
}

function GoalCard({ goal, categoryColor, categoryLabel, onProgressUpdate, onStatusChange, isCompleted, dragHandle }: GoalCardProps) {
  const [showActions, setShowActions] = useState(false);
  const progressPercent = goal.targetProgress > 0
    ? Math.min(100, Math.round((goal.currentProgress / goal.targetProgress) * 100))
    : 0;

  const progressBarColor = isCompleted ? 'bg-green-500'
    : progressPercent >= 75 ? 'bg-[#0891b2]'
    : progressPercent >= 40 ? 'bg-blue-400'
    : 'bg-gray-300';

  return (
    <div className={`bg-white rounded-2xl border p-4 transition-all ${
      isCompleted ? 'border-green-100 opacity-75' : 'border-gray-100 hover:border-[#0891b2]/30 hover:shadow-sm'
    }`}>
      {/* Header: drag handle + category + title */}
      <div className="flex items-start gap-2">
        {/* Drag handle (rendered by SortableGoalList) */}
        {dragHandle && (
          <div className="flex-shrink-0 mt-0.5">
            {dragHandle}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColor.bg} ${categoryColor.text} ${categoryColor.border} border`}>
              {categoryLabel}
            </span>
            {goal.targetFrequency && (
              <span className="text-xs text-gray-400">{goal.targetFrequency}</span>
            )}
          </div>
          <h4 className={`font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {goal.title}
          </h4>
          {goal.description && (
            <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">
            {goal.currentProgress}/{goal.targetProgress} {goal.unit || 'completed'}
          </span>
          <span className="text-xs font-medium text-gray-700">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick progress buttons */}
      {!isCompleted && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onProgressUpdate(Math.min(goal.currentProgress + 1, goal.targetProgress))}
            className="flex-1 py-2 text-xs font-medium text-[#0891b2] bg-[#0891b2]/5 rounded-lg hover:bg-[#0891b2]/10 transition-colors"
          >
            + Log Progress
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="More actions"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      )}

      {/* Expanded actions */}
      {showActions && !isCompleted && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
          <button
            onClick={() => { onStatusChange('completed'); setShowActions(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark Complete
          </button>
          <button
            onClick={() => { onStatusChange(goal.status === 'paused' ? 'active' : 'paused'); setShowActions(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {goal.status === 'paused' ? (
              <><Play className="w-3.5 h-3.5" /> Resume</>
            ) : (
              <><Pause className="w-3.5 h-3.5" /> Pause</>
            )}
          </button>
        </div>
      )}

      {/* Completed badge */}
      {isCompleted && goal.completedAt && (
        <div className="mt-3 pt-2 border-t border-green-100 flex items-center gap-2 text-xs text-green-600">
          <Award className="w-4 h-4" />
          Completed {new Date(goal.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {/* Timeline */}
      {!isCompleted && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          Started {new Date(goal.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Empty Goals State
// ============================================================================

function EmptyGoals() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-[#0891b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Target className="w-8 h-8 text-[#0891b2]" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
      <p className="text-gray-500 mb-2 max-w-xs mx-auto">
        Goals help track progress on specific developmental milestones. Ask your provider to set up SMART goals during your next visit.
      </p>
      <p className="text-xs text-gray-400 max-w-xs mx-auto">
        Goals can also be created from your Aminy AI care plan suggestions.
      </p>
    </div>
  );
}

export default CarePlanTabScreen;
