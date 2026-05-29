// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Demo Seed Data — fills empty screens with realistic-looking content
 * when the app is running in demo mode (`?demo=true`, `?demo=investor`,
 * `?demo=aact`, or `VITE_DEMO_MODE=true`).
 *
 * IMPORTANT: This is in-memory only — NEVER writes to the database.
 * Real users never see this data. It's purely a presentation layer
 * for investor demos, AACT walk-throughs, and cold-eye usability tests.
 *
 * How it works:
 *   - Components check `isDemoMode()` and use seed data when true
 *   - When false (normal users), components fetch real DB data
 *   - URL param `?demo=true` flips the flag for one session
 */

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true' || params.get('demo') === 'investor' || params.get('demo') === 'aact') {
    try { sessionStorage.setItem('aminy-demo-mode', '1'); } catch {}
    return true;
  }
  try { return sessionStorage.getItem('aminy-demo-mode') === '1'; } catch { return false; }
}

export function exitDemoMode(): void {
  try { sessionStorage.removeItem('aminy-demo-mode'); } catch {}
}

// ─── Demo providers ─────────────────────────────────────────────────────────

export interface DemoProvider {
  id: string;
  name: string;
  credentials: string;
  title: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  bio: string;
  hourlyRate: number;
  acceptingNew: boolean;
  payers: string[];
  states: string[];
  photoEmoji: string;          // until imagery arrives
  nextAvailable: string;        // "Tomorrow at 3pm", "Next Tuesday"
}

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: 'demo-sarah-lee',
    name: 'Dr. Sarah Lee',
    credentials: 'BCBA-D',
    title: 'Lead BCBA, AACT Affiliated',
    specialty: 'Early intervention, transitions, communication',
    rating: 4.9,
    reviewCount: 127,
    yearsExperience: 12,
    bio: 'Dr. Lee specializes in early-intervention ABA for children 2-7 with a focus on functional communication and transition planning. Trained at UCLA, AACT-affiliated.',
    hourlyRate: 14900,
    acceptingNew: true,
    payers: ['AHCCCS', 'BCBS AZ', 'Aetna', 'United Healthcare'],
    states: ['AZ'],
    photoEmoji: '👩‍⚕️',
    nextAvailable: 'Tomorrow at 3pm',
  },
  {
    id: 'demo-marcus-johnson',
    name: 'Marcus Johnson',
    credentials: 'BCBA',
    title: 'Senior BCBA',
    specialty: 'School-age behavior, IEP collaboration, social skills',
    rating: 4.8,
    reviewCount: 89,
    yearsExperience: 8,
    bio: 'Marcus focuses on school-age children (5-12), working closely with parents and IEP teams to bridge home and school behaviors. Bilingual (English/Spanish).',
    hourlyRate: 14900,
    acceptingNew: true,
    payers: ['AHCCCS', 'Cigna', 'Mercy Care', 'Banner Health'],
    states: ['AZ'],
    photoEmoji: '👨‍⚕️',
    nextAvailable: 'Wed at 10am',
  },
  {
    id: 'demo-priya-patel',
    name: 'Priya Patel',
    credentials: 'BCBA',
    title: 'BCBA · Telehealth',
    specialty: 'Parent coaching, feeding, sleep behaviors',
    rating: 5.0,
    reviewCount: 42,
    yearsExperience: 6,
    bio: 'Priya delivers most of her work via parent coaching — empowering caregivers to be the primary intervention agent. Strong focus on feeding + sleep.',
    hourlyRate: 12900,
    acceptingNew: true,
    payers: ['AHCCCS', 'BCBS AZ', 'Aetna'],
    states: ['AZ', 'CA'],
    photoEmoji: '👩🏽‍⚕️',
    nextAvailable: 'Today at 6pm',
  },
  {
    id: 'demo-jamie-chen',
    name: 'Jamie Chen, M.S., CCC-SLP',
    credentials: 'SLP',
    title: 'Speech-Language Pathologist',
    specialty: 'AAC, articulation, language delays',
    rating: 4.9,
    reviewCount: 73,
    yearsExperience: 10,
    bio: 'Jamie specializes in augmentative & alternative communication (AAC) for minimally-verbal children. Certified in PECS, PROMPT, and DIR/Floortime.',
    hourlyRate: 11900,
    acceptingNew: true,
    payers: ['AHCCCS', 'BCBS AZ', 'Cigna', 'United Healthcare'],
    states: ['AZ'],
    photoEmoji: '🧑‍⚕️',
    nextAvailable: 'Thu at 2pm',
  },
  {
    id: 'demo-dr-williams',
    name: 'Dr. Rachel Williams, Psy.D.',
    credentials: 'Licensed Psychologist',
    title: 'Child + Family Psychologist',
    specialty: 'Parent anxiety, family dynamics, sibling support',
    rating: 4.9,
    reviewCount: 54,
    yearsExperience: 15,
    bio: 'Dr. Williams supports parents and siblings of neurodivergent children — burnout prevention, marriage strain, sibling identity. Telehealth across AZ, CA, NY.',
    hourlyRate: 17900,
    acceptingNew: true,
    payers: ['BCBS AZ', 'Cigna', 'Aetna', 'United Healthcare'],
    states: ['AZ', 'CA', 'NY'],
    photoEmoji: '👩‍⚕️',
    nextAvailable: 'Mon at 11am',
  },
];

