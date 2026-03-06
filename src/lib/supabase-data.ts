/**
 * Supabase Data Service
 *
 * The bridge between the frontend Zustand store and the real Supabase backend.
 * This module replaces demo/mock data with real CRUD operations.
 *
 * Tables that exist in Supabase:
 *   profiles, children, conversations, messages, screening_results,
 *   treatment_goals, provider_profiles, provider_sessions,
 *   usage_tracking, stripe_customers, kv_store_8a022548,
 *   community_posts, community_comments, push_subscriptions, waitlist
 *
 * Usage:
 *   import { dataService } from '../lib/supabase-data';
 *   const profile = await dataService.getProfile();
 *   await dataService.saveChild({ name: 'Emma', ... });
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Validation Helpers (lightweight, no Zod dependency)
// ============================================================================

const MAX_STRING_LENGTH = 10_000; // 10KB max for any text field
const MAX_ARRAY_LENGTH = 100;     // Max items in any array field
const MAX_CONTENT_LENGTH = 50_000; // 50KB max for message content

class DataServiceError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly code?: string,
    public readonly isValidation: boolean = false,
  ) {
    super(message);
    this.name = 'DataServiceError';
  }
}

function validateString(value: unknown, fieldName: string, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== 'string') throw new DataServiceError(`${fieldName} must be a string`, 'validation', undefined, true);
  if (value.length > maxLength) throw new DataServiceError(`${fieldName} exceeds maximum length (${maxLength})`, 'validation', undefined, true);
  return value;
}

function validateStringArray(value: unknown, fieldName: string, maxItems = MAX_ARRAY_LENGTH): string[] {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw new DataServiceError(`${fieldName} exceeds maximum items (${maxItems})`, 'validation', undefined, true);
  return value.filter(v => typeof v === 'string').map(v => v.slice(0, MAX_STRING_LENGTH));
}

/** Wraps a Supabase operation with consistent error handling */
async function withErrorHandling<T>(
  operation: string,
  fn: () => PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>,
  fallback: T,
): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      const err = new DataServiceError(error.message, operation, error.code);
      console.error(`[DataService] ${operation}:`, error.message);
      // Dispatch a custom event so UI can show toast notifications
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dataservice:error', {
          detail: { operation, message: error.message, code: error.code },
        }));
      }
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    if (err instanceof DataServiceError && err.isValidation) throw err; // Re-throw validation errors
    console.error(`[DataService] ${operation} unexpected:`, err);
    return fallback;
  }
}

// ============================================================================
// Types (matching Supabase schema)
// ============================================================================

export interface Profile {
  id: string;
  parent_name: string | null;
  child_name: string | null;
  relationship: string | null;
  state: string | null;
  tier: 'free' | 'starter' | 'basic' | 'core' | 'pro' | 'proplus';
  role: 'parent' | 'provider' | 'admin';
  has_completed_onboarding: boolean;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  date_of_birth: string | null;
  age_years: number | null;
  gender: string | null;
  diagnoses: string[];
  communication_level: string | null;
  sensory_sensitivities: string[];
  strengths: string[];
  challenges: string[];
  current_therapies: string[];
  school_info: Record<string, unknown>;
  avatar_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  child_id: string | null;
  title: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  tokens_used: number;
  created_at: string;
}

export interface ScreeningResult {
  id: string;
  user_id: string;
  child_id: string | null;
  instrument_id: string;
  instrument_name: string;
  answers: Record<string, unknown>;
  total_score: number;
  risk_level: string;
  summary: string;
  next_steps: string[];
  child_age_months: number | null;
  completed_at: string;
  created_at: string;
}

export interface TreatmentGoal {
  id: string;
  user_id: string;
  child_id: string | null;
  title: string;
  description: string | null;
  domain: string | null;
  baseline: number;
  current: number;
  target: number;
  trend_direction: 'improving' | 'stable' | 'declining';
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Auth Helpers
// ============================================================================

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ============================================================================
// Profile Operations
// ============================================================================

async function getProfile(): Promise<Profile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  return withErrorHandling('getProfile', () =>
    supabase.from('profiles').select('*').eq('id', userId).single(),
    null,
  );
}

async function updateProfile(updates: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile | null> {
  const userId = await requireAuth();

  return withErrorHandling('updateProfile', () =>
    supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId).select().single(),
    null,
  );
}

// ============================================================================
// Children Operations
// ============================================================================

