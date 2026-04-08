// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CentralReach Demo Data — Extended Mock Dataset
 *
 * Comprehensive mock data for webhook testing, sync dashboard demos,
 * and development without a CentralReach sandbox.
 *
 * Supplements the existing `centralreach-demo-data.ts` (in lib root) with:
 *   - 8 additional client records with diverse demographics
 *   - 20 session records across ABA, speech, and OT
 *   - 10 insurance authorizations with varied statuses
 *   - Sample webhook payloads for all supported event types
 *   - Sync dashboard status data
 *   - Common ABA billing codes
 */

import type {
  CRClient,
  CRSession,
  CRInsurance,
  CRWebhookPayload,
  CRWebhookEvent,
  CRSessionType,
  CRGoalData,
} from '../centralreach-types';

// ============================================================================
// Demo Clients — 8 mock CentralReach client records
// ============================================================================

export const DEMO_CR_CLIENTS: CRClient[] = [
  {
    id: 'cr-client-101',
    firstName: 'Aiden',
    lastName: 'Romero',
    dateOfBirth: '2019-02-14',
    diagnosis: ['F84.0'],
    insuranceInfo: {
      payerId: 'ins-bcbs-az',
      payerName: 'Blue Cross Blue Shield of Arizona',
      memberId: 'BCBS-AZ-11223344',
      groupNumber: 'GRP-8810',
      authorizationNumber: 'AUTH-2026-AR-5501',
      authUnitsRemaining: 160,
      authUnitsUsed: 40,
      authStartDate: '2026-01-15',
      authEndDate: '2026-07-14',
      authStatus: 'active',
    },
    status: 'active',
    primaryProviderId: 'prov-bcba-001',
    createdAt: '2025-06-10T00:00:00Z',
    updatedAt: '2026-03-09T10:00:00Z',
  },
  {
    id: 'cr-client-102',
    firstName: 'Sofia',
    lastName: 'Patel',
    dateOfBirth: '2020-07-22',
    diagnosis: ['F84.0', 'F80.1'],
    insuranceInfo: {
      payerId: 'ins-uhc',
      payerName: 'UnitedHealthcare',
      memberId: 'UHC-556677889',
      groupNumber: 'GRP-4420',
      authorizationNumber: 'AUTH-2026-SP-7712',
      authUnitsRemaining: 95,
      authUnitsUsed: 105,
      authStartDate: '2025-10-01',
      authEndDate: '2026-03-31',
      authStatus: 'active',
    },
    status: 'active',
    primaryProviderId: 'prov-bcba-001',
    createdAt: '2025-03-15T00:00:00Z',
    updatedAt: '2026-03-08T14:20:00Z',
  },
  {
    id: 'cr-client-103',
    firstName: 'Liam',
    lastName: 'Nguyen',
    dateOfBirth: '2018-11-05',
    diagnosis: ['F84.0'],
    insuranceInfo: {
      payerId: 'ins-aetna',
      payerName: 'Aetna',
      memberId: 'AETNA-334455667',
      groupNumber: 'GRP-2290',
      authorizationNumber: 'AUTH-2025-LN-3301',
      authUnitsRemaining: 8,
      authUnitsUsed: 192,
      authStartDate: '2025-07-01',
      authEndDate: '2026-01-01',
      authStatus: 'expired',
    },
    status: 'active',
    primaryProviderId: 'prov-rbt-001',
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2026-03-05T09:30:00Z',
  },
  {
    id: 'cr-client-104',
    firstName: 'Zoe',
    lastName: 'Washington',
    dateOfBirth: '2021-03-18',
    diagnosis: ['F84.0'],
    insuranceInfo: {
      payerId: 'ins-cigna',
      payerName: 'Cigna',
      memberId: 'CIGNA-889900112',
      groupNumber: 'GRP-6650',
      authorizationNumber: 'AUTH-2026-ZW-9903',
      authUnitsRemaining: 180,
      authUnitsUsed: 20,
      authStartDate: '2026-02-01',
      authEndDate: '2026-08-01',
      authStatus: 'active',
    },
    status: 'active',
    primaryProviderId: 'prov-bcba-001',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-03-09T11:45:00Z',
  },
  {
    id: 'cr-client-105',
    firstName: 'Mason',
    lastName: 'Kim',
    dateOfBirth: '2017-09-30',
    diagnosis: ['F84.0', 'F90.0'],
    insuranceInfo: {
      payerId: 'ins-bcbs-az',
      payerName: 'Blue Cross Blue Shield of Arizona',
      memberId: 'BCBS-AZ-77665544',
      groupNumber: 'GRP-1120',
      authorizationNumber: 'AUTH-2026-MK-1104',
      authUnitsRemaining: 0,
      authUnitsUsed: 200,
      authStartDate: '2025-09-01',
      authEndDate: '2026-02-28',
      authStatus: 'expired',
    },
    status: 'active',
    primaryProviderId: 'prov-rbt-001',
    createdAt: '2023-05-01T00:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'cr-client-106',
    firstName: 'Olivia',
    lastName: 'Martinez',
    dateOfBirth: '2020-01-12',
    diagnosis: ['F84.0'],
    insuranceInfo: {
      payerId: 'ins-humana',
      payerName: 'Humana',
      memberId: 'HUM-223344556',
      groupNumber: 'GRP-9930',
      authorizationNumber: '',
      authUnitsRemaining: 0,
      authUnitsUsed: 0,
      authStartDate: '',
      authEndDate: '',
      authStatus: 'pending',
    },
    status: 'active',
    primaryProviderId: 'prov-bcba-001',
    createdAt: '2026-02-28T00:00:00Z',
    updatedAt: '2026-03-09T16:10:00Z',
  },
  {
    id: 'cr-client-107',
    firstName: 'Elijah',
    lastName: 'Brooks',
    dateOfBirth: '2019-05-08',
    diagnosis: ['F84.0', 'F82'],
    insuranceInfo: {
      payerId: 'ins-tricare',
      payerName: 'TRICARE',
      memberId: 'TRI-998877665',
      groupNumber: '',
      authorizationNumber: 'AUTH-2026-EB-6602',
      authUnitsRemaining: 120,
      authUnitsUsed: 80,
      authStartDate: '2026-01-01',
      authEndDate: '2026-06-30',
      authStatus: 'active',
    },
    status: 'active',
    primaryProviderId: 'prov-rbt-001',
    createdAt: '2025-08-15T00:00:00Z',
    updatedAt: '2026-03-07T13:25:00Z',
  },
  {
    id: 'cr-client-108',
    firstName: 'Ava',
    lastName: 'Thompson',
    dateOfBirth: '2018-12-01',
    diagnosis: ['F84.0'],
    insuranceInfo: {
      payerId: 'ins-medicaid-az',
      payerName: 'Arizona Medicaid (AHCCCS)',
      memberId: 'AHCCCS-112233445',
      groupNumber: '',
      authorizationNumber: 'AUTH-2025-AT-2210',
      authUnitsRemaining: 45,
      authUnitsUsed: 155,
      authStartDate: '2025-04-01',
      authEndDate: '2026-03-31',
      authStatus: 'active',
    },
    status: 'inactive',
    primaryProviderId: 'prov-bcba-001',
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  },
];

