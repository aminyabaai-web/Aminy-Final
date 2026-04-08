// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Rich AI Context Builder
 *
 * Builds the comprehensive context that powers Aminy's intelligence.
 * Aggregates child profile, vault documents, daily plans, conversation
 * memory, Junior mode data, telehealth sessions, and parent profile
 * into a single rich context object used by all AI consumers.
 *
 * Extracted from aminy-ai-brain.ts during AI module consolidation.
 */

import { useAminyStore as store } from '../store';
import { supabase } from '../../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ChildContext {
  id: string;
  name: string;
  age: number;
  dateOfBirth?: string;
  concerns: string[];
  strengths: string[];
  diagnoses: string[];
  sensoryProfile: {
    seekers: string[];
    avoiders: string[];
  };
  communicationLevel: 'nonverbal' | 'emerging' | 'conversational';
  currentGoals: Goal[];
}

export interface Goal {
  id: string;
  area: 'communication' | 'social' | 'behavioral' | 'sensory' | 'adaptive' | 'academic';
  description: string;
  targetDate: string;
  progress: number; // 0-100
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  description: string;
  completed: boolean;
  dateCompleted?: string;
}

export interface VaultContext {
  evaluations: VaultDocument[];
  iepDocuments: VaultDocument[];
  progressReports: VaultDocument[];
  bcbaNotes: VaultDocument[];
  insuranceInfo: VaultDocument[];
  medicalRecords: VaultDocument[];
}

export interface VaultDocument {
  id: string;
  title: string;
  type: string;
  date: string;
  summary?: string;
  keyInsights?: string[];
}

export interface DailyPlanContext {
  currentWeek: WeeklyPlan;
  todaysFocus: Activity[];
  completedToday: Activity[];
  upcomingChallenges: string[];
}

export interface WeeklyPlan {
  weekOf: string;
  focus: string;
  routines: Routine[];
  activities: Activity[];
}

export interface Routine {
  id: string;
  name: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  steps: string[];
  successRate: number;
  lastModified: string;
}

export interface Activity {
  id: string;
  title: string;
  goalArea: string;
  duration: number;
  completed: boolean;
  childEngagement?: number;
  parentNotes?: string;
}

export interface ConversationMemory {
  conversations: BrainConversation[];
  commonQuestions: string[];
  parentConcerns: string[];
  successfulStrategies: Strategy[];
  challengingScenarios: Scenario[];
  onboardingConversation?: Array<{ role: string; content: string }>;
}

export interface BrainConversation {
  id: string;
  timestamp: string;
  messages: { role: 'parent' | 'ai'; content: string }[];
  topic: string;
  outcome?: string;
  followUpNeeded?: boolean;
}

export interface Strategy {
  id: string;
  description: string;
  context: string;
  effectiveness: number;
  usedCount: number;
}

export interface Scenario {
  id: string;
  description: string;
  frequency: number;
  lastOccurred: string;
  aiRecommendations: string[];
  whatWorked?: string[];
}

export interface JuniorModeContext {
  gamesPlayed: GameSession[];
  skillsPracticed: string[];
  emotionalRegulation: EmotionData[];
  communicationAttempts: number;
  successfulInteractions: number;
}

export interface GameSession {
  gameId: string;
  date: string;
  duration: number;
  skillsTargeted: string[];
  performanceScore: number;
  emotionalState: 'calm' | 'excited' | 'frustrated' | 'happy';
}

export interface EmotionData {
  timestamp: string;
  emotion: string;
  regulationStrategy: string;
  successful: boolean;
}

export interface TelehealthSessionData {
  sessionId: string;
  date: string;
  provider: string;
  duration: number;
  type: '50min' | '25min';
  topics: string[];
  observations: string;
  recommendations: string[];
  progressUpdates: {
    area: string;
    status: 'improved' | 'maintained' | 'needs_attention';
    notes: string;
  }[];
}

/**
 * The Unified AI Context — everything Aminy knows about this family
 */