async function getChildren(): Promise<Child[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  return withErrorHandling('getChildren', () =>
    supabase.from('children').select('*').eq('parent_id', userId).order('is_primary', { ascending: false }),
    [] as Child[],
  );
}

async function getPrimaryChild(): Promise<Child | null> {
  const children = await getChildren();
  return children.find(c => c.is_primary) ?? children[0] ?? null;
}

async function saveChild(child: Partial<Omit<Child, 'id' | 'parent_id' | 'created_at' | 'updated_at'>> & { name: string }): Promise<Child | null> {
  const userId = await requireAuth();

  // Validate user input
  const validatedName = validateString(child.name, 'name', 200);
  const validatedDiagnoses = validateStringArray(child.diagnoses, 'diagnoses', 50);
  const validatedSensory = validateStringArray(child.sensory_sensitivities, 'sensory_sensitivities', 50);
  const validatedStrengths = validateStringArray(child.strengths, 'strengths', 50);
  const validatedChallenges = validateStringArray(child.challenges, 'challenges', 50);
  const validatedTherapies = validateStringArray(child.current_therapies, 'current_therapies', 50);

  return withErrorHandling('saveChild', () =>
    supabase
      .from('children')
      .insert({
        parent_id: userId,
        ...child,
        name: validatedName,
        diagnoses: validatedDiagnoses,
        sensory_sensitivities: validatedSensory,
        strengths: validatedStrengths,
        challenges: validatedChallenges,
        current_therapies: validatedTherapies,
        is_primary: child.is_primary ?? true,
      })
      .select()
      .single(),
    null as Child | null,
  );
}

async function updateChild(childId: string, updates: Partial<Omit<Child, 'id' | 'parent_id' | 'created_at'>>): Promise<Child | null> {
  // Validate any string arrays in updates
  if (updates.name) validateString(updates.name, 'name', 200);
  if (updates.diagnoses) updates.diagnoses = validateStringArray(updates.diagnoses, 'diagnoses', 50);
  if (updates.sensory_sensitivities) updates.sensory_sensitivities = validateStringArray(updates.sensory_sensitivities, 'sensory_sensitivities', 50);
  if (updates.strengths) updates.strengths = validateStringArray(updates.strengths, 'strengths', 50);
  if (updates.challenges) updates.challenges = validateStringArray(updates.challenges, 'challenges', 50);

  return withErrorHandling('updateChild', () =>
    supabase.from('children').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', childId).select().single(),
    null,
  );
}

// ============================================================================
// Conversations & Messages
// ============================================================================

async function getConversations(limit = 20): Promise<Conversation[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  return withErrorHandling('getConversations', () =>
    supabase.from('conversations').select('*').eq('user_id', userId).eq('archived', false).order('updated_at', { ascending: false }).limit(limit),
    [] as Conversation[],
  );
}

async function createConversation(title?: string, childId?: string): Promise<Conversation | null> {
  const userId = await requireAuth();
  if (title) validateString(title, 'conversation title', 500);

  return withErrorHandling('createConversation', () =>
    supabase.from('conversations').insert({ user_id: userId, child_id: childId, title: title || 'New conversation' }).select().single(),
    null,
  );
}

async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  return withErrorHandling('getMessages', () =>
    supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(limit),
    [] as Message[],
  );
}

async function saveMessage(conversationId: string, role: Message['role'], content: string, metadata?: Record<string, unknown>): Promise<Message | null> {
  // Validate content length
  validateString(content, 'message content', MAX_CONTENT_LENGTH);
  validateString(conversationId, 'conversationId', 100);
  if (!['user', 'assistant', 'system'].includes(role)) {
    throw new DataServiceError(`Invalid message role: ${role}`, 'saveMessage', undefined, true);
  }

  const result = await withErrorHandling('saveMessage', () =>
    supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: metadata || {},
      })
      .select()
      .single(),
    null as Message | null,
  );

  if (result) {
    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  return result;
}

// ============================================================================
// Screening Results (Supabase persistence)
// ============================================================================

async function saveScreeningResult(result: Omit<ScreeningResult, 'id' | 'user_id' | 'created_at'>): Promise<ScreeningResult | null> {
  const userId = await requireAuth();
  validateString(result.instrument_id, 'instrument_id', 200);
  validateString(result.summary, 'summary', MAX_STRING_LENGTH);

  return withErrorHandling('saveScreeningResult', () =>
    supabase.from('screening_results').insert({ user_id: userId, ...result }).select().single(),
    null,
  );
}

