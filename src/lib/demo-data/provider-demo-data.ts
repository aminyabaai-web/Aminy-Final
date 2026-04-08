// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Demo Data
 *
 * Realistic but clearly fake provider profiles, referrals, outcomes,
 * care teams, and credentials for populating the provider portal
 * screens during development and demo presentations.
 *
 * All names, license numbers, and contact info are fictional.
 */

// ============================================================================
// Types
// ============================================================================

export type ProviderType = 'bcba' | 'rbt' | 'slp' | 'ot' | 'bcaba' | 'psychologist';

export type ReferralStatus = 'pending' | 'accepted' | 'completed' | 'declined';

export type CredentialVerificationStatus = 'verified' | 'pending' | 'expired' | 'renewal_due';

export type OutcomeDomain = 'communication' | 'social' | 'behavioral' | 'daily_living' | 'academic' | 'motor';

export interface DemoProvider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  providerType: ProviderType;
  credentials: string;
  title: string;
  specialties: string[];
  languages: string[];
  bio: string;
  avatarUrl: string | null;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  locationCity: string;
  locationState: string;
  offersTelehealth: boolean;
  offersInPerson: boolean;
  insuranceAccepted: string[];
  hourlyRate: number;
  acceptsNewPatients: boolean;
  verified: boolean;
  verificationLevel: 'none' | 'pending' | 'verified' | 'gold';
  caseloadCurrent: number;
  caseloadMax: number;
  availability: DemoAvailability;
  npiNumber: string;
}

export interface DemoAvailability {
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
  saturday: string[];
  sunday: string[];
  nextAvailableSlot: string;
}

export interface DemoReferral {
  id: string;
  referralDate: string;
  status: ReferralStatus;
  providerName: string;
  providerId: string;
  providerType: ProviderType;
  familyName: string;
  childName: string;
  childAge: number;
  reasonForReferral: string;
  urgency: 'routine' | 'urgent' | 'high';
  notes: string;
  acceptedDate?: string;
  completedDate?: string;
  declinedReason?: string;
}

export interface DemoOutcome {
  id: string;
  childName: string;
  childId: string;
  providerId: string;
  providerName: string;
  domain: OutcomeDomain;
  goalDescription: string;
  baselineScore: number;
  currentScore: number;
  targetScore: number;
  progressPercent: number;
  sessionsCompleted: number;
  sessionsPlanned: number;
  startDate: string;
  lastUpdated: string;
  status: 'on_track' | 'ahead' | 'behind' | 'completed';
  dataPoints: { date: string; score: number }[];
}

export interface DemoCareTeam {
  id: string;
  familyName: string;
  childName: string;
  childAge: number;
  leadBCBA: {
    id: string;
    name: string;
    credentials: string;
    email: string;
  };
  assignedRBTs: {
    id: string;
    name: string;
    credentials: string;
    weeklyHours: number;
  }[];
  assignedSLPs: {
    id: string;
    name: string;
    credentials: string;
    sessionFrequency: string;
  }[];
  assignedOTs: {
    id: string;
    name: string;
    credentials: string;
    sessionFrequency: string;
  }[];
  createdAt: string;
  lastReviewDate: string;
  nextReviewDate: string;
  status: 'active' | 'on_hold' | 'discharged';
}

export interface DemoCredential {
  id: string;
  providerId: string;
  providerName: string;
  credentialType: 'license' | 'certification' | 'insurance' | 'cpr' | 'background_check';
  credentialName: string;
  issuingBody: string;
  licenseNumber: string; // Masked
  state?: string;
  issueDate: string;
  expiryDate: string;
  verificationStatus: CredentialVerificationStatus;
  verifiedAt?: string;
  ceHoursRequired: number;
  ceHoursCompleted: number;
  ceHoursDueDate?: string;
  documentUrl?: string;
}

