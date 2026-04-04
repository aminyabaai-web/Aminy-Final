/**
 * Social Proof Engine
 * Trust signals displayed throughout the app to build confidence
 * and create urgency for neurodivergent family care.
 *
 * All data is realistic demo data suitable for pre-launch.
 */

// ============================================================================
// Types
// ============================================================================

export interface RecentActivity {
  id: string;
  type: 'booking' | 'signup' | 'milestone' | 'review';
  message: string;
  location: string;
  timeAgo: string;
  icon: 'calendar' | 'user-plus' | 'star' | 'trophy' | 'heart';
}

export interface WaitlistPosition {
  position: number;
  totalAhead: number;
  area: string;
  estimatedWait: string;
}

export interface ProviderDemand {
  providerId: string;
  providerName: string;
  credentials: string;
  slotsRemaining: number;
  totalSlots: number;
  nextAvailable: string;
  specialty: string;
}

export interface MilestoneStats {
  easeActivitiesCompleted: number;
  familiesJoined: number;
  sessionsBooked: number;
  providersOnPlatform: number;
  careMinutesLogged: number;
  averageRating: number;
}

export interface Testimonial {
  id: string;
  firstName: string;
  city: string;
  state: string;
  quote: string;
  rating: number;
  childAge: string;
  serviceType: string;
  avatarInitials: string;
}

// ============================================================================
// Demo Data Pools
// ============================================================================

const PHOENIX_CITIES = [
  'Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler',
  'Gilbert', 'Glendale', 'Peoria', 'Surprise', 'Goodyear',
];

const OTHER_CITIES = [
  'Los Angeles', 'San Diego', 'Denver', 'Austin', 'Houston',
  'Dallas', 'Nashville', 'Atlanta', 'Charlotte', 'Orlando',
];

const ALL_CITIES = [...PHOENIX_CITIES, ...OTHER_CITIES];

const SERVICE_TYPES = [
  'ABA therapy', 'BCBA session', 'speech therapy', 'occupational therapy',
  'behavioral assessment', 'parent training', 'social skills group',
];

const FIRST_NAMES = [
  'Sarah', 'Jessica', 'Amanda', 'Rachel', 'Emily',
  'Michael', 'David', 'James', 'Chris', 'Daniel',
  'Maria', 'Lisa', 'Ana', 'Nicole', 'Ashley',
  'Brandon', 'Tyler', 'Ryan', 'Kevin', 'Andrew',
];

const TIME_AGOS = [
  '2 minutes ago', '5 minutes ago', '12 minutes ago', '18 minutes ago',
  '32 minutes ago', '1 hour ago', '2 hours ago', '3 hours ago',
];

const PROVIDER_NAMES: Array<{ name: string; credentials: string; specialty: string }> = [
  { name: 'Dr. Sarah Chen', credentials: 'BCBA-D', specialty: 'ABA Therapy' },
  { name: 'Dr. Michael Rodriguez', credentials: 'BCBA', specialty: 'Early Intervention' },
  { name: 'Lauren Mitchell', credentials: 'BCBA, LBA', specialty: 'Verbal Behavior' },
  { name: 'Dr. Emily Park', credentials: 'SLP-CCC', specialty: 'Speech Therapy' },
  { name: 'James Thompson', credentials: 'OTR/L', specialty: 'Occupational Therapy' },
  { name: 'Dr. Priya Patel', credentials: 'BCBA-D', specialty: 'Autism Diagnostics' },
  { name: 'Katie Wilson', credentials: 'BCBA', specialty: 'Social Skills' },
  { name: 'Dr. Robert Kim', credentials: 'BCBA, PhD', specialty: 'Behavioral Assessment' },
];