// ─── Demo appointments (for dashboard upcoming events) ─────────────────────

export interface DemoAppointment {
  id: string;
  title: string;
  providerName: string;
  serviceType: string;
  startAt: string;   // ISO
  durationMinutes: number;
  location: string;
}

export function demoAppointments(): DemoAppointment[] {
  const now = Date.now();
  return [
    {
      id: 'demo-apt-1',
      title: 'ABA session — focus on transitions',
      providerName: 'Dr. Sarah Lee, BCBA-D',
      serviceType: 'ABA',
      startAt: new Date(now + 1 * 86_400_000 + 3 * 3600_000).toISOString(),  // tomorrow + 3h
      durationMinutes: 60,
      location: 'Telehealth',
    },
    {
      id: 'demo-apt-2',
      title: 'Speech therapy — AAC practice',
      providerName: 'Jamie Chen, CCC-SLP',
      serviceType: 'ST',
      startAt: new Date(now + 3 * 86_400_000).toISOString(),
      durationMinutes: 50,
      location: 'Phoenix office',
    },
    {
      id: 'demo-apt-3',
      title: 'Parent coaching — bedtime routine',
      providerName: 'Priya Patel, BCBA',
      serviceType: 'ABA',
      startAt: new Date(now + 7 * 86_400_000).toISOString(),
      durationMinutes: 45,
      location: 'Telehealth',
    },
  ];
}

// ─── Demo outcome submissions (for trends chart) ─────────────────────────

export interface DemoOutcomeSubmission {
  id: string;
  measureId: 'phq9' | 'gad7' | 'abc-irritability';
  measureName: string;
  totalScore: number;
  severityBand: string;
  createdAt: string;
}

