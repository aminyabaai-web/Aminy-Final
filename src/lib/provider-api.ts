/**
 * Provider Data Sharing API
 *
 * FHIR-compatible data export for healthcare interoperability
 * Enables secure sharing of patient data with external providers and EHR systems
 *
 * Supports:
 * - FHIR R4 Patient, Observation, CarePlan, Goal resources
 * - Secure time-limited share links
 * - Audit logging for all data access
 * - Provider-specific data views
 */

import { ChildProfile, CarePlanGoal, InsightNavigator, conditionLabels, ConditionType } from './child-profiles';
import { Appointment, VisitSummary, Provider } from '../types/telehealth';

// ============================================================================
// FHIR R4 Resource Types
// ============================================================================

/**
 * FHIR R4 Patient Resource
 * https://www.hl7.org/fhir/patient.html
 */
export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
    source: string;
  };
  identifier: Array<{
    system: string;
    value: string;
  }>;
  active: boolean;
  name: Array<{
    use: 'official' | 'nickname';
    family?: string;
    given: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  // Extension for neurodevelopmental conditions
  extension?: Array<{
    url: string;
    valueCodeableConcept?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
  }>;
}

/**
 * FHIR R4 Observation Resource
 * Used for tracking behavioral observations and progress
 */
export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string; // Patient/id
    display: string;
  };
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  valueString?: string;
  note?: Array<{
    text: string;
    time?: string;
    authorString?: string;
  }>;
}

/**
 * FHIR R4 CarePlan Resource
 */
export interface FHIRCarePlan {
  resourceType: 'CarePlan';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  title: string;
  description?: string;
  subject: {
    reference: string;
    display: string;
  };
  period?: {
    start: string;
    end?: string;
  };
  created: string;
  activity?: Array<{
    detail: {
      status: 'not-started' | 'scheduled' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
      description: string;
      goal?: Array<{
        reference: string;
      }>;
    };
  }>;
  goal?: Array<{
    reference: string;
  }>;
}

/**
 * FHIR R4 Goal Resource
 */
export interface FHIRGoal {
  resourceType: 'Goal';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  lifecycleStatus: 'proposed' | 'planned' | 'accepted' | 'active' | 'on-hold' | 'completed' | 'cancelled' | 'entered-in-error' | 'rejected';
  achievementStatus?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  description: {
    text: string;
  };
  subject: {
    reference: string;
    display: string;
  };
  startDate?: string;
  target?: Array<{
    measure?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    detailQuantity?: {
      value: number;
      unit: string;
    };
    dueDate?: string;
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
}

/**
 * FHIR Bundle for exporting multiple resources
 */
export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  meta: {
    lastUpdated: string;
  };
  type: 'collection' | 'document' | 'message' | 'transaction' | 'searchset';
  timestamp: string;
  total: number;
  entry: Array<{
    fullUrl: string;
    resource: FHIRPatient | FHIRObservation | FHIRCarePlan | FHIRGoal;
  }>;
}

// ============================================================================
// Share Link Management
// ============================================================================

export interface ShareLink {
  id: string;
  childId: string;
  createdBy: string; // userId who created the link
  providerId?: string; // Optional: specific provider the link is for
  providerEmail?: string;
  accessLevel: 'summary' | 'full' | 'clinical';
  // What data to include
  includePatient: boolean;
  includeCarePlan: boolean;
  includeGoals: boolean;
  includeObservations: boolean;
  includeInsightNavigator: boolean;
  // Security
  expiresAt: string;
  accessCode?: string; // Optional PIN protection
  maxViews: number;
  viewCount: number;
  // Audit
  createdAt: string;
  lastAccessedAt?: string;
  accessLog: ShareLinkAccess[];
  isRevoked: boolean;
  revokedAt?: string;
}

export interface ShareLinkAccess {
  id: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  action: 'view' | 'download' | 'export';
}

// ============================================================================
// ICD-10 Diagnostic Codes
// ============================================================================

