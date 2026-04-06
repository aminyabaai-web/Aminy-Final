// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Session Note Engine
 *
 * Generates SOAP notes, parent summaries, CPT suggestions, and session metrics
 * from structured session data. Uses algorithmic/template logic (no external AI calls).
 */

// ============================================================================
// Types
// ============================================================================

export interface SessionData {
  sessionId: string;
  providerId: string;
  childId: string;
  parentId: string;
  duration: number; // minutes
  sessionType: 'aba' | 'speech' | 'ot' | 'mental-health' | 'eval';
  activitiesCompleted: {
    name: string;
    domain: string;
    accuracy: number; // 0-100
    notes: string;
  }[];
  goalsAddressed: {
    goalId: string;
    goalTitle: string;
    progressPct: number; // 0-100
    notes: string;
  }[];
  behaviorNotes: string;
  parentFeedback?: string;
}

export interface AISessionNote {
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  parentSummary: string;
  cptSuggestions: CPTSuggestion[];
  metrics: SessionMetrics;
  generatedAt: string;
  status: NoteStatus;
}

export type NoteStatus =
  | 'draft'
  | 'provider_review'
  | 'approved'
  | 'sent_to_parent'
  | 'parent_acknowledged';

export interface CPTSuggestion {
  code: string;
  description: string;
  units: number;
  confidence: number; // 0-1
}

export interface SessionMetrics {
  accuracy: number; // 0-100
  engagement: number; // 0-100
  goalProgress: number; // 0-100
}

// ============================================================================
// CPT Code Reference
// ============================================================================

const CPT_CODES: Record<
  string,
  { code: string; description: string; minutesPerUnit: number; sessionTypes: string[] }[]
> = {
  aba: [
    { code: '97153', description: 'Adaptive behavior treatment by protocol (direct 1:1)', minutesPerUnit: 15, sessionTypes: ['aba'] },
    { code: '97155', description: 'Adaptive behavior treatment with protocol modification', minutesPerUnit: 15, sessionTypes: ['aba'] },
    { code: '97156', description: 'Family adaptive behavior treatment guidance', minutesPerUnit: 15, sessionTypes: ['aba'] },
    { code: '97151', description: 'Behavior identification assessment', minutesPerUnit: 30, sessionTypes: ['aba', 'eval'] },
  ],
  speech: [
    { code: '92507', description: 'Treatment of speech, language, voice, communication', minutesPerUnit: 30, sessionTypes: ['speech'] },
    { code: '92508', description: 'Treatment of speech (group, 2+)', minutesPerUnit: 30, sessionTypes: ['speech'] },
    { code: '92523', description: 'Evaluation of speech sound production', minutesPerUnit: 60, sessionTypes: ['speech', 'eval'] },
  ],
  ot: [
    { code: '97530', description: 'Therapeutic activities, direct patient contact', minutesPerUnit: 15, sessionTypes: ['ot'] },
    { code: '97110', description: 'Therapeutic exercises', minutesPerUnit: 15, sessionTypes: ['ot'] },
    { code: '97542', description: 'Wheelchair management training', minutesPerUnit: 15, sessionTypes: ['ot'] },
    { code: '97165', description: 'OT evaluation, low complexity', minutesPerUnit: 30, sessionTypes: ['ot', 'eval'] },
    { code: '97166', description: 'OT evaluation, moderate complexity', minutesPerUnit: 45, sessionTypes: ['ot', 'eval'] },
  ],
  'mental-health': [
    { code: '90834', description: 'Psychotherapy, 45 minutes', minutesPerUnit: 45, sessionTypes: ['mental-health'] },
    { code: '90837', description: 'Psychotherapy, 60 minutes', minutesPerUnit: 60, sessionTypes: ['mental-health'] },
    { code: '90847', description: 'Family psychotherapy with patient present', minutesPerUnit: 50, sessionTypes: ['mental-health'] },
    { code: '90791', description: 'Psychiatric diagnostic evaluation', minutesPerUnit: 60, sessionTypes: ['mental-health', 'eval'] },
  ],
  eval: [
    { code: '96130', description: 'Psychological testing evaluation (first hour)', minutesPerUnit: 60, sessionTypes: ['eval'] },
    { code: '96131', description: 'Psychological testing evaluation (each addl hour)', minutesPerUnit: 60, sessionTypes: ['eval'] },
    { code: '96136', description: 'Psychological or neuropsychological test admin (first 30 min)', minutesPerUnit: 30, sessionTypes: ['eval'] },
  ],
};

// ============================================================================
// Session Type Labels
// ============================================================================

