// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Artifacts System (Bevel Files-style)
 *
 * When the AI generates something substantial — a care plan, behavior chart,
 * insurance appeal letter, progress summary, home activity guide — it becomes
 * a persistent, editable "artifact" that lives in the app as a reusable document.
 *
 * Unlike chat messages that scroll away, artifacts are saved, searchable,
 * shareable, and versioned. They bridge the gap between "the AI told me
 * something useful" and "I can find and use it later."
 *
 * Bevel does this with health reports and nutrition plans. We do it with:
 * - Weekly care plan summaries
 * - Behavior intervention quick-guides
 * - Insurance appeal letters
 * - Session summaries for providers
 * - Home activity guides per domain
 * - IEP meeting prep sheets
 * - Progress reports for pediatricians
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ArtifactType =
  | 'care-plan'           // Weekly personalized care plan
  | 'behavior-guide'      // Quick-reference for a specific behavior
  | 'appeal-letter'       // Insurance appeal document
  | 'session-summary'     // Post-session summary for parent or provider
  | 'home-activities'     // Domain-specific home activity guide
  | 'iep-prep'            // IEP meeting preparation sheet
  | 'progress-report'     // Progress report for pediatrician/school
  | 'trigger-map'         // Visual map of known triggers + strategies
  | 'routine-guide'       // Morning/bedtime/transition routine guide
  | 'medication-summary'  // Current medications with notes
  | 'provider-letter'     // Letter to/from provider
  | 'custom';             // User-requested custom document

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string; // Markdown or structured content
  createdAt: string;
  updatedAt: string;
  createdBy: 'ai' | 'user' | 'provider';
  childId?: string;
  version: number;
  isPinned: boolean;
  isShared: boolean;
  sharedWith?: string[]; // provider IDs
  tags: string[];
  sourceConversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ArtifactTemplate {
  type: ArtifactType;
  title: string;
  description: string;
  icon: string;
  promptTemplate: string;
  requiredContext: string[];
}

// ─── Artifact Templates ─────────────────────────────────────────────

export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  {
    type: 'care-plan',
    title: 'Weekly Care Plan',
    description: 'Personalized focus areas, home activities, and provider updates',
    icon: 'clipboard-list',
    promptTemplate: 'Generate a weekly care plan for {childName} based on their current goals, recent session notes, and home activity data.',
    requiredContext: ['childProfile', 'goals', 'recentSessions'],
  },
  {
    type: 'behavior-guide',
    title: 'Behavior Quick Guide',
    description: 'What to do when a specific behavior happens',
    icon: 'book-open',
    promptTemplate: 'Create a quick-reference guide for handling {behavior} with {childName}. Include: what it looks like, possible triggers, in-the-moment strategies, and prevention tips.',
    requiredContext: ['childProfile', 'triggers'],
  },
  {
    type: 'appeal-letter',
    title: 'Insurance Appeal Letter',
    description: 'Professional appeal letter for denied claims',
    icon: 'file-text',
    promptTemplate: 'Generate an insurance appeal letter for {childName}\'s denied {serviceType} claim. Include clinical justification and supporting documentation checklist.',
    requiredContext: ['childProfile', 'denialDetails', 'insurancePlan'],
  },
  {
    type: 'home-activities',
    title: 'Home Activity Guide',
    description: 'Activities parents can do at home for a specific domain',
    icon: 'home',
    promptTemplate: 'Create a home activity guide for {domain} skills for {childName} (age {childAge}). Include 5-7 activities that take 5-15 minutes each.',
    requiredContext: ['childProfile', 'goals'],
  },
  {
    type: 'iep-prep',
    title: 'IEP Meeting Prep',
    description: 'Everything you need for your next IEP meeting',
    icon: 'users',
    promptTemplate: 'Help prepare for {childName}\'s IEP meeting. Include: current goals and progress, questions to ask, accommodations to request, and data to bring.',
    requiredContext: ['childProfile', 'goals', 'schoolInfo'],
  },
  {
    type: 'progress-report',
    title: 'Progress Report',
    description: 'Shareable progress summary for pediatricians or school',
    icon: 'trending-up',
    promptTemplate: 'Generate a progress report for {childName} covering the last {period}. Include: goal progress, behavioral trends, session attendance, and recommendations.',
    requiredContext: ['childProfile', 'goals', 'recentSessions'],
  },
  {
    type: 'trigger-map',
    title: 'Trigger & Strategy Map',
    description: 'Visual map of triggers and what works',
    icon: 'map',
    promptTemplate: 'Create a trigger and strategy map for {childName} based on known triggers, effective strategies, and patterns from incident logs.',
    requiredContext: ['childProfile', 'triggers', 'strategies'],
  },
  {
    type: 'routine-guide',
    title: 'Routine Guide',
    description: 'Step-by-step guide for daily routines',
    icon: 'clock',
    promptTemplate: 'Create a {routineType} routine guide for {childName}. Include visual schedule steps, transition tips, and timing suggestions.',
    requiredContext: ['childProfile', 'routines'],
  },
];

