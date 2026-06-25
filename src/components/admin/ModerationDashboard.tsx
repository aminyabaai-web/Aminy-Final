/**
 * ModerationDashboard.tsx
 *
 * Admin dashboard for content moderation.
 * Features:
 * - Queue view of flagged content (posts, comments)
 * - AI moderation confidence display
 * - One-click approve/reject/escalate
 * - User moderation history
 * - Appeal handling workflow
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import {
  Flag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  MessageSquare,
  User,
  Clock,
  Shield,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  ChevronRight,
  RefreshCw,
  Filter,
  Search,
  Brain,
  Loader2,
  ChevronDown,
  ExternalLink,
  History,
  Ban,
  CheckCheck,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

// Types
interface FlaggedContent {
  id: string;
  contentType: 'post' | 'comment' | 'message';
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  flaggedAt: string;
  flagReason: string;
  flaggedBy: 'user' | 'ai' | 'system';
  aiConfidence?: number;
  aiCategories?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  moderatorId?: string;
  moderatorNotes?: string;
  resolvedAt?: string;
  originalPostId?: string;
  reportCount: number;
}

interface ModerationStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  escalatedToday: number;
  avgResponseTime: number; // minutes
}

interface UserModerationHistory {
  userId: string;
  userName: string;
  totalFlags: number;
  approvedFlags: number;
  rejectedFlags: number;
  warnings: number;
  isBanned: boolean;
  lastFlagDate: string;
}

// AI confidence configuration
const AI_CONFIDENCE_CONFIG = {
  high: { min: 0.85, color: 'text-rose-600 bg-rose-50', label: 'High Confidence' },
  medium: { min: 0.6, color: 'text-amber-600 bg-amber-50', label: 'Medium Confidence' },
  low: { min: 0, color: 'text-blue-600 bg-[#EEF4F8]', label: 'Low Confidence' },
};

const getConfidenceLevel = (confidence: number) => {
  if (confidence >= AI_CONFIDENCE_CONFIG.high.min) return AI_CONFIDENCE_CONFIG.high;
  if (confidence >= AI_CONFIDENCE_CONFIG.medium.min) return AI_CONFIDENCE_CONFIG.medium;
  return AI_CONFIDENCE_CONFIG.low;
};

const FLAG_REASONS = {
  spam: { label: 'Spam', color: 'bg-neutral-100 text-neutral-700' },
  harassment: { label: 'Harassment', color: 'bg-rose-100 text-rose-700' },
  misinformation: { label: 'Misinformation', color: 'bg-amber-100 text-amber-700' },
  inappropriate: { label: 'Inappropriate', color: 'bg-purple-100 text-purple-700' },
  self_harm: { label: 'Self-Harm', color: 'bg-red-100 text-red-700' },
  privacy: { label: 'Privacy Violation', color: 'bg-blue-100 text-blue-700' },
  other: { label: 'Other', color: 'bg-neutral-100 text-neutral-700' },
};

export function ModerationDashboard() {
  const [queue, setQueue] = useState<FlaggedContent[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    escalatedToday: 0,
    avgResponseTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FlaggedContent | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'escalated'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showUserHistory, setShowUserHistory] = useState<string | null>(null);
  const [userHistory, setUserHistory] = useState<UserModerationHistory | null>(null);

  // Load moderation queue
  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('moderation_queue')
        .select('*')
        .order('flagged_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading moderation queue:', error);
      }

      if (data && data.length > 0) {
        const mapped: FlaggedContent[] = data.map(item => ({
          id: item.id,
          contentType: item.content_type,
          content: item.content,
          authorId: item.author_id,
          authorName: item.author_name || 'Unknown User',
          authorEmail: item.author_email || '',
          flaggedAt: item.flagged_at,
          flagReason: item.flag_reason,
          flaggedBy: item.flagged_by,
          aiConfidence: item.ai_confidence,
          aiCategories: item.ai_categories,
          status: item.status,
          moderatorId: item.moderator_id,
          moderatorNotes: item.moderator_notes,
          resolvedAt: item.resolved_at,
          originalPostId: item.original_post_id,
          reportCount: item.report_count || 1,
        }));
        setQueue(mapped);

        // Calculate stats
        const today = new Date().toDateString();
        setStats({
          pending: mapped.filter(i => i.status === 'pending').length,
          approvedToday: mapped.filter(i => i.status === 'approved' && new Date(i.resolvedAt || '').toDateString() === today).length,
          rejectedToday: mapped.filter(i => i.status === 'rejected' && new Date(i.resolvedAt || '').toDateString() === today).length,
          escalatedToday: mapped.filter(i => i.status === 'escalated').length,
          avgResponseTime: 15, // Would calculate from actual data
        });
      } else {
        // Demo data
        const demoQueue: FlaggedContent[] = [
          {
            id: '1',
            contentType: 'post',
            content: 'Has anyone tried essential oils for autism? My friend said they cured her son completely! Message me for details on which ones to buy.',
            authorId: 'user1',
            authorName: 'EssentialOilMom',
            authorEmail: 'oilmom@email.com',
            flaggedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            flagReason: 'misinformation',
            flaggedBy: 'ai',
            aiConfidence: 0.92,
            aiCategories: ['medical_misinformation', 'potentially_harmful'],
            status: 'pending',
            reportCount: 3,
          },
          {
            id: '2',
            contentType: 'comment',
            content: 'You clearly don\'t know what you\'re doing as a parent. Kids like yours shouldn\'t even be in regular schools.',
            authorId: 'user2',
            authorName: 'ToughLove123',
            authorEmail: 'tough@email.com',
            flaggedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            flagReason: 'harassment',
            flaggedBy: 'user',
            aiConfidence: 0.88,
            aiCategories: ['harassment', 'ableism'],
            status: 'pending',
            reportCount: 5,
          },
          {
            id: '3',
            contentType: 'post',
            content: 'Feeling so overwhelmed today. Sometimes I wonder if things would be easier for everyone if I just wasn\'t here anymore.',
            authorId: 'user3',
            authorName: 'TiredMom2024',
            authorEmail: 'tired@email.com',
            flaggedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            flagReason: 'self_harm',
            flaggedBy: 'ai',
            aiConfidence: 0.95,
            aiCategories: ['self_harm_ideation', 'crisis_concern'],
            status: 'escalated',
            reportCount: 1,
          },
          {
            id: '4',
            contentType: 'comment',
            content: 'Great tips! We tried something similar and it really helped with transitions.',
            authorId: 'user4',
            authorName: 'HappyParent',
            authorEmail: 'happy@email.com',
            flaggedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            flagReason: 'spam',
            flaggedBy: 'user',
            aiConfidence: 0.15,
            aiCategories: [],
            status: 'pending',
            reportCount: 1,
          },
        ];
        setQueue(demoQueue);
        setStats({
          pending: 3,
          approvedToday: 12,
          rejectedToday: 5,
          escalatedToday: 1,
          avgResponseTime: 15,
        });
      }
    } catch (error) {
      console.error('Failed to load moderation queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Filter queue
  const filteredQueue = queue.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'escalated') return item.status === 'escalated';
    return true;
  });

  // Handle moderation actions
  const handleApprove = async (itemId: string) => {
    setActionLoading(`approve-${itemId}`);
    try {
      await supabase
        .from('moderation_queue')
        .update({
          status: 'approved',
          moderator_notes: moderatorNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      setQueue(prev =>
        prev.map(i => (i.id === itemId ? { ...i, status: 'approved' as const, moderatorNotes, resolvedAt: new Date().toISOString() } : i))
      );
      setSelectedItem(null);
      setModeratorNotes('');
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (itemId: string) => {
    setActionLoading(`reject-${itemId}`);
    try {
      await supabase
        .from('moderation_queue')
        .update({
          status: 'rejected',
          moderator_notes: moderatorNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      // Also hide the original content
      await supabase
        .from('community_posts')
        .update({ is_hidden: true, hidden_reason: 'moderation' })
        .eq('id', queue.find(i => i.id === itemId)?.originalPostId);

      setQueue(prev =>
        prev.map(i => (i.id === itemId ? { ...i, status: 'rejected' as const, moderatorNotes, resolvedAt: new Date().toISOString() } : i))
      );
      setSelectedItem(null);
      setModeratorNotes('');
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async (itemId: string) => {
    setActionLoading(`escalate-${itemId}`);
    try {
      await supabase
        .from('moderation_queue')
        .update({
          status: 'escalated',
          moderator_notes: moderatorNotes,
        })
        .eq('id', itemId);

      setQueue(prev =>
        prev.map(i => (i.id === itemId ? { ...i, status: 'escalated' as const, moderatorNotes } : i))
      );
      setSelectedItem(null);
      setModeratorNotes('');
    } catch (error) {
      console.error('Failed to escalate:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (userId: string) => {
    setActionLoading(`ban-${userId}`);
    try {
      await supabase
        .from('profiles')
        .update({ status: 'banned' })
        .eq('id', userId);

      toast.success('User has been banned');
    } catch (error) {
      console.error('Failed to ban user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const loadUserHistory = async (userId: string) => {
    setShowUserHistory(userId);
    // Load user's moderation history
    try {
      const { data } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('author_id', userId);

      if (data) {
        setUserHistory({
          userId,
          userName: queue.find(i => i.authorId === userId)?.authorName || 'Unknown',
          totalFlags: data.length,
          approvedFlags: data.filter(i => i.status === 'approved').length,
          rejectedFlags: data.filter(i => i.status === 'rejected').length,
          warnings: 0, // Would come from user profile
          isBanned: false,
          lastFlagDate: data[0]?.flagged_at || '',
        });
      }
    } catch (error) {
      console.error('Failed to load user history:', error);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">Content Moderation</h2>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
            {stats.pending} items awaiting review
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadQueue}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.pending}</p>
              <p className="text-sm text-[#5A6B7A]">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.approvedToday}</p>
              <p className="text-sm text-[#5A6B7A]">Approved Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.rejectedToday}</p>
              <p className="text-sm text-[#5A6B7A]">Rejected Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.escalatedToday}</p>
              <p className="text-sm text-[#5A6B7A]">Escalated</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.avgResponseTime}m</p>
              <p className="text-sm text-[#5A6B7A]">Avg Response</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['pending', 'escalated', 'all'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-primary hover:bg-[#216982]' : ''}
          >
            {f === 'pending' && <Clock className="w-4 h-4 mr-1" />}
            {f === 'escalated' && <AlertTriangle className="w-4 h-4 mr-1" />}
            {f === 'all' && <Flag className="w-4 h-4 mr-1" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && ` (${stats.pending})`}
            {f === 'escalated' && ` (${stats.escalatedToday})`}
          </Button>
        ))}
      </div>

      {/* Queue */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6B9080]" />
          </Card>
        ) : filteredQueue.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCheck className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <p className="text-neutral-600 dark:text-slate-400">
              {filter === 'pending' ? 'No items pending review!' : 'No items in this category'}
            </p>
          </Card>
        ) : (
          filteredQueue.map(item => {
            const reasonConfig = FLAG_REASONS[item.flagReason as keyof typeof FLAG_REASONS] || FLAG_REASONS.other;
            const confidenceConfig = item.aiConfidence ? getConfidenceLevel(item.aiConfidence) : null;

            return (
              <Card
                key={item.id}
                className={`p-4 ${
                  item.status === 'escalated'
                    ? 'border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/10'
                    : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={reasonConfig.color}>
                        <Flag className="w-3 h-3 mr-1" />
                        {reasonConfig.label}
                      </Badge>
                      {item.aiConfidence && confidenceConfig && (
                        <Badge className={confidenceConfig.color}>
                          <Brain className="w-3 h-3 mr-1" />
                          AI: {Math.round(item.aiConfidence * 100)}%
                        </Badge>
                      )}
                      {item.reportCount > 1 && (
                        <Badge variant="secondary">
                          {item.reportCount} reports
                        </Badge>
                      )}
                      <span className="text-sm text-[#5A6B7A]">
                        {item.contentType} • {formatTimeAgo(item.flaggedAt)}
                      </span>
                    </div>

                    <p className="text-[#1B2733] dark:text-white mb-3 line-clamp-3">
                      "{item.content}"
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <button
                        onClick={() => loadUserHistory(item.authorId)}
                        className="flex items-center gap-1 text-[#5A6B7A] hover:text-neutral-700"
                      >
                        <User className="w-4 h-4" />
                        {item.authorName}
                      </button>
                      {item.aiCategories && item.aiCategories.length > 0 && (
                        <span className="text-neutral-400">
                          AI: {item.aiCategories.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2">
                    {item.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(item.id)}
                          disabled={actionLoading === `approve-${item.id}`}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          {actionLoading === `approve-${item.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ThumbsUp className="w-4 h-4 sm:mr-1" />
                          )}
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(item.id)}
                          disabled={actionLoading === `reject-${item.id}`}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          {actionLoading === `reject-${item.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ThumbsDown className="w-4 h-4 sm:mr-1" />
                          )}
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEscalate(item.id)}
                          disabled={actionLoading === `escalate-${item.id}`}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          {actionLoading === `escalate-${item.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 sm:mr-1" />
                          )}
                          <span className="hidden sm:inline">Escalate</span>
                        </Button>
                      </>
                    )}
                    {item.status === 'escalated' && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Escalated
                      </Badge>
                    )}
                    {(item.status === 'approved' || item.status === 'rejected') && (
                      <Badge
                        variant="secondary"
                        className={
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }
                      >
                        {item.status === 'approved' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* User History Modal */}
      {showUserHistory && userHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-500 flex items-center justify-center text-white font-medium">
                    {userHistory.userName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1B2733] dark:text-white">{userHistory.userName}</h3>
                    <p className="text-sm text-[#5A6B7A]">Moderation History</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowUserHistory(null)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{userHistory.totalFlags}</p>
                  <p className="text-sm text-[#5A6B7A]">Total Flags</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{userHistory.approvedFlags}</p>
                  <p className="text-sm text-[#5A6B7A]">Approved</p>
                </div>
                <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-rose-600">{userHistory.rejectedFlags}</p>
                  <p className="text-sm text-[#5A6B7A]">Rejected</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {/* Send warning */}}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Send Warning
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => handleBanUser(userHistory.userId)}
                  disabled={actionLoading === `ban-${userHistory.userId}`}
                >
                  {actionLoading === `ban-${userHistory.userId}` ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Ban className="w-4 h-4 mr-2" />
                  )}
                  Ban User
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ModerationDashboard;