const TESTIMONIALS_POOL: Testimonial[] = [
  {
    id: 't1',
    firstName: 'Sarah',
    city: 'Scottsdale',
    state: 'AZ',
    quote: 'Aminy helped us find an amazing BCBA within a week. Our son has made more progress in 3 months than the previous year.',
    rating: 5,
    childAge: '4 years old',
    serviceType: 'ABA Therapy',
    avatarInitials: 'SM',
  },
  {
    id: 't2',
    firstName: 'Jessica',
    city: 'Phoenix',
    state: 'AZ',
    quote: 'The Ease activities are a game-changer. My daughter looks forward to her calming exercises every morning.',
    rating: 5,
    childAge: '6 years old',
    serviceType: 'Behavioral Support',
    avatarInitials: 'JR',
  },
  {
    id: 't3',
    firstName: 'Michael',
    city: 'Tempe',
    state: 'AZ',
    quote: 'Finally, one app that coordinates between our BCBA, speech therapist, and school. The care plan feature is incredible.',
    rating: 5,
    childAge: '7 years old',
    serviceType: 'Care Coordination',
    avatarInitials: 'MK',
  },
  {
    id: 't4',
    firstName: 'Amanda',
    city: 'Gilbert',
    state: 'AZ',
    quote: 'We were on a 6-month waitlist elsewhere. Aminy connected us with a BCBA who had openings in 2 weeks.',
    rating: 5,
    childAge: '3 years old',
    serviceType: 'ABA Therapy',
    avatarInitials: 'AT',
  },
  {
    id: 't5',
    firstName: 'Rachel',
    city: 'Mesa',
    state: 'AZ',
    quote: 'The progress tracking gives me data I can actually share with our pediatrician. No more guessing.',
    rating: 4,
    childAge: '5 years old',
    serviceType: 'Progress Tracking',
    avatarInitials: 'RP',
  },
  {
    id: 't6',
    firstName: 'David',
    city: 'Chandler',
    state: 'AZ',
    quote: 'My son asks to do his Aminy Jr activities every day. The visual schedule has completely transformed our mornings.',
    rating: 5,
    childAge: '4 years old',
    serviceType: 'Daily Activities',
    avatarInitials: 'DL',
  },
  {
    id: 't7',
    firstName: 'Emily',
    city: 'Denver',
    state: 'CO',
    quote: 'The telehealth sessions are so seamless. Our BCBA can observe behaviors in real-time at home. This is the future.',
    rating: 5,
    childAge: '6 years old',
    serviceType: 'Telehealth ABA',
    avatarInitials: 'EP',
  },
  {
    id: 't8',
    firstName: 'Maria',
    city: 'Austin',
    state: 'TX',
    quote: 'As a bilingual family, having care plan notes in Spanish has been a huge relief. Aminy gets it.',
    rating: 5,
    childAge: '5 years old',
    serviceType: 'Bilingual Support',
    avatarInitials: 'MG',
  },
];