// ─── Artifact Detection ─────────────────────────────────────────────

/**
 * Detect if an AI response should generate an artifact.
 * Called after every AI response in the chat pipeline.
 */
export function shouldCreateArtifact(aiResponse: string): {
  shouldCreate: boolean;
  suggestedType?: ArtifactType;
  suggestedTitle?: string;
} {
  const lower = aiResponse.toLowerCase();
  const length = aiResponse.length;

  // Long, structured responses (>500 chars with headers/lists) are artifact candidates
  const hasStructure = (aiResponse.match(/^[#*\-\d]|\n[#*\-\d]/gm) || []).length >= 3;
  const isSubstantial = length > 500;

  if (!isSubstantial || !hasStructure) {
    return { shouldCreate: false };
  }

  // Detect type from content
  if (/care\s*plan|weekly\s*plan|this\s*week.*focus/i.test(lower)) {
    return { shouldCreate: true, suggestedType: 'care-plan', suggestedTitle: 'Weekly Care Plan' };
  }
  if (/appeal|denied|denial|claim.*denied/i.test(lower)) {
    return { shouldCreate: true, suggestedType: 'appeal-letter', suggestedTitle: 'Insurance Appeal Letter' };
  }
  if (/iep|individualized\s*education|accommodation/i.test(lower)) {
    return { shouldCreate: true, suggestedType: 'iep-prep', suggestedTitle: 'IEP Meeting Prep' };
  }
  if (/routine|morning\s*routine|bedtime\s*routine|schedule/i.test(lower)) {
    return { shouldCreate: true, suggestedType: 'routine-guide', suggestedTitle: 'Routine Guide' };
  }
  if (/trigger|strategy|when.*happens|what\s*to\s*do/i.test(lower)) {
    return { shouldCreate: true, suggestedType: 'behavior-guide', suggestedTitle: 'Behavior Quick Guide' };
  }
  if (/activities?\s*(?:at\s*home|to\s*try|for\s*parents)/i.test(lower)) {
    return { shouldCreate: true, suggestedType: 'home-activities', suggestedTitle: 'Home Activity Guide' };
  }
  if (/progress\s*report|summary.*(?:month|week)/i.test(lower)) {
    return { shouldCreate: true, suggestedType: 'progress-report', suggestedTitle: 'Progress Report' };
  }

  // Generic long structured response
  if (isSubstantial && hasStructure && length > 800) {
    return { shouldCreate: true, suggestedType: 'custom', suggestedTitle: 'Saved from Aminy AI' };
  }

  return { shouldCreate: false };
}

/**
 * Create an artifact from an AI response
 */
export function createArtifactFromResponse(
  aiResponse: string,
  type: ArtifactType,
  title: string,
  childId?: string,
  conversationId?: string
): Artifact {
  return {
    id: `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type,
    title,
    content: aiResponse,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'ai',
    childId,
    version: 1,
    isPinned: false,
    isShared: false,
    tags: [type],
    sourceConversationId: conversationId,
  };
}

/**
 * Persist artifact to Supabase
 */
export async function saveArtifact(
  artifact: Artifact,
  userId: string
): Promise<void> {
  const { supabase } = await import('../utils/supabase/client');

  await supabase.from('ai_artifacts').insert({
    id: artifact.id,
    user_id: userId,
    child_id: artifact.childId,
    type: artifact.type,
    title: artifact.title,
    content: artifact.content,
    created_by: artifact.createdBy,
    version: artifact.version,
    is_pinned: artifact.isPinned,
    is_shared: artifact.isShared,
    shared_with: artifact.sharedWith || [],
    tags: artifact.tags,
    source_conversation_id: artifact.sourceConversationId,
    metadata: artifact.metadata || {},
    created_at: artifact.createdAt,
    updated_at: artifact.updatedAt,
  });
}

/**
 * Load artifacts for a user/child
 */
export async function loadArtifacts(
  userId: string,
  childId?: string,
  type?: ArtifactType
): Promise<Artifact[]> {
  const { supabase } = await import('../utils/supabase/client');

  let query = supabase
    .from('ai_artifacts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (childId) query = query.eq('child_id', childId);
  if (type) query = query.eq('type', type);

  const { data } = await query.limit(50);

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    type: row.type as ArtifactType,
    title: row.title as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as 'ai' | 'user' | 'provider',
    childId: row.child_id as string | undefined,
    version: row.version as number,
    isPinned: row.is_pinned as boolean,
    isShared: row.is_shared as boolean,
    sharedWith: row.shared_with as string[] | undefined,
    tags: row.tags as string[],
    sourceConversationId: row.source_conversation_id as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
  }));
}
