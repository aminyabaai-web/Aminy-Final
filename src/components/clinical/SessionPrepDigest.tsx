/**
 * Session Prep AI Digest
 *
 * Generates an AI-powered summary digest for providers to prepare
 * for therapy sessions. Aggregates data from multiple sources.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Brain,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  Heart,
  FileText,
  MessageSquare,
  Loader2,
  RefreshCw,
  Download,
  Sparkles,
  ChevronDown,
  ChevronRight,
  User,
  Activity
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

interface ChildProfile {
  id: string;
  name: string;
  birthDate: string;
  diagnoses: string[];
  communicationLevel: string;
  sensoryProfile: string[];
  currentGoals: string[];
}

interface RecentIncident {
  date: string;
  behavior: string;
  antecedent: string;
  consequence: string;
  intensity: string;
}

interface RecentConversation {
  date: string;
  topic: string;
  keyPoints: string[];
  parentConcerns: string[];
}

interface GoalProgress {
  goal: string;
  baseline: number;
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
}

interface SessionDigest {
  generatedAt: string;
  childProfile: ChildProfile;
  sessionContext: {
    lastSession: string | null;
    sessionsThisMonth: number;
    attendanceRate: number;
  };
  behaviorSummary: {
    incidentsLast7Days: number;
    incidentsTrend: 'up' | 'down' | 'stable';
    topBehaviors: Array<{ behavior: string; count: number }>;
    topTriggers: Array<{ trigger: string; count: number }>;
    likelyFunction: string;
  };
  parentUpdates: {
    recentConcerns: string[];
    winsToAcknowledge: string[];
    questionsAsked: string[];
  };
  goalProgress: GoalProgress[];
  recommendedFocus: string[];
  talkingPoints: string[];
  resourcesShared: string[];
}

interface AbcEntry {
  behavior_category: string;
  antecedent_category: string;
  consequence_category: string;
  occurred_at: string;
  child_id: string;
}

interface ChatMessage {
  content: string;
  role: string;
  created_at: string;
}

interface TreatmentGoal {
  goal_text: string;
  baseline_value: number | null;
  current_value: number | null;
  target_value: number | null;
  child_id: string;
  status: string;
}

interface MarketplaceBooking {
  scheduled_at: string;
  status: string;
  user_id: string;
  provider_id: string;
}

interface SessionPrepDigestProps {
  childId: string;
  providerId: string;
  sessionDate?: string;
  onExport?: (digest: SessionDigest) => void;
}

export function SessionPrepDigest({
  childId,
  providerId,
  sessionDate = new Date().toISOString().split('T')[0],
  onExport
}: SessionPrepDigestProps) {
  const [digest, setDigest] = useState<SessionDigest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['behavior', 'goals', 'focus'])
  );

  useEffect(() => {
    generateDigest();
  }, [childId, providerId, sessionDate]);

  const generateDigest = async () => {
    setIsLoading(true);
    try {
      // Fetch child profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', childId)
        .single();

      // Fetch child details
      const { data: childData } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('user_id', childId)
        .single();

      // Fetch ABC data from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: abcData } = await supabase
        .from('abc_entries')
        .select('*')
        .eq('child_id', childId)
        .gte('occurred_at', sevenDaysAgo.toISOString())
        .order('occurred_at', { ascending: false });

      // Fetch recent conversations (AI chats with parent)
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('user_id', childId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch messages from those conversations
      const conversationIds = conversations?.map(c => c.id) || [];
      const { data: messages } = await supabase
        .from('messages')
        .select('content, role, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      // Fetch session history
      const { data: sessions } = await supabase
        .from('marketplace_bookings')
        .select('*')
        .eq('user_id', childId)
        .eq('provider_id', providerId)
        .order('scheduled_at', { ascending: false });

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('treatment_goals')
        .select('*')
        .eq('child_id', childId)
        .eq('status', 'active');

      // Process ABC data
      const behaviorCounts: Record<string, number> = {};
      const triggerCounts: Record<string, number> = {};
      const consequenceCounts: Record<string, number> = {};

      (abcData || []).forEach((entry: AbcEntry) => {
        behaviorCounts[entry.behavior_category] = (behaviorCounts[entry.behavior_category] || 0) + 1;
        triggerCounts[entry.antecedent_category] = (triggerCounts[entry.antecedent_category] || 0) + 1;
        consequenceCounts[entry.consequence_category] = (consequenceCounts[entry.consequence_category] || 0) + 1;
      });

      const topBehaviors = Object.entries(behaviorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([behavior, count]) => ({ behavior: formatCategory(behavior), count }));

      const topTriggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([trigger, count]) => ({ trigger: formatCategory(trigger), count }));

      const likelyFunction = Object.entries(consequenceCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'undetermined';

      // Extract parent concerns from messages
      const parentMessages = (messages || []).filter((m: ChatMessage) => m.role === 'user');
      const recentConcerns = extractConcerns(parentMessages);
      const winsToAcknowledge = extractWins(parentMessages);
      const questionsAsked = extractQuestions(parentMessages);

      // Calculate incident trend (compare to previous 7 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: previousAbcData } = await supabase
        .from('abc_entries')
        .select('id')
        .eq('child_id', childId)
        .gte('occurred_at', fourteenDaysAgo.toISOString())
        .lt('occurred_at', sevenDaysAgo.toISOString());

      const currentIncidents = abcData?.length || 0;
      const previousIncidents = previousAbcData?.length || 0;

      let incidentsTrend: 'up' | 'down' | 'stable' = 'stable';
      if (currentIncidents > previousIncidents * 1.2) incidentsTrend = 'up';
      else if (currentIncidents < previousIncidents * 0.8) incidentsTrend = 'down';

      // Process goals
      const goalProgress: GoalProgress[] = (goalsData || []).map((g: TreatmentGoal) => ({
        goal: g.goal_text,
        baseline: g.baseline_value || 0,
        current: g.current_value || 0,
        target: g.target_value || 100,
        trend: (g.current_value ?? 0) > (g.baseline_value ?? 0) ? 'up' : (g.current_value ?? 0) < (g.baseline_value ?? 0) ? 'down' : 'stable'
      }));

      // Generate recommended focus areas
      const recommendedFocus = generateFocusAreas(
        topBehaviors,
        topTriggers,
        likelyFunction,
        goalProgress,
        recentConcerns
      );

      // Generate talking points
      const talkingPoints = generateTalkingPoints(
        winsToAcknowledge,
        recentConcerns,
        goalProgress,
        currentIncidents,
        incidentsTrend
      );

      // Session context
      const lastSession = sessions?.[0]?.scheduled_at || null;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const sessionsThisMonth = (sessions || []).filter(
        (s: MarketplaceBooking) => new Date(s.scheduled_at) >= thisMonth
      ).length;
      const totalSessions = sessions?.length || 0;
      const completedSessions = (sessions || []).filter((s: MarketplaceBooking) => s.status === 'completed').length;
      const attendanceRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 100;

      // Build digest
      const newDigest: SessionDigest = {
        generatedAt: new Date().toISOString(),
        childProfile: {
          id: childId,
          name: childData?.name || profileData?.full_name || 'Child',
          birthDate: childData?.birth_date || '',
          diagnoses: childData?.diagnoses || [],
          communicationLevel: childData?.communication_level || 'verbal',
          sensoryProfile: childData?.sensory_sensitivities || [],
          currentGoals: goalProgress.map(g => g.goal)
        },
        sessionContext: {
          lastSession,
          sessionsThisMonth,
          attendanceRate: Math.round(attendanceRate)
        },
        behaviorSummary: {
          incidentsLast7Days: currentIncidents,
          incidentsTrend,
          topBehaviors,
          topTriggers,
          likelyFunction: formatCategory(likelyFunction)
        },
        parentUpdates: {
          recentConcerns,
          winsToAcknowledge,
          questionsAsked
        },
        goalProgress,
        recommendedFocus,
        talkingPoints,
        resourcesShared: []
      };

      setDigest(newDigest);
    } catch (error) {
      console.error('[SessionPrep] Error generating digest:', error);
      toast.error('Failed to generate session digest');
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  const formatCategory = (category: string): string => {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const extractConcerns = (messages: ChatMessage[]): string[] => {
    const concernPatterns = [
      /worried about/i,
      /concerned about/i,
      /struggling with/i,
      /hard time with/i,
      /help with/i,
      /frustrated/i,
      /stressed about/i
    ];

    const concerns: string[] = [];
    messages.forEach(m => {
      const content = m.content || '';
      concernPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          // Extract the sentence containing the concern
          const sentences = content.split(/[.!?]+/);
          sentences.forEach((s: string) => {
            if (pattern.test(s) && s.trim().length > 10 && s.trim().length < 200) {
              concerns.push(s.trim());
            }
          });
        }
      });
    });

    return [...new Set(concerns)].slice(0, 5);
  };

  const extractWins = (messages: ChatMessage[]): string[] => {
    const winPatterns = [
      /did great/i,
      /did well/i,
      /improvement/i,
      /better today/i,
      /proud of/i,
      /finally/i,
      /first time/i,
      /success/i
    ];

    const wins: string[] = [];
    messages.forEach(m => {
      const content = m.content || '';
      winPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          const sentences = content.split(/[.!?]+/);
          sentences.forEach((s: string) => {
            if (pattern.test(s) && s.trim().length > 10 && s.trim().length < 200) {
              wins.push(s.trim());
            }
          });
        }
      });
    });

    return [...new Set(wins)].slice(0, 3);
  };

  const extractQuestions = (messages: ChatMessage[]): string[] => {
    const questions: string[] = [];
    messages.forEach(m => {
      const content = m.content || '';
      const questionMatches = content.match(/[^.!?]*\?/g) || [];
      questionMatches.forEach((q: string) => {
        if (q.trim().length > 10 && q.trim().length < 200) {
          questions.push(q.trim());
        }
      });
    });

    return [...new Set(questions)].slice(0, 5);
  };

  const generateFocusAreas = (
    topBehaviors: Array<{ behavior: string; count: number }>,
    topTriggers: Array<{ trigger: string; count: number }>,
    likelyFunction: string,
    goalProgress: GoalProgress[],
    concerns: string[]
  ): string[] => {
    const focus: string[] = [];

    // Based on behavior data
    if (topBehaviors.length > 0) {
      focus.push(`Address ${topBehaviors[0].behavior.toLowerCase()} (${topBehaviors[0].count} incidents this week)`);
    }

    if (topTriggers.length > 0) {
      focus.push(`Develop strategies for ${topTriggers[0].trigger.toLowerCase()} triggers`);
    }

    // Based on function
    if (likelyFunction === 'escape' || likelyFunction === 'Escape') {
      focus.push('Review break/escape requesting skills');
    } else if (likelyFunction === 'attention' || likelyFunction === 'Attention') {
      focus.push('Practice appropriate attention-seeking alternatives');
    }

    // Based on goals needing attention
    const strugglingGoals = goalProgress.filter(g => g.trend === 'down' || g.current < g.baseline);
    strugglingGoals.forEach(g => {
      focus.push(`Review approach for: ${g.goal}`);
    });

    // If there are parent concerns
    if (concerns.length > 0) {
      focus.push('Address parent concerns from this week');
    }

    return focus.slice(0, 5);
  };

  const generateTalkingPoints = (
    wins: string[],
    concerns: string[],
    goals: GoalProgress[],
    incidents: number,
    trend: 'up' | 'down' | 'stable'
  ): string[] => {
    const points: string[] = [];

    // Start with wins
    if (wins.length > 0) {
      points.push(`Celebrate: "${wins[0]}"`);
    }

    // Behavior trend
    if (trend === 'down') {
      points.push(`Positive trend: Incidents down from last week (${incidents} this week)`);
    } else if (trend === 'up') {
      points.push(`Check in: Incident increase noted (${incidents} this week) - explore what's changed`);
    }

    // Goal progress
    const progressingGoals = goals.filter(g => g.trend === 'up');
    if (progressingGoals.length > 0) {
      points.push(`Goal progress to highlight: ${progressingGoals[0].goal}`);
    }

    // Parent concerns to address
    if (concerns.length > 0) {
      points.push(`Address concern: "${concerns[0]}"`);
    }

    points.push('Review home practice assignments');
    points.push('Discuss priorities for coming week');

    return points.slice(0, 6);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (!digest) return;

    const content = JSON.stringify(digest, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-prep-${digest.childProfile.name.replace(/\s+/g, '-')}-${sessionDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onExport?.(digest);
    toast.success('Digest exported');
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
          <div className="relative">
            <Brain className="w-12 h-12 text-teal-600" />
            <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Generating Session Digest...
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Analyzing behavior data, conversations, and goals
            </p>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      </Card>
    );
  }

  if (!digest) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          Unable to Generate Digest
        </h3>
        <p className="text-gray-500 dark:text-slate-400 mb-4">
          There may not be enough data for this client yet.
        </p>
        <Button onClick={() => generateDigest()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Session Prep for {digest.childProfile.name}
              </h1>
              <p className="text-gray-600 dark:text-slate-400 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {new Date(sessionDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setIsRegenerating(true); generateDigest(); }}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {digest.sessionContext.sessionsThisMonth}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Sessions this month</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {digest.behaviorSummary.incidentsLast7Days}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Incidents (7 days)</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {digest.sessionContext.attendanceRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Attendance rate</p>
          </div>
        </div>
      </Card>

      {/* Clinical Disclaimer */}
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
        <span className="text-amber-600 flex-shrink-0">📋</span>
        <span className="text-amber-800">
          AI-generated session prep is for informational support. Clinical session planning should be directed by the treating BCBA or therapist.
        </span>
      </div>

      {/* Recommended Focus */}
      <CollapsibleCard
        title="Recommended Focus Areas"
        icon={Target}
        badge={`${digest.recommendedFocus.length} areas`}
        badgeColor="bg-red-100 text-red-700"
        expanded={expandedSections.has('focus')}
        onToggle={() => toggleSection('focus')}
      >
        <div className="space-y-3">
          {digest.recommendedFocus.map((focus, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-sm font-bold">{i + 1}</span>
              </div>
              <p className="text-gray-700 dark:text-slate-300">{focus}</p>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Behavior Summary */}
      <CollapsibleCard
        title="Behavior Summary"
        icon={Activity}
        badge={
          digest.behaviorSummary.incidentsTrend === 'down' ? 'Improving' :
          digest.behaviorSummary.incidentsTrend === 'up' ? 'Increasing' : 'Stable'
        }
        badgeColor={
          digest.behaviorSummary.incidentsTrend === 'down'
            ? 'bg-green-100 text-green-700'
            : digest.behaviorSummary.incidentsTrend === 'up'
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-700'
        }
        expanded={expandedSections.has('behavior')}
        onToggle={() => toggleSection('behavior')}
      >
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Top Behaviors</p>
            <div className="space-y-2">
              {digest.behaviorSummary.topBehaviors.map((b, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-slate-300">{b.behavior}</span>
                  <Badge className="bg-red-100 text-red-700">{b.count}x</Badge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Top Triggers</p>
            <div className="space-y-2">
              {digest.behaviorSummary.topTriggers.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-slate-300">{t.trigger}</span>
                  <Badge className="bg-blue-100 text-blue-700">{t.count}x</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            <strong>Likely Function:</strong> {digest.behaviorSummary.likelyFunction}
          </p>
        </div>
      </CollapsibleCard>

      {/* Goal Progress */}
      <CollapsibleCard
        title="Goal Progress"
        icon={CheckCircle}
        badge={`${digest.goalProgress.length} active goals`}
        badgeColor="bg-teal-100 text-teal-700"
        expanded={expandedSections.has('goals')}
        onToggle={() => toggleSection('goals')}
      >
        <div className="space-y-3 sm:space-y-4">
          {digest.goalProgress.map((goal, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 dark:text-white">{goal.goal}</p>
                <div className={`flex items-center gap-1 ${
                  goal.trend === 'up' ? 'text-green-600' :
                  goal.trend === 'down' ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {getTrendIcon(goal.trend)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Baseline: {goal.baseline}%
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                  {goal.current}% / {goal.target}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Parent Updates */}
      <CollapsibleCard
        title="Parent Updates"
        icon={Heart}
        badge={`${digest.parentUpdates.recentConcerns.length + digest.parentUpdates.winsToAcknowledge.length} items`}
        badgeColor="bg-pink-100 text-pink-700"
        expanded={expandedSections.has('parent')}
        onToggle={() => toggleSection('parent')}
      >
        {digest.parentUpdates.winsToAcknowledge.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Wins to Celebrate
            </p>
            <div className="space-y-2">
              {digest.parentUpdates.winsToAcknowledge.map((win, i) => (
                <p key={i} className="text-gray-700 dark:text-slate-300 text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  "{win}"
                </p>
              ))}
            </div>
          </div>
        )}

        {digest.parentUpdates.recentConcerns.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Concerns to Address
            </p>
            <div className="space-y-2">
              {digest.parentUpdates.recentConcerns.map((concern, i) => (
                <p key={i} className="text-gray-700 dark:text-slate-300 text-sm p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  "{concern}"
                </p>
              ))}
            </div>
          </div>
        )}

        {digest.parentUpdates.questionsAsked.length > 0 && (
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Questions Asked
            </p>
            <div className="space-y-2">
              {digest.parentUpdates.questionsAsked.map((q, i) => (
                <p key={i} className="text-gray-700 dark:text-slate-300 text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  {q}
                </p>
              ))}
            </div>
          </div>
        )}
      </CollapsibleCard>

      {/* Talking Points */}
      <CollapsibleCard
        title="Session Talking Points"
        icon={FileText}
        badge="Agenda"
        badgeColor="bg-purple-100 text-purple-700"
        expanded={expandedSections.has('talking')}
        onToggle={() => toggleSection('talking')}
      >
        <div className="space-y-3">
          {digest.talkingPoints.map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 text-sm font-bold">{i + 1}</span>
              </div>
              <p className="text-gray-700 dark:text-slate-300">{point}</p>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Child Profile Summary */}
      <CollapsibleCard
        title="Client Profile"
        icon={User}
        badge={digest.childProfile.diagnoses.join(', ') || 'No diagnoses'}
        badgeColor="bg-gray-100 text-gray-700"
        expanded={expandedSections.has('profile')}
        onToggle={() => toggleSection('profile')}
      >
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Communication</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {digest.childProfile.communicationLevel}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Age</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {digest.childProfile.birthDate
                ? `${Math.floor((Date.now() - new Date(digest.childProfile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years`
                : 'Not specified'}
            </p>
          </div>
          {digest.childProfile.sensoryProfile.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Sensory Sensitivities</p>
              <div className="flex flex-wrap gap-2">
                {digest.childProfile.sensoryProfile.map((s, i) => (
                  <Badge key={i} className="bg-yellow-100 text-yellow-700">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Footer */}
      <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
        Generated at {new Date(digest.generatedAt).toLocaleString()} •
        Data from the past 7 days
      </p>
    </div>
  );
}

// Collapsible Card Component
function CollapsibleCard({
  title,
  icon: Icon,
  badge,
  badgeColor,
  expanded,
  onToggle,
  children
}: {
  title: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-teal-600" />
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          <Badge className={badgeColor}>{badge}</Badge>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="p-3 sm:p-4">{children}</div>}
    </Card>
  );
}

export default SessionPrepDigest;
