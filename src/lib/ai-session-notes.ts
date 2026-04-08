// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Session Notes Engine
 *
 * Generates realistic SOAP notes from session metadata, manages the full
 * provider-edit → parent-approval → finalization lifecycle.
 *
 * Service types: ABA (97153/97155/97156), MH (90837), Speech (92507)
 */

// ============================================================================
// Types
// ============================================================================

export type ServiceType = 'aba' | 'mh' | 'speech';

export type NoteApprovalStatus =
  | 'draft'
  | 'ready_for_provider'
  | 'provider_editing'
  | 'pending_parent_approval'
  | 'parent_approved'
  | 'finalized';

export interface SessionData {
  sessionId: string;
  providerId: string;
  providerName: string;
  childId: string;
  childName: string;
  parentId: string;
  dateOfService: string; // ISO date
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  serviceType: ServiceType;
  placeOfService: '02' | '10' | '11'; // 02=telehealth, 10=home, 11=office
  diagnosisCodes: string[]; // ICD-10
  providerNPI: string;
  goals: SessionGoal[];
  behaviorData?: BehaviorDataPoint[];
  parentReport?: string;
  childPresentation?: string;
}

export interface SessionGoal {
  goalId: string;
  description: string;
  domain: string;
  trialsCompleted: number;
  trialsCorrect: number;
  percentCorrect: number;
  masteryThreshold: number; // e.g. 80
  notes: string;
}

export interface BehaviorDataPoint {
  behavior: string;
  frequency?: number;
  duration?: number; // seconds
  intensity?: 'low' | 'medium' | 'high';
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface SessionNoteTemplate {
  serviceType: ServiceType;
  cptCodes: CPTCodeEntry[];
  noteStructure: 'SOAP' | 'DAP' | 'BIRP';
  requiredFields: string[];
}

export interface CPTCodeEntry {
  code: string;
  description: string;
  units: number;
  unitDuration: number; // minutes per unit
  requiresSupervision?: boolean;
}

export interface ParentApproval {
  noteId: string;
  approvedAt: string;
  signatureType: 'drawn' | 'typed';
  signatureData: string; // base64 canvas or typed name
  parentName: string;
  parentId: string;
  ipAddress?: string;
}

export interface ProviderEdit {
  field: keyof SOAPNote;
  originalText: string;
  editedText: string;
  editedAt: string;
}

export interface AINoteDraft {
  noteId: string;
  sessionId: string;
  sessionData: SessionData;
  soapNote: SOAPNote;
  cptCodes: CPTCodeEntry[];
  status: NoteApprovalStatus;
  aiGeneratedAt: string;
  providerEdits: ProviderEdit[];
  providerSignedAt?: string;
  parentApproval?: ParentApproval;
  finalizedAt?: string;
  superbillReady: boolean;
  claimValidation: ClaimValidation;
}

export interface ClaimValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checklist: {
    cptCode: boolean;
    duration: boolean;
    providerNPI: boolean;
    diagnosisCode: boolean;
    placeOfService: boolean;
    parentSignature: boolean;
  };
}

// ============================================================================
// Templates by service type
// ============================================================================

const SERVICE_TEMPLATES: Record<ServiceType, SessionNoteTemplate> = {
  aba: {
    serviceType: 'aba',
    cptCodes: [
      { code: '97153', description: 'Adaptive behavior treatment by protocol (RBT/tech)', units: 4, unitDuration: 15 },
      { code: '97155', description: 'Adaptive behavior treatment, modified (BCBA)', units: 2, unitDuration: 15, requiresSupervision: false },
      { code: '97156', description: 'Family adaptive behavior treatment guidance (BCBA)', units: 1, unitDuration: 15 },
    ],
    noteStructure: 'SOAP',
    requiredFields: ['cptCode', 'duration', 'providerNPI', 'diagnosisCode', 'placeOfService'],
  },
  mh: {
    serviceType: 'mh',
    cptCodes: [
      { code: '90837', description: 'Psychotherapy, 60 min with patient', units: 1, unitDuration: 60 },
      { code: '90834', description: 'Psychotherapy, 45 min with patient', units: 1, unitDuration: 45 },
    ],
    noteStructure: 'SOAP',
    requiredFields: ['cptCode', 'duration', 'providerNPI', 'diagnosisCode', 'placeOfService'],
  },
  speech: {
    serviceType: 'speech',
    cptCodes: [
      { code: '92507', description: 'Speech-language therapy, individual', units: 2, unitDuration: 30 },
      { code: '92508', description: 'Speech-language therapy, group (2+)', units: 1, unitDuration: 45 },
    ],
    noteStructure: 'SOAP',
    requiredFields: ['cptCode', 'duration', 'providerNPI', 'diagnosisCode', 'placeOfService'],
  },
};