export const ICD10_CODES: Record<ConditionType, { code: string; display: string }> = {
  'autism': { code: 'F84.0', display: 'Autistic disorder' },
  'adhd': { code: 'F90.9', display: 'Attention-deficit hyperactivity disorder, unspecified type' },
  'anxiety': { code: 'F41.9', display: 'Anxiety disorder, unspecified' },
  'sensory-processing': { code: 'F88', display: 'Other disorders of psychological development' },
  'learning-disability': { code: 'F81.9', display: 'Developmental disorder of scholastic skills, unspecified' },
  'speech-delay': { code: 'F80.9', display: 'Developmental disorder of speech and language, unspecified' },
  'developmental-delay': { code: 'F89', display: 'Unspecified disorder of psychological development' },
  'ocd': { code: 'F42.9', display: 'Obsessive-compulsive disorder, unspecified' },
  'depression': { code: 'F32.9', display: 'Major depressive disorder, single episode, unspecified' },
  'other': { code: 'F99', display: 'Mental disorder, not otherwise specified' },
};

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert ChildProfile to FHIR Patient resource
 */
export function childToFHIRPatient(child: ChildProfile): FHIRPatient {
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: `patient-${child.id}`,
    meta: {
      versionId: '1',
      lastUpdated: child.updatedAt,
      source: 'aminy-app',
    },
    identifier: [
      {
        system: 'urn:aminy:patient-id',
        value: child.id,
      },
    ],
    active: child.isActive,
    name: [
      {
        use: 'official',
        family: child.lastName,
        given: [child.firstName],
      },
    ],
    birthDate: child.dateOfBirth,
  };

  // Add nickname if exists
  if (child.nickname) {
    patient.name.push({
      use: 'nickname',
      given: [child.nickname],
    });
  }

  // Map gender
  if (child.gender) {
    const genderMap: Record<string, 'male' | 'female' | 'other' | 'unknown'> = {
      'male': 'male',
      'female': 'female',
      'non-binary': 'other',
      'prefer-not-to-say': 'unknown',
    };
    patient.gender = genderMap[child.gender];
  }

  // Add conditions as extensions
  if (child.conditions.length > 0) {
    patient.extension = child.conditions.map(condition => ({
      url: 'http://hl7.org/fhir/StructureDefinition/patient-diagnosis',
      valueCodeableConcept: {
        coding: [{
          system: 'http://hl7.org/fhir/sid/icd-10-cm',
          code: ICD10_CODES[condition]?.code || 'F99',
          display: ICD10_CODES[condition]?.display || conditionLabels[condition],
        }],
      },
    }));
  }

  return patient;
}

/**
 * Convert CarePlanGoal to FHIR Goal resource
 */
export function goalToFHIRGoal(goal: CarePlanGoal, childId: string, childName: string): FHIRGoal {
  // Map goal status to FHIR lifecycle status
  const statusMap: Record<string, 'proposed' | 'active' | 'completed' | 'on-hold'> = {
    'not-started': 'proposed',
    'in-progress': 'active',
    'achieved': 'completed',
    'paused': 'on-hold',
  };

  // Map to achievement status
  const achievementMap: Record<string, string> = {
    'not-started': 'not-started',
    'in-progress': 'in-progress',
    'achieved': 'achieved',
    'paused': 'not-attainable',
  };

  const fhirGoal: FHIRGoal = {
    resourceType: 'Goal',
    id: `goal-${goal.id}`,
    meta: {
      versionId: '1',
      lastUpdated: goal.updatedAt,
    },
    lifecycleStatus: statusMap[goal.status] || 'active',
    achievementStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/goal-achievement',
        code: achievementMap[goal.status] || 'in-progress',
        display: goal.status.replace('-', ' '),
      }],
    },
    category: [{
      coding: [{
        system: 'urn:aminy:goal-category',
        code: goal.area.toLowerCase().replace(/\s+/g, '-'),
        display: goal.area,
      }],
    }],
    description: {
      text: `${goal.title}: ${goal.description}`,
    },
    subject: {
      reference: `Patient/patient-${childId}`,
      display: childName,
    },
    startDate: goal.createdAt.split('T')[0],
    target: [{
      measure: {
        coding: [{
          system: 'urn:aminy:goal-measure',
          code: 'percentage',
          display: 'Percentage Complete',
        }],
      },
      detailQuantity: {
        value: goal.target,
        unit: '%',
      },
      dueDate: goal.targetDate,
    }],
  };

  // Add notes
  if (goal.notes.length > 0) {
    fhirGoal.note = goal.notes.map(note => ({
      text: note,
      time: goal.updatedAt,
    }));
  }

  return fhirGoal;
}

