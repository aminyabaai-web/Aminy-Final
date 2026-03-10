/**
 * FHIR R4 Resources for Aminy Telehealth
 *
 * Produces HL7 FHIR R4-compliant JSON resources for data portability.
 * Supports: Patient, Encounter, Condition, Bundle, DocumentReference.
 *
 * Reference: https://hl7.org/fhir/R4/
 */

import { logAuditEvent } from './audit-logger';

// ── FHIR R4 Base Interfaces ──

export interface FHIRResource {
  resourceType: string;
  id: string;
  meta?: {
    lastUpdated?: string;
    profile?: string[];
  };
}

export interface FHIRReference {
  reference: string;
  display?: string;
}

export interface FHIRCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text?: string;
}

export interface FHIRIdentifier {
  system: string;
  value: string;
}

export interface FHIRPeriod {
  start: string;
  end?: string;
}

export interface FHIRHumanName {
  use?: 'official' | 'usual' | 'nickname';
  family?: string;
  given?: string[];
  text?: string;
}

// ── Patient Resource ──

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: FHIRIdentifier[];
  name: FHIRHumanName[];
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  address?: Array<{
    use?: string;
    state?: string;
    postalCode?: string;
  }>;
  contact?: Array<{
    relationship: FHIRCodeableConcept[];
    name: FHIRHumanName;
  }>;
}

// ── Encounter Resource ──

export interface FHIREncounter extends FHIRResource {
  resourceType: 'Encounter';
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: FHIRCoding;
  type?: FHIRCodeableConcept[];
  subject: FHIRReference;
  participant?: Array<{
    type?: FHIRCodeableConcept[];
    individual?: FHIRReference;
  }>;
  period: FHIRPeriod;
  reasonCode?: FHIRCodeableConcept[];
  serviceType?: FHIRCodeableConcept;
}

// ── Condition Resource ──

export interface FHIRCondition extends FHIRResource {
  resourceType: 'Condition';
  clinicalStatus: FHIRCodeableConcept;
  category: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  onsetDateTime?: string;
  recordedDate?: string;
}

// ── DocumentReference Resource ──

export interface FHIRDocumentReference extends FHIRResource {
  resourceType: 'DocumentReference';
  status: 'current' | 'superseded' | 'entered-in-error';
  type: FHIRCodeableConcept;
  subject: FHIRReference;
  date: string;
  content: Array<{
    attachment: {
      contentType: string;
      title?: string;
      creation?: string;
    };
  }>;
}

// ── Bundle Resource ──

export interface FHIRBundleEntry {
  fullUrl?: string;
  resource: FHIRResource;
}

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  type: 'collection' | 'document' | 'searchset' | 'transaction';
  timestamp?: string;
  total?: number;
  entry: FHIRBundleEntry[];
}

// ── Converters ──

/**
 * Input types for converters — loose to accept various app formats
 */
export interface AppChild {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  dob?: string;
  gender?: string;
  state?: string;
  diagnosisCodes?: string[];
}

export interface AppAppointment {
  id: string;
  appointmentId?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  scheduledDate?: string;
  duration?: number;
  type?: string;
  serviceType?: string;
  providerName?: string;
  providerId?: string;
  reason?: string;
  notes?: string;
}

/**
 * Convert an Aminy child profile to a FHIR R4 Patient
 */
export function toFHIRPatient(child: AppChild, parentName?: string): FHIRPatient {
  const nameParts = (child.name || '').split(' ');
  const firstName = child.firstName || nameParts[0] || '';
  const lastName = child.lastName || nameParts.slice(1).join(' ') || '';

  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: child.id,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
    },
    identifier: [
      {
        system: 'urn:aminy:patient-id',
        value: child.id,
      },
    ],
    name: [
      {
        use: 'official',
        family: lastName,
        given: firstName ? [firstName] : [],
        text: child.name || `${firstName} ${lastName}`.trim(),
      },
    ],
  };

  // Birth date
  const dob = child.dateOfBirth || child.dob;
  if (dob) {
    patient.birthDate = dob.substring(0, 10); // YYYY-MM-DD
  }

  // Gender
  if (child.gender) {
    const g = child.gender.toLowerCase();
    patient.gender = g === 'male' || g === 'm' ? 'male'
      : g === 'female' || g === 'f' ? 'female'
      : 'unknown';
  }

  // State
  if (child.state) {
    patient.address = [{ use: 'home', state: child.state }];
  }

  // Parent contact
  if (parentName) {
    patient.contact = [
      {
        relationship: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
            code: 'N',
            display: 'Next-of-Kin',
          }],
          text: 'Parent/Guardian',
        }],
        name: { text: parentName },
      },
    ];
  }

  return patient;
}

/**
 * Convert an Aminy appointment/session to a FHIR R4 Encounter
 */
