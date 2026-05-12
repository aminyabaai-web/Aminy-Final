// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Chat-to-Data Pipeline (Bevel-style)
 *
 * When a parent or provider tells the AI something in conversation,
 * this system extracts structured data and routes it to the appropriate
 * data store — not just memory, but actual app records.
 *
 * Examples:
 * - "He had a meltdown at Target today" → creates incident log entry
 * - "We started melatonin 3mg" → adds to medication tracker
 * - "His BCBA said he's mastering transitions" → updates goal progress
 * - "We have BCBS, member ID XYZ123" → populates insurance profile
 * - "Bedtime has been 8:30pm this week" → updates routine data
 * - "He weighs 45 pounds now" → updates child profile
 *
 * This is what makes Aminy feel alive — the AI isn't just answering
 * questions, it's actively building your child's profile from conversation.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type DataCategory =
  | 'incident'         // Behavioral incident → incident log
  | 'medication'       // Medication info → medication tracker
  | 'goal-progress'    // Treatment goal update → goals dashboard
  | 'insurance'        // Insurance details → benefits profile
  | 'routine'          // Daily routine info → routine tracker
  | 'trigger'          // Known trigger → child profile
  | 'strategy'         // What works → care plan
  | 'appointment'      // Upcoming appointment → calendar
  | 'provider-note'    // Clinical observation → session notes
  | 'child-profile'    // Demographics, weight, diagnosis → profile
  | 'preference'       // Likes, dislikes, sensory → profile
  | 'milestone'        // Achievement → progress timeline
  | 'concern'          // Parent concern → AI context
  | 'school'           // School info, IEP → vault
  | 'diet';            // Food/nutrition → child profile

export interface ExtractedDataPoint {
  category: DataCategory;
  confidence: number; // 0-1
  rawText: string;
  structuredData: Record<string, unknown>;
  suggestedAction: string;
  requiresConfirmation: boolean;
}

export interface DataRoutingResult {
  extracted: ExtractedDataPoint[];
  persisted: string[];
  pendingConfirmation: ExtractedDataPoint[];
  toast?: string;
}

// ─── Extraction Patterns ────────────────────────────────────────────

interface ExtractionPattern {
  category: DataCategory;
  patterns: RegExp[];
  extractor: (text: string, match: RegExpMatchArray) => Record<string, unknown>;
  action: string;
  needsConfirmation: boolean;
}