// ============================================================================
// Demo Providers (8 realistic profiles)
// ============================================================================

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: 'prov-demo-001',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    email: 'sarah.mitchell@demo-aminy.test',
    phone: '(555) 201-0101',
    providerType: 'bcba',
    credentials: 'BCBA',
    title: 'Board Certified Behavior Analyst',
    specialties: [
      'Early Intervention (0-5)',
      'Verbal Behavior',
      'Social Skills Training',
      'Parent Training',
    ],
    languages: ['English', 'Spanish'],
    bio: 'Specializing in early intervention ABA therapy with over a decade of experience working with children on the autism spectrum. Passionate about family-centered care and evidence-based programming.',
    avatarUrl: null,
    rating: 4.9,
    reviewCount: 127,
    yearsExperience: 12,
    locationCity: 'Phoenix',
    locationState: 'AZ',
    offersTelehealth: true,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'Aetna', 'UnitedHealthcare', 'Cigna', 'AHCCCS'],
    hourlyRate: 125,
    acceptsNewPatients: true,
    verified: true,
    verificationLevel: 'gold',
    caseloadCurrent: 18,
    caseloadMax: 24,
    availability: {
      monday: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
      tuesday: ['9:00 AM', '11:00 AM', '1:00 PM'],
      wednesday: ['10:00 AM', '2:00 PM', '4:00 PM'],
      thursday: ['9:00 AM', '10:00 AM', '3:00 PM'],
      friday: ['9:00 AM', '11:00 AM'],
      saturday: [],
      sunday: [],
      nextAvailableSlot: '2026-03-12T09:00:00-07:00',
    },
    npiNumber: '1234567890',
  },
  {
    id: 'prov-demo-002',
    firstName: 'Marcus',
    lastName: 'Johnson',
    email: 'marcus.johnson@demo-aminy.test',
    phone: '(555) 201-0102',
    providerType: 'bcba',
    credentials: 'BCBA',
    title: 'Board Certified Behavior Analyst',
    specialties: [
      'Adolescent Behavior Management',
      'Functional Behavior Assessment',
      'Crisis Intervention',
      'Transition Planning',
    ],
    languages: ['English'],
    bio: 'Focused on adolescents and young adults navigating behavioral challenges. Develops individualized behavior intervention plans grounded in positive reinforcement and skill acquisition.',
    avatarUrl: null,
    rating: 4.8,
    reviewCount: 89,
    yearsExperience: 8,
    locationCity: 'Scottsdale',
    locationState: 'AZ',
    offersTelehealth: true,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'Aetna', 'Tricare', 'Mercy Care'],
    hourlyRate: 115,
    acceptsNewPatients: true,
    verified: true,
    verificationLevel: 'verified',
    caseloadCurrent: 15,
    caseloadMax: 20,
    availability: {
      monday: ['8:00 AM', '10:00 AM', '1:00 PM'],
      tuesday: ['9:00 AM', '2:00 PM', '4:00 PM'],
      wednesday: ['8:00 AM', '11:00 AM'],
      thursday: ['10:00 AM', '1:00 PM', '3:00 PM'],
      friday: ['8:00 AM', '9:00 AM', '2:00 PM'],
      saturday: ['9:00 AM'],
      sunday: [],
      nextAvailableSlot: '2026-03-11T08:00:00-07:00',
    },
    npiNumber: '2345678901',
  },
  {
    id: 'prov-demo-003',
    firstName: 'Priya',
    lastName: 'Patel',
    email: 'priya.patel@demo-aminy.test',
    phone: '(555) 201-0103',
    providerType: 'rbt',
    credentials: 'RBT',
    title: 'Registered Behavior Technician',
    specialties: [
      'Discrete Trial Training',
      'Natural Environment Teaching',
      'Self-Care Skills',
      'Play-Based Intervention',
    ],
    languages: ['English', 'Hindi', 'Gujarati'],
    bio: 'Energetic and compassionate RBT dedicated to helping children build life skills through structured and naturalistic ABA programming. Three years experience across home and clinic settings.',
    avatarUrl: null,
    rating: 4.7,
    reviewCount: 54,
    yearsExperience: 3,
    locationCity: 'Tempe',
    locationState: 'AZ',
    offersTelehealth: false,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'UnitedHealthcare', 'AHCCCS'],
    hourlyRate: 45,
    acceptsNewPatients: true,
    verified: true,
    verificationLevel: 'verified',
    caseloadCurrent: 8,
    caseloadMax: 10,
    availability: {
      monday: ['8:00 AM', '9:00 AM', '10:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'],
      tuesday: ['8:00 AM', '9:00 AM', '10:00 AM', '1:00 PM', '2:00 PM'],
      wednesday: ['8:00 AM', '9:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'],
      thursday: ['8:00 AM', '9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
      friday: ['8:00 AM', '9:00 AM', '10:00 AM'],
      saturday: [],
      sunday: [],
      nextAvailableSlot: '2026-03-11T08:00:00-07:00',
    },
    npiNumber: '3456789012',
  },
  {
    id: 'prov-demo-004',
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@demo-aminy.test',
    phone: '(555) 201-0104',
    providerType: 'rbt',
    credentials: 'RBT',
    title: 'Registered Behavior Technician',
    specialties: [
      'Motor Imitation',
      'Manding',
      'Toileting Programs',
      'Community-Based Instruction',
    ],
    languages: ['English', 'Korean'],
    bio: 'Detail-oriented RBT with experience implementing behavior plans for children ages 2-12. Skilled in data collection and parent collaboration to ensure consistency across environments.',
    avatarUrl: null,
    rating: 4.6,
    reviewCount: 37,
    yearsExperience: 2,
    locationCity: 'Mesa',
    locationState: 'AZ',
    offersTelehealth: false,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'Aetna', 'AHCCCS'],
    hourlyRate: 42,
    acceptsNewPatients: false,
    verified: true,
    verificationLevel: 'verified',
    caseloadCurrent: 10,
    caseloadMax: 10,
    availability: {
      monday: ['9:00 AM', '10:00 AM', '2:00 PM'],
      tuesday: ['9:00 AM', '10:00 AM', '1:00 PM', '2:00 PM'],
      wednesday: ['9:00 AM', '2:00 PM'],
      thursday: ['9:00 AM', '10:00 AM', '1:00 PM'],
      friday: ['9:00 AM', '10:00 AM'],
      saturday: [],
      sunday: [],
      nextAvailableSlot: '2026-03-14T09:00:00-07:00',
    },
    npiNumber: '4567890123',
  },
  {
    id: 'prov-demo-005',
    firstName: 'Elena',
    lastName: 'Vasquez',
    email: 'elena.vasquez@demo-aminy.test',
    phone: '(555) 201-0105',
    providerType: 'slp',
    credentials: 'CCC-SLP',
    title: 'Speech-Language Pathologist',
    specialties: [
      'Augmentative and Alternative Communication (AAC)',
      'Articulation and Phonology',
      'Pragmatic Language',
      'Feeding Therapy',
    ],
    languages: ['English', 'Spanish'],
    bio: 'Bilingual speech-language pathologist specializing in AAC implementation and pragmatic language development for children with autism and developmental delays. Certified in PROMPT and Hanen approaches.',
    avatarUrl: null,
    rating: 4.9,
    reviewCount: 98,
    yearsExperience: 10,
    locationCity: 'Chandler',
    locationState: 'AZ',
    offersTelehealth: true,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'Aetna', 'UnitedHealthcare', 'Cigna', 'AHCCCS', 'Mercy Care'],
    hourlyRate: 110,
    acceptsNewPatients: true,
    verified: true,
    verificationLevel: 'gold',
    caseloadCurrent: 22,
    caseloadMax: 28,
    availability: {
      monday: ['10:00 AM', '1:00 PM', '3:00 PM'],
      tuesday: ['9:00 AM', '11:00 AM', '2:00 PM'],
      wednesday: ['10:00 AM', '1:00 PM'],
      thursday: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
      friday: ['10:00 AM', '1:00 PM'],
      saturday: [],
      sunday: [],
      nextAvailableSlot: '2026-03-11T10:00:00-07:00',
    },
    npiNumber: '5678901234',
  },
  {
    id: 'prov-demo-006',
    firstName: 'James',
    lastName: 'Okafor',
    email: 'james.okafor@demo-aminy.test',
    phone: '(555) 201-0106',
    providerType: 'ot',
    credentials: 'OTR/L',
    title: 'Occupational Therapist',
    specialties: [
      'Sensory Integration',
      'Fine Motor Development',
      'Self-Regulation',
      'Handwriting',
    ],
    languages: ['English'],
    bio: 'Occupational therapist with deep expertise in sensory processing and self-regulation strategies for neurodivergent children. Uses a strengths-based approach to build functional independence.',
    avatarUrl: null,
    rating: 4.8,
    reviewCount: 72,
    yearsExperience: 7,
    locationCity: 'Gilbert',
    locationState: 'AZ',
    offersTelehealth: true,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'UnitedHealthcare', 'Cigna', 'AHCCCS'],
    hourlyRate: 105,
    acceptsNewPatients: true,
    verified: true,
    verificationLevel: 'verified',
    caseloadCurrent: 16,
    caseloadMax: 22,
    availability: {
      monday: ['8:00 AM', '10:00 AM', '2:00 PM'],
      tuesday: ['9:00 AM', '11:00 AM', '3:00 PM'],
      wednesday: ['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM'],
      thursday: ['9:00 AM', '11:00 AM'],
      friday: ['8:00 AM', '10:00 AM', '1:00 PM'],
      saturday: [],
      sunday: [],
      nextAvailableSlot: '2026-03-11T08:00:00-07:00',
    },
    npiNumber: '6789012345',
  },
  {
    id: 'prov-demo-007',
    firstName: 'Rachel',
    lastName: 'Nguyen',
    email: 'rachel.nguyen@demo-aminy.test',
    phone: '(555) 201-0107',
    providerType: 'bcba',
    credentials: 'BCBA',
    title: 'Board Certified Behavior Analyst',
    specialties: [
      'Severe Behavior Reduction',
      'Skill Acquisition',
      'Staff Training',
      'Organizational Behavior Management',
    ],
    languages: ['English', 'Vietnamese'],
    bio: 'Clinical director with extensive experience managing multi-site ABA programs. Specializes in complex cases involving severe problem behavior and skill acquisition for school-age children.',
    avatarUrl: null,
    rating: 4.9,
    reviewCount: 143,
    yearsExperience: 14,
    locationCity: 'Phoenix',
    locationState: 'AZ',
    offersTelehealth: true,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Tricare', 'AHCCCS'],
    hourlyRate: 135,
    acceptsNewPatients: false,
    verified: true,
    verificationLevel: 'gold',
    caseloadCurrent: 24,
    caseloadMax: 24,
    availability: {
      monday: [],
      tuesday: ['3:00 PM'],
      wednesday: [],
      thursday: ['2:00 PM'],
      friday: [],
      saturday: [],
      sunday: [],
      nextAvailableSlot: '2026-03-18T15:00:00-07:00',
    },
    npiNumber: '7890123456',
  },
  {
    id: 'prov-demo-008',
    firstName: 'Carlos',
    lastName: 'Rivera',
    email: 'carlos.rivera@demo-aminy.test',
    phone: '(555) 201-0108',
    providerType: 'rbt',
    credentials: 'RBT',
    title: 'Registered Behavior Technician',
    specialties: [
      'Early Learner Programs',
      'Peer Social Skills Groups',
      'Token Economy Systems',
      'Visual Supports',
    ],
    languages: ['English', 'Spanish'],
    bio: 'Bilingual RBT passionate about creating engaging and motivating learning environments. Experienced in both one-on-one and small group instruction for children ages 3-8.',
    avatarUrl: null,
    rating: 4.7,
    reviewCount: 41,
    yearsExperience: 4,
    locationCity: 'Glendale',
    locationState: 'AZ',
    offersTelehealth: false,
    offersInPerson: true,
    insuranceAccepted: ['BCBS', 'AHCCCS', 'Mercy Care'],
    hourlyRate: 48,
    acceptsNewPatients: true,
    verified: true,
    verificationLevel: 'verified',
    caseloadCurrent: 7,
    caseloadMax: 10,
    availability: {
      monday: ['8:00 AM', '9:00 AM', '10:00 AM', '1:00 PM', '2:00 PM'],
      tuesday: ['8:00 AM', '9:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'],
      wednesday: ['8:00 AM', '9:00 AM', '10:00 AM', '2:00 PM'],
      thursday: ['8:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'],
      friday: ['8:00 AM', '9:00 AM', '10:00 AM', '1:00 PM'],
      saturday: ['9:00 AM', '10:00 AM'],
      sunday: [],
      nextAvailableSlot: '2026-03-11T08:00:00-07:00',
    },
    npiNumber: '8901234567',
  },
];

