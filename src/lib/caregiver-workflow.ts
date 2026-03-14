import { supabase } from '../utils/supabase/client';
import {
  createConversation as createCanonicalConversation,
  generateTitle,
  getConversation as getCanonicalConversation,
  listConversations as listCanonicalConversations,
  saveMessage as saveCanonicalMessage,
  type ConversationRecord,
  type MessageMetadata,
  type MessageRecord,
} from './conversation-store';
import { getConversationMemory, type ConversationSummary } from './multi-turn-memory';
import { extractFactsFromMessage, type ExtractedFact } from './fact-extraction';
import { generateClinicalReportPDF, DEFAULT_SECTIONS, type ReportSections } from './clinical-pdf-generator';
import type { ClinicalReportData, ClinicalGoal } from './clinical-report-demo-data';
import type { Child } from './supabase-data';
import { setWorkflowSyncStatus } from './core-workflow-sync';

export type WorkflowFocusDomain = 'speech' | 'social' | 'regulation' | 'routines' | 'sensory' | 'executive' | 'aac';
export type WorkflowTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime';
export type WorkflowDataSource = 'goal' | 'memory' | 'conversation' | 'manual';

export interface WorkflowChildProfileInput {
  childId?: string;
  userId?: string;
  parentName?: string;
  childName: string;
  childAge?: number;
  dateOfBirth?: string;
  diagnoses?: string[];
  challenges?: string[];
  strengths?: string[];
  therapies?: string[];
  concerns?: string[];
  isPrimary?: boolean;
  hasCompletedOnboarding?: boolean;
}

export interface DailyPlanItem {
  id: string;
  title: string;
  description: string;
  source: WorkflowDataSource;
  timeOfDay: WorkflowTimeOfDay;
  recommendedDurationMinutes: number;
  completed: boolean;
  completedAt?: string;
  linkedGoalIds?: string[];
  linkedMemoryFactIds?: string[];
  linkedConversationSummaryIds?: string[];
  launchJuniorDomain?: WorkflowFocusDomain;
}

export interface DailyPlanSnapshot {
  id: string;
  userId: string;
  childId: string;
  planDate: string;
  version: number;
  status: 'active' | 'superseded' | 'archived';
  source: 'generated' | 'manual' | 'recovered';
  items: DailyPlanItem[];
  generatedFromGoalIds: string[];
  generatedFromMemoryFactIds: string[];
  generatedFromConversationSummaryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanRoutineGroup {
  id: WorkflowTimeOfDay;
  timeOfDay: WorkflowTimeOfDay;
  label: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    timeEstimate: string;
  }>;
  completedCount: number;
  totalCount: number;
}