// ============================================================================
// SOAP Note Generation
// ============================================================================

function calcUnits(durationMinutes: number, unitDuration: number): number {
  return Math.floor(durationMinutes / unitDuration);
}

function goalSummary(goals: SessionGoal[]): string {
  if (!goals.length) return 'No specific goals documented for this session.';
  return goals
    .map((g) => `${g.description} (${g.percentCorrect}% correct across ${g.trialsCompleted} trials)`)
    .join('; ') + '.';
}

function generateSubjective(data: SessionData): string {
  const presentation = data.childPresentation ||
    `${data.childName} arrived ${['on time and appeared calm', 'slightly dysregulated but transitioned well', 'engaged and motivated'][Math.floor(Math.random() * 3)]}`;
  const parentReport = data.parentReport ||
    'Parent reported no significant behavioral concerns since last session. Sleep and appetite reported as stable.';
  return `${presentation}. ${parentReport} Child demonstrated ${
    data.goals.some((g) => g.percentCorrect >= 80) ? 'strong engagement' : 'moderate engagement'
  } with structured activities throughout the session.`;
}

function generateObjective(data: SessionData): string {
  const template = SERVICE_TEMPLATES[data.serviceType];
  const unitLines = template.cptCodes
    .map((c) => {
      const units = calcUnits(data.durationMinutes, c.unitDuration);
      return `  • CPT ${c.code} (${c.description}): ${units} unit${units !== 1 ? 's' : ''} × ${c.unitDuration} min`;
    })
    .join('\n');

  const goalLines = data.goals
    .map(
      (g) =>
        `  • ${g.description} [${g.domain}]: ${g.trialsCorrect}/${g.trialsCompleted} correct (${g.percentCorrect}% — mastery threshold ${g.masteryThreshold}%)`
    )
    .join('\n');

  const behaviorLines = data.behaviorData?.length
    ? '\nBehavior data:\n' +
      data.behaviorData
        .map((b) => `  • ${b.behavior}: freq=${b.frequency ?? 'N/A'}, intensity=${b.intensity ?? 'N/A'}`)
        .join('\n')
    : '';

  return `Session duration: ${data.durationMinutes} min | Date: ${data.dateOfService} | Place of service: ${
    data.placeOfService === '02' ? 'Telehealth (02)' : data.placeOfService === '10' ? 'Home (10)' : 'Office (11)'
  }\n\nBilling codes:\n${unitLines}\n\nGoal performance:\n${goalLines}${behaviorLines}`;
}

function generateAssessment(data: SessionData): string {
  const mastered = data.goals.filter((g) => g.percentCorrect >= g.masteryThreshold);
  const progressing = data.goals.filter((g) => g.percentCorrect >= 60 && g.percentCorrect < g.masteryThreshold);
  const emerging = data.goals.filter((g) => g.percentCorrect < 60);

  const lines: string[] = [];

  if (mastered.length) {
    lines.push(
      `${data.childName} demonstrated mastery-level performance on ${mastered.length} goal(s): ${mastered.map((g) => g.description).join(', ')}. These programs are candidates for advancement or maintenance phase.`
    );
  }
  if (progressing.length) {
    lines.push(
      `Progressing toward criterion on ${progressing.length} goal(s): ${progressing.map((g) => g.description).join(', ')}. Current trajectory is positive; continue current programming.`
    );
  }
  if (emerging.length) {
    lines.push(
      `${emerging.length} goal(s) remain in acquisition phase (${emerging.map((g) => g.description).join(', ')}). Consider prompt fading adjustments or task analysis review to support skill acquisition.`
    );
  }

  if (!lines.length) {
    lines.push('Session data collected and reviewed. Clinical judgment to be applied during next program review.');
  }

  const serviceNote =
    data.serviceType === 'aba'
      ? ' Behavioral strategies (differential reinforcement, prompting hierarchy) were implemented with fidelity per treatment plan.'
      : data.serviceType === 'speech'
      ? ' Therapeutic techniques including modeling, expansion, and functional communication training were utilized throughout.'
      : ' Evidenced-based therapeutic modalities were applied consistent with the individualized treatment plan.';

  return lines.join(' ') + serviceNote;
}