const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  // Behavioral incidents
  {
    category: 'incident',
    patterns: [
      /(?:had|has|having)\s+(?:a\s+)?(?:meltdown|tantrum|outburst|episode|breakdown|crisis)/i,
      /(?:hit|bit|kicked|threw|screamed|eloped|ran\s+away|bolted)/i,
      /(?:meltdown|tantrum|outburst)\s+(?:at|in|during|before|after)\s+(.+)/i,
    ],
    extractor: (text) => ({
      type: 'behavioral',
      description: text.substring(0, 200),
      severity: /crisis|emergency|hurt|danger/i.test(text) ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
    }),
    action: 'Log this in your incident tracker?',
    needsConfirmation: true,
  },

  // Medications
  {
    category: 'medication',
    patterns: [
      /(?:started|taking|prescribed|on)\s+(\w+)\s+(\d+\.?\d*)\s*(?:mg|ml|mcg)/i,
      /(?:melatonin|ritalin|adderall|concerta|strattera|guanfacine|risperidone|abilify|prozac|zoloft|lexapro)\s*(\d+\.?\d*)?\s*(?:mg)?/i,
      /(?:stopped|quit|discontinued|off)\s+(\w+)/i,
    ],
    extractor: (text, match) => ({
      name: match[1] || 'Unknown',
      dosage: match[2] || '',
      action: /stop|quit|discontinu|off/i.test(text) ? 'discontinued' : 'started',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Add this to medication tracker?',
    needsConfirmation: true,
  },

  // Goal progress
  {
    category: 'goal-progress',
    patterns: [
      /(?:mastering|mastered|improving|improved|progressing|progress)\s+(?:on|in|at|with)\s+(.+)/i,
      /(?:BCBA|therapist|provider|teacher)\s+said\s+(.+)/i,
      /(?:can\s+now|finally|started)\s+(.+)(?:independently|on\s+(?:his|her|their)\s+own)/i,
    ],
    extractor: (text, match) => ({
      goalArea: match[1]?.trim().substring(0, 100) || '',
      status: /master/i.test(text) ? 'mastered' : 'improving',
      source: /BCBA|therapist|provider/i.test(text) ? 'provider-reported' : 'parent-reported',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Update goal progress?',
    needsConfirmation: false,
  },

  // Insurance info
  {
    category: 'insurance',
    patterns: [
      /(?:have|on|insurance\s+is|plan\s+is|covered\s+by)\s+(?:BCBS|Blue\s+Cross|UHC|United|Aetna|Cigna|AHCCCS|Medicaid|Kaiser|Anthem|Humana|Tricare)/i,
      /member\s+(?:id|number|#)\s*(?:is\s+)?([A-Z0-9]+)/i,
      /group\s+(?:number|#|id)\s*(?:is\s+)?([A-Z0-9]+)/i,
    ],
    extractor: (text, match) => ({
      planName: (text.match(/BCBS|Blue\s+Cross|UHC|United|Aetna|Cigna|AHCCCS|Medicaid|Kaiser|Anthem|Humana|Tricare/i) || [''])[0],
      memberId: match[1] || '',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Save to your insurance profile?',
    needsConfirmation: true,
  },

  // Routine updates
  {
    category: 'routine',
    patterns: [
      /bedtime\s+(?:is|has\s+been|changed\s+to|now)\s+(?:around\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
      /wake(?:s)?\s+up\s+(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
      /(?:nap|naps)\s+(?:at|from|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
      /(?:school|class)\s+(?:starts|begins|is)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    ],
    extractor: (text, match) => ({
      routineType: /bedtime/i.test(text) ? 'bedtime'
        : /wake/i.test(text) ? 'wakeup'
        : /nap/i.test(text) ? 'nap'
        : 'school',
      time: match[1] || '',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Update daily routine?',
    needsConfirmation: false,
  },

  // Triggers
  {
    category: 'trigger',
    patterns: [
      /(?:trigger|triggers|triggered\s+by|sets?\s+(?:him|her|them)\s+off|can'?t\s+handle|hates|freaks?\s+out\s+(?:about|when|with))\s+(.+)/i,
      /(?:loud\s+noises?|crowds?|transitions?|waiting|new\s+people|change\s+in\s+routine|hunger|tiredness|sensory)\s+(?:is|are)\s+(?:a\s+)?(?:trigger|problem|issue|hard)/i,
    ],
    extractor: (text, match) => ({
      trigger: match[1]?.trim().substring(0, 100) || text.substring(0, 100),
      severity: /can'?t|freaks?|meltdown|crisis/i.test(text) ? 'high' : 'medium',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Add to known triggers?',
    needsConfirmation: false,
  },

  // Strategies that work
  {
    category: 'strategy',
    patterns: [
      /(?:what\s+work(?:s|ed)|helps?\s+is|that\s+helped|trick\s+is|figured\s+out)\s+(.+)/i,
      /(?:tried|using|started)\s+(.+)\s+and\s+(?:it\s+)?(?:worked|helped|made\s+a\s+difference)/i,
      /(?:visual\s+schedule|timer|token\s+board|social\s+story|first.then|countdown)\s+(?:works?|helped|is\s+great)/i,
    ],
    extractor: (text, match) => ({
      strategy: match[1]?.trim().substring(0, 200) || text.substring(0, 200),
      effectiveness: /great|amazing|incredible|perfect/i.test(text) ? 'high' : 'moderate',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Save to effective strategies?',
    needsConfirmation: false,
  },

  // Milestones
  {
    category: 'milestone',
    patterns: [
      /(?:first\s+time|for\s+the\s+first\s+time|never\s+(?:done|did)\s+(?:that|this)\s+before)/i,
      /(?:finally|can\s+now|just\s+started|learned\s+to|able\s+to)\s+(.+)/i,
      /(?:potty\s+trained|said\s+(?:his|her|their)\s+first|made\s+a\s+friend|sat\s+through|completed)/i,
    ],
    extractor: (text, match) => ({
      milestone: match[1]?.trim().substring(0, 200) || text.substring(0, 200),
      celebrationType: 'achievement',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Celebrate this milestone!',
    needsConfirmation: false,
  },

  // Child profile updates
  {
    category: 'child-profile',
    patterns: [
      /(?:weighs?|weight\s+is)\s+(\d+\.?\d*)\s*(?:lbs?|pounds?|kg)/i,
      /(?:is|turned|just\s+turned)\s+(\d+)\s+(?:years?\s+old|months?\s+old)/i,
      /(?:diagnosed\s+with|has|got\s+a\s+diagnosis\s+of)\s+(.+)/i,
    ],
    extractor: (text, match) => ({
      field: /weigh/i.test(text) ? 'weight'
        : /year|month|turned/i.test(text) ? 'age'
        : 'diagnosis',
      value: match[1] || '',
      unit: /lbs?|pounds?/i.test(text) ? 'lbs' : /kg/i.test(text) ? 'kg' : '',
      reportedAt: new Date().toISOString(),
    }),
    action: 'Update child profile?',
    needsConfirmation: true,
  },
];

// ─── Main Extraction Function ───────────────────────────────────────

/**
 * Extract structured data points from a chat message.
 * Called after every user message in the AI chat pipeline.
 */
export function extractDataFromMessage(message: string): ExtractedDataPoint[] {
  const results: ExtractedDataPoint[] = [];
  const normalizedMessage = message.trim();

  if (normalizedMessage.length < 10) return results;

  for (const pattern of EXTRACTION_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = normalizedMessage.match(regex);
      if (match) {
        const structuredData = pattern.extractor(normalizedMessage, match);
        results.push({
          category: pattern.category,
          confidence: calculateConfidence(normalizedMessage, match, pattern),
          rawText: normalizedMessage.substring(0, 300),
          structuredData,
          suggestedAction: pattern.action,
          requiresConfirmation: pattern.needsConfirmation,
        });
        break; // One match per pattern category
      }
    }
  }

  return results;
}

/**
 * Calculate confidence score based on match quality
 */
function calculateConfidence(
  text: string,
  match: RegExpMatchArray,
  _pattern: ExtractionPattern
): number {
  let confidence = 0.6; // Base

  // Longer match = higher confidence
  if (match[0].length > 20) confidence += 0.1;
  if (match[0].length > 40) confidence += 0.1;

  // More specific data extracted = higher confidence
  if (match[1] && match[1].length > 3) confidence += 0.1;

  // Shorter message with clear intent = higher confidence
  if (text.length < 100) confidence += 0.05;

  return Math.min(0.95, confidence);
}

/**
 * Route extracted data to appropriate Supabase tables.
 * Returns which items were persisted and which need user confirmation.
 */
export async function routeExtractedData(
  dataPoints: ExtractedDataPoint[],
  userId: string,
  childId?: string,
): Promise<DataRoutingResult> {
  const persisted: string[] = [];
  const pendingConfirmation: ExtractedDataPoint[] = [];

  for (const dp of dataPoints) {
    if (dp.confidence < 0.5) continue;

    if (dp.requiresConfirmation) {
      pendingConfirmation.push(dp);
      continue;
    }

    // Auto-persist high-confidence, no-confirmation-needed items
    try {
      await persistDataPoint(dp, userId, childId);
      persisted.push(dp.category);
    } catch {
      // Non-critical — data extraction is best-effort
    }
  }

  const toast = persisted.length > 0
    ? `Updated: ${persisted.map(formatCategory).join(', ')}`
    : undefined;

  return {
    extracted: dataPoints,
    persisted,
    pendingConfirmation,
    toast,
  };
}

/**
 * Persist a single confirmed item (called from the "Ready for Review" modal).
 * Forces persist regardless of the requiresConfirmation flag.
 */
export async function confirmAndPersist(
  dp: ExtractedDataPoint,
  userId: string,
  childId?: string,
): Promise<void> {
  return persistDataPoint(dp, userId, childId);
}

/**
 * Persist a data point to the appropriate Supabase table
 */
async function persistDataPoint(
  dp: ExtractedDataPoint,
  userId: string,
  childId?: string,
): Promise<void> {
  // Import supabase lazily to avoid circular deps
  const { supabase } = await import('../utils/supabase/client');

  const baseRecord = {
    user_id: userId,
    child_id: childId,
    source: 'ai-chat',
    created_at: new Date().toISOString(),
  };

  switch (dp.category) {
    case 'trigger':
    case 'strategy':
    case 'preference':
      await supabase.from('ai_memory_facts').insert({
        ...baseRecord,
        category: dp.category,
        fact: JSON.stringify(dp.structuredData),
        confidence: dp.confidence,
      });
      break;

    case 'milestone':
      await supabase.from('milestones').insert({
        ...baseRecord,
        title: (dp.structuredData as { milestone?: string }).milestone || 'New milestone',
        celebration_type: 'achievement',
      });
      break;

    case 'goal-progress':
      await supabase.from('goal_updates').insert({
        ...baseRecord,
        goal_area: (dp.structuredData as { goalArea?: string }).goalArea || '',
        status: (dp.structuredData as { status?: string }).status || 'improving',
        reported_by: (dp.structuredData as { source?: string }).source || 'parent',
      });
      break;

    case 'routine':
      await supabase.from('routine_updates').insert({
        ...baseRecord,
        routine_type: (dp.structuredData as { routineType?: string }).routineType || '',
        time_value: (dp.structuredData as { time?: string }).time || '',
      });
      break;

    default:
      // For other categories, store in a generic chat_extracted_data table
      await supabase.from('chat_extracted_data').insert({
        ...baseRecord,
        category: dp.category,
        data: dp.structuredData,
        raw_text: dp.rawText.substring(0, 500),
        confidence: dp.confidence,
      });
  }
}

function formatCategory(cat: string): string {
  const labels: Record<string, string> = {
    incident: 'incident log',
    medication: 'medications',
    'goal-progress': 'goals',
    insurance: 'insurance',
    routine: 'daily routine',
    trigger: 'triggers',
    strategy: 'strategies',
    appointment: 'calendar',
    'provider-note': 'notes',
    'child-profile': 'profile',
    preference: 'preferences',
    milestone: 'milestones',
    concern: 'concerns',
    school: 'school info',
    diet: 'nutrition',
  };
  return labels[cat] || cat;
}

// ─── Integration Hook ───────────────────────────────────────────────

/**
 * Hook to integrate chat-to-data pipeline into StreamingAIChat.
 * Call this after every user message is sent.
 *
 * Usage in StreamingAIChat:
 *   const extracted = extractDataFromMessage(userMessage);
 *   if (extracted.length > 0) {
 *     const result = await routeExtractedData(extracted, userId, childId);
 *     if (result.toast) toast.success(result.toast);
 *     if (result.pendingConfirmation.length > 0) {
 *       showDataConfirmation(result.pendingConfirmation);
 *     }
 *   }
 */
export { extractDataFromMessage as extractFromChat };

// ─── Three-Way Data Flow ────────────────────────────────────────────
//
// The Aminy Loop: Parent ↔ AI ↔ Provider ↔ Jr App ↔ Parent
//
// When a PARENT tells the AI something:
//   1. Data persists to structured tables (above)
//   2. Provider gets notified: "Parent reported: meltdown at Target today"
//   3. Jr app adapts: if parent says "transitions are hard" → Jr bumps
//      transition routine activities to top of daily challenges
//   4. AI context updates: future conversations reference this data
//
// When a PROVIDER documents something:
//   1. Parent gets plain-English summary: "Dr. Mitchell says Aiden is
//      mastering transitions! Here's what to practice at home."
//   2. Jr app adapts: mastered skills get harder, struggling areas get
//      more scaffolding
//   3. Care plan updates automatically
//
// When the CHILD completes Jr activities:
//   1. Parent sees progress on dashboard
//   2. Provider sees engagement data in session prep
//   3. AI references it: "Aiden completed 12 sensory activities this
//      week — that's 3x more than last week"

export interface DataFlowEvent {
  source: 'parent-chat' | 'provider-note' | 'jr-activity' | 'system';
  category: DataCategory;
  data: Record<string, unknown>;
  timestamp: string;
  childId?: string;
}

export interface DataFlowTarget {
  target: 'provider-dashboard' | 'jr-app' | 'parent-dashboard' | 'ai-context' | 'care-plan';
  action: string;
  payload: Record<string, unknown>;
}

/**
 * Given a data flow event, determine where the data should propagate.
 * This is the core of the Aminy Loop.
 */
export function calculateDataFlowTargets(event: DataFlowEvent): DataFlowTarget[] {
  const targets: DataFlowTarget[] = [];

  // ALWAYS update AI context (every data point enriches future conversations)
  targets.push({
    target: 'ai-context',
    action: 'update-memory',
    payload: { category: event.category, data: event.data },
  });

  switch (event.source) {
    case 'parent-chat':
      // Parent → Provider: notify provider of parent-reported data
      if (['incident', 'medication', 'concern', 'trigger', 'milestone'].includes(event.category)) {
        targets.push({
          target: 'provider-dashboard',
          action: 'parent-reported-update',
          payload: {
            type: event.category,
            summary: generateProviderAlert(event),
            urgency: event.category === 'incident' ? 'high' : 'normal',
            requiresAcknowledgement: event.category === 'medication',
          },
        });
      }

      // Parent → Jr App: adapt child experience based on parent input
      if (['trigger', 'routine', 'strategy', 'goal-progress', 'preference'].includes(event.category)) {
        targets.push({
          target: 'jr-app',
          action: 'adapt-experience',
          payload: {
            adaptationType: getJrAdaptation(event),
          },
        });
      }

      // Parent → Care Plan: update active care plan
      if (['goal-progress', 'strategy', 'concern'].includes(event.category)) {
        targets.push({
          target: 'care-plan',
          action: 'incorporate-parent-input',
          payload: { category: event.category, data: event.data },
        });
      }
      break;

    case 'provider-note':
      // Provider → Parent: translate to plain English and notify
      targets.push({
        target: 'parent-dashboard',
        action: 'provider-update',
        payload: {
          summary: generateParentSummary(event),
          actionItems: generateHomeActivities(event),
        },
      });

      // Provider → Jr App: adjust difficulty, focus areas
      targets.push({
        target: 'jr-app',
        action: 'clinical-adjustment',
        payload: {
          adjustments: getClinicalAdjustments(event),
        },
      });

      // Provider → Care Plan: update goals and objectives
      targets.push({
        target: 'care-plan',
        action: 'clinical-update',
        payload: { category: event.category, data: event.data },
      });
      break;

    case 'jr-activity':
      // Jr → Parent: show engagement on dashboard
      targets.push({
        target: 'parent-dashboard',
        action: 'child-activity-update',
        payload: {
          summary: `Completed ${(event.data as { activityName?: string }).activityName || 'activity'} with ${(event.data as { accuracy?: number }).accuracy || 0}% accuracy`,
        },
      });

      // Jr → Provider: engagement data for session prep
      targets.push({
        target: 'provider-dashboard',
        action: 'engagement-data',
        payload: {
          type: 'jr-session-data',
          data: event.data,
        },
      });
      break;
  }

  return targets;
}

// ─── Helper functions for data flow ─────────────────────────────────

function generateProviderAlert(event: DataFlowEvent): string {
  const data = event.data as Record<string, string>;
  switch (event.category) {
    case 'incident':
      return `Parent reported behavioral incident: ${data.description || 'See details'}`;
    case 'medication':
      return `Medication change: ${data.action || 'updated'} ${data.name || ''} ${data.dosage || ''}`;
    case 'trigger':
      return `New trigger identified: ${data.trigger || 'See details'}`;
    case 'milestone':
      return `Milestone reached: ${data.milestone || 'See details'}`;
    case 'concern':
      return `Parent concern: ${data.concern || 'See details'}`;
    default:
      return `Parent update: ${event.category}`;
  }
}

function generateParentSummary(event: DataFlowEvent): string {
  const data = event.data as Record<string, string>;
  return data.parentSummary
    || `Your provider updated ${event.category === 'goal-progress' ? 'goal progress' : 'session notes'}. Check your care plan for details.`;
}

function generateHomeActivities(event: DataFlowEvent): string[] {
  const data = event.data as Record<string, string[]>;
  return data.homeActivities || [
    'Practice what was worked on today for 5 minutes',
    'Use the strategies discussed in your next challenging moment',
  ];
}

function getJrAdaptation(event: DataFlowEvent): Record<string, unknown> {
  const data = event.data as Record<string, string>;
  switch (event.category) {
    case 'trigger':
      return {
        type: 'avoid-trigger',
        triggerDescription: data.trigger,
        action: 'reduce-exposure-to-triggering-activities',
      };
    case 'routine':
      return {
        type: 'update-schedule',
        routineType: data.routineType,
        newTime: data.time,
      };
    case 'strategy':
      return {
        type: 'reinforce-strategy',
        strategy: data.strategy,
        action: 'surface-related-activities',
      };
    case 'goal-progress':
      return {
        type: 'adjust-difficulty',
        goalArea: data.goalArea,
        direction: data.status === 'mastered' ? 'increase' : 'maintain',
      };
    default:
      return { type: 'general-update', category: event.category };
  }
}

function getClinicalAdjustments(event: DataFlowEvent): Record<string, unknown> {
  const data = event.data as Record<string, string>;
  return {
    source: 'provider',
    goalArea: data.goalArea || event.category,
    adjustmentType: data.status === 'mastered' ? 'advance-difficulty' : 'increase-scaffolding',
    effectiveDate: new Date().toISOString(),
  };
}