export interface AminyAIContext {
  child: ChildContext;
  vault: VaultContext;
  dailyPlan: DailyPlanContext;
  memory: ConversationMemory;
  juniorMode: JuniorModeContext;
  telehealthSessions: TelehealthSessionData[];
  parentProfile: {
    name: string;
    relationshipToChild: string;
    primaryConcerns: string[];
    copingStrategies: string[];
    supportNeeds: string[];
    stressLevel?: number;
    availableMinutes?: number;
    supportSystem?: 'none' | 'some' | 'good' | 'strong';
    biggestConcern?: string;
  };
  tier: 'free' | 'core' | 'pro';
  clinicalData: {
    diagnosisHistory: string[];
    therapyHistory: string[];
    medicationHistory: string[];
    schoolSupports: string[];
  };
  childMentalHealth?: {
    moodScore: number;
    anxietyScore: number;
    safetyScore: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    concerns: string[];
    needsProfessional: boolean;
    needsImmediate: boolean;
  };
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Build complete AI context from current app state
 */
export async function buildAIContext(): Promise<AminyAIContext> {
  const state = store.getState();
  const children = state.children ?? [];
  const currentChild = state.currentChildId
    ? children.find((c: { id: string }) => c.id === state.currentChildId)
    : children[0];

  if (!currentChild) {
    throw new Error('No child profile found');
  }

  const childContext = await buildChildContext(currentChild);
  const vaultContext = await buildVaultContext(currentChild.id);
  const dailyPlanContext = await buildDailyPlanContext(currentChild.id);
  const memoryContext = await buildMemoryContext(currentChild.id);
  const juniorContext = await buildJuniorModeContext(currentChild.id);
  const telehealthContext = await buildTelehealthContext(currentChild.id);

  // Load onboarding data for memory continuity
  let onboardingContext: {
    initialConcern?: string;
    conversationSummary?: Array<{ role: string; content: string }>;
  } = {};

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_data')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_data) {
        onboardingContext = profile.onboarding_data;
      }
    }
  } catch (e) {
    console.error('Error loading onboarding context:', e);
  }

  const primaryConcerns = [
    ...(state.concerns || []),
    ...(onboardingContext.initialConcern ? [onboardingContext.initialConcern] : [])
  ].filter(Boolean);

  const enrichedMemory = {
    ...memoryContext,
    onboardingConversation: onboardingContext.conversationSummary || [],
  };

  return {
    child: childContext,
    vault: vaultContext,
    dailyPlan: dailyPlanContext,
    memory: enrichedMemory,
    juniorMode: juniorContext,
    telehealthSessions: telehealthContext,
    parentProfile: {
      name: state.parentName || 'Parent',
      relationshipToChild: 'Parent',
      primaryConcerns,
      copingStrategies: [],
      supportNeeds: []
    },
    tier: (state.selectedTier || 'core') as 'free' | 'core' | 'pro',
    clinicalData: {
      diagnosisHistory: childContext.diagnoses,
      therapyHistory: [],
      medicationHistory: [],
      schoolSupports: []
    }
  };
}

// ============================================================================
// Helper Builders
// ============================================================================

async function buildChildContext(child: {
  id: string;
  name: string;
  age?: number;
  challenges?: string[];
  strengths?: string[];
  diagnoses?: string[];
  sensoryProfile?: { seekers?: string[]; avoiders?: string[] };
  communicationLevel?: 'nonverbal' | 'emerging' | 'conversational';
  goals?: Goal[];
}): Promise<ChildContext> {
  return {
    id: child.id,
    name: child.name,
    age: child.age ?? 0,
    concerns: child.challenges || [],
    strengths: child.strengths || [],
    diagnoses: child.diagnoses || [],
    sensoryProfile: {
      seekers: child.sensoryProfile?.seekers || [],
      avoiders: child.sensoryProfile?.avoiders || []
    },
    communicationLevel: child.communicationLevel || 'conversational',
    currentGoals: child.goals || []
  };
}

async function buildVaultContext(childId: string): Promise<VaultContext> {
  let vaultData: VaultContext = {
    evaluations: [],
    iepDocuments: [],
    progressReports: [],
    bcbaNotes: [],
    insuranceInfo: [],
    medicalRecords: []
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: documents } = await supabase
        .from('vault_documents')
        .select('id, title, document_type, uploaded_at, ai_summary, key_insights')
        .eq('user_id', user.id)
        .eq('child_id', childId)
        .order('uploaded_at', { ascending: false })
        .limit(50);

      if (documents && documents.length > 0) {
        documents.forEach(doc => {
          const formattedDoc: VaultDocument = {
            id: doc.id,
            title: doc.title,
            type: doc.document_type,
            date: doc.uploaded_at,
            summary: doc.ai_summary,
            keyInsights: doc.key_insights || []
          };

          switch (doc.document_type) {
            case 'evaluation':
            case 'psychological_eval':
            case 'developmental_eval':
              vaultData.evaluations.push(formattedDoc);
              break;
            case 'iep':
            case 'ifsp':
              vaultData.iepDocuments.push(formattedDoc);
              break;
            case 'progress_report':
              vaultData.progressReports.push(formattedDoc);
              break;
            case 'bcba_notes':
            case 'therapy_notes':
              vaultData.bcbaNotes.push(formattedDoc);
              break;
            case 'insurance':
            case 'eob':
              vaultData.insuranceInfo.push(formattedDoc);
              break;
            case 'medical':
            case 'prescription':
              vaultData.medicalRecords.push(formattedDoc);
              break;
          }
        });
      }
    }
  } catch (e) {
    console.error('[AI Engine] Error loading vault from database:', e);
  }

  // Fall back to local store if database is empty
  if (vaultData.evaluations.length === 0) {
    const state = store.getState();
    const vault = state.vault || {};
    vaultData = {
      evaluations: (vault.evaluations || []) as VaultDocument[],
      iepDocuments: (vault.ieps || []) as VaultDocument[],
      progressReports: (vault.progressReports || []) as VaultDocument[],
      bcbaNotes: (vault.bcbaNotes || []) as VaultDocument[],
      insuranceInfo: (vault.insurance || []) as VaultDocument[],
      medicalRecords: (vault.medical || []) as VaultDocument[]
    };
  }

  return vaultData;
}