/**
 * Convert progress data to FHIR Observation
 */
export function progressToFHIRObservation(
  observationId: string,
  childId: string,
  childName: string,
  category: string,
  value: number,
  date: string,
  notes?: string
): FHIRObservation {
  return {
    resourceType: 'Observation',
    id: observationId,
    meta: {
      versionId: '1',
      lastUpdated: date,
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'survey',
        display: 'Survey',
      }],
    }],
    code: {
      coding: [{
        system: 'urn:aminy:observation-type',
        code: category.toLowerCase().replace(/\s+/g, '-'),
        display: category,
      }],
      text: category,
    },
    subject: {
      reference: `Patient/patient-${childId}`,
      display: childName,
    },
    effectiveDateTime: date,
    valueQuantity: {
      value,
      unit: '%',
      system: 'http://unitsofmeasure.org',
      code: '%',
    },
    note: notes ? [{ text: notes }] : undefined,
  };
}

/**
 * Create FHIR CarePlan from child's care plan data
 */
export function createFHIRCarePlan(
  child: ChildProfile,
  goals: FHIRGoal[]
): FHIRCarePlan | null {
  if (!child.carePlan) return null;

  return {
    resourceType: 'CarePlan',
    id: `careplan-${child.carePlan.id}`,
    meta: {
      versionId: '1',
      lastUpdated: child.carePlan.lastUpdated,
    },
    status: 'active',
    intent: 'plan',
    title: `Care Plan for ${child.firstName}`,
    description: `Comprehensive behavior and development support plan`,
    subject: {
      reference: `Patient/patient-${child.id}`,
      display: child.firstName,
    },
    created: child.carePlan.lastUpdated,
    activity: child.carePlan.routines.filter(r => r.isActive).map(routine => ({
      detail: {
        status: 'in-progress',
        description: `${routine.name} (${routine.timeOfDay}): ${routine.steps.length} steps`,
      },
    })),
    goal: goals.map(g => ({
      reference: `Goal/${g.id}`,
    })),
  };
}

/**
 * Create a complete FHIR Bundle with all relevant resources
 */
export function createFHIRBundle(
  child: ChildProfile,
  options: {
    includePatient?: boolean;
    includeCarePlan?: boolean;
    includeGoals?: boolean;
    includeObservations?: boolean;
  } = {}
): FHIRBundle {
  const {
    includePatient = true,
    includeCarePlan = true,
    includeGoals = true,
    includeObservations = true,
  } = options;

  const entries: FHIRBundle['entry'] = [];
  const baseUrl = 'urn:uuid:';

  // Add Patient
  if (includePatient) {
    const patient = childToFHIRPatient(child);
    entries.push({
      fullUrl: `${baseUrl}${patient.id}`,
      resource: patient,
    });
  }

  // Add Goals
  const fhirGoals: FHIRGoal[] = [];
  if (includeGoals && child.carePlan?.goals) {
    child.carePlan.goals.forEach(goal => {
      const fhirGoal = goalToFHIRGoal(goal, child.id, child.firstName);
      fhirGoals.push(fhirGoal);
      entries.push({
        fullUrl: `${baseUrl}${fhirGoal.id}`,
        resource: fhirGoal,
      });
    });
  }

  // Add CarePlan
  if (includeCarePlan && child.carePlan) {
    const carePlan = createFHIRCarePlan(child, fhirGoals);
    if (carePlan) {
      entries.push({
        fullUrl: `${baseUrl}${carePlan.id}`,
        resource: carePlan,
      });
    }
  }

  // Add sample observations (would be populated from real tracking data)
  if (includeObservations && child.carePlan?.goals) {
    child.carePlan.goals.forEach((goal, index) => {
      // Create observation for current progress
      const observation = progressToFHIRObservation(
        `observation-${goal.id}-current`,
        child.id,
        child.firstName,
        goal.area,
        goal.current,
        new Date().toISOString()
      );
      entries.push({
        fullUrl: `${baseUrl}${observation.id}`,
        resource: observation,
      });
    });
  }

  return {
    resourceType: 'Bundle',
    id: `bundle-${child.id}-${Date.now()}`,
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
  };
}