// ============================================================================
// Demo Referrals (12 sample referrals)
// ============================================================================

export const DEMO_REFERRALS: DemoReferral[] = [
  {
    id: 'ref-demo-001',
    referralDate: '2026-03-08',
    status: 'pending',
    providerName: 'Sarah Mitchell, BCBA',
    providerId: 'prov-demo-001',
    providerType: 'bcba',
    familyName: 'Thompson',
    childName: 'Liam Thompson',
    childAge: 4,
    reasonForReferral: 'Initial ABA assessment for newly diagnosed ASD. Significant delays in communication and social engagement.',
    urgency: 'high',
    notes: 'Family prefers bilingual (English/Spanish) provider. Available mornings Mon-Wed.',
  },
  {
    id: 'ref-demo-002',
    referralDate: '2026-03-07',
    status: 'pending',
    providerName: 'Elena Vasquez, CCC-SLP',
    providerId: 'prov-demo-005',
    providerType: 'slp',
    familyName: 'Nakamura',
    childName: 'Hana Nakamura',
    childAge: 3,
    reasonForReferral: 'Speech evaluation for limited verbal output. Uses approximately 10 single words. Pediatrician recommends AAC evaluation.',
    urgency: 'urgent',
    notes: 'AAC device trial requested. Family has BCBS insurance.',
  },
  {
    id: 'ref-demo-003',
    referralDate: '2026-03-05',
    status: 'accepted',
    providerName: 'James Okafor, OTR/L',
    providerId: 'prov-demo-006',
    providerType: 'ot',
    familyName: 'Williams',
    childName: 'Noah Williams',
    childAge: 6,
    reasonForReferral: 'Sensory processing evaluation. Significant tactile defensiveness impacting self-care routines and mealtime.',
    urgency: 'routine',
    notes: 'School OT referral included. IEP meeting scheduled for April.',
    acceptedDate: '2026-03-06',
  },
  {
    id: 'ref-demo-004',
    referralDate: '2026-03-04',
    status: 'accepted',
    providerName: 'Marcus Johnson, BCBA',
    providerId: 'prov-demo-002',
    providerType: 'bcba',
    familyName: 'Garcia',
    childName: 'Sofia Garcia',
    childAge: 14,
    reasonForReferral: 'Behavioral support for school refusal and social anxiety. Previous ABA services discontinued after age 10.',
    urgency: 'high',
    notes: 'Adolescent-focused plan needed. Family requests afternoon availability.',
    acceptedDate: '2026-03-05',
  },
  {
    id: 'ref-demo-005',
    referralDate: '2026-03-01',
    status: 'completed',
    providerName: 'Priya Patel, RBT',
    providerId: 'prov-demo-003',
    providerType: 'rbt',
    familyName: 'Chen',
    childName: 'Ethan Chen',
    childAge: 5,
    reasonForReferral: 'In-home RBT services for skill acquisition program designed by supervising BCBA.',
    urgency: 'routine',
    notes: 'BCBA (Dr. Mitchell) to provide oversight. 20 hours/week recommended.',
    acceptedDate: '2026-03-02',
    completedDate: '2026-03-08',
  },
  {
    id: 'ref-demo-006',
    referralDate: '2026-02-28',
    status: 'completed',
    providerName: 'Sarah Mitchell, BCBA',
    providerId: 'prov-demo-001',
    providerType: 'bcba',
    familyName: 'Anderson',
    childName: 'Mia Anderson',
    childAge: 7,
    reasonForReferral: 'Reassessment and behavior plan update. Current goals met, need new targets.',
    urgency: 'routine',
    notes: 'Annual reassessment. Insurance requires updated treatment plan by March 31.',
    acceptedDate: '2026-03-01',
    completedDate: '2026-03-07',
  },
  {
    id: 'ref-demo-007',
    referralDate: '2026-03-09',
    status: 'pending',
    providerName: 'Rachel Nguyen, BCBA',
    providerId: 'prov-demo-007',
    providerType: 'bcba',
    familyName: 'Foster',
    childName: 'Jackson Foster',
    childAge: 9,
    reasonForReferral: 'Severe elopement behavior requiring intensive behavior reduction plan. School placing on modified schedule.',
    urgency: 'urgent',
    notes: 'Complex case — previous provider discharged. School threatening suspension.',
  },
  {
    id: 'ref-demo-008',
    referralDate: '2026-03-06',
    status: 'accepted',
    providerName: 'Elena Vasquez, CCC-SLP',
    providerId: 'prov-demo-005',
    providerType: 'slp',
    familyName: 'Taylor',
    childName: 'Ava Taylor',
    childAge: 5,
    reasonForReferral: 'Pragmatic language intervention. Difficulty with conversational turn-taking and topic maintenance.',
    urgency: 'routine',
    notes: 'Concurrent ABA services with separate BCBA. Coordination required.',
    acceptedDate: '2026-03-07',
  },
  {
    id: 'ref-demo-009',
    referralDate: '2026-03-03',
    status: 'declined',
    providerName: 'David Kim, RBT',
    providerId: 'prov-demo-004',
    providerType: 'rbt',
    familyName: 'Martinez',
    childName: 'Lucas Martinez',
    childAge: 4,
    reasonForReferral: 'In-home ABA implementation — morning sessions 3x per week.',
    urgency: 'routine',
    notes: 'Family in Mesa area, close to provider.',
    declinedReason: 'Caseload at maximum capacity. Referred to Carlos Rivera, RBT as alternative.',
  },
  {
    id: 'ref-demo-010',
    referralDate: '2026-02-25',
    status: 'completed',
    providerName: 'James Okafor, OTR/L',
    providerId: 'prov-demo-006',
    providerType: 'ot',
    familyName: 'Lee',
    childName: 'Olivia Lee',
    childAge: 8,
    reasonForReferral: 'Fine motor and handwriting evaluation. Difficulty with pencil grip and letter formation affecting school performance.',
    urgency: 'routine',
    notes: 'Teacher reports included. BCBS pre-auth obtained.',
    acceptedDate: '2026-02-26',
    completedDate: '2026-03-05',
  },
  {
    id: 'ref-demo-011',
    referralDate: '2026-03-09',
    status: 'pending',
    providerName: 'Carlos Rivera, RBT',
    providerId: 'prov-demo-008',
    providerType: 'rbt',
    familyName: 'Hernandez',
    childName: 'Diego Hernandez',
    childAge: 3,
    reasonForReferral: 'Early learner ABA program implementation. 15 hours/week recommended by BCBA.',
    urgency: 'high',
    notes: 'Bilingual services preferred (Spanish). BCBA supervising remotely.',
  },
  {
    id: 'ref-demo-012',
    referralDate: '2026-03-02',
    status: 'accepted',
    providerName: 'Marcus Johnson, BCBA',
    providerId: 'prov-demo-002',
    providerType: 'bcba',
    familyName: 'Robinson',
    childName: 'Aiden Robinson',
    childAge: 11,
    reasonForReferral: 'Transition planning assessment — moving from elementary to middle school. Need updated FBA and BIP.',
    urgency: 'routine',
    notes: 'IEP team requesting ABA recommendations. Family has Tricare coverage.',
    acceptedDate: '2026-03-03',
  },
];