async function buildDailyPlanContext(_childId: string): Promise<DailyPlanContext> {
  const state = store.getState();
  const plan = state.weeklyPlan || {};

  return {
    currentWeek: plan as unknown as WeeklyPlan,
    todaysFocus: (plan.todayActivities || []) as Activity[],
    completedToday: (plan.completedActivities || []) as Activity[],
    upcomingChallenges: (plan.challenges || []) as string[]
  };
}

async function buildMemoryContext(_childId: string): Promise<ConversationMemory> {
  const state = store.getState();
  const conversations = (state.conversationHistory || []) as unknown as BrainConversation[];

  return {
    conversations,
    commonQuestions: extractCommonQuestions(conversations),
    parentConcerns: extractConcerns(conversations),
    successfulStrategies: extractStrategies(conversations),
    challengingScenarios: extractScenarios(conversations)
  };
}

async function buildJuniorModeContext(_childId: string): Promise<JuniorModeContext> {
  const state = store.getState();
  const jrData = state.juniorModeData || {};

  return {
    gamesPlayed: (jrData.sessions || []) as GameSession[],
    skillsPracticed: (jrData.skillsPracticed || []) as string[],
    emotionalRegulation: (jrData.emotions || []) as EmotionData[],
    communicationAttempts: jrData.communicationAttempts || 0,
    successfulInteractions: jrData.successfulInteractions || 0
  };
}

async function buildTelehealthContext(_childId: string): Promise<TelehealthSessionData[]> {
  const state = store.getState();
  const sessions = state.sessions || [];

  return sessions
    .filter((s: { type?: string; status?: string; summary?: unknown }) =>
      s.type === 'telehealth' && s.status === 'completed' && s.summary
    )
    .map((session: { id: string; scheduledAt: string; duration: number; summary?: unknown }) => {
      try {
        const summaryData = typeof session.summary === 'string'
          ? JSON.parse(session.summary)
          : session.summary;

        return {
          sessionId: session.id,
          date: session.scheduledAt,
          provider: summaryData.provider || 'Provider',
          duration: session.duration,
          type: session.duration === 50 ? '50min' as const : '25min' as const,
          topics: summaryData.topics || [],
          observations: summaryData.observations || '',
          recommendations: summaryData.recommendations || [],
          progressUpdates: summaryData.progressUpdates || []
        };
      } catch (e) {
        console.error('Error parsing session summary:', e);
        return null;
      }
    })
    .filter(Boolean) as TelehealthSessionData[];
}

// ============================================================================
// Extraction Helpers
// ============================================================================

function extractCommonQuestions(conversations: BrainConversation[]): string[] {
  const questions: Map<string, number> = new Map();

  conversations.forEach(conv => {
    conv.messages
      .filter(m => m.role === 'parent' && m.content.includes('?'))
      .forEach(m => {
        questions.set(m.content, (questions.get(m.content) || 0) + 1);
      });
  });

  return Array.from(questions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([q]) => q);
}

function extractConcerns(conversations: BrainConversation[]): string[] {
  const concernKeywords = ['worried', 'struggling', 'difficult', 'hard', 'help', 'concern'];
  const concerns: string[] = [];

  conversations.forEach(conv => {
    conv.messages
      .filter(m => m.role === 'parent')
      .forEach(m => {
        if (concernKeywords.some(kw => m.content.toLowerCase().includes(kw))) {
          concerns.push(m.content);
        }
      });
  });

  return concerns.slice(0, 20);
}

function extractStrategies(conversations: BrainConversation[]): Strategy[] {
  const strategies: Strategy[] = [];

  conversations.forEach(conv => {
    if (conv.outcome === 'positive' || conv.outcome === 'helpful') {
      const aiMessages = conv.messages.filter(m => m.role === 'ai');
      aiMessages.forEach((msg, idx) => {
        strategies.push({
          id: `${conv.id}-${idx}`,
          description: msg.content,
          context: conv.topic,
          effectiveness: 4,
          usedCount: 1
        });
      });
    }
  });

  return strategies;
}

function extractScenarios(conversations: BrainConversation[]): Scenario[] {
  const scenarioMap: Map<string, Scenario> = new Map();

  conversations.forEach(conv => {
    const key = conv.topic;
    if (scenarioMap.has(key)) {
      const existing = scenarioMap.get(key)!;
      existing.frequency++;
      existing.lastOccurred = conv.timestamp;
    } else {
      scenarioMap.set(key, {
        id: key,
        description: conv.topic,
        frequency: 1,
        lastOccurred: conv.timestamp,
        aiRecommendations: [],
        whatWorked: []
      });
    }
  });

  return Array.from(scenarioMap.values())
    .sort((a, b) => b.frequency - a.frequency);
}