// ============================================================================
// Share Link Functions
// ============================================================================

/**
 * Generate a unique share link ID
 */
function generateShareLinkId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new share link
 */
export function createShareLink(
  childId: string,
  createdBy: string,
  options: {
    accessLevel?: 'summary' | 'full' | 'clinical';
    providerId?: string;
    providerEmail?: string;
    expiresInHours?: number;
    maxViews?: number;
    accessCode?: string;
    includePatient?: boolean;
    includeCarePlan?: boolean;
    includeGoals?: boolean;
    includeObservations?: boolean;
    includeInsightNavigator?: boolean;
  } = {}
): ShareLink {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (options.expiresInHours || 72) * 60 * 60 * 1000);

  return {
    id: generateShareLinkId(),
    childId,
    createdBy,
    providerId: options.providerId,
    providerEmail: options.providerEmail,
    accessLevel: options.accessLevel || 'summary',
    includePatient: options.includePatient ?? true,
    includeCarePlan: options.includeCarePlan ?? true,
    includeGoals: options.includeGoals ?? true,
    includeObservations: options.includeObservations ?? false,
    includeInsightNavigator: options.includeInsightNavigator ?? false,
    expiresAt: expiresAt.toISOString(),
    accessCode: options.accessCode,
    maxViews: options.maxViews || 10,
    viewCount: 0,
    createdAt: now.toISOString(),
    accessLog: [],
    isRevoked: false,
  };
}

/**
 * Validate share link access
 */
export function validateShareLink(
  link: ShareLink,
  accessCode?: string
): { valid: boolean; error?: string } {
  // Check if revoked
  if (link.isRevoked) {
    return { valid: false, error: 'This share link has been revoked' };
  }

  // Check expiration
  if (new Date(link.expiresAt) < new Date()) {
    return { valid: false, error: 'This share link has expired' };
  }

  // Check view count
  if (link.viewCount >= link.maxViews) {
    return { valid: false, error: 'This share link has reached its view limit' };
  }

  // Check access code
  if (link.accessCode && link.accessCode !== accessCode) {
    return { valid: false, error: 'Invalid access code' };
  }

  return { valid: true };
}

/**
 * Log access to a share link
 */
