/**
 * centralreach-data-feed.ts
 *
 * Defines what Aminy sends TO CentralReach (CR) — structured data exports
 * for client records, sessions, goal updates, and billing that CR can ingest.
 */

// ============================================================================
// Types
// ============================================================================

export interface CRDataExport {
  exportId: string;
  generatedAt: string;
  clientCount: number;
  sessionCount: number;
  goalUpdateCount: number;
  billingRecordCount: number;
  format: 'json' | 'csv';
  status: 'ready' | 'generating' | 'error';
}

export interface CRClientRecord {
  clientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosisCodes: string[];
  diagnosisDescriptions: string[];
  insuranceMemberId: string;
  insurancePlan: string;
  authorizationNumber: string;
  authorizationStartDate: string;
  authorizationEndDate: string;
  authorizedUnits: number;
  usedUnits: number;
  primaryBCBA: string;
  primaryBCBANPI: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  serviceStartDate: string;
  programType: string;
}

export interface CRGoalUpdate {
  goalId: string;
  clientId: string;
  goalName: string;
  goalDomain: string;
  targetBehavior: string;
  baselineDate: string;
  baselineValue: number;
  currentMasteryPercent: number;
  masteryLevel: 'not-started' | 'acquisition' | 'emerging' | 'mastered' | 'maintenance';
  dataPoints: {
    date: string;
    correct: number;
    total: number;
    percent: number;
    therapistNote: string;
  }[];
  masteryDate: string | null;
  lastDataDate: string;
}

export interface CRSessionRecord {
  sessionId: string;
  clientId: string;
  providerId: string;
  providerName: string;
  providerNPI: string;
  providerCredential: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  serviceCode: string;
  placeOfService: string;
  units: number;
  sessionType: 'direct' | 'supervision' | 'parent-training' | 'assessment';
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  goalsAddressed: string[];
  behaviorsRecorded: {
    behavior: string;
    frequency?: number;
    duration?: number;
    intensity?: number;
  }[];
  parentPresent: boolean;
  parentTrainingMinutes: number;
  signedBy: string;
  signedAt: string;
}

export interface CRBillingRecord {
  billingId: string;
  clientId: string;
  sessionId: string;
  providerId: string;
  providerNPI: string;
  serviceDate: string;
  cptCode: string;
  modifier: string | null;
  icd10Code: string;
  units: number;
  billedAmount: number;
  authorizationNumber: string;
  payerName: string;
  payerId: string;
  placeOfService: string;
  renderingProviderNPI: string;
  supervisingBCBANPI: string | null;
  claimStatus: 'unbilled' | 'ready' | 'submitted' | 'paid' | 'denied';
}

export interface CRSyncStatus {
  lastSyncAt: string;
  pendingRecords: number;
  syncErrors: { recordType: string; recordId: string; error: string }[];
  dataQualityScore: number;
  completenessBreakdown: {
    sessions: { complete: number; incomplete: number; missingFields: string[] };
    goals: { complete: number; incomplete: number; missingFields: string[] };
    billing: { complete: number; incomplete: number; missingFields: string[] };
    demographics: { complete: number; incomplete: number; missingFields: string[] };
  };
}

// ============================================================================
// Builder Functions
// ============================================================================

export function buildClientExport(clientId: string): CRClientRecord {
  // Demo data — in production this reads from Supabase
  const demoClients: Record<string, CRClientRecord> = {
    'client-001': {
      clientId: 'client-001',
      firstName: 'Lucas',
      lastName: 'Thompson',
      dateOfBirth: '2018-04-12',
      diagnosisCodes: ['F84.0', 'F41.1'],
      diagnosisDescriptions: ['Autistic Disorder', 'Generalized Anxiety Disorder'],
      insuranceMemberId: 'AHCCCS-88421',
      insurancePlan: 'AHCCCS Complete Care',
      authorizationNumber: 'AZ-AUTH-221847',
      authorizationStartDate: '2026-01-01',
      authorizationEndDate: '2026-06-30',
      authorizedUnits: 480,
      usedUnits: 218,
      primaryBCBA: 'Dr. Sarah Chen',
      primaryBCBANPI: '1234567890',
      address: { street: '1234 W. Camelback Rd', city: 'Phoenix', state: 'AZ', zip: '85013' },
      guardianName: 'Jennifer Thompson',
      guardianPhone: '(602) 555-1234',
      guardianEmail: 'jthompson@email.com',
      serviceStartDate: '2025-08-15',
      programType: 'Comprehensive ABA',
    },
    'client-002': {
      clientId: 'client-002',
      firstName: 'Mia',
      lastName: 'Rodriguez',
      dateOfBirth: '2019-11-05',
      diagnosisCodes: ['F84.0'],
      diagnosisDescriptions: ['Autistic Disorder'],
      insuranceMemberId: 'BCBS-77612A',
      insurancePlan: 'BCBS AZ BlueSelect',
      authorizationNumber: 'BCBS-AUTH-994412',
      authorizationStartDate: '2026-01-01',
      authorizationEndDate: '2026-12-31',
      authorizedUnits: 960,
      usedUnits: 384,
      primaryBCBA: 'Dr. Sarah Chen',
      primaryBCBANPI: '1234567890',
      address: { street: '5678 N. 32nd St', city: 'Phoenix', state: 'AZ', zip: '85018' },
      guardianName: 'Carlos Rodriguez',
      guardianPhone: '(602) 555-5678',
      guardianEmail: 'crodriguez@email.com',
      serviceStartDate: '2025-06-01',
      programType: 'Comprehensive ABA',
    },
  };

  return demoClients[clientId] ?? demoClients['client-001'];
}

