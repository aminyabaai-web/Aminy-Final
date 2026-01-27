/**
 * FHIR R4 Integration for EHR Interoperability
 * Enables data exchange with Epic, Cerner, and other FHIR-compliant systems
 *
 * Implements:
 * - Patient resource mapping
 * - Observation resources (developmental screenings)
 * - CarePlan resources
 * - DocumentReference for reports
 * - SMART on FHIR authorization
 */

import { createClientSupabaseClient } from '../utils/supabase/client';

const supabase = createClientSupabaseClient();

// ============================================================================
// FHIR RESOURCE TYPES (R4 Compliant)
// ============================================================================

/**
 * FHIR Patient Resource
 */
export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  active?: boolean;
  name: Array<{
    use?: 'official' | 'usual' | 'temp' | 'nickname' | 'anonymous';
    family: string;
    given: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'email' | 'fax';
    value: string;
    use?: 'home' | 'work' | 'mobile';
  }>;
  address?: Array<{
    use?: 'home' | 'work' | 'temp';
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  communication?: Array<{
    language: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    preferred?: boolean;
  }>;
}

/**
 * FHIR Observation Resource (for screenings and assessments)
 */
export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  meta?: {
    lastUpdated?: string;
    profile?: string[];
  };
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'cancelled';
  category?: Array<{
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
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  performer?: Array<{
    reference: string;
    display?: string;
  }>;
  valueQuantity?: {
    value: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueCodeableConcept?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  valueString?: string;
  interpretation?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
  component?: Array<{
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    valueQuantity?: {
      value: number;
      unit?: string;
    };
    valueString?: string;
  }>;
}

/**
 * FHIR CarePlan Resource
 */
export interface FHIRCarePlan {
  resourceType: 'CarePlan';
  id: string;
  meta?: {
    lastUpdated?: string;
    profile?: string[];
  };
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  title?: string;
  description?: string;
  subject: {
    reference: string;
    display?: string;
  };
  period?: {
    start: string;
    end?: string;
  };
  created?: string;
  author?: {
    reference: string;
    display?: string;
  };
  contributor?: Array<{
    reference: string;
    display?: string;
  }>;
  careTeam?: Array<{
    reference: string;
    display?: string;
  }>;
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  goal?: Array<{
    reference: string;
    display?: string;
  }>;
  activity?: Array<{
    detail?: {
      status: 'not-started' | 'scheduled' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
      code?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
        text?: string;
      };
      description?: string;
      scheduledTiming?: {
        repeat?: {
          frequency?: number;
          period?: number;
          periodUnit?: 'h' | 'd' | 'wk' | 'mo';
        };
      };
    };
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
}

/**
 * FHIR DocumentReference Resource (for reports)
 */
export interface FHIRDocumentReference {
  resourceType: 'DocumentReference';
  id: string;
  meta?: {
    lastUpdated?: string;
  };
  status: 'current' | 'superseded' | 'entered-in-error';
  type: {
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
  subject: {
    reference: string;
    display?: string;
  };
  date?: string;
  author?: Array<{
    reference: string;
    display?: string;
  }>;
  description?: string;
  content: Array<{
    attachment: {
      contentType: string;
      data?: string; // base64 encoded
      url?: string;
      title?: string;
      creation?: string;
    };
  }>;
}

// ============================================================================
// LOINC CODES FOR DEVELOPMENTAL ASSESSMENTS
// ============================================================================

export const LOINC_CODES = {
  // M-CHAT-R (Modified Checklist for Autism in Toddlers)
  MCHAT: {
    system: 'http://loinc.org',
    code: '72135-9',
    display: 'M-CHAT-R/F [Modified Checklist for Autism in Toddlers, Revised with Follow-Up]',
  },
  MCHAT_SCORE: {
    system: 'http://loinc.org',
    code: '72134-2',
    display: 'M-CHAT-R Total score',
  },
  // PHQ-9 (Depression screening)
  PHQ9: {
    system: 'http://loinc.org',
    code: '44249-1',
    display: 'PHQ-9 quick depression assessment panel',
  },
  PHQ9_SCORE: {
    system: 'http://loinc.org',
    code: '44261-6',
    display: 'PHQ-9 Total score',
  },
  // GAD-7 (Anxiety screening)
  GAD7: {
    system: 'http://loinc.org',
    code: '69737-5',
    display: 'GAD-7 Generalized anxiety disorder 7 item',
  },
  GAD7_SCORE: {
    system: 'http://loinc.org',
    code: '70274-6',
    display: 'GAD-7 Total score',
  },
  // Developmental milestones
  DEVELOPMENTAL_ASSESSMENT: {
    system: 'http://loinc.org',
    code: '62377-7',
    display: 'Developmental assessment',
  },
};

// ============================================================================
// SMART ON FHIR CONFIGURATION
// ============================================================================

export interface SMARTConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string[];
  fhirBaseUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
}

// Common EHR configurations
export const EHR_CONFIGS: Record<string, Partial<SMARTConfig>> = {
  epic: {
    scope: [
      'openid',
      'fhirUser',
      'patient/Patient.read',
      'patient/Observation.read',
      'patient/Observation.write',
      'patient/CarePlan.read',
      'patient/CarePlan.write',
      'patient/DocumentReference.write',
    ],
    authorizeUrl: '/oauth2/authorize',
    tokenUrl: '/oauth2/token',
  },
  cerner: {
    scope: [
      'openid',
      'profile',
      'patient/Patient.read',
      'patient/Observation.read',
      'patient/Observation.write',
      'patient/CarePlan.read',
      'patient/CarePlan.write',
    ],
    authorizeUrl: '/oauth2/authorize',
    tokenUrl: '/oauth2/token',
  },
  smart_sandbox: {
    fhirBaseUrl: 'https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMV0/fhir',
    scope: [
      'openid',
      'profile',
      'patient/*.*',
      'launch/patient',
    ],
  },
};

// ============================================================================
// DATA MAPPING FUNCTIONS
// ============================================================================

/**
 * Map Aminy child profile to FHIR Patient
 */
export function mapChildToFHIRPatient(child: {
  id: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
}): FHIRPatient {
  return {
    resourceType: 'Patient',
    id: child.id,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
    },
    identifier: [
      {
        system: 'https://aminy.app/patient-id',
        value: child.id,
      },
    ],
    active: true,
    name: [
      {
        use: 'official',
        family: child.lastName || 'Unknown',
        given: [child.firstName],
      },
    ],
    gender: child.gender === 'male' || child.gender === 'female' ? child.gender : 'unknown',
    birthDate: child.dateOfBirth,
  };
}