async function getScreeningResults(): Promise<ScreeningResult[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  return withErrorHandling('getScreeningResults', () =>
    supabase.from('screening_results').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
    [] as ScreeningResult[],
  );
}

// ============================================================================
// Treatment Goals
// ============================================================================

async function getTreatmentGoals(childId?: string): Promise<TreatmentGoal[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  let query = supabase
    .from('treatment_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (childId) {
    query = query.eq('child_id', childId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[DataService] getTreatmentGoals:', error.message);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dataservice:error', {
        detail: { operation: 'getTreatmentGoals', message: error.message, code: error.code },
      }));
    }
    return [];
  }
  return data || [];
}

async function saveTreatmentGoal(goal: Omit<TreatmentGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<TreatmentGoal | null> {
  const userId = await requireAuth();
  validateString(goal.title, 'goal title', 500);

  return withErrorHandling('saveTreatmentGoal', () =>
    supabase.from('treatment_goals').insert({ user_id: userId, ...goal }).select().single(),
    null,
  );
}

async function updateTreatmentGoal(goalId: string, updates: Partial<Omit<TreatmentGoal, 'id' | 'user_id' | 'created_at'>>): Promise<TreatmentGoal | null> {
  if (updates.title) validateString(updates.title, 'goal title', 500);

  return withErrorHandling('updateTreatmentGoal', () =>
    supabase.from('treatment_goals').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', goalId).select().single(),
    null,
  );
}

// ============================================================================
// Usage Tracking (for rate limiting / analytics)
// ============================================================================

async function getDailyUsage(): Promise<{ message_count: number; tokens_used: number } | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('message_count, tokens_used')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.warn('[DataService] getDailyUsage error:', error.message);
  }
  return data || { message_count: 0, tokens_used: 0 };
}

async function incrementUsage(tokensUsed: number = 0): Promise<void> {
  const userId = await requireAuth();
  const today = new Date().toISOString().split('T')[0];

  // Upsert: create or increment
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_date: today,
    p_tokens: tokensUsed,
  });

  // If RPC doesn't exist, fall back to manual upsert
  if (error) {
    const existing = await getDailyUsage();
    if (existing && existing.message_count > 0) {
      await supabase
        .from('usage_tracking')
        .update({
          message_count: existing.message_count + 1,
          tokens_used: existing.tokens_used + tokensUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          date: today,
          message_count: 1,
          tokens_used: tokensUsed,
        });
    }
  }
}

// ============================================================================
// Store Sync (hydrate Zustand from Supabase on login)
// ============================================================================

export interface HydratedUserData {
  profile: Profile;
  children: Child[];
  primaryChild: Child | null;
  screenings: ScreeningResult[];
  goals: TreatmentGoal[];
  conversations: Conversation[];
  usage: { message_count: number; tokens_used: number };
}

async function hydrateUserData(): Promise<HydratedUserData | null> {
  const profile = await getProfile();
  if (!profile) return null;

  // Fetch all user data in parallel
  const [children, screenings, goals, conversations, usage] = await Promise.all([
    getChildren(),
    getScreeningResults(),
    getTreatmentGoals(),
    getConversations(10),
    getDailyUsage(),
  ]);

  const primaryChild = children.find(c => c.is_primary) ?? children[0] ?? null;

  return {
    profile,
    children,
    primaryChild,
    screenings,
    goals,
    conversations,
    usage: usage || { message_count: 0, tokens_used: 0 },
  };
}

// ============================================================================
// Auth State Listener
// ============================================================================

type AuthCallback = (userId: string | null) => void;
let authListeners: AuthCallback[] = [];

function onAuthChange(callback: AuthCallback): () => void {
  authListeners.push(callback);

  // Set up Supabase auth listener (only once)
  if (authListeners.length === 1) {
    supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      authListeners.forEach(cb => cb(userId));
    });
  }

  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

// ============================================================================
// Export unified service
// ============================================================================

export { DataServiceError };

export const dataService = {
  // Auth
  getCurrentUserId,
  onAuthChange,

  // Profile
  getProfile,
  updateProfile,

  // Children
  getChildren,
  getPrimaryChild,
  saveChild,
  updateChild,

  // Conversations
  getConversations,
  createConversation,
  getMessages,
  saveMessage,

  // Screenings
  saveScreeningResult,
  getScreeningResults,

  // Treatment Goals
  getTreatmentGoals,
  saveTreatmentGoal,
  updateTreatmentGoal,

  // Usage
  getDailyUsage,
  incrementUsage,

  // Hydration
  hydrateUserData,
};