// ============================================================================
// Demo Outcomes (ABA session data with progress metrics)
// ============================================================================

export const DEMO_OUTCOMES: DemoOutcome[] = [
  {
    id: 'outcome-demo-001',
    childName: 'Ethan Chen',
    childId: 'child-demo-001',
    providerId: 'prov-demo-001',
    providerName: 'Sarah Mitchell, BCBA',
    domain: 'communication',
    goalDescription: 'Independently request preferred items using 2-3 word phrases across 80% of opportunities',
    baselineScore: 15,
    currentScore: 62,
    targetScore: 80,
    progressPercent: 72,
    sessionsCompleted: 24,
    sessionsPlanned: 36,
    startDate: '2026-01-06',
    lastUpdated: '2026-03-08',
    status: 'on_track',
    dataPoints: [
      { date: '2026-01-06', score: 15 },
      { date: '2026-01-20', score: 22 },
      { date: '2026-02-03', score: 31 },
      { date: '2026-02-17', score: 45 },
      { date: '2026-03-03', score: 56 },
      { date: '2026-03-08', score: 62 },
    ],
  },
  {
    id: 'outcome-demo-002',
    childName: 'Ethan Chen',
    childId: 'child-demo-001',
    providerId: 'prov-demo-001',
    providerName: 'Sarah Mitchell, BCBA',
    domain: 'social',
    goalDescription: 'Initiate peer interactions during structured play activities in 3 out of 5 opportunities',
    baselineScore: 10,
    currentScore: 48,
    targetScore: 60,
    progressPercent: 76,
    sessionsCompleted: 24,
    sessionsPlanned: 36,
    startDate: '2026-01-06',
    lastUpdated: '2026-03-08',
    status: 'ahead',
    dataPoints: [
      { date: '2026-01-06', score: 10 },
      { date: '2026-01-20', score: 18 },
      { date: '2026-02-03', score: 28 },
      { date: '2026-02-17', score: 36 },
      { date: '2026-03-03', score: 44 },
      { date: '2026-03-08', score: 48 },
    ],
  },
  {
    id: 'outcome-demo-003',
    childName: 'Mia Anderson',
    childId: 'child-demo-002',
    providerId: 'prov-demo-001',
    providerName: 'Sarah Mitchell, BCBA',
    domain: 'behavioral',
    goalDescription: 'Reduce tantrum duration to under 2 minutes with self-regulation strategies across 90% of episodes',
    baselineScore: 20,
    currentScore: 85,
    targetScore: 90,
    progressPercent: 93,
    sessionsCompleted: 40,
    sessionsPlanned: 40,
    startDate: '2025-09-15',
    lastUpdated: '2026-03-07',
    status: 'completed',
    dataPoints: [
      { date: '2025-09-15', score: 20 },
      { date: '2025-10-15', score: 35 },
      { date: '2025-11-15', score: 50 },
      { date: '2025-12-15', score: 65 },
      { date: '2026-01-15', score: 75 },
      { date: '2026-02-15', score: 82 },
      { date: '2026-03-07', score: 85 },
    ],
  },
  {
    id: 'outcome-demo-004',
    childName: 'Sofia Garcia',
    childId: 'child-demo-003',
    providerId: 'prov-demo-002',
    providerName: 'Marcus Johnson, BCBA',
    domain: 'behavioral',
    goalDescription: 'Attend full school day (6 hours) without school refusal behavior 4 out of 5 days per week',
    baselineScore: 20,
    currentScore: 45,
    targetScore: 80,
    progressPercent: 42,
    sessionsCompleted: 6,
    sessionsPlanned: 24,
    startDate: '2026-03-05',
    lastUpdated: '2026-03-09',
    status: 'on_track',
    dataPoints: [
      { date: '2026-03-05', score: 20 },
      { date: '2026-03-07', score: 35 },
      { date: '2026-03-09', score: 45 },
    ],
  },
  {
    id: 'outcome-demo-005',
    childName: 'Noah Williams',
    childId: 'child-demo-004',
    providerId: 'prov-demo-006',
    providerName: 'James Okafor, OTR/L',
    domain: 'daily_living',
    goalDescription: 'Independently complete morning hygiene routine (teeth brushing, face washing, hair combing) with visual schedule',
    baselineScore: 25,
    currentScore: 58,
    targetScore: 85,
    progressPercent: 55,
    sessionsCompleted: 12,
    sessionsPlanned: 24,
    startDate: '2026-02-03',
    lastUpdated: '2026-03-08',
    status: 'on_track',
    dataPoints: [
      { date: '2026-02-03', score: 25 },
      { date: '2026-02-17', score: 35 },
      { date: '2026-03-03', score: 50 },
      { date: '2026-03-08', score: 58 },
    ],
  },
  {
    id: 'outcome-demo-006',
    childName: 'Hana Nakamura',
    childId: 'child-demo-005',
    providerId: 'prov-demo-005',
    providerName: 'Elena Vasquez, CCC-SLP',
    domain: 'communication',
    goalDescription: 'Use AAC device to make 10+ independent requests per session across 3 consecutive sessions',
    baselineScore: 5,
    currentScore: 22,
    targetScore: 70,
    progressPercent: 26,
    sessionsCompleted: 8,
    sessionsPlanned: 30,
    startDate: '2026-02-10',
    lastUpdated: '2026-03-09',
    status: 'behind',
    dataPoints: [
      { date: '2026-02-10', score: 5 },
      { date: '2026-02-24', score: 12 },
      { date: '2026-03-09', score: 22 },
    ],
  },
  {
    id: 'outcome-demo-007',
    childName: 'Ava Taylor',
    childId: 'child-demo-006',
    providerId: 'prov-demo-005',
    providerName: 'Elena Vasquez, CCC-SLP',
    domain: 'social',
    goalDescription: 'Maintain on-topic conversational exchanges for 4+ turns with a peer in 70% of structured opportunities',
    baselineScore: 30,
    currentScore: 55,
    targetScore: 70,
    progressPercent: 63,
    sessionsCompleted: 10,
    sessionsPlanned: 20,
    startDate: '2026-01-20',
    lastUpdated: '2026-03-08',
    status: 'on_track',
    dataPoints: [
      { date: '2026-01-20', score: 30 },
      { date: '2026-02-03', score: 38 },
      { date: '2026-02-17', score: 45 },
      { date: '2026-03-03', score: 52 },
      { date: '2026-03-08', score: 55 },
    ],
  },
  {
    id: 'outcome-demo-008',
    childName: 'Olivia Lee',
    childId: 'child-demo-007',
    providerId: 'prov-demo-006',
    providerName: 'James Okafor, OTR/L',
    domain: 'motor',
    goalDescription: 'Write first and last name legibly using appropriate pencil grip within 60 seconds',
    baselineScore: 20,
    currentScore: 70,
    targetScore: 80,
    progressPercent: 83,
    sessionsCompleted: 14,
    sessionsPlanned: 16,
    startDate: '2026-01-13',
    lastUpdated: '2026-03-05',
    status: 'ahead',
    dataPoints: [
      { date: '2026-01-13', score: 20 },
      { date: '2026-01-27', score: 35 },
      { date: '2026-02-10', score: 48 },
      { date: '2026-02-24', score: 60 },
      { date: '2026-03-05', score: 70 },
    ],
  },
  {
    id: 'outcome-demo-009',
    childName: 'Aiden Robinson',
    childId: 'child-demo-008',
    providerId: 'prov-demo-002',
    providerName: 'Marcus Johnson, BCBA',
    domain: 'daily_living',
    goalDescription: 'Navigate school transitions (class changes, lunch, dismissal) independently using visual checklist',
    baselineScore: 30,
    currentScore: 52,
    targetScore: 80,
    progressPercent: 44,
    sessionsCompleted: 4,
    sessionsPlanned: 20,
    startDate: '2026-03-03',
    lastUpdated: '2026-03-09',
    status: 'on_track',
    dataPoints: [
      { date: '2026-03-03', score: 30 },
      { date: '2026-03-06', score: 40 },
      { date: '2026-03-09', score: 52 },
    ],
  },
  {
    id: 'outcome-demo-010',
    childName: 'Mia Anderson',
    childId: 'child-demo-002',
    providerId: 'prov-demo-001',
    providerName: 'Sarah Mitchell, BCBA',
    domain: 'academic',
    goalDescription: 'Follow multi-step classroom instructions (3+ steps) without additional prompts in 75% of opportunities',
    baselineScore: 35,
    currentScore: 72,
    targetScore: 75,
    progressPercent: 93,
    sessionsCompleted: 38,
    sessionsPlanned: 40,
    startDate: '2025-09-15',
    lastUpdated: '2026-03-07',
    status: 'ahead',
    dataPoints: [
      { date: '2025-09-15', score: 35 },
      { date: '2025-10-15', score: 42 },
      { date: '2025-11-15', score: 50 },
      { date: '2025-12-15', score: 58 },
      { date: '2026-01-15', score: 63 },
      { date: '2026-02-15', score: 68 },
      { date: '2026-03-07', score: 72 },
    ],
  },
];