export function toFHIREncounter(
  appointment: AppAppointment | Record<string, unknown>,
  childId: string
): FHIREncounter {
  const apt = appointment as AppAppointment;
  const id = apt.id || apt.appointmentId || `enc-${Date.now()}`;

  // Map status
  let status: FHIREncounter['status'] = 'planned';
  const rawStatus = (apt.status || '').toLowerCase();
  if (rawStatus === 'completed' || rawStatus === 'finished') status = 'finished';
  else if (rawStatus === 'in-progress' || rawStatus === 'active') status = 'in-progress';
  else if (rawStatus === 'cancelled' || rawStatus === 'canceled') status = 'cancelled';
  else if (rawStatus === 'arrived') status = 'arrived';

  const encounter: FHIREncounter = {
    resourceType: 'Encounter',
    id,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter'],
    },
    status,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'VR', // Virtual (telehealth)
      display: 'Virtual',
    },
    subject: {
      reference: `Patient/${childId}`,
    },
    period: {
      start: apt.startTime || apt.scheduledDate || new Date().toISOString(),
      end: apt.endTime || undefined,
    },
  };

  // Service type (ABA therapy default for Aminy)
  const serviceCode = mapServiceType(apt.serviceType || apt.type);
  if (serviceCode) {
    encounter.serviceType = {
      coding: [serviceCode],
      text: apt.serviceType || apt.type || 'ABA Therapy',
    };
  }

  // Provider
  if (apt.providerId || apt.providerName) {
    encounter.participant = [{
      type: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
          code: 'PPRF',
          display: 'Primary Performer',
        }],
      }],
      individual: {
        reference: apt.providerId ? `Practitioner/${apt.providerId}` : undefined,
        display: apt.providerName,
      } as FHIRReference,
    }];
  }

  // Reason
  if (apt.reason) {
    encounter.reasonCode = [{
      coding: [],
      text: apt.reason,
    }];
  }

  return encounter;
}

/**
 * Convert a diagnosis code to a FHIR R4 Condition
 */
export function toFHIRCondition(
  diagnosisCode: string,
  childId: string,
  displayText?: string
): FHIRCondition {
  return {
    resourceType: 'Condition',
    id: `cond-${childId}-${diagnosisCode.replace(/\./g, '-')}`,
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: 'active',
      }],
    },
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        code: 'encounter-diagnosis',
        display: 'Encounter Diagnosis',
      }],
    }],
    code: {
      coding: [{
        system: 'http://hl7.org/fhir/sid/icd-10-cm',
        code: diagnosisCode,
        display: displayText || diagnosisCode,
      }],
    },
    subject: {
      reference: `Patient/${childId}`,
    },
    recordedDate: new Date().toISOString(),
  };
}

/**
 * Convert a set of Aminy records into a FHIR R4 collection Bundle
 */
export function toFHIRBundle(
  resources: FHIRResource[] | unknown[],
  meta?: Record<string, unknown>
): FHIRBundle {
  const entries: FHIRBundleEntry[] = (resources as FHIRResource[]).map((resource) => ({
    fullUrl: `urn:uuid:${resource.id || `res-${Date.now()}`}`,
    resource,
  }));

  return {
    resourceType: 'Bundle',
    id: `bundle-${Date.now()}`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
    meta: {
      lastUpdated: new Date().toISOString(),
      ...(meta || {}),
    },
  };
}

/**
 * Generate a full FHIR R4 data export for a child
 * Produces a Bundle containing: Patient, Conditions, Encounters
 */
export async function generateFHIRExport(
  child: AppChild,
  appointments: AppAppointment[],
  userId: string,
  parentName?: string,
): Promise<FHIRBundle> {
  const resources: FHIRResource[] = [];

  // 1. Patient resource
  const patient = toFHIRPatient(child, parentName);
  resources.push(patient);

  // 2. Conditions from diagnosis codes
  if (child.diagnosisCodes) {
    for (const code of child.diagnosisCodes) {
      resources.push(toFHIRCondition(code, child.id));
    }
  }

  // 3. Encounters from appointments
  for (const apt of appointments) {
    resources.push(toFHIREncounter(apt, child.id));
  }

  const bundle = toFHIRBundle(resources);

  // Audit log the export
  try {
    const sessionId = typeof window !== 'undefined'
      ? (sessionStorage.getItem('aminy_session_id') || 'unknown')
      : 'server';
    await logAuditEvent({
      action: 'export',
      resourceType: 'clinical_data',
      resourceId: child.id,
      userId,
      userRole: 'parent',
      sessionId,
      success: true,
      details: {
        exportFormat: 'FHIR R4',
        resourceCount: resources.length,
        resourceTypes: [...new Set(resources.map(r => r.resourceType))],
      },
    });
  } catch {
    // Non-blocking — audit failure shouldn't prevent export
  }

  return bundle;
}

/**
 * Download a FHIR Bundle as a JSON file
 */
export function downloadFHIRBundle(bundle: FHIRBundle, filename?: string): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/fhir+json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `aminy-fhir-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Helpers ──

function mapServiceType(serviceType?: string): FHIRCoding | null {
  if (!serviceType) return null;
  const lower = serviceType.toLowerCase();

  if (lower.includes('aba') || lower.includes('behavior')) {
    return { system: 'http://www.ama-assn.org/go/cpt', code: '97153', display: 'ABA Therapy' };
  }
  if (lower.includes('speech')) {
    return { system: 'http://www.ama-assn.org/go/cpt', code: '92507', display: 'Speech-Language Therapy' };
  }
  if (lower.includes('occupational') || lower.includes('ot')) {
    return { system: 'http://www.ama-assn.org/go/cpt', code: '97530', display: 'Occupational Therapy' };
  }
  if (lower.includes('assessment') || lower.includes('evaluation')) {
    return { system: 'http://www.ama-assn.org/go/cpt', code: '97151', display: 'Behavioral Assessment' };
  }
  if (lower.includes('parent') || lower.includes('family')) {
    return { system: 'http://www.ama-assn.org/go/cpt', code: '97156', display: 'Family Guidance' };
  }
  return { system: 'http://www.ama-assn.org/go/cpt', code: '97153', display: 'ABA Therapy' };
}

export default {
  toFHIRPatient,
  toFHIREncounter,
  toFHIRCondition,
  toFHIRBundle,
  generateFHIRExport,
  downloadFHIRBundle,
};
