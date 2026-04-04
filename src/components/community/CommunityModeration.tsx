import React, { useState, useMemo } from 'react';
import {
  Flag, Shield, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff,
  Star, Award, ThumbsUp, MessageSquare, ArrowLeft, Search, Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────────────

export interface FlagReport {
  id: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'message';
  contentPreview: string;
  authorId: string;
  authorName: string;
  reporterId: string;
  reporterName: string;
  reason: FlagReason;
  details?: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  moderatorNote?: string;
  action?: ModerationAction;
}

export type FlagReason =
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'inappropriate'
  | 'self-harm'
  | 'solicitation'
  | 'off-topic'
  | 'other';

export type ModerationAction =
  | 'none'
  | 'warn'
  | 'hide-content'
  | 'remove-content'
  | 'mute-user'
  | 'suspend-user'
  | 'ban-user';

export interface UserReputation {
  userId: string;
  displayName: string;
  level: ReputationLevel;
  points: number;
  badges: ReputationBadge[];
  memberSince: string;
  postsCount: number;
  helpfulVotes: number;
  flagCount: number;
  warningCount: number;
}

export type ReputationLevel = 'newcomer' | 'member' | 'contributor' | 'trusted' | 'champion' | 'moderator';

export interface ReputationBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}

interface CommunityModerationProps {
  reports: FlagReport[];
  onAction: (reportId: string, action: ModerationAction, note: string) => void;
  onBack?: () => void;
  isModerator?: boolean;
}

interface ReportContentProps {
  onSubmit: (reason: FlagReason, details: string) => void;
  onCancel: () => void;
}

interface CommunityGuidelinesProps {
  onBack?: () => void;
}

interface UserBadgesProps {
  reputation: UserReputation;
}

// ─── Constants ───────────────────────────────────────────────────────

const AUTO_HIDE_THRESHOLD = 3;

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  spam: 'Spam or Advertising',
  harassment: 'Harassment or Bullying',
  misinformation: 'Medical Misinformation',
  inappropriate: 'Inappropriate Content',
  'self-harm': 'Self-Harm or Crisis Content',
  solicitation: 'Unauthorized Solicitation',
  'off-topic': 'Off-Topic',
  other: 'Other',
};

const ACTION_LABELS: Record<ModerationAction, string> = {
  none: 'No Action',
  warn: 'Warn User',
  'hide-content': 'Hide Content',
  'remove-content': 'Remove Content',
  'mute-user': 'Mute User (7 days)',
  'suspend-user': 'Suspend User (30 days)',
  'ban-user': 'Ban User',
};

const REPUTATION_LEVELS: Record<ReputationLevel, { label: string; minPoints: number; color: string }> = {
  newcomer: { label: 'Newcomer', minPoints: 0, color: 'text-gray-500' },
  member: { label: 'Member', minPoints: 50, color: 'text-blue-600' },
  contributor: { label: 'Contributor', minPoints: 200, color: 'text-green-600' },
  trusted: { label: 'Trusted', minPoints: 500, color: 'text-purple-600' },
  champion: { label: 'Champion', minPoints: 1000, color: 'text-amber-600' },
  moderator: { label: 'Moderator', minPoints: 0, color: 'text-red-600' },
};

// ─── Report Content Dialog ──────────────────────────────────────────

export function ReportContent({ onSubmit, onCancel }: ReportContentProps) {
  const [reason, setReason] = useState<FlagReason | ''>('');
  const [details, setDetails] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <Flag className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-bold text-gray-900">Report Content</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Help keep our community safe. Select a reason for your report.
        </p>

        <div className="space-y-2 mb-4">
          {(Object.entries(FLAG_REASON_LABELS) as [FlagReason, string][]).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
              <input
                type="radio"
                name="reason"
                value={key}
                checked={reason === key}
                onChange={() => setReason(key)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
              {key === 'self-harm' && (
                <AlertTriangle className="ml-auto h-4 w-4 text-red-500" />
              )}
            </label>
          ))}
        </div>

        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Additional details (optional)"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />

        {reason === 'self-harm' && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">If someone is in immediate danger:</p>
            <p>Call 911 or text 988 (Suicide & Crisis Lifeline)</p>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => reason && onSubmit(reason, details)}
            disabled={!reason}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit Report
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Moderator Queue ─────────────────────────────────────────────────