// ============================================================================
// Demo Care Teams (5 configurations)
// ============================================================================

export const DEMO_CARE_TEAMS: DemoCareTeam[] = [
  {
    id: 'team-demo-001',
    familyName: 'Chen',
    childName: 'Ethan Chen',
    childAge: 5,
    leadBCBA: {
      id: 'prov-demo-001',
      name: 'Sarah Mitchell',
      credentials: 'BCBA',
      email: 'sarah.mitchell@demo-aminy.test',
    },
    assignedRBTs: [
      {
        id: 'prov-demo-003',
        name: 'Priya Patel',
        credentials: 'RBT',
        weeklyHours: 20,
      },
      {
        id: 'prov-demo-008',
        name: 'Carlos Rivera',
        credentials: 'RBT',
        weeklyHours: 10,
      },
    ],
    assignedSLPs: [
      {
        id: 'prov-demo-005',
        name: 'Elena Vasquez',
        credentials: 'CCC-SLP',
        sessionFrequency: '2x/week',
      },
    ],
    assignedOTs: [],
    createdAt: '2025-12-15',
    lastReviewDate: '2026-02-15',
    nextReviewDate: '2026-05-15',
    status: 'active',
  },
  {
    id: 'team-demo-002',
    familyName: 'Anderson',
    childName: 'Mia Anderson',
    childAge: 7,
    leadBCBA: {
      id: 'prov-demo-001',
      name: 'Sarah Mitchell',
      credentials: 'BCBA',
      email: 'sarah.mitchell@demo-aminy.test',
    },
    assignedRBTs: [
      {
        id: 'prov-demo-004',
        name: 'David Kim',
        credentials: 'RBT',
        weeklyHours: 15,
      },
    ],
    assignedSLPs: [],
    assignedOTs: [
      {
        id: 'prov-demo-006',
        name: 'James Okafor',
        credentials: 'OTR/L',
        sessionFrequency: '1x/week',
      },
    ],
    createdAt: '2025-09-01',
    lastReviewDate: '2026-03-01',
    nextReviewDate: '2026-06-01',
    status: 'active',
  },
  {
    id: 'team-demo-003',
    familyName: 'Williams',
    childName: 'Noah Williams',
    childAge: 6,
    leadBCBA: {
      id: 'prov-demo-007',
      name: 'Rachel Nguyen',
      credentials: 'BCBA',
      email: 'rachel.nguyen@demo-aminy.test',
    },
    assignedRBTs: [
      {
        id: 'prov-demo-003',
        name: 'Priya Patel',
        credentials: 'RBT',
        weeklyHours: 15,
      },
    ],
    assignedSLPs: [],
    assignedOTs: [
      {
        id: 'prov-demo-006',
        name: 'James Okafor',
        credentials: 'OTR/L',
        sessionFrequency: '2x/week',
      },
    ],
    createdAt: '2026-01-10',
    lastReviewDate: '2026-03-01',
    nextReviewDate: '2026-04-10',
    status: 'active',
  },
  {
    id: 'team-demo-004',
    familyName: 'Garcia',
    childName: 'Sofia Garcia',
    childAge: 14,
    leadBCBA: {
      id: 'prov-demo-002',
      name: 'Marcus Johnson',
      credentials: 'BCBA',
      email: 'marcus.johnson@demo-aminy.test',
    },
    assignedRBTs: [],
    assignedSLPs: [],
    assignedOTs: [],
    createdAt: '2026-03-05',
    lastReviewDate: '2026-03-05',
    nextReviewDate: '2026-04-05',
    status: 'active',
  },
  {
    id: 'team-demo-005',
    familyName: 'Nakamura',
    childName: 'Hana Nakamura',
    childAge: 3,
    leadBCBA: {
      id: 'prov-demo-001',
      name: 'Sarah Mitchell',
      credentials: 'BCBA',
      email: 'sarah.mitchell@demo-aminy.test',
    },
    assignedRBTs: [
      {
        id: 'prov-demo-008',
        name: 'Carlos Rivera',
        credentials: 'RBT',
        weeklyHours: 15,
      },
    ],
    assignedSLPs: [
      {
        id: 'prov-demo-005',
        name: 'Elena Vasquez',
        credentials: 'CCC-SLP',
        sessionFrequency: '3x/week',
      },
    ],
    assignedOTs: [
      {
        id: 'prov-demo-006',
        name: 'James Okafor',
        credentials: 'OTR/L',
        sessionFrequency: '1x/week',
      },
    ],
    createdAt: '2026-02-01',
    lastReviewDate: '2026-03-01',
    nextReviewDate: '2026-05-01',
    status: 'active',
  },
];