const SESSION_TYPE_LABELS: Record<string, string> = {
  aba: 'ABA Therapy',
  speech: 'Speech Therapy',
  ot: 'Occupational Therapy',
  'mental-health': 'Mental Health',
  eval: 'Evaluation',
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate a full AI session note from structured session data.
 * Uses template-based logic, not external AI.
 */
export async function generateSessionNote(session: SessionData): Promise<AISessionNote> {
  const metrics = calculateMetrics(session);
  const cptSuggestions = suggestCPTCodes(session);

  const soapNote = generateSOAP(session, metrics);
  const parentSummary = generateParentSummary(session, {
    soapNote,
    parentSummary: '', // placeholder, will be replaced
    cptSuggestions,
    metrics,
    generatedAt: new Date().toISOString(),
    status: 'draft',
  });

  return {
    soapNote,
    parentSummary,
    cptSuggestions,
    metrics,
    generatedAt: new Date().toISOString(),
    status: 'draft',
  };
}

/**
 * Generate parent-friendly summary from session data and note.
 */
export function generateParentSummary(session: SessionData, note: AISessionNote): string {
  const typeLabel = SESSION_TYPE_LABELS[session.sessionType] || session.sessionType;
  const topActivities = session.activitiesCompleted
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  const wins = topActivities
    .filter(a => a.accuracy >= 70)
    .map(a => `${a.name} (${a.accuracy}% accuracy)`);

  const goalsWorkedOn = session.goalsAddressed.map(g => g.goalTitle);

  const lines: string[] = [];

  lines.push(`Today's ${typeLabel} session lasted ${session.duration} minutes.`);

  if (wins.length > 0) {
    lines.push(`Great progress on: ${wins.join(', ')}.`);
  }

  if (goalsWorkedOn.length > 0) {
    lines.push(`We worked on these goals: ${goalsWorkedOn.join(', ')}.`);
  }

  const avgProgress = session.goalsAddressed.length > 0
    ? Math.round(session.goalsAddressed.reduce((sum, g) => sum + g.progressPct, 0) / session.goalsAddressed.length)
    : 0;

  if (avgProgress > 0) {
    lines.push(`Average goal progress this session: ${avgProgress}%.`);
  }

  if (session.behaviorNotes) {
    // Soften clinical language for parents
    const parentFriendly = session.behaviorNotes
      .replace(/maladaptive/gi, 'challenging')
      .replace(/non-?complian/gi, 'had difficulty following')
      .replace(/extinction burst/gi, 'temporary increase in behavior')
      .replace(/elopement/gi, 'leaving the activity area')
      .replace(/stereotypy/gi, 'repetitive movements')
      .replace(/self-?injurious/gi, 'self-directed')
      .replace(/tantrum/gi, 'emotional moment');
    lines.push(`Behavior notes: ${parentFriendly}`);
  }

  if (note.soapNote.plan) {
    lines.push(`Next steps: ${note.soapNote.plan}`);
  }

  return lines.join('\n\n');
}

/**
 * Suggest CPT codes based on session type and duration.
 */
export function suggestCPTCodes(session: SessionData): CPTSuggestion[] {
  const candidates = CPT_CODES[session.sessionType] || [];
  const suggestions: CPTSuggestion[] = [];

  for (const candidate of candidates) {
    if (!candidate.sessionTypes.includes(session.sessionType)) continue;

    const units = Math.max(1, Math.floor(session.duration / candidate.minutesPerUnit));

    // Confidence scoring
    let confidence = 0.7; // base

    // Boost if duration aligns well with CPT unit structure
    const remainder = session.duration % candidate.minutesPerUnit;
    if (remainder < 5) confidence += 0.15;

    // Boost for primary codes based on session type
    if (session.sessionType === 'aba' && candidate.code === '97153') confidence = 0.95;
    if (session.sessionType === 'speech' && candidate.code === '92507') confidence = 0.92;
    if (session.sessionType === 'ot' && candidate.code === '97530') confidence = 0.90;
    if (session.sessionType === 'mental-health') {
      if (session.duration <= 37 && candidate.code === '90834') confidence = 0.93;
      if (session.duration > 37 && session.duration <= 52 && candidate.code === '90834') confidence = 0.90;
      if (session.duration > 52 && candidate.code === '90837') confidence = 0.95;
    }

    // Eval sessions
    if (session.sessionType === 'eval') {
      if (candidate.code === '96130' || candidate.code === '97151' || candidate.code === '92523') {
        confidence = 0.88;
      }
    }

    // Family guidance if parent feedback present
    if (session.parentFeedback && candidate.code === '97156') {
      confidence = 0.85;
    }

    suggestions.push({
      code: candidate.code,
      description: candidate.description,
      units,
      confidence: Math.min(1, confidence),
    });
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate accuracy, engagement, and goal progress metrics from session data.
 */
export function calculateMetrics(session: SessionData): SessionMetrics {
  // Accuracy: average of all activity accuracies
  const accuracy = session.activitiesCompleted.length > 0
    ? Math.round(
        session.activitiesCompleted.reduce((sum, a) => sum + a.accuracy, 0) /
        session.activitiesCompleted.length
      )
    : 0;

  // Engagement: heuristic based on activities completed, duration utilization, and behavior
  let engagement = 50; // baseline
  const activitiesPerHour = session.activitiesCompleted.length / (session.duration / 60);
  if (activitiesPerHour >= 4) engagement += 20;
  else if (activitiesPerHour >= 2) engagement += 10;

  // Accuracy boosts engagement
  if (accuracy >= 80) engagement += 15;
  else if (accuracy >= 60) engagement += 10;

  // Behavior notes reduce engagement if negative indicators present
  const behaviorLower = session.behaviorNotes.toLowerCase();
  const negativeIndicators = ['refusal', 'elopement', 'aggression', 'non-complian', 'tantrum', 'crying', 'escape'];
  const positiveIndicators = ['cooperative', 'engaged', 'happy', 'motivated', 'independent', 'attentive', 'excellent'];

  const negCount = negativeIndicators.filter(w => behaviorLower.includes(w)).length;
  const posCount = positiveIndicators.filter(w => behaviorLower.includes(w)).length;
  engagement += (posCount * 5) - (negCount * 8);
  engagement = Math.max(0, Math.min(100, engagement));

  // Goal progress: average of all goals addressed
  const goalProgress = session.goalsAddressed.length > 0
    ? Math.round(
        session.goalsAddressed.reduce((sum, g) => sum + g.progressPct, 0) /
        session.goalsAddressed.length
      )
    : 0;

  return { accuracy, engagement, goalProgress };
}

// ============================================================================
// Internal Helpers
// ============================================================================

// ============================================================================
// Enhanced Note Pipeline: Draft → Provider Edit → Parent Approval → CR Export
// ============================================================================

export interface NoteEdit {
  field: 'subjective' | 'objective' | 'assessment' | 'plan' | 'parentSummary';
  originalText: string;
  editedText: string;
  editedBy: string;
  editedAt: string;
  reason?: string;
}

export interface NoteApproval {
  noteId: string;
  status: NoteStatus;
  providerEdits: NoteEdit[];
  parentSignature?: string;
  parentSignedAt?: string;
  parentQuestions?: string[];
  providerApprovedAt?: string;
  crExportedAt?: string;
  crExportFormat?: 'cr-soap' | 'cr-narrative' | 'cr-structured';
}

export interface CRExportPayload {
  clientId: string;
  sessionDate: string;
  sessionDuration: number;
  serviceType: string;
  cptCodes: { code: string; units: number }[];
  soapNote: AISessionNote['soapNote'];
  providerNpi: string;
  authorizationNumber?: string;
  renderingProviderId: string;
  supervisingProviderId?: string;
  placeOfService: '02' | '11' | '12'; // 02=telehealth, 11=office, 12=home
  diagnosisCodes: string[];
  goalProgress: { goalId: string; baseline: number; current: number; target: number }[];
}

/**
 * Create the full note pipeline: generate draft, track edits, handle approvals
 */
export function createNotePipeline(session: SessionData): NoteApproval {
  return {
    noteId: `note-${session.sessionId}`,
    status: 'draft',
    providerEdits: [],
    parentQuestions: [],
  };
}

/**
 * Apply a provider edit to the note and track the change
 */
export function applyProviderEdit(
  note: AISessionNote,
  approval: NoteApproval,
  field: NoteEdit['field'],
  newText: string,
  providerId: string,
  reason?: string
): { note: AISessionNote; approval: NoteApproval } {
  const originalText =
    field === 'parentSummary'
      ? note.parentSummary
      : note.soapNote[field as keyof AISessionNote['soapNote']];

  const edit: NoteEdit = {
    field,
    originalText,
    editedText: newText,
    editedBy: providerId,
    editedAt: new Date().toISOString(),
    reason,
  };

  const updatedNote = { ...note };
  if (field === 'parentSummary') {
    updatedNote.parentSummary = newText;
  } else {
    updatedNote.soapNote = { ...updatedNote.soapNote, [field]: newText };
  }

  return {
    note: { ...updatedNote, status: 'provider_review' },
    approval: {
      ...approval,
      providerEdits: [...approval.providerEdits, edit],
      status: 'provider_review',
    },
  };
}

/**
 * Provider approves the note and sends to parent
 */
export function providerApproveNote(approval: NoteApproval): NoteApproval {
  return {
    ...approval,
    status: 'sent_to_parent',
    providerApprovedAt: new Date().toISOString(),
  };
}

/**
 * Parent acknowledges the note with optional signature
 */
export function parentAcknowledgeNote(
  approval: NoteApproval,
  signature?: string,
  questions?: string[]
): NoteApproval {
  return {
    ...approval,
    status: 'parent_acknowledged',
    parentSignature: signature,
    parentSignedAt: new Date().toISOString(),
    parentQuestions: questions ?? approval.parentQuestions,
  };
}

/**
 * Translate clinical SOAP note to plain-English parent-friendly language.
 * Goes beyond generateParentSummary by softening ALL clinical jargon.
 */
export function translateNoteForParent(note: AISessionNote, childName: string = 'your child'): string {
  const replacements: [RegExp, string][] = [
    [/\bclient\b/gi, childName],
    [/\bmaladaptive\b/gi, 'challenging'],
    [/\bnon-?complian\w*/gi, 'had difficulty following directions'],
    [/\bextinction burst\b/gi, 'temporary increase in behavior (this is actually normal and expected!)'],
    [/\belopement\b/gi, 'leaving the activity area'],
    [/\bstereotypy\b/gi, 'repetitive movements'],
    [/\bself-?injurious\b/gi, 'self-directed behavior'],
    [/\btantrum\b/gi, 'emotional moment'],
    [/\bprompting hierarchy\b/gi, 'level of support'],
    [/\bfull physical prompt\b/gi, 'hand-over-hand help'],
    [/\bpartial physical prompt\b/gi, 'gentle physical guidance'],
    [/\bgestural prompt\b/gi, 'pointing or gesturing'],
    [/\bvisual prompt\b/gi, 'picture or visual cue'],
    [/\bindependent\b/gi, 'on their own'],
    [/\breinforcer\b/gi, 'reward or motivator'],
    [/\bdiscrete trial\b/gi, 'structured practice activity'],
    [/\bNET\b/g, 'natural play-based teaching'],
    [/\bVB\b/g, 'verbal behavior approach'],
    [/\bDTT\b/g, 'structured practice'],
    [/\bFCT\b/g, 'teaching replacement communication'],
    [/\bBIP\b/g, 'behavior support plan'],
    [/\bABC data\b/gi, 'behavior tracking notes'],
    [/\bbaseline\b/gi, 'starting point'],
    [/\bmastery criterion\b/gi, 'goal for this skill'],
    [/\bgeneralization\b/gi, 'using the skill in different situations'],
    [/\bmaintenance\b/gi, 'keeping skills strong over time'],
    [/\bSLP\b/g, 'speech therapist'],
    [/\bOT\b/g, 'occupational therapist'],
    [/\bBCBA\b/g, 'behavior analyst'],
    [/\bRBT\b/g, 'behavior technician'],
  ];

  let text = [
    note.soapNote.subjective,
    note.soapNote.objective,
    note.soapNote.assessment,
    note.soapNote.plan,
  ].join('\n\n');

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

/**
 * Export note in CentralReach-compatible format
 */
export function exportForCentralReach(
  session: SessionData,
  note: AISessionNote,
  providerNpi: string,
  diagnosisCodes: string[],
  authorizationNumber?: string,
  placeOfService: CRExportPayload['placeOfService'] = '02'
): CRExportPayload {
  return {
    clientId: session.childId,
    sessionDate: new Date().toISOString().split('T')[0],
    sessionDuration: session.duration,
    serviceType: session.sessionType,
    cptCodes: note.cptSuggestions
      .filter(s => s.confidence >= 0.7)
      .map(s => ({ code: s.code, units: s.units })),
    soapNote: note.soapNote,
    providerNpi,
    authorizationNumber,
    renderingProviderId: session.providerId,
    placeOfService,
    diagnosisCodes,
    goalProgress: session.goalsAddressed.map(g => ({
      goalId: g.goalId,
      baseline: 0,
      current: g.progressPct,
      target: 100,
    })),
  };
}

/**
 * Validate note is complete and ready for submission/export
 */
export function validateNoteCompleteness(note: AISessionNote): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!note.soapNote.subjective?.trim()) missing.push('Subjective section');
  if (!note.soapNote.objective?.trim()) missing.push('Objective section');
  if (!note.soapNote.assessment?.trim()) missing.push('Assessment section');
  if (!note.soapNote.plan?.trim()) missing.push('Plan section');
  if (note.cptSuggestions.length === 0) missing.push('CPT codes');
  if (!note.parentSummary?.trim()) missing.push('Parent summary');
  return { ready: missing.length === 0, missing };
}

// ============================================================================
// Internal Helpers
// ============================================================================

function generateSOAP(
  session: SessionData,
  metrics: SessionMetrics
): AISessionNote['soapNote'] {
  const typeLabel = SESSION_TYPE_LABELS[session.sessionType] || session.sessionType;

  // --- Subjective ---
  const subjectiveParts: string[] = [];
  subjectiveParts.push(
    `Client participated in a ${session.duration}-minute ${typeLabel} session.`
  );
  if (session.parentFeedback) {
    subjectiveParts.push(`Parent reported: "${session.parentFeedback}"`);
  }
  if (session.behaviorNotes) {
    subjectiveParts.push(`Behavioral observations: ${session.behaviorNotes}`);
  }

  // --- Objective ---
  const objectiveParts: string[] = [];
  if (session.activitiesCompleted.length > 0) {
    objectiveParts.push(
      `${session.activitiesCompleted.length} activities completed across domains: ${[...new Set(session.activitiesCompleted.map(a => a.domain))].join(', ')}.`
    );
    objectiveParts.push(`Overall accuracy: ${metrics.accuracy}%.`);

    // Detail top activities
    const sorted = [...session.activitiesCompleted].sort((a, b) => b.accuracy - a.accuracy);
    for (const act of sorted.slice(0, 5)) {
      objectiveParts.push(`- ${act.name} (${act.domain}): ${act.accuracy}% accuracy. ${act.notes}`);
    }
  }
  if (session.goalsAddressed.length > 0) {
    objectiveParts.push(`Goals addressed: ${session.goalsAddressed.length}.`);
    for (const goal of session.goalsAddressed) {
      objectiveParts.push(`- ${goal.goalTitle}: ${goal.progressPct}% progress. ${goal.notes}`);
    }
  }

  // --- Assessment ---
  const assessmentParts: string[] = [];
  if (metrics.accuracy >= 80) {
    assessmentParts.push('Client demonstrated strong performance across targeted skills.');
  } else if (metrics.accuracy >= 60) {
    assessmentParts.push('Client demonstrated moderate performance. Continued practice recommended.');
  } else if (metrics.accuracy > 0) {
    assessmentParts.push('Client demonstrated emerging skills. Increased support and scaffolding recommended.');
  }

  if (metrics.engagement >= 75) {
    assessmentParts.push('Engagement was high throughout the session.');
  } else if (metrics.engagement >= 50) {
    assessmentParts.push('Engagement was adequate with some redirection needed.');
  } else {
    assessmentParts.push('Engagement was low; consider environmental or motivational adjustments.');
  }

  const avgGoalProgress = session.goalsAddressed.length > 0
    ? Math.round(session.goalsAddressed.reduce((s, g) => s + g.progressPct, 0) / session.goalsAddressed.length)
    : 0;

  if (avgGoalProgress >= 70) {
    assessmentParts.push(`Goal progress is on track (avg ${avgGoalProgress}%). Consider advancing targets.`);
  } else if (avgGoalProgress >= 40) {
    assessmentParts.push(`Goal progress is moderate (avg ${avgGoalProgress}%). Continue current programming.`);
  } else if (avgGoalProgress > 0) {
    assessmentParts.push(`Goal progress is below expectations (avg ${avgGoalProgress}%). Review programming and consider modifications.`);
  }

  // --- Plan ---
  const planParts: string[] = [];
  planParts.push(`Continue ${typeLabel} sessions as scheduled.`);

  // Low accuracy activities need attention
  const lowAccuracy = session.activitiesCompleted.filter(a => a.accuracy < 50);
  if (lowAccuracy.length > 0) {
    planParts.push(
      `Increase trials/scaffolding for: ${lowAccuracy.map(a => a.name).join(', ')}.`
    );
  }

  // Goals with low progress
  const lowGoals = session.goalsAddressed.filter(g => g.progressPct < 30);
  if (lowGoals.length > 0) {
    planParts.push(
      `Review and potentially modify targets for: ${lowGoals.map(g => g.goalTitle).join(', ')}.`
    );
  }

  if (session.parentFeedback) {
    planParts.push('Incorporate parent feedback into next session planning.');
  }

  return {
    subjective: subjectiveParts.join(' '),
    objective: objectiveParts.join('\n'),
    assessment: assessmentParts.join(' '),
    plan: planParts.join(' '),
  };
}