export function ModeratorQueue({ reports, onAction, onBack }: CommunityModerationProps) {
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReport, setActiveReport] = useState<FlagReport | null>(null);
  const [selectedAction, setSelectedAction] = useState<ModerationAction>('none');
  const [modNote, setModNote] = useState('');

  const filteredReports = useMemo(() => {
    let result = reports;
    if (filterStatus === 'pending') {
      result = result.filter(r => r.status === 'pending');
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.contentPreview.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      // Self-harm reports first
      if (a.reason === 'self-harm' && b.reason !== 'self-harm') return -1;
      if (b.reason === 'self-harm' && a.reason !== 'self-harm') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reports, filterStatus, searchQuery]);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const handleAction = () => {
    if (!activeReport) return;
    onAction(activeReport.id, selectedAction, modNote);
    setActiveReport(null);
    setSelectedAction('none');
    setModNote('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <Shield className="h-6 w-6 text-teal-600" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Moderation Queue</h1>
            <p className="text-xs text-gray-500">{pendingCount} pending reports</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
              filterStatus === 'pending'
                ? 'border-teal-200 bg-teal-50 text-teal-700'
                : 'border-gray-300 bg-white text-gray-600'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {filterStatus === 'pending' ? 'Pending' : 'All'}
          </button>
        </div>
      </div>

      {/* Report List */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredReports.map(report => {
            // Count how many reports exist for same content
            const flagCount = reports.filter(r => r.contentId === report.contentId).length;
            const isAutoHidden = flagCount >= AUTO_HIDE_THRESHOLD;

            return (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  report.reason === 'self-harm'
                    ? 'border-red-300 bg-red-50'
                    : isAutoHidden
                      ? 'border-amber-300'
                      : 'border-gray-200'
                }`}
              >
                {/* Priority badge */}
                {report.reason === 'self-harm' && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    PRIORITY: Self-Harm Report
                  </div>
                )}
                {isAutoHidden && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <EyeOff className="h-3.5 w-3.5" />
                    Auto-hidden ({flagCount} flags)
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {report.contentType}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {FLAG_REASON_LABELS[report.reason]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">&quot;{report.contentPreview}&quot;</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>By: {report.authorName}</span>
                      <span>Reported by: {report.reporterName}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveReport(report)}
                    className="ml-3 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Review
                  </button>
                </div>

                {/* Status indicator */}
                {report.status !== 'pending' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {report.status === 'actioned' && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                    {report.status === 'dismissed' && <XCircle className="h-3.5 w-3.5 text-gray-400" />}
                    {report.status === 'reviewed' && <Eye className="h-3.5 w-3.5 text-blue-500" />}
                    <span className="text-gray-500 capitalize">{report.status}</span>
                    {report.action && report.action !== 'none' && (
                      <span className="text-gray-400">— {ACTION_LABELS[report.action]}</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {filterStatus === 'pending' ? 'No pending reports. Community is healthy!' : 'No reports found.'}
            </p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {activeReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Review Report</h3>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Reason:</strong> {FLAG_REASON_LABELS[activeReport.reason]}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Content:</strong> &quot;{activeReport.contentPreview}&quot;
              </p>
              {activeReport.details && (
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Reporter notes:</strong> {activeReport.details}
                </p>
              )}

              <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">Action</label>
              <select
                value={selectedAction}
                onChange={e => setSelectedAction(e.target.value as ModerationAction)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              >
                {(Object.entries(ACTION_LABELS) as [ModerationAction, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">Moderator Note</label>
              <textarea
                value={modNote}
                onChange={e => setModNote(e.target.value)}
                rows={2}
                placeholder="Internal note (not visible to users)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAction}
                  className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Apply Action
                </button>
                <button
                  onClick={() => { setActiveReport(null); setSelectedAction('none'); setModNote(''); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Community Guidelines ────────────────────────────────────────────

export function CommunityGuidelines({ onBack }: CommunityGuidelinesProps) {
  const guidelines = [
    {
      icon: <ThumbsUp className="h-5 w-5 text-teal-600" />,
      title: 'Be Supportive',
      body: 'This is a community of families navigating autism together. Lead with empathy and kindness. Celebrate wins, offer encouragement during tough times.',
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      title: 'Protect Privacy',
      body: 'Never share personal identifying information about other families or children. Do not post photos of other people\'s children without explicit consent.',
    },
    {
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      title: 'No Medical Advice',
      body: 'Share your experiences, but do not provide medical, clinical, or diagnostic advice. Always recommend consulting qualified professionals for clinical questions.',
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-purple-600" />,
      title: 'Stay Respectful',
      body: 'Disagree constructively. No personal attacks, harassment, bullying, or discriminatory language. Respect diverse perspectives on treatment approaches.',
    },
    {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      title: 'No Solicitation',
      body: 'Do not use the community to solicit business, sell products, or promote services without explicit approval from moderators.',
    },
    {
      icon: <Eye className="h-5 w-5 text-green-600" />,
      title: 'Report Concerns',
      body: 'If you see content that violates these guidelines or makes you uncomfortable, report it. Reports are confidential and help keep our community safe.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900">Community Guidelines</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <p className="text-sm text-gray-700">
          The Aminy community is a safe, supportive space for families and providers in the autism
          community. These guidelines help everyone feel welcome and protected.
        </p>

        {guidelines.map((g, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-gray-200 p-4">
            <div className="mt-0.5">{g.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{g.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{g.body}</p>
            </div>
          </div>
        ))}

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Enforcement</h3>
          <p className="mt-1 text-sm text-gray-600">
            Content with {AUTO_HIDE_THRESHOLD}+ reports is automatically hidden pending review.
            Violations may result in warnings, content removal, temporary muting, or permanent bans
            depending on severity. All moderation actions are logged and can be appealed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── User Reputation Badges ──────────────────────────────────────────

export function UserBadges({ reputation }: UserBadgesProps) {
  const level = REPUTATION_LEVELS[reputation.level];

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold ${level.color}`}>
        {level.label}
      </span>
      {reputation.badges.slice(0, 3).map(badge => (
        <span
          key={badge.id}
          title={`${badge.name}: ${badge.description}`}
          className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-xs"
        >
          <Award className="mr-0.5 h-3 w-3 text-amber-500" />
          {badge.name}
        </span>
      ))}
      {reputation.badges.length > 3 && (
        <span className="text-xs text-gray-400">+{reputation.badges.length - 3}</span>
      )}
    </div>
  );
}

export default ModeratorQueue;