function generatePlan(data: SessionData): string {
  const nextFocus = data.goals[0]?.description ?? 'previously established program goals';
  return [
    `Next session focus: Continue programming on ${nextFocus} with adjusted prompt levels based on today's data.`,
    'Parent homework: Practice target skills in natural environment for 10–15 min/day; record any significant behaviors using the parent log in Aminy.',
    data.serviceType === 'aba'
      ? 'Program adjustment: Review reinforcer preference assessment; update token economy if engagement declines.'
      : data.serviceType === 'speech'
      ? 'Program adjustment: Introduce generalization activities across environments; consult with classroom teacher regarding carryover.'
      : 'Program adjustment: Coordinate with care team; review psychoeducation materials provided to family.',
    `Follow-up appointment: ${data.dateOfService} + 7 days (pending scheduling confirmation).`,
  ].join('\n');
}

function validateClaim(data: SessionData, draft: Partial<AINoteDraft>): ClaimValidation {
  const checklist = {
    cptCode: (draft.cptCodes?.length ?? 0) > 0,
    duration: data.durationMinutes > 0,
    providerNPI: !!data.providerNPI && data.providerNPI.length === 10,
    diagnosisCode: data.diagnosisCodes.length > 0,
    placeOfService: !!data.placeOfService,
    parentSignature: !!draft.parentApproval,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!checklist.cptCode) errors.push('No CPT code selected');
  if (!checklist.duration) errors.push('Session duration is zero');
  if (!checklist.providerNPI) errors.push('Provider NPI missing or invalid (must be 10 digits)');
  if (!checklist.diagnosisCode) errors.push('No diagnosis (ICD-10) code on file');
  if (!checklist.placeOfService) errors.push('Place of service code required');
  if (!checklist.parentSignature) warnings.push('Parent approval signature not yet captured');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checklist,
  };
}

// ============================================================================
// Public API
// ============================================================================

/** Generate an AI SOAP note draft from session metadata */
export function generateNoteDraft(data: SessionData): AINoteDraft {
  const template = SERVICE_TEMPLATES[data.serviceType];
  const cptCodes = template.cptCodes.map((c) => ({
    ...c,
    units: calcUnits(data.durationMinutes, c.unitDuration),
  }));

  const soapNote: SOAPNote = {
    subjective: generateSubjective(data),
    objective: generateObjective(data),
    assessment: generateAssessment(data),
    plan: generatePlan(data),
  };

  const draft: AINoteDraft = {
    noteId: `note-${data.sessionId}-${Date.now()}`,
    sessionId: data.sessionId,
    sessionData: data,
    soapNote,
    cptCodes,
    status: 'draft',
    aiGeneratedAt: new Date().toISOString(),
    providerEdits: [],
    superbillReady: false,
    claimValidation: { valid: false, errors: [], warnings: [], checklist: {
      cptCode: true, duration: true, providerNPI: true, diagnosisCode: true, placeOfService: true, parentSignature: false,
    }},
  };

  draft.claimValidation = validateClaim(data, draft);
  return draft;
}

/** Mark note as ready for provider review */
export function submitForProviderReview(draft: AINoteDraft): AINoteDraft {
  return { ...draft, status: 'ready_for_provider' };
}

/** Record what the provider changed vs. the AI draft */
export function providerEditsNote(
  draft: AINoteDraft,
  field: keyof SOAPNote,
  newText: string
): AINoteDraft {
  const edit: ProviderEdit = {
    field,
    originalText: draft.soapNote[field],
    editedText: newText,
    editedAt: new Date().toISOString(),
  };
  const updatedEdits = [
    ...draft.providerEdits.filter((e) => e.field !== field), // replace prior edit for same field
    edit,
  ];
  return {
    ...draft,
    soapNote: { ...draft.soapNote, [field]: newText },
    providerEdits: updatedEdits,
    status: 'provider_editing',
  };
}

/** Provider signs off and triggers parent notification */
export function submitForParentApproval(draft: AINoteDraft): AINoteDraft {
  return {
    ...draft,
    status: 'pending_parent_approval',
    providerSignedAt: new Date().toISOString(),
    claimValidation: validateClaim(draft.sessionData, draft),
  };
}