/**
 * Map screening result to FHIR Observation
 */
export function mapScreeningToFHIRObservation(screening: {
  id: string;
  type: 'MCHAT' | 'PHQ9' | 'GAD7' | 'DEVELOPMENTAL';
  patientId: string;
  score: number;
  severity?: string;
  completedAt: string;
  components?: Array<{ code: string; value: number | string }>;
}): FHIRObservation {
  const codeMap = {
    MCHAT: LOINC_CODES.MCHAT,
    PHQ9: LOINC_CODES.PHQ9,
    GAD7: LOINC_CODES.GAD7,
    DEVELOPMENTAL: LOINC_CODES.DEVELOPMENTAL_ASSESSMENT,
  };

  const scoreCodeMap = {
    MCHAT: LOINC_CODES.MCHAT_SCORE,
    PHQ9: LOINC_CODES.PHQ9_SCORE,
    GAD7: LOINC_CODES.GAD7_SCORE,
    DEVELOPMENTAL: LOINC_CODES.DEVELOPMENTAL_ASSESSMENT,
  };

  const interpretationMap: Record<string, { code: string; display: string }> = {
    minimal: { code: 'N', display: 'Normal' },
    mild: { code: 'L', display: 'Low' },
    moderate: { code: 'H', display: 'High' },
    severe: { code: 'HH', display: 'Critical high' },
  };

  const observation: FHIRObservation = {
    resourceType: 'Observation',
    id: screening.id,
    meta: {
      lastUpdated: screening.completedAt,
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-screening-assessment'],
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey',
          },
        ],
      },
    ],
    code: {
      coding: [codeMap[screening.type]],
      text: codeMap[screening.type].display,
    },
    subject: {
      reference: `Patient/${screening.patientId}`,
    },
    effectiveDateTime: screening.completedAt,
    issued: screening.completedAt,
    valueQuantity: {
      value: screening.score,
      unit: 'score',
      system: 'http://unitsofmeasure.org',
      code: '{score}',
    },
  };

  // Add interpretation if severity provided
  if (screening.severity && interpretationMap[screening.severity]) {
    observation.interpretation = [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            ...interpretationMap[screening.severity],
          },
        ],
      },
    ];
  }

  // Add component observations for subscores
  if (screening.components && screening.components.length > 0) {
    observation.component = screening.components.map(comp => ({
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: comp.code,
            display: comp.code,
          },
        ],
      },
      valueQuantity: typeof comp.value === 'number' ? { value: comp.value } : undefined,
      valueString: typeof comp.value === 'string' ? comp.value : undefined,
    }));
  }

  return observation;
}