// ============================================================================
// Demo Sessions — 20 mock session records
// ============================================================================

function makeDemoSession(
  id: string,
  clientId: string,
  providerId: string,
  date: string,
  startTime: string,
  endTime: string,
  duration: number,
  sessionType: CRSessionType,
  billingCode: string,
  billingUnits: number,
  status: CRSession['status'],
  notes: string,
): CRSession {
  const goals: CRGoalData[] = [
    {
      goalId: `goal-${clientId}-a`,
      trials: 20,
      successes: Math.floor(Math.random() * 8) + 12,
      accuracy: Math.floor(Math.random() * 30) + 60,
      promptLevel: 'gestural',
      notes: 'Responding to prompts consistently',
      phase: 'acquisition',
    },
  ];

  return {
    id,
    clientId,
    providerId,
    date,
    startTime,
    endTime,
    duration,
    sessionType,
    notes,
    goals,
    billingCode,
    billingUnits,
    status,
    signedOff: status === 'completed',
    signedOffBy: status === 'completed' ? providerId : '',
    signedOffAt: status === 'completed' ? `${date}T18:00:00Z` : '',
    createdAt: `${date}T${startTime}:00Z`,
    updatedAt: `${date}T${endTime}:00Z`,
  };
}

export const DEMO_CR_SESSIONS: CRSession[] = [
  // ABA Sessions
  makeDemoSession('sess-201', 'cr-client-101', 'prov-rbt-001', '2026-03-10', '09:00', '12:00', 180, 'direct_therapy', '97153', 12, 'scheduled', 'Scheduled ABA session - morning block'),
  makeDemoSession('sess-202', 'cr-client-101', 'prov-bcba-001', '2026-03-10', '12:00', '13:00', 60, 'supervision', '97155', 4, 'scheduled', 'BCBA supervision overlapping RBT session'),
  makeDemoSession('sess-203', 'cr-client-102', 'prov-rbt-001', '2026-03-10', '13:30', '16:30', 180, 'direct_therapy', '97153', 12, 'scheduled', 'Afternoon ABA block'),
  makeDemoSession('sess-204', 'cr-client-103', 'prov-rbt-001', '2026-03-09', '09:00', '12:00', 180, 'direct_therapy', '97153', 12, 'completed', 'Strong session, 78% accuracy across targets. Client engaged throughout.'),
  makeDemoSession('sess-205', 'cr-client-104', 'prov-bcba-001', '2026-03-09', '14:00', '15:00', 60, 'parent_training', '97156', 4, 'completed', 'Reviewed home routine data with parent. Discussed prompting hierarchy.'),
  makeDemoSession('sess-206', 'cr-client-105', 'prov-rbt-001', '2026-03-08', '09:00', '11:00', 120, 'direct_therapy', '97153', 8, 'completed', 'Good engagement. Working on social initiation targets.'),
  makeDemoSession('sess-207', 'cr-client-106', 'prov-bcba-001', '2026-03-08', '10:00', '12:00', 120, 'assessment', '97151', 8, 'completed', 'Initial assessment - VB-MAPP administered.'),
  makeDemoSession('sess-208', 'cr-client-107', 'prov-rbt-001', '2026-03-08', '13:00', '16:00', 180, 'direct_therapy', '97153', 12, 'completed', 'Continued work on daily living skills. Morning routine at 72% independence.'),
  makeDemoSession('sess-209', 'cr-client-101', 'prov-bcba-001', '2026-03-07', '14:00', '15:00', 60, 'parent_training', '97156', 4, 'completed', 'Trained parent on transition strategies. Reviewed visual schedule use.'),
  makeDemoSession('sess-210', 'cr-client-102', 'prov-rbt-001', '2026-03-07', '09:00', '12:00', 180, 'direct_therapy', '97153', 12, 'completed', 'PECS exchange at 65% independent. Mealtime requesting improving.'),

  // Speech Therapy Sessions
  makeDemoSession('sess-211', 'cr-client-102', 'prov-bcba-001', '2026-03-07', '13:00', '13:45', 45, 'consultation', 'H0032', 3, 'completed', 'Speech consult - articulation review and oral motor assessment.'),
  makeDemoSession('sess-212', 'cr-client-108', 'prov-bcba-001', '2026-03-06', '10:00', '10:45', 45, 'telehealth', 'H0032', 3, 'completed', 'Telehealth speech session. Worked on /s/ and /z/ phonemes.'),

  // OT Sessions
  makeDemoSession('sess-213', 'cr-client-107', 'prov-bcba-001', '2026-03-06', '14:00', '14:45', 45, 'consultation', '97530', 3, 'completed', 'OT consult - fine motor assessment. Scissor skills at modified independence.'),
  makeDemoSession('sess-214', 'cr-client-104', 'prov-rbt-001', '2026-03-06', '09:00', '12:00', 180, 'direct_therapy', '97153', 12, 'completed', 'ABA session with embedded OT goals. Handwriting practice during NET.'),

  // Group session
  makeDemoSession('sess-215', 'cr-client-101', 'prov-rbt-001', '2026-03-05', '15:00', '16:00', 60, 'group_therapy', '97154', 4, 'completed', 'Social skills group. 4 peers. Practiced greetings and turn-taking.'),
  makeDemoSession('sess-216', 'cr-client-103', 'prov-rbt-001', '2026-03-05', '15:00', '16:00', 60, 'group_therapy', '97154', 4, 'completed', 'Social skills group. Peer interaction targets addressed.'),

  // Cancelled sessions
  makeDemoSession('sess-217', 'cr-client-105', 'prov-rbt-001', '2026-03-04', '09:00', '12:00', 180, 'direct_therapy', '97153', 12, 'cancelled', 'Cancelled - client illness'),
  makeDemoSession('sess-218', 'cr-client-108', 'prov-bcba-001', '2026-03-04', '14:00', '15:00', 60, 'parent_training', '97156', 4, 'cancelled', 'Cancelled - provider schedule conflict'),

  // No-show
  makeDemoSession('sess-219', 'cr-client-103', 'prov-rbt-001', '2026-03-03', '09:00', '12:00', 180, 'direct_therapy', '97153', 12, 'no_show', 'No show - family did not respond to contact attempts'),

  // Telehealth
  makeDemoSession('sess-220', 'cr-client-106', 'prov-bcba-001', '2026-03-03', '10:00', '11:00', 60, 'telehealth', '97153', 4, 'completed', 'Telehealth ABA session. Parent-mediated intervention. Good engagement via video.'),
];