export function buildSessionExport(sessionId: string): CRSessionRecord {
  return {
    sessionId,
    clientId: 'client-001',
    providerId: 'prov-001',
    providerName: 'Marcus Rivera, RBT',
    providerNPI: '9876543210',
    providerCredential: 'RBT',
    sessionDate: '2026-03-28',
    startTime: '09:00',
    endTime: '13:00',
    durationMinutes: 240,
    serviceCode: 'H2019',
    placeOfService: '11',
    units: 16,
    sessionType: 'direct',
    soapNote: {
      subjective: 'Client arrived calm and engaged. Guardian reported a good night\'s sleep and positive morning routine.',
      objective: 'Client demonstrated 85% correct responding on "Label Emotions" program (17/20 trials). Elopement behavior: 0 instances (down from 3 last session). Parent training conducted for 30 min on naturalistic teaching strategies.',
      assessment: 'Client continues to make progress on emotion labeling. Elopement behavior decreasing with implementation of visual cues and reinforcement schedule.',
      plan: 'Continue current reinforcement schedule. Introduce "Label Emotions" in novel environments next session. Increase parent training to 45 min.',
    },
    goalsAddressed: ['Label Emotions', 'Elopement Reduction', 'Request Help Verbally'],
    behaviorsRecorded: [
      { behavior: 'Elopement', frequency: 0 },
      { behavior: 'Self-Injurious Behavior', frequency: 0 },
      { behavior: 'Physical Aggression', frequency: 0 },
    ],
    parentPresent: true,
    parentTrainingMinutes: 30,
    signedBy: 'Dr. Sarah Chen, BCBA',
    signedAt: '2026-03-28T17:30:00Z',
  };
}

export function generateCRImportFile(clientIds: string[]): {
  filename: string;
  format: 'json';
  data: {
    exportMeta: { generatedAt: string; clientCount: number; version: string };
    clients: CRClientRecord[];
    sessions: CRSessionRecord[];
    goalUpdates: CRGoalUpdate[];
    billingRecords: CRBillingRecord[];
  };
} {
  const clients = clientIds.map(id => buildClientExport(id));
  const sessions = clientIds.map(id => buildSessionExport(`session-${id}`));

  const goalUpdates: CRGoalUpdate[] = clientIds.map(clientId => ({
    goalId: `goal-${clientId}-001`,
    clientId,
    goalName: 'Label Emotions from Pictures',
    goalDomain: 'Social-Emotional',
    targetBehavior: 'Client will label 10 basic emotions from picture cards with 80% accuracy across 3 consecutive sessions',
    baselineDate: '2025-08-20',
    baselineValue: 15,
    currentMasteryPercent: 78,
    masteryLevel: 'emerging',
    dataPoints: [
      { date: '2026-03-14', correct: 14, total: 20, percent: 70, therapistNote: 'Good engagement' },
      { date: '2026-03-21', correct: 16, total: 20, percent: 80, therapistNote: 'Near mastery' },
      { date: '2026-03-28', correct: 17, total: 20, percent: 85, therapistNote: 'Excellent session' },
    ],
    masteryDate: null,
    lastDataDate: '2026-03-28',
  }));

  const billingRecords: CRBillingRecord[] = clientIds.map((clientId, i) => ({
    billingId: `bill-${clientId}-001`,
    clientId,
    sessionId: `session-${clientId}`,
    providerId: 'prov-001',
    providerNPI: '1234567890',
    serviceDate: '2026-03-28',
    cptCode: 'H2019',
    modifier: null,
    icd10Code: 'F84.0',
    units: 16,
    billedAmount: 136.00 + i * 10,
    authorizationNumber: 'AZ-AUTH-221847',
    payerName: 'AHCCCS',
    payerId: 'ahcccs',
    placeOfService: '11',
    renderingProviderNPI: '9876543210',
    supervisingBCBANPI: '1234567890',
    claimStatus: 'ready',
  }));

  return {
    filename: `aminy-cr-export-${new Date().toISOString().split('T')[0]}.json`,
    format: 'json',
    data: {
      exportMeta: {
        generatedAt: new Date().toISOString(),
        clientCount: clients.length,
        version: '2.0',
      },
      clients,
      sessions,
      goalUpdates,
      billingRecords,
    },
  };
}

export function getCRSyncStatus(): CRSyncStatus {
  return {
    lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    pendingRecords: 7,
    syncErrors: [
      { recordType: 'session', recordId: 'sn-441', error: 'Missing supervisor NPI on H2019 record' },
    ],
    dataQualityScore: 94,
    completenessBreakdown: {
      sessions: { complete: 41, incomplete: 2, missingFields: ['supervisor_npi', 'parent_training_minutes'] },
      goals: { complete: 28, incomplete: 1, missingFields: ['baseline_date'] },
      billing: { complete: 38, incomplete: 4, missingFields: ['modifier', 'place_of_service'] },
      demographics: { complete: 18, incomplete: 0, missingFields: [] },
    },
  };
}