export function demoOutcomeSubmissions(): DemoOutcomeSubmission[] {
  const now = Date.now();
  const wk = 7 * 86_400_000;
  return [
    // PHQ-9 trend: started high (parent burnout), gradually improving (the story we want to tell)
    { id: 'phq-1', measureId: 'phq9', measureName: 'PHQ-9', totalScore: 14, severityBand: 'moderate', createdAt: new Date(now - 8 * wk).toISOString() },
    { id: 'phq-2', measureId: 'phq9', measureName: 'PHQ-9', totalScore: 12, severityBand: 'moderate', createdAt: new Date(now - 6 * wk).toISOString() },
    { id: 'phq-3', measureId: 'phq9', measureName: 'PHQ-9', totalScore: 9,  severityBand: 'mild',     createdAt: new Date(now - 4 * wk).toISOString() },
    { id: 'phq-4', measureId: 'phq9', measureName: 'PHQ-9', totalScore: 7,  severityBand: 'mild',     createdAt: new Date(now - 2 * wk).toISOString() },
    { id: 'phq-5', measureId: 'phq9', measureName: 'PHQ-9', totalScore: 5,  severityBand: 'mild',     createdAt: new Date(now - 1 * wk).toISOString() },
    // GAD-7: also improving
    { id: 'gad-1', measureId: 'gad7', measureName: 'GAD-7', totalScore: 11, severityBand: 'moderate', createdAt: new Date(now - 8 * wk).toISOString() },
    { id: 'gad-2', measureId: 'gad7', measureName: 'GAD-7', totalScore: 9,  severityBand: 'mild',     createdAt: new Date(now - 4 * wk).toISOString() },
    { id: 'gad-3', measureId: 'gad7', measureName: 'GAD-7', totalScore: 6,  severityBand: 'mild',     createdAt: new Date(now - 1 * wk).toISOString() },
    // ABC-I: dramatic improvement (the headline)
    { id: 'abc-1', measureId: 'abc-irritability', measureName: 'ABC-I', totalScore: 15, severityBand: 'severe',  createdAt: new Date(now - 8 * wk).toISOString() },
    { id: 'abc-2', measureId: 'abc-irritability', measureName: 'ABC-I', totalScore: 11, severityBand: 'mild',    createdAt: new Date(now - 4 * wk).toISOString() },
    { id: 'abc-3', measureId: 'abc-irritability', measureName: 'ABC-I', totalScore: 6,  severityBand: 'minimal', createdAt: new Date(now - 1 * wk).toISOString() },
  ];
}

// ─── AACT exec aggregate (for the partner dashboard) ─────────────────────

export interface DemoPartnerSnapshot {
  newFamiliesThisWeek: number;
  totalActiveFamilies: number;
  activeProviders: number;
  sessionsCompletedThisWeek: number;
  phq9Avg: number;
  phq9DeltaPct: number;          // negative = improving
  gad7Avg: number;
  gad7DeltaPct: number;
  abcIAvg: number;
  abcIDeltaPct: number;
  authsExpiring30d: number;
  licensesExpiring60d: number;
}

export function demoPartnerSnapshot(): DemoPartnerSnapshot {
  return {
    newFamiliesThisWeek: 7,
    totalActiveFamilies: 43,
    activeProviders: 12,
    sessionsCompletedThisWeek: 89,
    phq9Avg: 7.2,
    phq9DeltaPct: -18,    // 18% better than last week
    gad7Avg: 6.1,
    gad7DeltaPct: -12,
    abcIAvg: 5.8,
    abcIDeltaPct: -24,
    authsExpiring30d: 4,
    licensesExpiring60d: 2,
  };
}

// ─── Demo AskAminy queue (for provider portal) ─────────────────────────

export interface DemoAskQueueItem {
  id: string;
  parentName: string;
  childName: string;
  question: string;
  category: string;
  status: 'awaiting_bcba' | 'completed';
  createdAt: string;
}

export function demoAskQueue(): DemoAskQueueItem[] {
  const now = Date.now();
  return [
    {
      id: 'q1',
      parentName: 'M. Rodriguez',
      childName: 'Liam (7)',
      question: 'Liam started biting his shirt every time he comes home from school last week. He never did this before. Is this a regression I should worry about, or sensory?',
      category: 'sensory',
      status: 'awaiting_bcba',
      createdAt: new Date(now - 2 * 3600_000).toISOString(),
    },
    {
      id: 'q2',
      parentName: 'D. Smith',
      childName: 'Mia (5)',
      question: 'Bedtime has become a nightmare. She refuses to brush teeth and screams for 30+ min. What\'s the best way to handle this without it becoming a power struggle?',
      category: 'transitions',
      status: 'awaiting_bcba',
      createdAt: new Date(now - 5 * 3600_000).toISOString(),
    },
    {
      id: 'q3',
      parentName: 'T. Williams',
      childName: 'Ethan (9)',
      question: 'School is recommending we change his IEP from inclusion to self-contained. We\'re torn. What questions should we ask at the IEP meeting?',
      category: 'school',
      status: 'awaiting_bcba',
      createdAt: new Date(now - 1 * 86_400_000).toISOString(),
    },
  ];
}