// ============================================================================
// Demo Authorizations — 10 mock insurance authorizations
// ============================================================================

export interface DemoCRAuthorization {
  id: string;
  clientId: string;
  clientName: string;
  payerName: string;
  authorizationNumber: string;
  serviceType: string;
  billingCode: string;
  hoursApproved: number;
  hoursUsed: number;
  hoursRemaining: number;
  unitsApproved: number;
  unitsUsed: number;
  unitsRemaining: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending' | 'denied' | 'expiring_soon';
  lastUpdated: string;
}

export const DEMO_CR_AUTHORIZATIONS: DemoCRAuthorization[] = [
  {
    id: 'auth-301',
    clientId: 'cr-client-101',
    clientName: 'Aiden Romero',
    payerName: 'Blue Cross Blue Shield of Arizona',
    authorizationNumber: 'AUTH-2026-AR-5501',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 50,
    hoursUsed: 10,
    hoursRemaining: 40,
    unitsApproved: 200,
    unitsUsed: 40,
    unitsRemaining: 160,
    startDate: '2026-01-15',
    endDate: '2026-07-14',
    status: 'active',
    lastUpdated: '2026-03-09T10:00:00Z',
  },
  {
    id: 'auth-302',
    clientId: 'cr-client-102',
    clientName: 'Sofia Patel',
    payerName: 'UnitedHealthcare',
    authorizationNumber: 'AUTH-2026-SP-7712',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 50,
    hoursUsed: 26.25,
    hoursRemaining: 23.75,
    unitsApproved: 200,
    unitsUsed: 105,
    unitsRemaining: 95,
    startDate: '2025-10-01',
    endDate: '2026-03-31',
    status: 'expiring_soon',
    lastUpdated: '2026-03-08T14:20:00Z',
  },
  {
    id: 'auth-303',
    clientId: 'cr-client-103',
    clientName: 'Liam Nguyen',
    payerName: 'Aetna',
    authorizationNumber: 'AUTH-2025-LN-3301',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 50,
    hoursUsed: 48,
    hoursRemaining: 2,
    unitsApproved: 200,
    unitsUsed: 192,
    unitsRemaining: 8,
    startDate: '2025-07-01',
    endDate: '2026-01-01',
    status: 'expired',
    lastUpdated: '2026-01-02T00:00:00Z',
  },
  {
    id: 'auth-304',
    clientId: 'cr-client-104',
    clientName: 'Zoe Washington',
    payerName: 'Cigna',
    authorizationNumber: 'AUTH-2026-ZW-9903',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 50,
    hoursUsed: 5,
    hoursRemaining: 45,
    unitsApproved: 200,
    unitsUsed: 20,
    unitsRemaining: 180,
    startDate: '2026-02-01',
    endDate: '2026-08-01',
    status: 'active',
    lastUpdated: '2026-03-09T11:45:00Z',
  },
  {
    id: 'auth-305',
    clientId: 'cr-client-105',
    clientName: 'Mason Kim',
    payerName: 'Blue Cross Blue Shield of Arizona',
    authorizationNumber: 'AUTH-2026-MK-1104',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 50,
    hoursUsed: 50,
    hoursRemaining: 0,
    unitsApproved: 200,
    unitsUsed: 200,
    unitsRemaining: 0,
    startDate: '2025-09-01',
    endDate: '2026-02-28',
    status: 'expired',
    lastUpdated: '2026-03-01T08:00:00Z',
  },
  {
    id: 'auth-306',
    clientId: 'cr-client-106',
    clientName: 'Olivia Martinez',
    payerName: 'Humana',
    authorizationNumber: '',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 0,
    hoursUsed: 0,
    hoursRemaining: 0,
    unitsApproved: 0,
    unitsUsed: 0,
    unitsRemaining: 0,
    startDate: '',
    endDate: '',
    status: 'pending',
    lastUpdated: '2026-03-09T16:10:00Z',
  },
  {
    id: 'auth-307',
    clientId: 'cr-client-107',
    clientName: 'Elijah Brooks',
    payerName: 'TRICARE',
    authorizationNumber: 'AUTH-2026-EB-6602',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 50,
    hoursUsed: 20,
    hoursRemaining: 30,
    unitsApproved: 200,
    unitsUsed: 80,
    unitsRemaining: 120,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: 'active',
    lastUpdated: '2026-03-07T13:25:00Z',
  },
  {
    id: 'auth-308',
    clientId: 'cr-client-102',
    clientName: 'Sofia Patel',
    payerName: 'UnitedHealthcare',
    authorizationNumber: 'AUTH-2026-SP-SPEECH-2201',
    serviceType: 'Speech Therapy',
    billingCode: 'H0032',
    hoursApproved: 25,
    hoursUsed: 8,
    hoursRemaining: 17,
    unitsApproved: 100,
    unitsUsed: 32,
    unitsRemaining: 68,
    startDate: '2025-10-01',
    endDate: '2026-03-31',
    status: 'expiring_soon',
    lastUpdated: '2026-03-07T13:00:00Z',
  },
  {
    id: 'auth-309',
    clientId: 'cr-client-108',
    clientName: 'Ava Thompson',
    payerName: 'Arizona Medicaid (AHCCCS)',
    authorizationNumber: 'AUTH-2025-AT-2210',
    serviceType: 'ABA Therapy',
    billingCode: '97153',
    hoursApproved: 50,
    hoursUsed: 38.75,
    hoursRemaining: 11.25,
    unitsApproved: 200,
    unitsUsed: 155,
    unitsRemaining: 45,
    startDate: '2025-04-01',
    endDate: '2026-03-31',
    status: 'expiring_soon',
    lastUpdated: '2026-02-15T10:00:00Z',
  },
  {
    id: 'auth-310',
    clientId: 'cr-client-101',
    clientName: 'Aiden Romero',
    payerName: 'Blue Cross Blue Shield of Arizona',
    authorizationNumber: 'AUTH-2026-AR-DENIED-001',
    serviceType: 'Occupational Therapy',
    billingCode: '97530',
    hoursApproved: 0,
    hoursUsed: 0,
    hoursRemaining: 0,
    unitsApproved: 0,
    unitsUsed: 0,
    unitsRemaining: 0,
    startDate: '2026-03-01',
    endDate: '2026-03-01',
    status: 'denied',
    lastUpdated: '2026-03-05T09:00:00Z',
  },
];