// ============================================================================
// Deterministic Random (seeded by time bucket so data is consistent within a period)
// ============================================================================

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getTimeBucket(intervalMinutes: number): number {
  return Math.floor(Date.now() / (intervalMinutes * 60 * 1000));
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get recent activity notifications for social proof.
 * Returns activities that rotate every few minutes to feel live.
 */
export function getRecentActivity(count: number = 5): RecentActivity[] {
  const bucket = getTimeBucket(3); // Rotates every 3 minutes
  const activities: RecentActivity[] = [];

  for (let i = 0; i < count; i++) {
    const seed = bucket * 100 + i;
    const city = pick(ALL_CITIES, seed);
    const name = pick(FIRST_NAMES, seed + 1);
    const service = pick(SERVICE_TYPES, seed + 2);
    const timeAgo = TIME_AGOS[i % TIME_AGOS.length];

    const templates = [
      {
        type: 'booking' as const,
        message: `${name} from ${city} booked ${service}`,
        icon: 'calendar' as const,
      },
      {
        type: 'signup' as const,
        message: `A family in ${city} just joined Aminy`,
        icon: 'user-plus' as const,
      },
      {
        type: 'milestone' as const,
        message: `${name} in ${city} completed a 7-day Ease streak`,
        icon: 'trophy' as const,
      },
      {
        type: 'review' as const,
        message: `${name} from ${city} rated their BCBA session 5 stars`,
        icon: 'star' as const,
      },
    ];

    const template = templates[i % templates.length];

    activities.push({
      id: `activity-${seed}`,
      type: template.type,
      message: template.message,
      location: city,
      timeAgo,
      icon: template.icon,
    });
  }

  return activities;
}

/**
 * Get waitlist position for urgency signaling.
 * Varies by area to feel realistic.
 */
export function getWaitlistPosition(userCity?: string): WaitlistPosition {
  const bucket = getTimeBucket(60); // Updates hourly
  const city = userCity || 'Phoenix';
  const seed = bucket + city.length;

  const basePosition = Math.floor(seededRandom(seed) * 30) + 15;
  const totalAhead = Math.floor(seededRandom(seed + 1) * 40) + 20;

  return {
    position: basePosition,
    totalAhead,
    area: city,
    estimatedWait: totalAhead > 30 ? '2-3 weeks' : '1-2 weeks',
  };
}

/**
 * Get provider demand signals (slot scarcity).
 */
export function getProviderDemand(count: number = 3): ProviderDemand[] {
  const bucket = getTimeBucket(30); // Updates every 30 minutes
  const demands: ProviderDemand[] = [];

  for (let i = 0; i < count; i++) {
    const seed = bucket * 50 + i;
    const provider = PROVIDER_NAMES[i % PROVIDER_NAMES.length];
    const slotsRemaining = Math.floor(seededRandom(seed) * 4) + 1; // 1-4 slots
    const daysUntilNext = Math.floor(seededRandom(seed + 1) * 5) + 1;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysUntilNext);

    demands.push({
      providerId: `provider-${i}`,
      providerName: provider.name,
      credentials: provider.credentials,
      slotsRemaining,
      totalSlots: 8,
      nextAvailable: nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      specialty: provider.specialty,
    });
  }

  return demands;
}

/**
 * Get platform milestone stats.
 * Numbers grow slowly to feel organic.
 */
export function getMilestoneStats(): MilestoneStats {
  const daysSinceLaunch = Math.floor((Date.now() - new Date('2026-01-15').getTime()) / 86400000);
  const growthFactor = Math.min(daysSinceLaunch / 365, 1); // Caps at 1 year

  return {
    easeActivitiesCompleted: Math.floor(8400 + growthFactor * 24000),
    familiesJoined: Math.floor(420 + growthFactor * 1800),
    sessionsBooked: Math.floor(1200 + growthFactor * 6000),
    providersOnPlatform: Math.floor(45 + growthFactor * 180),
    careMinutesLogged: Math.floor(180000 + growthFactor * 720000),
    averageRating: 4.8,
  };
}

/**
 * Get rotating testimonials. Returns a subset that changes periodically.
 */
export function getTestimonialRotation(count: number = 3): Testimonial[] {
  const bucket = getTimeBucket(120); // Rotates every 2 hours
  const shuffled = [...TESTIMONIALS_POOL].sort(
    (a, b) => seededRandom(bucket + a.id.charCodeAt(1)) - seededRandom(bucket + b.id.charCodeAt(1))
  );
  return shuffled.slice(0, count);
}

/**
 * Get a single social proof message for toast display.
 * Returns a different message on each call within the same time bucket.
 */
export function getToastMessage(index: number = 0): RecentActivity {
  const activities = getRecentActivity(10);
  return activities[index % activities.length];
}

/**
 * Get a milestone toast message (for platform-wide celebrations).
 */
export function getMilestoneToast(): { message: string; icon: 'trophy' | 'heart' | 'star' } | null {
  const stats = getMilestoneStats();
  const bucket = getTimeBucket(360); // Changes every 6 hours

  const milestones = [
    { threshold: 500, message: `${stats.familiesJoined.toLocaleString()} families have joined Aminy!`, icon: 'heart' as const },
    { threshold: 10000, message: `${stats.easeActivitiesCompleted.toLocaleString()} Ease activities completed this month!`, icon: 'trophy' as const },
    { threshold: 1000, message: `${stats.sessionsBooked.toLocaleString()} therapy sessions booked on Aminy!`, icon: 'star' as const },
  ];

  const seed = seededRandom(bucket);
  const idx = Math.floor(seed * milestones.length);
  return milestones[idx];
}