export function logShareLinkAccess(
  link: ShareLink,
  action: 'view' | 'download' | 'export',
  ipAddress?: string,
  userAgent?: string
): ShareLink {
  const access: ShareLinkAccess = {
    id: `access-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ipAddress,
    userAgent,
    action,
  };

  return {
    ...link,
    viewCount: link.viewCount + 1,
    lastAccessedAt: access.timestamp,
    accessLog: [...link.accessLog, access],
  };
}

/**
 * Revoke a share link
 */
export function revokeShareLink(link: ShareLink): ShareLink {
  return {
    ...link,
    isRevoked: true,
    revokedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Provider Summary Generation
// ============================================================================

export interface ProviderSummary {
  child: {
    name: string;
    age: number;
    conditions: string[];
    primaryCondition?: string;
  };
  quickStart: {
    mustKnow: string[];
    approachGuidance: string[];
    avoidThese: string[];
  };
  currentGoals: Array<{
    area: string;
    title: string;
    progress: number;
    target: number;
    status: string;
  }>;
  recentProgress: Array<{
    date: string;
    area: string;
    description: string;
  }>;
  whatsWorking: string[];
  currentChallenges: string[];
  recommendations: string[];
  generatedAt: string;
}

/**
 * Generate a provider-friendly summary
 */
export function generateProviderSummary(
  child: ChildProfile,
  insightNavigator?: InsightNavigator
): ProviderSummary {
  const summary: ProviderSummary = {
    child: {
      name: child.firstName,
      age: child.age,
      conditions: child.conditions.map(c => conditionLabels[c]),
      primaryCondition: child.primaryCondition ? conditionLabels[child.primaryCondition] : undefined,
    },
    quickStart: {
      mustKnow: insightNavigator?.providerQuickStart?.mustKnow || [],
      approachGuidance: insightNavigator?.providerQuickStart?.approachGuidance || [],
      avoidThese: insightNavigator?.providerQuickStart?.avoidThese || [],
    },
    currentGoals: child.carePlan?.goals.map(g => ({
      area: g.area,
      title: g.title,
      progress: g.current,
      target: g.target,
      status: g.status.replace('-', ' '),
    })) || [],
    recentProgress: insightNavigator?.progressTimeline?.slice(0, 5).map(p => ({
      date: p.date,
      area: p.area,
      description: p.description,
    })) || [],
    whatsWorking: insightNavigator?.insights?.whatsWorking?.map(i => i.content) || [],
    currentChallenges: insightNavigator?.currentPresentation?.challenges || [],
    recommendations: insightNavigator?.insights?.recommendations?.map(r => r.content) || [],
    generatedAt: new Date().toISOString(),
  };

  return summary;
}

// ============================================================================
// Data Export Utilities
// ============================================================================

/**
 * Export FHIR Bundle as JSON string
 */
export function exportBundleAsJSON(bundle: FHIRBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Validate FHIR Bundle structure
 */
export function validateFHIRBundle(bundle: FHIRBundle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (bundle.resourceType !== 'Bundle') {
    errors.push('Invalid resourceType: must be "Bundle"');
  }

  if (!bundle.id) {
    errors.push('Bundle must have an id');
  }

  if (!['collection', 'document', 'message', 'transaction', 'searchset'].includes(bundle.type)) {
    errors.push(`Invalid bundle type: ${bundle.type}`);
  }

  bundle.entry?.forEach((entry, index) => {
    if (!entry.resource) {
      errors.push(`Entry ${index} is missing resource`);
    }
    if (!entry.fullUrl) {
      errors.push(`Entry ${index} is missing fullUrl`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Storage Keys (for localStorage during development)
// ============================================================================

const STORAGE_KEYS = {
  SHARE_LINKS: 'aminy_share_links',
  ACCESS_LOG: 'aminy_provider_access_log',
};

/**
 * Save share link to storage
 */
export function saveShareLink(link: ShareLink): void {
  const links = getShareLinks();
  const index = links.findIndex(l => l.id === link.id);
  if (index >= 0) {
    links[index] = link;
  } else {
    links.push(link);
  }
  localStorage.setItem(STORAGE_KEYS.SHARE_LINKS, JSON.stringify(links));
}

/**
 * Get all share links
 */
export function getShareLinks(): ShareLink[] {
  const stored = localStorage.getItem(STORAGE_KEYS.SHARE_LINKS);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Get share link by ID
 */
export function getShareLinkById(id: string): ShareLink | undefined {
  return getShareLinks().find(l => l.id === id);
}

/**
 * Get share links for a child
 */
export function getShareLinksForChild(childId: string): ShareLink[] {
  return getShareLinks().filter(l => l.childId === childId);
}

/**
 * Delete expired share links
 */
export function cleanupExpiredLinks(): number {
  const links = getShareLinks();
  const now = new Date();
  const activeLinks = links.filter(l =>
    !l.isRevoked && new Date(l.expiresAt) > now
  );
  const removedCount = links.length - activeLinks.length;
  localStorage.setItem(STORAGE_KEYS.SHARE_LINKS, JSON.stringify(activeLinks));
  return removedCount;
}