export interface CaregiverWeeklySummary {
  weekOf: string;
  overallProgress: number;
  progressTrend: 'up' | 'down' | 'stable';
  highlights: string[];
  challenges: string[];
  recommendations: string[];
  goalsProgress: Array<{
    name: string;
    progress: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  moodPattern: 'positive' | 'neutral' | 'challenging';
  streakDays: number;
  activitiesCompleted: number;
  conversationsCount: number;
}

export const WORKFLOW_EVENTS = {
  dailyPlanUpdated: 'aminy:workflow-daily-plan-updated',
  juniorProgressUpdated: 'aminy:workflow-junior-progress-updated',
  caregiverSummaryUpdated: 'aminy:workflow-caregiver-summary-updated',
} as const;

type WorkflowEventName = typeof WORKFLOW_EVENTS[keyof typeof WORKFLOW_EVENTS];

interface WorkflowEventDetail {
  userId: string;
  childId?: string;
  snapshotId?: string;
  itemId?: string;
  summaryId?: string;
}

function emitWorkflowEvent(name: WorkflowEventName, detail: WorkflowEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export interface CaregiverSummarySnapshot {
  generatedAt: string;
  child: {
    id: string;
    name: string;
    age: number | null;
    diagnoses: string[];
    challenges: string[];
    strengths: string[];
  };
  period: {
    start: string;
    end: string;
  };
  plans: DailyPlanSnapshot[];
  juniorSessions: Array<{
    id: string;
    activityName: string;
    domain: WorkflowFocusDomain;
    completedAt: string;
    durationSeconds: number;
    tokensEarned: number;
    accuracy?: number | null;
  }>;
  conversationSummaries: Array<{
    id: string;
    summary: string;
    topics: string[];
    createdAt: string;
  }>;
  weeklySummary: CaregiverWeeklySummary;
}

export interface CaregiverSummary {
  id: string;
  userId: string;
  childId: string;
  periodStart: string;
  periodEnd: string;
  snapshot: CaregiverSummarySnapshot;
  summaryText: string;
  notes?: string | null;
  sourcePlanSnapshotIds: string[];
  sourceConversationSummaryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMessageAppendResult {
  message: MessageRecord;
  extractedFacts: ExtractedFact[];
  conversationSummary?: ConversationSummary;
}

interface WorkflowGoal {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  progress?: number | null;
}

interface WorkflowMemoryFactRow {
  id: string;
  category: string;
  key: string;
  value: string;
  extracted_at: string;
}

interface WorkflowJuniorProgressInput {
  userId?: string;
  childId?: string;
  planSnapshotId?: string;
  planItemId?: string;
  activityId: string;
  activityTitle: string;
  domain: WorkflowFocusDomain;
  completedAt: string;
  durationSeconds: number;
  accuracy?: number;
  promptLevel?: number;
  tokensEarned: number;
  emotionBefore?: string;
  emotionAfter?: string;
  notes?: string;
}

interface WorkflowClinicalExportOptions {
  recipientType?: 'pediatrician' | 'bcba' | 'specialist';
  sections?: ReportSections;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeIsoDate(value?: string | Date): string {
  if (!value) return new Date().toISOString().split('T')[0];
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return value.includes('T') ? value.split('T')[0] : value;
}

function normalizeRequestedChildId(childId?: string | null): string | null {
  if (!childId) return null;
  if (childId === 'default') return null;
  if (childId.startsWith('child-') && !/^[0-9a-f-]{36}$/i.test(childId)) return null;
  return childId;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function slugifyKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'fact';
}

function normalizeMemoryCategory(category: ExtractedFact['category']): string {
  const allowed = new Set([
    'preference',
    'trigger',
    'strength',
    'challenge',
    'milestone',
    'strategy',
    'medical',
    'educational',
    'routine',
    'relationship',
  ]);

  return allowed.has(category) ? category : 'challenge';
}

function inferTimeOfDay(text: string): WorkflowTimeOfDay {
  const value = text.toLowerCase();
  if (/(wake|morning|breakfast|dress|school)/.test(value)) return 'morning';
  if (/(lunch|afternoon|homework|after school|play)/.test(value)) return 'afternoon';
  if (/(dinner|evening|family|bath)/.test(value)) return 'evening';
  if (/(bed|sleep|night|calm|tooth|pajama)/.test(value)) return 'bedtime';
  return 'afternoon';
}

function inferFocusDomain(text: string): WorkflowFocusDomain {
  const value = text.toLowerCase();
  if (/(speech|language|communicat|aac|talk|articulation)/.test(value)) return 'speech';
  if (/(social|peer|friend|play)/.test(value)) return 'social';
  if (/(sensory|texture|noise|overwhelm)/.test(value)) return 'sensory';
  if (/(routine|transition|schedule|bedtime|morning)/.test(value)) return 'routines';
  if (/(emotion|regulat|calm|meltdown)/.test(value)) return 'regulation';
  if (/(organize|plan|executive|focus)/.test(value)) return 'executive';
  return 'routines';
}

function toPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

export function buildLegacyConversationState(
  existingMessages: Array<Record<string, unknown>>,
  message: MessageRecord,
  extractedFacts: ExtractedFact[] = [],
): {
  messages: Array<Record<string, unknown>>;
  messageCount: number;
  topics: string[];
  factsExtracted: string[];
  lastMessageAt: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'crisis';
} {
  const nextMessages = [
    ...existingMessages,
    {
      id: message.id,
      role: message.role,
      content: message.content,
      metadata: message.metadata || {},
      created_at: message.createdAt,
    },
  ];

  const combinedText = nextMessages.map((entry) => String(entry.content || '')).join(' ').toLowerCase();
  const topics = uniqueStrings([
    /(routine|transition|bedtime|morning)/.test(combinedText) ? 'routines' : null,
    /(speech|language|talk|communicat|aac)/.test(combinedText) ? 'communication' : null,
    /(social|friend|peer|play)/.test(combinedText) ? 'social' : null,
    /(meltdown|behavior|tantrum|regulat|calm)/.test(combinedText) ? 'behavior' : null,
    /(sensory|noise|texture|overwhelm)/.test(combinedText) ? 'sensory' : null,
    /(school|iep|teacher|classroom)/.test(combinedText) ? 'school' : null,
  ]);

  const negativeSignals = ['overwhelmed', 'frustrated', 'crisis', 'danger', 'emergency'];
  const positiveSignals = ['progress', 'win', 'better', 'success', 'proud'];
  const negativeCount = negativeSignals.filter((token) => combinedText.includes(token)).length;
  const positiveCount = positiveSignals.filter((token) => combinedText.includes(token)).length;

  return {
    messages: nextMessages,
    messageCount: nextMessages.length,
    topics,
    factsExtracted: extractedFacts.map((fact) => `${fact.category}: ${fact.content}`),
    lastMessageAt: message.createdAt,
    sentiment: combinedText.includes('crisis') || combinedText.includes('danger')
      ? 'crisis'
      : negativeCount > positiveCount
        ? 'negative'
        : positiveCount > negativeCount
          ? 'positive'
          : 'neutral',
  };
}

export function buildDailyPlanItems(input: {
  childName: string;
  goals: WorkflowGoal[];
  memoryFacts: WorkflowMemoryFactRow[];
  conversationSummaries: ConversationSummary[];
}): {
  items: DailyPlanItem[];
  goalIds: string[];
  memoryFactIds: string[];
  conversationSummaryIds: string[];
} {
  const items: DailyPlanItem[] = [];
  const goalIds: string[] = [];
  const memoryFactIds: string[] = [];
  const conversationSummaryIds: string[] = [];

  for (const goal of input.goals.slice(0, 3)) {
    goalIds.push(goal.id);
    items.push({
      id: generateId('plan-goal'),
      title: goal.title,
      description: goal.description || `Practice a focused support block for ${input.childName}.`,
      source: 'goal',
      timeOfDay: inferTimeOfDay(`${goal.category || ''} ${goal.title}`),
      recommendedDurationMinutes: 15,
      completed: false,
      linkedGoalIds: [goal.id],
      launchJuniorDomain: inferFocusDomain(`${goal.category || ''} ${goal.title}`),
    });
  }

  for (const fact of input.memoryFacts.filter((fact) => ['strategy', 'routine', 'challenge'].includes(fact.category)).slice(0, 2)) {
    memoryFactIds.push(fact.id);
    items.push({
      id: generateId('plan-memory'),
      title: fact.category === 'strategy' ? 'Reuse a proven strategy' : 'Support a recurring challenge',
      description: fact.value,
      source: 'memory',
      timeOfDay: inferTimeOfDay(fact.value),
      recommendedDurationMinutes: 10,
      completed: false,
      linkedMemoryFactIds: [fact.id],
      launchJuniorDomain: inferFocusDomain(fact.value),
    });
  }

  const recentSummary = input.conversationSummaries[0];
  if (recentSummary) {
    conversationSummaryIds.push(recentSummary.id);
    items.push({
      id: generateId('plan-conversation'),
      title: recentSummary.keyTopics[0]
        ? `Follow up on ${recentSummary.keyTopics[0]}`
        : 'Follow up on recent coaching',
      description: recentSummary.summary,
      source: 'conversation',
      timeOfDay: inferTimeOfDay(`${recentSummary.keyTopics.join(' ')} ${recentSummary.summary}`),
      recommendedDurationMinutes: 12,
      completed: false,
      linkedConversationSummaryIds: [recentSummary.id],
      launchJuniorDomain: inferFocusDomain(`${recentSummary.keyTopics.join(' ')} ${recentSummary.summary}`),
    });
  }

  if (items.length === 0) {
    items.push({
      id: generateId('plan-manual'),
      title: `Check in with ${input.childName}`,
      description: 'Spend 10 calm minutes noticing what is going well and where extra support is needed today.',
      source: 'manual',
      timeOfDay: 'afternoon',
      recommendedDurationMinutes: 10,
      completed: false,
      launchJuniorDomain: 'regulation',
    });
  }

  return {
    items,
    goalIds: uniqueStrings(goalIds),
    memoryFactIds: uniqueStrings(memoryFactIds),
    conversationSummaryIds: uniqueStrings(conversationSummaryIds),
  };
}

export function mapSnapshotToRoutineGroups(snapshot: DailyPlanSnapshot | null): DailyPlanRoutineGroup[] {
  const labels: Record<WorkflowTimeOfDay, string> = {
    morning: 'Morning Routine',
    afternoon: 'Afternoon Plan',
    evening: 'Evening Plan',
    bedtime: 'Bedtime Plan',
  };

  const allGroups = (['morning', 'afternoon', 'evening', 'bedtime'] as WorkflowTimeOfDay[]).map((timeOfDay) => {
    const tasks = (snapshot?.items || []).filter((item) => item.timeOfDay === timeOfDay);
    return {
      id: timeOfDay,
      timeOfDay,
      label: labels[timeOfDay],
      tasks: tasks.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        completed: item.completed,
        timeEstimate: `${item.recommendedDurationMinutes}m`,
      })),
      completedCount: tasks.filter((item) => item.completed).length,
      totalCount: tasks.length,
    };
  });

  return allGroups.filter((group) => group.totalCount > 0);
}

export function buildCaregiverWeeklySummary(input: {
  childName: string;
  planSnapshots: DailyPlanSnapshot[];
  juniorSessions: Array<Record<string, unknown>>;
  conversationSummaries: ConversationSummary[];
}): CaregiverWeeklySummary {
  const allItems = input.planSnapshots.flatMap((snapshot) => snapshot.items);
  const completedItems = allItems.filter((item) => item.completed);
  const completedSessions = input.juniorSessions.filter((session) => Boolean(session.completed));
  const totalTokens = input.juniorSessions.reduce((sum, session) => sum + Number(session.coins_earned || 0), 0);
  const topicCounts = new Map<string, number>();
  input.conversationSummaries.forEach((summary) => {
    summary.keyTopics.forEach((topic) => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
  });
  const topTopic = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  const overallProgress = toPercent(completedItems.length + completedSessions.length, Math.max(allItems.length + completedSessions.length, 1));
  const progressTrend: CaregiverWeeklySummary['progressTrend'] = overallProgress >= 70 ? 'up' : overallProgress <= 30 ? 'down' : 'stable';
  const moodPattern: CaregiverWeeklySummary['moodPattern'] = input.conversationSummaries.some((summary) => summary.emotionalTone === 'concerned')
    ? 'challenging'
    : overallProgress >= 60
      ? 'positive'
      : 'neutral';

  const goalsProgress = input.planSnapshots.flatMap((snapshot) =>
    snapshot.items
      .filter((item) => item.linkedGoalIds?.length)
      .map((item) => ({
        name: item.title,
        progress: item.completed ? 100 : 0,
        trend: (item.completed ? 'up' : 'stable') as 'up' | 'down' | 'stable',
      })),
  ).slice(0, 5);

  return {
    weekOf: input.planSnapshots[0]?.planDate || normalizeIsoDate(),
    overallProgress,
    progressTrend,
    highlights: uniqueStrings([
      completedItems.length > 0 ? `${input.childName} completed ${completedItems.length} plan item${completedItems.length === 1 ? '' : 's'} this period.` : null,
      completedSessions.length > 0 ? `Ease captured ${completedSessions.length} completed session${completedSessions.length === 1 ? '' : 's'} for ${input.childName}.` : null,
      topTopic ? `Recent coaching stayed focused on ${topTopic}.` : null,
      totalTokens > 0 ? `${input.childName} earned ${totalTokens} Ease tokens.` : null,
    ]).slice(0, 4),
    challenges: uniqueStrings([
      completedItems.length === 0 ? `No daily-plan items were marked complete for ${input.childName} yet.` : null,
      input.conversationSummaries.length === 0 ? 'No stored coaching summaries were available for this period.' : null,
      completedSessions.length === 0 ? 'Ease progress has not been recorded for this period yet.' : null,
    ]).slice(0, 3),
    recommendations: uniqueStrings([
      completedItems.length < Math.max(allItems.length, 1) ? 'Pick one plan item to finish each day before adding more.' : null,
      completedSessions.length === 0 ? 'Launch one Ease activity from the daily plan so progress carries into the report.' : null,
      topTopic ? `Review Aminy guidance on ${topTopic} with your provider at the next check-in.` : 'Review this week’s stored guidance before your next provider conversation.',
    ]).slice(0, 4),
    goalsProgress,
    moodPattern,
    streakDays: input.planSnapshots.length,
    activitiesCompleted: completedItems.length + completedSessions.length,
    conversationsCount: input.conversationSummaries.length,
  };
}

export function mapCaregiverSummaryToClinicalReportData(summary: CaregiverSummary): ClinicalReportData {
  const { child, period, weeklySummary, plans, juniorSessions, conversationSummaries } = summary.snapshot;

  const goals: ClinicalGoal[] = plans.flatMap((plan) =>
    plan.items
      .filter((item) => item.linkedGoalIds?.length)
      .map((item) => ({
        id: item.linkedGoalIds?.[0] || item.id,
        domain: item.launchJuniorDomain || 'General',
        title: item.title,
        description: item.description,
        baseline: 0,
        current: item.completed ? 100 : 0,
        target: 100,
        masteryCriteria: 'Complete the plan item consistently across the reporting window.',
        status: item.completed ? 'mastered' : 'in_progress',
        dataPoints: 1,
        trendDirection: item.completed ? 'improving' : 'stable',
        startDate: plan.planDate,
      })),
  );

  return {
    child: {
      firstName: child.name.split(/\s+/)[0] || child.name,
      lastName: child.name.split(/\s+/).slice(1).join(' '),
      dateOfBirth: 'Not recorded',
      age: child.age || 0,
      gender: 'Not specified',
      conditions: child.diagnoses.map(() => 'other'),
      primaryDiagnosis: child.diagnoses[0] || 'Not yet diagnosed',
      diagnosisDate: 'Not recorded',
      diagnosingProvider: 'Not recorded',
      medications: [],
      schoolInfo: {
        schoolName: 'Not recorded',
        grade: 'Not recorded',
        hasIEP: false,
        has504: false,
        specialEducation: false,
      },
    },
    reportingProvider: {
      name: 'Caregiver-generated summary',
      credentials: '',
      licenseNumber: '',
      npi: '',
      clinicName: 'Aminy',
      clinicAddress: '',
      clinicPhone: '',
    },
    reportPeriod: {
      start: period.start,
      end: period.end,
    },
    reportDate: normalizeIsoDate(summary.createdAt),
    treatmentPlan: {
      startDate: plans[plans.length - 1]?.planDate || period.start,
      approvedHoursPerWeek: 0,
      currentServiceLevel: 'Caregiver home program',
      goals,
    },
    behaviorData: {
      abcSummary: [],
      targetBehaviors: weeklySummary.challenges.map((challenge) => ({
        name: challenge,
        operationalDefinition: challenge,
        baselineRate: 0,
        currentRate: 0,
        unit: 'events',
        percentChange: 0,
        trend: 'stable' as const,
        weeklyData: [],
      })),
      overallTrend: weeklySummary.progressTrend === 'up' ? 'improving' : weeklySummary.progressTrend === 'down' ? 'declining' : 'stable',
    },
    assessments: [],
    sessions: {
      totalSessions: juniorSessions.length,
      attendedSessions: juniorSessions.length,
      canceledByFamily: 0,
      canceledByProvider: 0,
      attendanceRate: juniorSessions.length > 0 ? 100 : 0,
      totalHours: Number((juniorSessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0) / 3600).toFixed(1)),
      hoursByType: {
        junior: Number((juniorSessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0) / 3600).toFixed(1)),
      },
      sessionsByCPT: {},
    },
    parentReport: {
      concerns: weeklySummary.challenges,
      wins: weeklySummary.highlights,
      homeEnvironmentNotes: summary.summaryText,
      medicationChanges: 'No medications tracked in this summary.',
      recentLifeEvents: conversationSummaries.map((entry) => entry.summary).join(' '),
    },
    recommendations: weeklySummary.recommendations,
  };
}