// ============================================================================
// Demo Credentials
// ============================================================================

export const DEMO_CREDENTIALS: DemoCredential[] = [
  // Sarah Mitchell
  {
    id: 'cred-demo-001',
    providerId: 'prov-demo-001',
    providerName: 'Sarah Mitchell',
    credentialType: 'certification',
    credentialName: 'Board Certified Behavior Analyst (BCBA)',
    issuingBody: 'Behavior Analyst Certification Board (BACB)',
    licenseNumber: 'BCBA-1-XX-XXXX',
    issueDate: '2014-06-15',
    expiryDate: '2027-01-31',
    verificationStatus: 'verified',
    verifiedAt: '2026-02-01',
    ceHoursRequired: 32,
    ceHoursCompleted: 28,
    ceHoursDueDate: '2027-01-31',
  },
  {
    id: 'cred-demo-002',
    providerId: 'prov-demo-001',
    providerName: 'Sarah Mitchell',
    credentialType: 'license',
    credentialName: 'Arizona Behavior Analyst License',
    issuingBody: 'Arizona Board of Psychologist Examiners',
    licenseNumber: 'BA-XXXX',
    state: 'AZ',
    issueDate: '2014-08-01',
    expiryDate: '2027-07-31',
    verificationStatus: 'verified',
    verifiedAt: '2026-02-01',
    ceHoursRequired: 0,
    ceHoursCompleted: 0,
  },
  {
    id: 'cred-demo-003',
    providerId: 'prov-demo-001',
    providerName: 'Sarah Mitchell',
    credentialType: 'insurance',
    credentialName: 'Professional Liability Insurance',
    issuingBody: 'HPSO',
    licenseNumber: 'POL-XXXXXX',
    issueDate: '2026-01-01',
    expiryDate: '2027-01-01',
    verificationStatus: 'verified',
    verifiedAt: '2026-01-15',
    ceHoursRequired: 0,
    ceHoursCompleted: 0,
  },
  // Marcus Johnson
  {
    id: 'cred-demo-004',
    providerId: 'prov-demo-002',
    providerName: 'Marcus Johnson',
    credentialType: 'certification',
    credentialName: 'Board Certified Behavior Analyst (BCBA)',
    issuingBody: 'Behavior Analyst Certification Board (BACB)',
    licenseNumber: 'BCBA-1-XX-XXXX',
    issueDate: '2018-03-20',
    expiryDate: '2027-03-31',
    verificationStatus: 'verified',
    verifiedAt: '2026-01-10',
    ceHoursRequired: 32,
    ceHoursCompleted: 20,
    ceHoursDueDate: '2027-03-31',
  },
  {
    id: 'cred-demo-005',
    providerId: 'prov-demo-002',
    providerName: 'Marcus Johnson',
    credentialType: 'cpr',
    credentialName: 'CPR/First Aid Certification',
    issuingBody: 'American Red Cross',
    licenseNumber: 'ARC-XXXXXXXX',
    issueDate: '2025-08-15',
    expiryDate: '2027-08-15',
    verificationStatus: 'verified',
    verifiedAt: '2025-09-01',
    ceHoursRequired: 0,
    ceHoursCompleted: 0,
  },
  // Priya Patel
  {
    id: 'cred-demo-006',
    providerId: 'prov-demo-003',
    providerName: 'Priya Patel',
    credentialType: 'certification',
    credentialName: 'Registered Behavior Technician (RBT)',
    issuingBody: 'Behavior Analyst Certification Board (BACB)',
    licenseNumber: 'RBT-XXXXXXXX',
    issueDate: '2023-05-10',
    expiryDate: '2026-05-10',
    verificationStatus: 'renewal_due',
    verifiedAt: '2026-01-15',
    ceHoursRequired: 0,
    ceHoursCompleted: 0,
  },
  {
    id: 'cred-demo-007',
    providerId: 'prov-demo-003',
    providerName: 'Priya Patel',
    credentialType: 'background_check',
    credentialName: 'FBI Fingerprint Background Check',
    issuingBody: 'Arizona DPS',
    licenseNumber: 'FPC-XXXXXXXX',
    issueDate: '2025-04-20',
    expiryDate: '2027-04-20',
    verificationStatus: 'verified',
    verifiedAt: '2025-05-01',
    ceHoursRequired: 0,
    ceHoursCompleted: 0,
  },
  // Elena Vasquez
  {
    id: 'cred-demo-008',
    providerId: 'prov-demo-005',
    providerName: 'Elena Vasquez',
    credentialType: 'certification',
    credentialName: 'Certificate of Clinical Competence in Speech-Language Pathology (CCC-SLP)',
    issuingBody: 'American Speech-Language-Hearing Association (ASHA)',
    licenseNumber: 'CCC-SLP-XXXXXXX',
    issueDate: '2016-09-01',
    expiryDate: '2027-12-31',
    verificationStatus: 'verified',
    verifiedAt: '2026-01-20',
    ceHoursRequired: 30,
    ceHoursCompleted: 24,
    ceHoursDueDate: '2027-12-31',
  },
  {
    id: 'cred-demo-009',
    providerId: 'prov-demo-005',
    providerName: 'Elena Vasquez',
    credentialType: 'license',
    credentialName: 'Arizona Speech-Language Pathologist License',
    issuingBody: 'Arizona Department of Health Services',
    licenseNumber: 'SLP-XXXX',
    state: 'AZ',
    issueDate: '2016-10-15',
    expiryDate: '2026-10-15',
    verificationStatus: 'verified',
    verifiedAt: '2026-01-20',
    ceHoursRequired: 20,
    ceHoursCompleted: 18,
    ceHoursDueDate: '2026-10-15',
  },
  // James Okafor
  {
    id: 'cred-demo-010',
    providerId: 'prov-demo-006',
    providerName: 'James Okafor',
    credentialType: 'license',
    credentialName: 'Arizona Occupational Therapy License (OTR/L)',
    issuingBody: 'Arizona Board of Occupational Therapy Examiners',
    licenseNumber: 'OT-XXXX',
    state: 'AZ',
    issueDate: '2019-07-01',
    expiryDate: '2026-06-30',
    verificationStatus: 'renewal_due',
    verifiedAt: '2025-07-15',
    ceHoursRequired: 20,
    ceHoursCompleted: 14,
    ceHoursDueDate: '2026-06-30',
  },
  {
    id: 'cred-demo-011',
    providerId: 'prov-demo-006',
    providerName: 'James Okafor',
    credentialType: 'certification',
    credentialName: 'National Board for Certification in Occupational Therapy (NBCOT)',
    issuingBody: 'NBCOT',
    licenseNumber: 'OTR-XXXXXX',
    issueDate: '2019-06-15',
    expiryDate: '2027-06-15',
    verificationStatus: 'verified',
    verifiedAt: '2026-01-10',
    ceHoursRequired: 36,
    ceHoursCompleted: 30,
    ceHoursDueDate: '2027-06-15',
  },
  // Rachel Nguyen
  {
    id: 'cred-demo-012',
    providerId: 'prov-demo-007',
    providerName: 'Rachel Nguyen',
    credentialType: 'certification',
    credentialName: 'Board Certified Behavior Analyst (BCBA)',
    issuingBody: 'Behavior Analyst Certification Board (BACB)',
    licenseNumber: 'BCBA-1-XX-XXXX',
    issueDate: '2012-01-10',
    expiryDate: '2027-01-31',
    verificationStatus: 'verified',
    verifiedAt: '2026-02-01',
    ceHoursRequired: 32,
    ceHoursCompleted: 32,
    ceHoursDueDate: '2027-01-31',
  },
];