// ============================================================================
// Demo Webhook Payloads — Sample payloads for all event types
// ============================================================================

export interface DemoWebhookPayload {
  eventType: string;
  label: string;
  description: string;
  payload: CRWebhookPayload;
}

const now = new Date().toISOString();
const orgId = 'org-demo-001';

export const DEMO_WEBHOOK_PAYLOADS: DemoWebhookPayload[] = [
  {
    eventType: 'client_updated',
    label: 'Client Created',
    description: 'New client record created in CentralReach',
    payload: {
      event: 'client_updated' as CRWebhookEvent,
      timestamp: now,
      organizationId: orgId,
      data: {
        action: 'created',
        clientId: 'cr-client-109',
        firstName: 'Emma',
        lastName: 'Davis',
        dateOfBirth: '2021-08-14',
        diagnosis: ['F84.0'],
        status: 'active',
      },
      signature: 'demo-sig-client-created',
    },
  },
  {
    eventType: 'client_updated',
    label: 'Client Updated',
    description: 'Client demographics updated in CentralReach',
    payload: {
      event: 'client_updated' as CRWebhookEvent,
      timestamp: now,
      organizationId: orgId,
      data: {
        action: 'updated',
        clientId: 'cr-client-101',
        fields: ['diagnosis', 'primaryProviderId'],
        diagnosis: ['F84.0', 'F80.2'],
        primaryProviderId: 'prov-bcba-002',
      },
      signature: 'demo-sig-client-updated',
    },
  },
  {
    eventType: 'session_completed',
    label: 'Session Completed',
    description: 'Therapy session completed and notes signed off',
    payload: {
      event: 'session_completed' as CRWebhookEvent,
      timestamp: now,
      organizationId: orgId,
      data: {
        sessionId: 'sess-204',
        clientId: 'cr-client-103',
        providerId: 'prov-rbt-001',
        sessionType: 'direct_therapy',
        billingCode: '97153',
        billingUnits: 12,
        duration: 180,
        goalsAddressed: 3,
        avgAccuracy: 78,
      },
      signature: 'demo-sig-session-completed',
    },
  },
  {
    eventType: 'session_cancelled',
    label: 'Session Cancelled',
    description: 'Scheduled session was cancelled',
    payload: {
      event: 'session_cancelled' as CRWebhookEvent,
      timestamp: now,
      organizationId: orgId,
      data: {
        sessionId: 'sess-217',
        clientId: 'cr-client-105',
        providerId: 'prov-rbt-001',
        reason: 'client_illness',
        originalDate: '2026-03-04',
        rescheduleRequested: true,
      },
      signature: 'demo-sig-session-cancelled',
    },
  },
  {
    eventType: 'authorization_changed',
    label: 'Authorization Approved',
    description: 'New insurance authorization approved',
    payload: {
      event: 'authorization_changed' as CRWebhookEvent,
      timestamp: now,
      organizationId: orgId,
      data: {
        action: 'approved',
        clientId: 'cr-client-106',
        authorizationNumber: 'AUTH-2026-OM-NEW-001',
        payerName: 'Humana',
        serviceType: 'ABA Therapy',
        hoursApproved: 40,
        startDate: '2026-03-15',
        endDate: '2026-09-14',
      },
      signature: 'demo-sig-auth-approved',
    },
  },
  {
    eventType: 'authorization_changed',
    label: 'Authorization Expiring',
    description: 'Authorization nearing expiration date',
    payload: {
      event: 'authorization_changed' as CRWebhookEvent,
      timestamp: now,
      organizationId: orgId,
      data: {
        action: 'expiring',
        clientId: 'cr-client-102',
        authorizationNumber: 'AUTH-2026-SP-7712',
        payerName: 'UnitedHealthcare',
        daysRemaining: 21,
        hoursRemaining: 23.75,
        endDate: '2026-03-31',
      },
      signature: 'demo-sig-auth-expiring',
    },
  },
  {
    eventType: 'note_signed',
    label: 'Note Signed',
    description: 'Clinical session note signed off by supervisor',
    payload: {
      event: 'note_signed' as CRWebhookEvent,
      timestamp: now,
      organizationId: orgId,
      data: {
        sessionId: 'sess-208',
        clientId: 'cr-client-107',
        signedBy: 'prov-bcba-001',
        signedAt: now,
        noteType: 'session_note',
        billingReady: true,
      },
      signature: 'demo-sig-note-signed',
    },
  },
];