/**
 * Map care plan to FHIR CarePlan
 */
export function mapCarePlanToFHIR(carePlan: {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  goals: Array<{ id: string; description: string }>;
  activities: Array<{
    description: string;
    frequency?: string;
    status: string;
  }>;
  startDate: string;
  endDate?: string;
}): FHIRCarePlan {
  return {
    resourceType: 'CarePlan',
    id: carePlan.id,
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    status: 'active',
    intent: 'plan',
    title: carePlan.title,
    description: carePlan.description,
    subject: {
      reference: `Patient/${carePlan.patientId}`,
    },
    period: {
      start: carePlan.startDate,
      end: carePlan.endDate,
    },
    created: new Date().toISOString(),
    category: [
      {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/core/CodeSystem/careplan-category',
            code: 'assess-plan',
            display: 'Assessment and Plan of Treatment',
          },
        ],
      },
    ],
    goal: carePlan.goals.map(goal => ({
      reference: `Goal/${goal.id}`,
      display: goal.description,
    })),
    activity: carePlan.activities.map(activity => ({
      detail: {
        status: activity.status === 'completed' ? 'completed' : 'in-progress',
        description: activity.description,
        scheduledTiming: activity.frequency
          ? {
              repeat: {
                frequency: 1,
                period: 1,
                periodUnit: 'd' as const,
              },
            }
          : undefined,
      },
    })),
  };
}

// ============================================================================
// FHIR CLIENT
// ============================================================================

export class FHIRClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string, accessToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.accessToken = accessToken || null;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FHIR request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Patient operations
  async getPatient(id: string): Promise<FHIRPatient> {
    return this.request('GET', `/Patient/${id}`);
  }

  async createPatient(patient: FHIRPatient): Promise<FHIRPatient> {
    return this.request('POST', '/Patient', patient);
  }

  async updatePatient(patient: FHIRPatient): Promise<FHIRPatient> {
    return this.request('PUT', `/Patient/${patient.id}`, patient);
  }

  // Observation operations
  async getObservations(patientId: string, category?: string): Promise<{ entry: Array<{ resource: FHIRObservation }> }> {
    let path = `/Observation?patient=${patientId}`;
    if (category) {
      path += `&category=${category}`;
    }
    return this.request('GET', path);
  }

  async createObservation(observation: FHIRObservation): Promise<FHIRObservation> {
    return this.request('POST', '/Observation', observation);
  }

  // CarePlan operations
  async getCarePlans(patientId: string): Promise<{ entry: Array<{ resource: FHIRCarePlan }> }> {
    return this.request('GET', `/CarePlan?patient=${patientId}`);
  }

  async createCarePlan(carePlan: FHIRCarePlan): Promise<FHIRCarePlan> {
    return this.request('POST', '/CarePlan', carePlan);
  }

  async updateCarePlan(carePlan: FHIRCarePlan): Promise<FHIRCarePlan> {
    return this.request('PUT', `/CarePlan/${carePlan.id}`, carePlan);
  }

  // DocumentReference operations
  async createDocumentReference(doc: FHIRDocumentReference): Promise<FHIRDocumentReference> {
    return this.request('POST', '/DocumentReference', doc);
  }

  // Metadata
  async getCapabilityStatement(): Promise<unknown> {
    return this.request('GET', '/metadata');
  }
}