/** Parent approves the note with a signature */
export function parentApprovesNote(
  draft: AINoteDraft,
  signatureData: string,
  signatureType: 'drawn' | 'typed',
  parentName: string
): AINoteDraft {
  const approval: ParentApproval = {
    noteId: draft.noteId,
    approvedAt: new Date().toISOString(),
    signatureType,
    signatureData,
    parentName,
    parentId: draft.sessionData.parentId,
  };
  const updated = { ...draft, parentApproval: approval, status: 'parent_approved' as NoteApprovalStatus };
  updated.claimValidation = validateClaim(draft.sessionData, updated);
  return updated;
}

/** Lock the note — superbill-ready, no further edits */
export function finalizeNote(draft: AINoteDraft): AINoteDraft {
  const validation = validateClaim(draft.sessionData, draft);
  return {
    ...draft,
    status: 'finalized',
    finalizedAt: new Date().toISOString(),
    superbillReady: validation.valid,
    claimValidation: validation,
  };
}

/** Generate a plain-English parent summary from SOAP note */
export function generateParentSummary(draft: AINoteDraft): {
  whatHappenedToday: string;
  whatWeAreWorkingOn: string;
  yourHomeworkThisWeek: string;
} {
  const goals = draft.sessionData.goals;
  const bestGoal = goals.sort((a, b) => b.percentCorrect - a.percentCorrect)[0];

  return {
    whatHappenedToday: `${draft.sessionData.childName} had a great session today with ${draft.sessionData.providerName}! We worked on ${goals.length} skill${goals.length !== 1 ? 's' : ''} for ${draft.sessionData.durationMinutes} minutes. ${
      bestGoal ? `${draft.sessionData.childName} did especially well on "${bestGoal.description}" (${bestGoal.percentCorrect}% success rate — amazing!).` : ''
    }`,
    whatWeAreWorkingOn: goals
      .map((g) => `"${g.description}" — ${g.percentCorrect >= g.masteryThreshold ? 'Mastered!' : g.percentCorrect >= 60 ? 'Making great progress' : 'Still learning'}`)
      .join('; '),
    yourHomeworkThisWeek:
      'Practice the skills we worked on today for 10–15 minutes each day in natural settings like home or the park. Use the Aminy app to log what you observe. Every practice rep counts!',
  };
}

/** Get the service template for a given service type */
export function getServiceTemplate(serviceType: ServiceType): SessionNoteTemplate {
  return SERVICE_TEMPLATES[serviceType];
}

/** Create a realistic mock session for demos */
export function createMockSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    sessionId: `session-demo-${Date.now()}`,
    providerId: 'provider-001',
    providerName: 'Dr. Sarah Chen, BCBA',
    childId: 'child-001',
    childName: 'Alex',
    parentId: 'parent-001',
    dateOfService: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    durationMinutes: 60,
    serviceType: 'aba',
    placeOfService: '02',
    diagnosisCodes: ['F84.0'],
    providerNPI: '1234567890',
    goals: [
      {
        goalId: 'g1',
        description: 'Requesting preferred items using 2-word phrases',
        domain: 'Communication',
        trialsCompleted: 20,
        trialsCorrect: 17,
        percentCorrect: 85,
        masteryThreshold: 80,
        notes: 'Consistent performance across 3 consecutive sessions',
      },
      {
        goalId: 'g2',
        description: 'Following 2-step directions without gestural prompt',
        domain: 'Receptive Language',
        trialsCompleted: 15,
        trialsCorrect: 10,
        percentCorrect: 67,
        masteryThreshold: 80,
        notes: 'Improve gestural prompt fade; try partial physical prompt instead',
      },
      {
        goalId: 'g3',
        description: 'Tolerating peer proximity for 3+ minutes',
        domain: 'Social Skills',
        trialsCompleted: 10,
        trialsCorrect: 4,
        percentCorrect: 40,
        masteryThreshold: 80,
        notes: 'Emerging skill; gradually decrease proximity over next 4 sessions',
      },
    ],
    behaviorData: [
      { behavior: 'Elopement', frequency: 1, intensity: 'low' },
      { behavior: 'Stereotypy (hand flapping)', frequency: 8, intensity: 'low' },
    ],
    parentReport: 'Mom reported Alex slept well this week and had a positive experience at school on Friday.',
    childPresentation: 'Alex arrived calm and transitioned to the session room without difficulty',
    ...overrides,
  };
}