// ============================================================================
// Demo Sync Status — Mock sync dashboard data
// ============================================================================

export interface DemoSyncStatus {
  lastSyncTime: string;
  nextSyncTime: string;
  recordsSynced: number;
  recordsFailed: number;
  pendingItems: number;
  syncDurationMs: number;
  status: 'healthy' | 'warning' | 'error' | 'syncing';
  errors: DemoSyncError[];
  dataTypes: DemoSyncDataTypeStatus[];
}

export interface DemoSyncError {
  id: string;
  dataType: string;
  message: string;
  timestamp: string;
  retryCount: number;
  resolved: boolean;
}

export interface DemoSyncDataTypeStatus {
  dataType: string;
  label: string;
  direction: 'pull' | 'push';
  lastSyncAt: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  recordsSynced: number;
  nextSyncAt: string;
}

export const DEMO_SYNC_STATUS: DemoSyncStatus = {
  lastSyncTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  nextSyncTime: new Date(Date.now() + 225 * 60 * 1000).toISOString(),
  recordsSynced: 847,
  recordsFailed: 3,
  pendingItems: 5,
  syncDurationMs: 2340,
  status: 'healthy',
  errors: [
    {
      id: 'err-sync-001',
      dataType: 'sessions',
      message: 'Timeout fetching session data for client cr-client-103',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      retryCount: 2,
      resolved: false,
    },
    {
      id: 'err-sync-002',
      dataType: 'behavior_logs',
      message: 'CR API rate limit exceeded (429)',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      retryCount: 1,
      resolved: true,
    },
    {
      id: 'err-sync-003',
      dataType: 'goals',
      message: 'Conflict: goal-003-b updated in both systems',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      retryCount: 0,
      resolved: false,
    },
  ],
  dataTypes: [
    {
      dataType: 'sessions',
      label: 'Therapy Sessions',
      direction: 'pull',
      lastSyncAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSynced: 342,
      nextSyncAt: new Date(Date.now() + 225 * 60 * 1000).toISOString(),
    },
    {
      dataType: 'goals',
      label: 'Treatment Goals',
      direction: 'pull',
      lastSyncAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSynced: 89,
      nextSyncAt: new Date(Date.now() + 315 * 60 * 1000).toISOString(),
    },
    {
      dataType: 'insurance',
      label: 'Insurance Coverage',
      direction: 'pull',
      lastSyncAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSynced: 10,
      nextSyncAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      dataType: 'behavior_logs',
      label: 'Behavior Logs (ABC)',
      direction: 'push',
      lastSyncAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSynced: 156,
      nextSyncAt: new Date(Date.now() + 22 * 60 * 1000).toISOString(),
    },
    {
      dataType: 'routine_completions',
      label: 'Routine Completions',
      direction: 'push',
      lastSyncAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSynced: 203,
      nextSyncAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
    },
    {
      dataType: 'junior_results',
      label: 'Junior Session Results',
      direction: 'push',
      lastSyncAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      status: 'error',
      recordsSynced: 47,
      nextSyncAt: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    },
  ],
};