// ============================================================================
// Utility Helpers
// ============================================================================

/** Get a provider by ID */
export function getDemoProviderById(id: string): DemoProvider | undefined {
  return DEMO_PROVIDERS.find((p) => p.id === id);
}

/** Get all referrals for a specific provider */
export function getDemoReferralsByProvider(providerId: string): DemoReferral[] {
  return DEMO_REFERRALS.filter((r) => r.providerId === providerId);
}

/** Get all outcomes for a specific provider */
export function getDemoOutcomesByProvider(providerId: string): DemoOutcome[] {
  return DEMO_OUTCOMES.filter((o) => o.providerId === providerId);
}

/** Get the care team for a specific family */
export function getDemoCareTeamByFamily(familyName: string): DemoCareTeam | undefined {
  return DEMO_CARE_TEAMS.find((t) => t.familyName === familyName);
}

/** Get all credentials for a specific provider */
export function getDemoCredentialsByProvider(providerId: string): DemoCredential[] {
  return DEMO_CREDENTIALS.filter((c) => c.providerId === providerId);
}

/** Get providers accepting new patients */
export function getAvailableDemoProviders(): DemoProvider[] {
  return DEMO_PROVIDERS.filter((p) => p.acceptsNewPatients);
}

/** Get referral counts by status */
export function getDemoReferralCounts(): Record<ReferralStatus, number> {
  return DEMO_REFERRALS.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { pending: 0, accepted: 0, completed: 0, declined: 0 } as Record<ReferralStatus, number>,
  );
}

/** Get average outcome progress across all active goals */
export function getDemoAverageProgress(): number {
  const activeOutcomes = DEMO_OUTCOMES.filter((o) => o.status !== 'completed');
  if (activeOutcomes.length === 0) return 0;
  const totalProgress = activeOutcomes.reduce((sum, o) => sum + o.progressPercent, 0);
  return Math.round(totalProgress / activeOutcomes.length);
}