async function getAuthenticatedUserId(explicitUserId?: string): Promise<string> {
  if (explicitUserId) return explicitUserId;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated for caregiver workflow operations.');
  }
  return user.id;
}

async function resolveWorkflowChild(userId: string, requestedChildId?: string | null): Promise<Child | null> {
  const normalizedChildId = normalizeRequestedChildId(requestedChildId);

  if (normalizedChildId) {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', normalizedChildId)
      .eq('parent_id', userId)
      .maybeSingle();

    if (data && !error) return data as Child;
  }

  const { data: children, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;
  return (children?.[0] as Child | undefined) || null;
}

async function upsertMemoryFacts(userId: string, childId: string, extractedFacts: ExtractedFact[]): Promise<void> {
  if (extractedFacts.length === 0) {
    setWorkflowSyncStatus('aiMemory', 'synced');
    return;
  }

  setWorkflowSyncStatus('aiMemory', 'pending_sync');
  const now = new Date().toISOString();
  const rows = extractedFacts.map((fact) => ({
    id: generateId('fact'),
    user_id: userId,
    child_id: childId,
    category: normalizeMemoryCategory(fact.category),
    key: `${normalizeMemoryCategory(fact.category)}_${slugifyKey(fact.content)}`,
    value: fact.content,
    confidence: fact.confidence,
    source: 'conversation',
    source_id: null,
    extracted_at: now,
    last_verified: now,
    is_active: true,
  }));

  const { error } = await supabase.from('memory_facts').upsert(rows, {
    onConflict: 'user_id,child_id,key',
    ignoreDuplicates: false,
  });

  if (error) {
    setWorkflowSyncStatus('aiMemory', 'sync_failed');
    throw error;
  }

  setWorkflowSyncStatus('aiMemory', 'synced');
}

async function ensureLegacyConversationMirror(params: {
  aiConversation: ConversationRecord;
}): Promise<string | null> {
  const { aiConversation } = params;
  const { data: existingMap } = await supabase
    .from('conversation_compat_map')
    .select('conversation_id')
    .eq('ai_conversation_id', aiConversation.id)
    .maybeSingle();

  if (existingMap?.conversation_id) {
    return existingMap.conversation_id as string;
  }

  const legacyInsert = await supabase
    .from('conversations')
    .insert({
      user_id: aiConversation.userId,
      child_id: aiConversation.childId || null,
      title: aiConversation.title,
      archived: false,
      messages: [],
      message_count: aiConversation.messageCount,
      facts_extracted: [],
      topics: [],
      last_message_at: aiConversation.lastMessageAt,
    })
    .select('id')
    .single();

  if (legacyInsert.error || !legacyInsert.data?.id) {
    const fallback = await supabase
      .from('conversations')
      .insert({
        user_id: aiConversation.userId,
        child_id: aiConversation.childId || null,
        title: aiConversation.title,
        archived: false,
      })
      .select('id')
      .single();

    if (fallback.error || !fallback.data?.id) {
      throw fallback.error || legacyInsert.error || new Error('Failed to create legacy conversation mirror.');
    }

    await supabase.from('conversation_compat_map').upsert({
      ai_conversation_id: aiConversation.id,
      conversation_id: fallback.data.id,
      user_id: aiConversation.userId,
      child_id: aiConversation.childId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ai_conversation_id' });

    return fallback.data.id;
  }

  await supabase.from('conversation_compat_map').upsert({
    ai_conversation_id: aiConversation.id,
    conversation_id: legacyInsert.data.id,
    user_id: aiConversation.userId,
    child_id: aiConversation.childId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'ai_conversation_id' });

  return legacyInsert.data.id;
}

async function mirrorLegacyMessage(params: {
  aiConversation: ConversationRecord;
  message: MessageRecord;
  extractedFacts: ExtractedFact[];
}): Promise<void> {
  const { aiConversation, message, extractedFacts } = params;
  const legacyConversationId = await ensureLegacyConversationMirror({ aiConversation });
  if (!legacyConversationId) return;

  await supabase.from('messages').insert({
    conversation_id: legacyConversationId,
    role: message.role,
    content: message.content,
    metadata: message.metadata || {},
    created_at: message.createdAt,
  });

  const { data: existingConversation } = await supabase
    .from('conversations')
    .select('messages, message_count, facts_extracted, topics')
    .eq('id', legacyConversationId)
    .maybeSingle();

  const legacyState = buildLegacyConversationState(
    Array.isArray(existingConversation?.messages) ? existingConversation.messages as Array<Record<string, unknown>> : [],
    message,
    extractedFacts,
  );

  await supabase
    .from('conversations')
    .update({
      messages: legacyState.messages,
      message_count: legacyState.messageCount,
      facts_extracted: legacyState.factsExtracted,
      topics: legacyState.topics,
      last_message_at: legacyState.lastMessageAt,
      sentiment: legacyState.sentiment,
      updated_at: legacyState.lastMessageAt,
    })
    .eq('id', legacyConversationId);
}

async function loadWorkflowGoals(userId: string, childId: string): Promise<WorkflowGoal[]> {
  const [carePlanGoals, treatmentGoals, legacyGoals] = await Promise.all([
    supabase
      .from('care_plan_goals')
      .select('id, title, description, category, current_progress, child_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .then(({ data }) => Array.isArray(data) ? data : []),
    supabase
      .from('treatment_goals')
      .select('id, title, description, domain, current, child_id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => Array.isArray(data) ? data : []),
    supabase
      .from('goals')
      .select('id, title, name, progress, child_id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => Array.isArray(data) ? data : []),
  ]);

  const normalizedCarePlanGoals = carePlanGoals
    .filter((goal: Record<string, unknown>) => !goal.child_id || String(goal.child_id) === childId)
    .map((goal: Record<string, unknown>) => ({
      id: String(goal.id),
      title: String(goal.title),
      description: typeof goal.description === 'string' ? goal.description : null,
      category: typeof goal.category === 'string' ? goal.category : null,
      progress: Number(goal.current_progress || 0),
    }));

  const normalizedTreatmentGoals = treatmentGoals
    .filter((goal: Record<string, unknown>) => !goal.child_id || String(goal.child_id) === childId)
    .map((goal: Record<string, unknown>) => ({
      id: String(goal.id),
      title: String(goal.title),
      description: typeof goal.description === 'string' ? goal.description : null,
      category: typeof goal.domain === 'string' ? goal.domain : null,
      progress: Number(goal.current || 0),
    }));

  const normalizedLegacyGoals = legacyGoals
    .filter((goal: Record<string, unknown>) => !goal.child_id || String(goal.child_id) === childId)
    .map((goal: Record<string, unknown>) => ({
      id: String(goal.id),
      title: typeof goal.title === 'string' ? goal.title : String(goal.name || 'Goal'),
      description: null,
      category: null,
      progress: Number(goal.progress || 0),
    }));

  return [...normalizedCarePlanGoals, ...normalizedTreatmentGoals, ...normalizedLegacyGoals]
    .filter((goal, index, array) => array.findIndex((entry) => entry.id === goal.id) === index)
    .slice(0, 6);
}

async function loadWorkflowMemoryFacts(userId: string, childId: string, limit = 6): Promise<WorkflowMemoryFactRow[]> {
  const { data, error } = await supabase
    .from('memory_facts')
    .select('id, category, key, value, extracted_at')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('extracted_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as WorkflowMemoryFactRow[];
}

async function loadConversationSummaries(userId: string, childId: string, limit = 5): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('conversation_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    conversationId: String(row.conversation_id),
    userId: String(row.user_id),
    childId: typeof row.child_id === 'string' ? row.child_id : undefined,
    summary: String(row.summary),
    keyTopics: Array.isArray(row.key_topics) ? row.key_topics as string[] : [],
    emotionalTone: (row.emotional_tone || 'neutral') as ConversationSummary['emotionalTone'],
    actionItems: Array.isArray(row.action_items) ? row.action_items as string[] : [],
    strategiesMentioned: Array.isArray(row.strategies_mentioned) ? row.strategies_mentioned as string[] : [],
    createdAt: String(row.created_at),
  }));
}

export async function saveChildProfile(input: WorkflowChildProfileInput): Promise<Child> {
  const userId = await getAuthenticatedUserId(input.userId);
  setWorkflowSyncStatus('childProfile', 'pending_sync');

  const existingChild = await resolveWorkflowChild(userId, input.childId);
  const payload = {
    parent_id: userId,
    user_id: userId,
    name: input.childName,
    age_years: input.childAge ?? null,
    date_of_birth: input.dateOfBirth || null,
    diagnoses: uniqueStrings([...(input.diagnoses || [])]),
    challenges: uniqueStrings([...(input.challenges || []), ...(input.concerns || [])]),
    strengths: uniqueStrings(input.strengths || []),
    current_therapies: uniqueStrings(input.therapies || []),
    is_primary: input.isPrimary ?? (existingChild?.is_primary ?? true),
    updated_at: new Date().toISOString(),
  };

  const childQuery = existingChild
    ? supabase.from('children').update(payload).eq('id', existingChild.id).select('*').single()
    : supabase.from('children').insert(payload).select('*').single();

  const { data: child, error: childError } = await childQuery;
  if (childError || !child) {
    setWorkflowSyncStatus('childProfile', 'sync_failed');
    throw childError || new Error('Failed to save child profile.');
  }

  await supabase.from('profiles').upsert({
    id: userId,
    parent_name: input.parentName || null,
    child_name: input.childName,
    has_completed_onboarding: input.hasCompletedOnboarding ?? false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  setWorkflowSyncStatus('childProfile', 'synced');
  return child as Child;
}

export async function resumeConversation(params: {
  childId?: string;
  userId?: string;
}): Promise<ConversationRecord | null> {
  const userId = await getAuthenticatedUserId(params.userId);
  const child = await resolveWorkflowChild(userId, params.childId);
  const conversations = await listCanonicalConversations(userId, 20);

  if (child?.id) {
    return conversations.find((conversation) => conversation.childId === child.id) || null;
  }

  return conversations[0] || null;
}

export async function startConversation(params: {
  childId?: string;
  title?: string;
  userId?: string;
}): Promise<ConversationRecord> {
  const userId = await getAuthenticatedUserId(params.userId);
  const child = await resolveWorkflowChild(userId, params.childId);
  const conversation = await createCanonicalConversation(
    userId,
    child?.id,
    params.title || 'New Conversation',
  );

  await ensureLegacyConversationMirror({ aiConversation: conversation });
  return conversation;
}

export async function buildWorkflowMemoryContext(userId: string, childId?: string): Promise<string> {
  const child = await resolveWorkflowChild(userId, childId);
  if (!child) return '';

  const [facts, summaries] = await Promise.all([
    loadWorkflowMemoryFacts(userId, child.id, 8).catch(() => []),
    loadConversationSummaries(userId, child.id, 3).catch(() => []),
  ]);

  const lines: string[] = [];
  if (facts.length > 0) {
    lines.push('KNOWN FACTS:');
    facts.forEach((fact) => {
      lines.push(`- ${fact.category}: ${fact.value}`);
    });
  }

  if (summaries.length > 0) {
    lines.push('RECENT COACHING:');
    summaries.forEach((summary) => {
      lines.push(`- ${summary.summary}`);
    });
  }

  return lines.join('\n');
}

export async function appendMessage(params: {
  conversationId: string;
  role: MessageRecord['role'];
  content: string;
  metadata?: MessageMetadata;
  userId?: string;
  childId?: string;
}): Promise<WorkflowMessageAppendResult> {
  const userId = await getAuthenticatedUserId(params.userId);
  const child = await resolveWorkflowChild(userId, params.childId);
  const message = await saveCanonicalMessage(params.conversationId, params.role, params.content, params.metadata);
  const extractedFacts = params.role === 'user' ? extractFactsFromMessage(params.content, 'conversation') : [];

  if (child && extractedFacts.length > 0) {
    try {
      await upsertMemoryFacts(userId, child.id, extractedFacts);
    } catch (error) {
      console.warn('[caregiver-workflow] Failed to upsert memory facts:', error);
    }
  }

  const { conversation, messages } = await getCanonicalConversation(params.conversationId);
  if (!conversation) {
    return { message, extractedFacts };
  }

  await mirrorLegacyMessage({
    aiConversation: conversation,
    message,
    extractedFacts,
  }).catch((error) => {
    console.warn('[caregiver-workflow] Failed to mirror legacy message:', error);
  });

  let conversationSummary: ConversationSummary | undefined;
  if (child && messages.length >= 2) {
    try {
      conversationSummary = await getConversationMemory().summarizeConversation(
        conversation.id,
        messages.map((entry) => ({ role: entry.role, content: entry.content })),
        userId,
        child.id,
      );
    } catch (error) {
      console.warn('[caregiver-workflow] Failed to update conversation summary:', error);
    }
  }

  return {
    message,
    extractedFacts,
    conversationSummary,
  };
}

export async function getDailyPlan(params: {
  userId?: string;
  childId?: string;
  planDate?: string;
}): Promise<DailyPlanSnapshot | null> {
  const userId = await getAuthenticatedUserId(params.userId);
  const child = await resolveWorkflowChild(userId, params.childId);
  if (!child) return null;

  const planDate = normalizeIsoDate(params.planDate);
  const { data, error } = await supabase
    .from('daily_plan_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('child_id', child.id)
    .eq('plan_date', planDate)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDailyPlanSnapshotRow(data as Record<string, unknown>) : null;
}

function mapDailyPlanSnapshotRow(row: Record<string, unknown>): DailyPlanSnapshot {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    childId: String(row.child_id),
    planDate: normalizeIsoDate(String(row.plan_date)),
    version: Number(row.version || 1),
    status: (row.status || 'active') as DailyPlanSnapshot['status'],
    source: (row.source || 'generated') as DailyPlanSnapshot['source'],
    items: Array.isArray(row.items) ? row.items as DailyPlanItem[] : [],
    generatedFromGoalIds: Array.isArray(row.generated_from_goal_ids) ? row.generated_from_goal_ids as string[] : [],
    generatedFromMemoryFactIds: Array.isArray(row.generated_from_memory_fact_ids) ? row.generated_from_memory_fact_ids as string[] : [],
    generatedFromConversationSummaryIds: Array.isArray(row.generated_from_conversation_summary_ids) ? row.generated_from_conversation_summary_ids as string[] : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function generateDailyPlan(params: {
  userId?: string;
  childId?: string;
  planDate?: string;
  forceRegenerate?: boolean;
}): Promise<DailyPlanSnapshot> {
  const userId = await getAuthenticatedUserId(params.userId);
  const child = await resolveWorkflowChild(userId, params.childId);
  if (!child) {
    throw new Error('A child profile is required before generating a daily plan.');
  }

  const planDate = normalizeIsoDate(params.planDate);
  const existing = await getDailyPlan({ userId, childId: child.id, planDate });
  if (existing && !params.forceRegenerate) {
    return existing;
  }

  setWorkflowSyncStatus('dailyPlan', 'pending_sync');
  const [goals, memoryFacts, summaries] = await Promise.all([
    loadWorkflowGoals(userId, child.id),
    loadWorkflowMemoryFacts(userId, child.id).catch(() => []),
    loadConversationSummaries(userId, child.id).catch(() => []),
  ]);

  const generated = buildDailyPlanItems({
    childName: child.name,
    goals,
    memoryFacts,
    conversationSummaries: summaries,
  });

  const version = existing ? existing.version + 1 : 1;
  if (existing) {
    await supabase
      .from('daily_plan_snapshots')
      .update({ status: 'superseded', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  }

  const snapshotRow = {
    id: generateId('plan'),
    user_id: userId,
    child_id: child.id,
    plan_date: planDate,
    version,
    status: 'active',
    source: 'generated',
    items: generated.items,
    generated_from_goal_ids: generated.goalIds,
    generated_from_memory_fact_ids: generated.memoryFactIds,
    generated_from_conversation_summary_ids: generated.conversationSummaryIds,
  };

  const { data, error } = await supabase
    .from('daily_plan_snapshots')
    .insert(snapshotRow)
    .select('*')
    .single();

  if (error || !data) {
    setWorkflowSyncStatus('dailyPlan', 'sync_failed');
    throw error || new Error('Failed to save daily plan snapshot.');
  }

  setWorkflowSyncStatus('dailyPlan', 'synced');
  emitWorkflowEvent(WORKFLOW_EVENTS.dailyPlanUpdated, {
    userId,
    childId: child.id,
    snapshotId: String(data.id),
  });
  return mapDailyPlanSnapshotRow(data as Record<string, unknown>);
}

export async function getOrGenerateDailyPlan(params: {
  userId?: string;
  childId?: string;
  planDate?: string;
}): Promise<DailyPlanSnapshot | null> {
  const existing = await getDailyPlan(params);
  if (existing) return existing;
  return generateDailyPlan(params);
}

export async function completePlanItem(params: {
  snapshotId: string;
  itemId: string;
  userId?: string;
  notes?: string;
}): Promise<DailyPlanSnapshot> {
  const userId = await getAuthenticatedUserId(params.userId);
  setWorkflowSyncStatus('dailyPlan', 'pending_sync');

  const { data, error } = await supabase
    .from('daily_plan_snapshots')
    .select('*')
    .eq('id', params.snapshotId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    setWorkflowSyncStatus('dailyPlan', 'sync_failed');
    throw error || new Error('Daily plan snapshot not found.');
  }

  const snapshot = mapDailyPlanSnapshotRow(data as Record<string, unknown>);
  const updatedItems = snapshot.items.map((item) =>
    item.id === params.itemId
      ? { ...item, completed: true, completedAt: new Date().toISOString() }
      : item,
  );
  const updatedItem = updatedItems.find((item) => item.id === params.itemId);
  if (!updatedItem) {
    setWorkflowSyncStatus('dailyPlan', 'sync_failed');
    throw new Error('Plan item not found.');
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from('daily_plan_snapshots')
    .update({ items: updatedItems, updated_at: new Date().toISOString() })
    .eq('id', params.snapshotId)
    .select('*')
    .single();

  if (updateError || !updatedRow) {
    setWorkflowSyncStatus('dailyPlan', 'sync_failed');
    throw updateError || new Error('Failed to update daily plan snapshot.');
  }

  const completionRecord = {
    id: generateId('completion'),
    routine_id: params.itemId,
    routine_name: updatedItem.title,
    user_id: userId,
    child_id: snapshot.childId,
    scheduled_date: snapshot.planDate,
    started_at: updatedItem.completedAt,
    completed_at: updatedItem.completedAt,
    status: 'completed',
    completion_status: 'completed',
    steps_completed: 1,
    total_steps: 1,
    adherence_score: 100,
    notes: params.notes || null,
    plan_snapshot_id: snapshot.id,
    metadata: {
      source: 'daily_plan_snapshot',
      description: updatedItem.description,
      launchJuniorDomain: updatedItem.launchJuniorDomain,
    },
  };

  const { data: existingCompletion } = await supabase
    .from('routine_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_snapshot_id', snapshot.id)
    .eq('routine_id', params.itemId)
    .maybeSingle();

  if (existingCompletion?.id) {
    await supabase
      .from('routine_completions')
      .update(completionRecord)
      .eq('id', existingCompletion.id);
  } else {
    await supabase.from('routine_completions').insert(completionRecord);
  }

  setWorkflowSyncStatus('dailyPlan', 'synced');
  emitWorkflowEvent(WORKFLOW_EVENTS.dailyPlanUpdated, {
    userId,
    childId: snapshot.childId,
    snapshotId: snapshot.id,
    itemId: params.itemId,
  });
  return mapDailyPlanSnapshotRow(updatedRow as Record<string, unknown>);
}

export async function persistJuniorProgress(input: WorkflowJuniorProgressInput): Promise<void> {
  const userId = await getAuthenticatedUserId(input.userId);
  const child = await resolveWorkflowChild(userId, input.childId);
  if (!child) {
    setWorkflowSyncStatus('juniorProgress', 'local_only');
    return;
  }

  setWorkflowSyncStatus('juniorProgress', 'pending_sync');

  const { error } = await supabase.from('jr_sessions').insert({
    child_id: child.id,
    parent_id: userId,
    session_type: input.domain,
    activity_name: input.activityTitle,
    duration_seconds: input.durationSeconds,
    coins_earned: input.tokensEarned,
    completed: true,
    score: input.accuracy || null,
    data: {
      promptLevel: input.promptLevel,
      emotionBefore: input.emotionBefore,
      emotionAfter: input.emotionAfter,
      notes: input.notes,
      domain: input.domain,
      activityId: input.activityId,
      planSnapshotId: input.planSnapshotId,
      planItemId: input.planItemId,
    },
    started_at: input.completedAt,
    completed_at: input.completedAt,
  });

  if (error) {
    setWorkflowSyncStatus('juniorProgress', 'sync_failed');
    throw error;
  }

  setWorkflowSyncStatus('juniorProgress', 'synced');
  emitWorkflowEvent(WORKFLOW_EVENTS.juniorProgressUpdated, {
    userId,
    childId: child.id,
    snapshotId: input.planSnapshotId,
    itemId: input.planItemId,
  });
}

function mapCaregiverSummaryRow(row: Record<string, unknown>): CaregiverSummary {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    childId: String(row.child_id),
    periodStart: normalizeIsoDate(String(row.period_start)),
    periodEnd: normalizeIsoDate(String(row.period_end)),
    snapshot: row.snapshot as CaregiverSummarySnapshot,
    summaryText: String(row.summary_text),
    notes: typeof row.notes === 'string' ? row.notes : null,
    sourcePlanSnapshotIds: Array.isArray(row.source_plan_snapshot_ids) ? row.source_plan_snapshot_ids as string[] : [],
    sourceConversationSummaryIds: Array.isArray(row.source_conversation_summary_ids) ? row.source_conversation_summary_ids as string[] : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getLatestCaregiverSummary(params: {
  userId?: string;
  childId?: string;
  periodStart?: string;
  periodEnd?: string;
}): Promise<CaregiverSummary | null> {
  const userId = await getAuthenticatedUserId(params.userId);
  const child = await resolveWorkflowChild(userId, params.childId);
  if (!child) return null;

  let query = supabase
    .from('caregiver_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('child_id', child.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (params.periodStart) query = query.gte('period_start', normalizeIsoDate(params.periodStart));
  if (params.periodEnd) query = query.lte('period_end', normalizeIsoDate(params.periodEnd));

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapCaregiverSummaryRow(data as Record<string, unknown>) : null;
}

export async function generateCaregiverSummary(params: {
  userId?: string;
  childId?: string;
  periodStart?: string;
  periodEnd?: string;
  forceRegenerate?: boolean;
}): Promise<CaregiverSummary> {
  const userId = await getAuthenticatedUserId(params.userId);
  const child = await resolveWorkflowChild(userId, params.childId);
  if (!child) {
    throw new Error('A child profile is required before generating a caregiver summary.');
  }

  const periodEnd = normalizeIsoDate(params.periodEnd);
  const startDate = params.periodStart
    ? normalizeIsoDate(params.periodStart)
    : (() => {
        const date = new Date(`${periodEnd}T12:00:00.000Z`);
        date.setDate(date.getDate() - 6);
        return date.toISOString().split('T')[0];
      })();

  if (!params.forceRegenerate) {
    const existing = await getLatestCaregiverSummary({ userId, childId: child.id, periodStart: startDate, periodEnd });
    if (existing && existing.periodStart === startDate && existing.periodEnd === periodEnd) {
      return existing;
    }
  }

  setWorkflowSyncStatus('caregiverSummary', 'pending_sync');
  const [planRows, juniorRows, summaries] = await Promise.all([
    supabase
      .from('daily_plan_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('child_id', child.id)
      .gte('plan_date', startDate)
      .lte('plan_date', periodEnd)
      .eq('status', 'active')
      .order('plan_date', { ascending: false }),
    supabase
      .from('jr_sessions')
      .select('*')
      .eq('parent_id', userId)
      .eq('child_id', child.id)
      .gte('completed_at', `${startDate}T00:00:00.000Z`)
      .lte('completed_at', `${periodEnd}T23:59:59.999Z`)
      .order('completed_at', { ascending: false }),
    loadConversationSummaries(userId, child.id, 10),
  ]);

  if (planRows.error) {
    setWorkflowSyncStatus('caregiverSummary', 'sync_failed');
    throw planRows.error;
  }
  if (juniorRows.error) {
    setWorkflowSyncStatus('caregiverSummary', 'sync_failed');
    throw juniorRows.error;
  }

  const planSnapshots = (planRows.data || []).map((row) => mapDailyPlanSnapshotRow(row as Record<string, unknown>));
  const juniorSessions = (juniorRows.data || []).map((session: Record<string, unknown>) => ({
    id: String(session.id),
    activityName: String(session.activity_name || session.session_type || 'Activity'),
    domain: (((session.data as Record<string, unknown>)?.domain as WorkflowFocusDomain) || inferFocusDomain(String(session.session_type || ''))) as WorkflowFocusDomain,
    completedAt: String(session.completed_at || session.started_at || new Date().toISOString()),
    durationSeconds: Number(session.duration_seconds || 0),
    tokensEarned: Number(session.coins_earned || 0),
    accuracy: typeof session.score === 'number' ? session.score : null,
  }));

  const weeklySummary = buildCaregiverWeeklySummary({
    childName: child.name,
    planSnapshots,
    juniorSessions: juniorRows.data || [],
    conversationSummaries: summaries,
  });

  const snapshot: CaregiverSummarySnapshot = {
    generatedAt: new Date().toISOString(),
    child: {
      id: child.id,
      name: child.name,
      age: child.age_years,
      diagnoses: child.diagnoses || [],
      challenges: child.challenges || [],
      strengths: child.strengths || [],
    },
    period: {
      start: startDate,
      end: periodEnd,
    },
    plans: planSnapshots,
    juniorSessions,
    conversationSummaries: summaries.map((summary) => ({
      id: summary.id,
      summary: summary.summary,
      topics: summary.keyTopics,
      createdAt: summary.createdAt,
    })),
    weeklySummary,
  };

  const summaryText = [
    ...weeklySummary.highlights,
    ...weeklySummary.challenges,
    ...weeklySummary.recommendations,
  ].join(' ');

  const row = {
    id: generateId('caregiver-summary'),
    user_id: userId,
    child_id: child.id,
    period_start: startDate,
    period_end: periodEnd,
    snapshot,
    summary_text: summaryText || `Caregiver summary for ${child.name}`,
    notes: null,
    source_plan_snapshot_ids: uniqueStrings(planSnapshots.map((plan) => plan.id)),
    source_conversation_summary_ids: uniqueStrings(summaries.map((summary) => summary.id)),
  };

  const { data, error } = await supabase
    .from('caregiver_summaries')
    .insert(row)
    .select('*')
    .single();

  if (error || !data) {
    setWorkflowSyncStatus('caregiverSummary', 'sync_failed');
    throw error || new Error('Failed to save caregiver summary.');
  }

  setWorkflowSyncStatus('caregiverSummary', 'synced');
  emitWorkflowEvent(WORKFLOW_EVENTS.caregiverSummaryUpdated, {
    userId,
    childId: child.id,
    summaryId: String(data.id),
  });
  return mapCaregiverSummaryRow(data as Record<string, unknown>);
}

export async function exportCaregiverSummaryPdf(params: {
  userId?: string;
  childId?: string;
  summaryId?: string;
  periodStart?: string;
  periodEnd?: string;
} & WorkflowClinicalExportOptions): Promise<{
  summary: CaregiverSummary;
  reportData: ClinicalReportData;
  doc: ReturnType<typeof generateClinicalReportPDF>;
  filename: string;
}> {
  const userId = await getAuthenticatedUserId(params.userId);

  const summary: CaregiverSummary = params.summaryId
    ? await (async () => {
        const { data, error } = await supabase
          .from('caregiver_summaries')
          .select('*')
          .eq('id', params.summaryId)
          .eq('user_id', userId)
          .single();

        if (error || !data) throw error || new Error('Caregiver summary not found.');
        return mapCaregiverSummaryRow(data as Record<string, unknown>);
      })()
    : await generateCaregiverSummary({
        userId,
        childId: params.childId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      });

  const reportData = mapCaregiverSummaryToClinicalReportData(summary);
  const doc = generateClinicalReportPDF(
    reportData,
    params.sections || DEFAULT_SECTIONS,
    params.recipientType || 'pediatrician',
  );
  const dateStr = normalizeIsoDate(summary.periodEnd);
  const childSlug = summary.snapshot.child.name.replace(/\s+/g, '-');

  return {
    summary,
    reportData,
    doc,
    filename: `${childSlug}-Caregiver-Summary-${dateStr}.pdf`,
  };
}