// ============================================================================
// SMART ON FHIR AUTHORIZATION
// ============================================================================

/**
 * Initiate SMART on FHIR authorization
 */
export function initiateSMARTAuth(config: SMARTConfig): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem('smart_state', state);
  sessionStorage.setItem('smart_config', JSON.stringify(config));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(' '),
    state,
    aud: config.fhirBaseUrl,
  });

  window.location.href = `${config.fhirBaseUrl}${config.authorizeUrl}?${params.toString()}`;
}

/**
 * Handle SMART on FHIR callback
 */
export async function handleSMARTCallback(
  code: string,
  state: string
): Promise<{ accessToken: string; patient?: string; expiresIn: number }> {
  const savedState = sessionStorage.getItem('smart_state');
  if (state !== savedState) {
    throw new Error('Invalid state parameter');
  }

  const configStr = sessionStorage.getItem('smart_config');
  if (!configStr) {
    throw new Error('Missing SMART configuration');
  }

  const config: SMARTConfig = JSON.parse(configStr);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
  });

  if (config.clientSecret) {
    params.append('client_secret', config.clientSecret);
  }

  const response = await fetch(`${config.fhirBaseUrl}${config.tokenUrl}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Token exchange failed');
  }

  const tokenResponse = await response.json();

  // Clean up
  sessionStorage.removeItem('smart_state');
  sessionStorage.removeItem('smart_config');

  return {
    accessToken: tokenResponse.access_token,
    patient: tokenResponse.patient,
    expiresIn: tokenResponse.expires_in,
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync screening results to EHR
 */
export async function syncScreeningToEHR(
  client: FHIRClient,
  screening: {
    id: string;
    type: 'MCHAT' | 'PHQ9' | 'GAD7' | 'DEVELOPMENTAL';
    patientId: string;
    score: number;
    severity?: string;
    completedAt: string;
  }
): Promise<FHIRObservation> {
  const observation = mapScreeningToFHIRObservation(screening);
  return client.createObservation(observation);
}

/**
 * Sync care plan to EHR
 */
export async function syncCarePlanToEHR(
  client: FHIRClient,
  carePlan: {
    id: string;
    patientId: string;
    title: string;
    description?: string;
    goals: Array<{ id: string; description: string }>;
    activities: Array<{
      description: string;
      frequency?: string;
      status: string;
    }>;
    startDate: string;
  }
): Promise<FHIRCarePlan> {
  const fhirCarePlan = mapCarePlanToFHIR(carePlan);
  return client.createCarePlan(fhirCarePlan);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // FHIR Resources
  LOINC_CODES,
  EHR_CONFIGS,

  // Mapping functions
  mapChildToFHIRPatient,
  mapScreeningToFHIRObservation,
  mapCarePlanToFHIR,

  // Client
  FHIRClient,

  // Authorization
  initiateSMARTAuth,
  handleSMARTCallback,

  // Sync
  syncScreeningToEHR,
  syncCarePlanToEHR,
};