// ============================================================================
// Demo Billing Codes — Common ABA/therapy CPT codes
// ============================================================================

export interface DemoCRBillingCode {
  code: string;
  description: string;
  category: 'aba' | 'speech' | 'ot' | 'assessment' | 'other';
  unitsPerHour: number;
  typicalDurationMinutes: number;
  requiresSupervision: boolean;
  allowedProviderTypes: string[];
}

export const DEMO_CR_BILLING_CODES: DemoCRBillingCode[] = [
  {
    code: '97153',
    description: 'Adaptive behavior treatment by protocol, administered by technician',
    category: 'aba',
    unitsPerHour: 4,
    typicalDurationMinutes: 180,
    requiresSupervision: true,
    allowedProviderTypes: ['RBT', 'BCaBA', 'BCBA'],
  },
  {
    code: '97154',
    description: 'Group adaptive behavior treatment by protocol, administered by technician',
    category: 'aba',
    unitsPerHour: 4,
    typicalDurationMinutes: 60,
    requiresSupervision: true,
    allowedProviderTypes: ['RBT', 'BCaBA', 'BCBA'],
  },
  {
    code: '97155',
    description: 'Adaptive behavior treatment with protocol modification, administered by physician/QHP',
    category: 'aba',
    unitsPerHour: 4,
    typicalDurationMinutes: 60,
    requiresSupervision: false,
    allowedProviderTypes: ['BCBA', 'BCaBA'],
  },
  {
    code: '97156',
    description: 'Family adaptive behavior treatment guidance, administered by physician/QHP',
    category: 'aba',
    unitsPerHour: 4,
    typicalDurationMinutes: 60,
    requiresSupervision: false,
    allowedProviderTypes: ['BCBA', 'BCaBA'],
  },
  {
    code: '97151',
    description: 'Behavior identification assessment, administered by physician/QHP',
    category: 'assessment',
    unitsPerHour: 4,
    typicalDurationMinutes: 120,
    requiresSupervision: false,
    allowedProviderTypes: ['BCBA'],
  },
  {
    code: 'H0032',
    description: 'Mental health service plan development by non-physician',
    category: 'other',
    unitsPerHour: 4,
    typicalDurationMinutes: 45,
    requiresSupervision: false,
    allowedProviderTypes: ['BCBA', 'SLP', 'OT'],
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/** Get a demo client by ID */
export function getDemoCRClient(clientId: string): CRClient | undefined {
  return DEMO_CR_CLIENTS.find((c) => c.id === clientId);
}

/** Get demo sessions for a specific client */
export function getDemoCRSessionsForClient(clientId: string): CRSession[] {
  return DEMO_CR_SESSIONS.filter((s) => s.clientId === clientId);
}

/** Get demo authorizations for a specific client */
export function getDemoCRAuthorizationsForClient(
  clientId: string,
): DemoCRAuthorization[] {
  return DEMO_CR_AUTHORIZATIONS.filter((a) => a.clientId === clientId);
}

/** Get a billing code by CPT code */
export function getDemoCRBillingCode(
  code: string,
): DemoCRBillingCode | undefined {
  return DEMO_CR_BILLING_CODES.find((b) => b.code === code);
}

/** Get authorizations that are expiring within N days */
export function getExpiringAuthorizations(
  daysThreshold = 30,
): DemoCRAuthorization[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysThreshold);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return DEMO_CR_AUTHORIZATIONS.filter(
    (a) =>
      a.status === 'active' &&
      a.endDate !== '' &&
      a.endDate <= cutoffStr,
  );
}
