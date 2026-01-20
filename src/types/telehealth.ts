/**
 * Telehealth Types for One Medical-style "Get Care" Experience
 *
 * This is an ACCESS + ENGAGEMENT layer, NOT an EHR replacement.
 * Cash-pay only for MVP. No insurance billing, no prescribing, no clinical charting.
 */

// ============================================================================
// CONCERNS & ROUTING
// ============================================================================

export type ConcernCategory =
  | 'most-common'
  | 'autism-neurodivergence'
  | 'caregiver-family';

export interface Concern {
  id: string;
  name: string;
  description: string;
  category: ConcernCategory;
  icon?: string;
  imageUrl?: string;
  // Routing configuration
  recommendedProviderRoles: ProviderRole[];
  recommendedVisitType: VisitType;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  // Safety escalation
  requiresSafetyDisclaimer?: boolean;
  safetyMessage?: string;
}

export const CONCERN_CATEGORIES: Record<ConcernCategory, { title: string; description: string }> = {
  'most-common': {
    title: 'Most Common',
    description: 'Everyday challenges families face'
  },
  'autism-neurodivergence': {
    title: 'Autism & Neurodivergence',
    description: 'Support for unique needs'
  },
  'caregiver-family': {
    title: 'Caregiver & Family',
    description: 'Support for the whole family'
  }
};

// Default concerns configuration (editable via admin)
export const DEFAULT_CONCERNS: Concern[] = [
  // Most Common
  {
    id: 'meltdowns-aggression',
    name: 'Meltdowns / Aggression',
    description: 'Help managing intense emotional responses',
    category: 'most-common',
    icon: '😤',
    recommendedProviderRoles: ['bcba', 'behavior-consultant'],
    recommendedVisitType: 'deep-review',
    urgencyLevel: 'soon'
  },
  {
    id: 'sleep-issues',
    name: 'Sleep issues',
    description: 'Trouble falling or staying asleep',
    category: 'most-common',
    icon: '😴',
    recommendedProviderRoles: ['parent-coach', 'bcba'],
    recommendedVisitType: 'deep-review',
    urgencyLevel: 'routine'
  },
  {
    id: 'transitions',
    name: 'Transitions',
    description: 'Difficulty moving between activities',
    category: 'most-common',
    icon: '🔄',
    recommendedProviderRoles: ['parent-coach', 'bcba'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'picky-eating',
    name: 'Picky eating',
    description: 'Limited food preferences or feeding challenges',
    category: 'most-common',
    icon: '🍽️',
    recommendedProviderRoles: ['parent-coach', 'feeding-specialist'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'potty-training',
    name: 'Potty training',
    description: 'Toilet learning support',
    category: 'most-common',
    icon: '🚽',
    recommendedProviderRoles: ['parent-coach', 'bcba'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'anxiety-worry',
    name: 'Anxiety / Worry',
    description: 'Help with anxious thoughts and fears',
    category: 'most-common',
    icon: '😰',
    recommendedProviderRoles: ['therapist', 'parent-coach'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },

  // Autism & Neurodivergence
  {
    id: 'communication-support',
    name: 'Communication support',
    description: 'Help with speech, AAC, or language',
    category: 'autism-neurodivergence',
    icon: '💬',
    recommendedProviderRoles: ['slp', 'bcba'],
    recommendedVisitType: 'deep-review',
    urgencyLevel: 'routine'
  },
  {
    id: 'sensory-overload',
    name: 'Sensory overload',
    description: 'Managing sensory sensitivities',
    category: 'autism-neurodivergence',
    icon: '🎧',
    recommendedProviderRoles: ['ot', 'parent-coach'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'school-iep-stress',
    name: 'School / IEP stress',
    description: 'Navigating school challenges and IEP meetings',
    category: 'autism-neurodivergence',
    icon: '🏫',
    recommendedProviderRoles: ['education-advocate', 'parent-coach'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'social-skills',
    name: 'Social skills',
    description: 'Building connections and friendships',
    category: 'autism-neurodivergence',
    icon: '👫',
    recommendedProviderRoles: ['bcba', 'therapist'],
    recommendedVisitType: 'deep-review',
    urgencyLevel: 'routine'
  },
  {
    id: 'self-injury-risk',
    name: 'Self-injury concerns',
    description: 'Safety support for self-injurious behaviors',
    category: 'autism-neurodivergence',
    icon: '⚠️',
    recommendedProviderRoles: ['bcba', 'crisis-specialist'],
    recommendedVisitType: 'deep-review',
    urgencyLevel: 'urgent',
    requiresSafetyDisclaimer: true,
    safetyMessage: 'If there is immediate danger, please call 911. For non-emergency support, our specialists can help create a safety plan.'
  },

  // Caregiver & Family
  {
    id: 'parent-burnout',
    name: 'Parent burnout',
    description: 'Support when you\'re running on empty',
    category: 'caregiver-family',
    icon: '🔥',
    recommendedProviderRoles: ['therapist', 'parent-coach'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'sibling-dynamics',
    name: 'Sibling dynamics',
    description: 'Balancing attention and managing sibling relationships',
    category: 'caregiver-family',
    icon: '👧👦',
    recommendedProviderRoles: ['family-therapist', 'parent-coach'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'coparent-conflict',
    name: 'Co-parent conflict',
    description: 'Aligning on approach with your partner',
    category: 'caregiver-family',
    icon: '💑',
    recommendedProviderRoles: ['family-therapist', 'parent-coach'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  },
  {
    id: 'routine-building',
    name: 'Routine building',
    description: 'Creating structure that works',
    category: 'caregiver-family',
    icon: '📋',
    recommendedProviderRoles: ['parent-coach', 'bcba'],
    recommendedVisitType: 'consult',
    urgencyLevel: 'routine'
  }
];

// ============================================================================
// PROVIDERS
// ============================================================================

export type ProviderRole =
  | 'bcba'
  | 'rbt'
  | 'parent-coach'
  | 'therapist'
  | 'family-therapist'
  | 'slp'
  | 'ot'
  | 'feeding-specialist'
  | 'education-advocate'
  | 'behavior-consultant'
  | 'crisis-specialist'
  | 'care-coordinator';

export type ProviderOrganization = 'independent' | 'aact' | 'rise' | 'sensato';

export interface Provider {
  id: string;
  // Profile
  firstName: string;
  lastName: string;
  credentials: string; // e.g., "BCBA", "LCSW", "MS, CCC-SLP"
  role: ProviderRole;
  roleDisplayName: string;
  bio: string;
  avatarUrl?: string;
  hasVideoIntro?: boolean;
  // Licensing
  licensedStates: string[]; // US state abbreviations
  // Visit types offered
  offersConsult: boolean;
  offersDeepReview: boolean;
  // Pricing (cash-pay)
  consultPrice: number; // 25-min
  deepReviewPrice: number; // 50-min
  // Organization (for AACT/Rise pilots)
  organization: ProviderOrganization;
  referralTags?: string[];
  // Ratings
  rating?: number;
  reviewCount?: number;
  // Status
  isActive: boolean;
  acceptingNewPatients: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PROVIDER_ROLE_DISPLAY: Record<ProviderRole, string> = {
  'bcba': 'Board Certified Behavior Analyst',
  'rbt': 'Registered Behavior Technician',
  'parent-coach': 'Parent Coach',
  'therapist': 'Licensed Therapist',
  'family-therapist': 'Family Therapist',
  'slp': 'Speech-Language Pathologist',
  'ot': 'Occupational Therapist',
  'feeding-specialist': 'Feeding Specialist',
  'education-advocate': 'Education Advocate',
  'behavior-consultant': 'Behavior Consultant',
  'crisis-specialist': 'Crisis Specialist',
  'care-coordinator': 'Care Coordinator / Navigator'
};

// ============================================================================
// AVAILABILITY
// ============================================================================

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0

export interface AvailabilityBlock {
  id: string;
  providerId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format (24-hour)
  endTime: string;
  timezone: string; // IANA timezone
  isRecurring: boolean;
  effectiveFrom?: string; // ISO date
  effectiveUntil?: string; // ISO date
}

export interface TimeOffBlock {
  id: string;
  providerId: string;
  startDateTime: string; // ISO datetime
  endDateTime: string;
  reason?: string;
}

export interface TimeSlot {
  id: string;
  providerId: string;
  startTime: string; // ISO datetime
  endTime: string;
  visitType: VisitType;
  status: 'available' | 'held' | 'booked';
  holdExpiresAt?: string; // ISO datetime
  appointmentId?: string;
}

// ============================================================================
// VISITS & APPOINTMENTS
// ============================================================================

export type VisitType = 'consult' | 'deep-review';
export type VisitFormat = 'remote' | 'in-office';

export interface VisitTypeConfig {
  type: VisitType;
  displayName: string;
  duration: number; // minutes
  bufferTime: number; // minutes after appointment
  defaultPrice: number;
  description: string;
}

export const VISIT_TYPES: Record<VisitType, VisitTypeConfig> = {
  'consult': {
    type: 'consult',
    displayName: '25-min Consult',
    duration: 25,
    bufferTime: 5,
    defaultPrice: 75,
    description: 'Quick guidance session for specific questions'
  },
  'deep-review': {
    type: 'deep-review',
    displayName: '50-min Deep Review',
    duration: 50,
    bufferTime: 10,
    defaultPrice: 150,
    description: 'Comprehensive session for complex challenges'
  }
};

export type AppointmentStatus =
  | 'pending-payment'
  | 'confirmed'
  | 'reminder-sent'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'rescheduled';

export interface Appointment {
  id: string;
  userId: string;
  providerId: string;
  // Scheduling
  scheduledAt: string; // ISO datetime
  timezone: string;
  visitType: VisitType;
  visitFormat: VisitFormat;
  duration: number; // minutes
  // Context
  concernId?: string;
  visitReason: string;
  whoIsThisFor: 'child' | 'parent' | 'family';
  userState: string;
  // Payment
  price: number;
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentIntentId?: string;
  // Video
  videoJoinUrl?: string;
  videoProvider: 'zoom' | 'twilio' | 'other';
  // Status
  status: AppointmentStatus;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: 'user' | 'provider' | 'system';
  // Summary (completed visits)
  visitSummary?: VisitSummary;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CARE PLAN & VISIT SUMMARIES
// ============================================================================

export interface VisitSummary {
  id: string;
  appointmentId: string;
  providerId: string;
  userId: string;
  // Summary content
  reasonForVisit: string;
  whatWeDiscussed: string[]; // Bullet points
  planForNext7Days: string[]; // 3-5 action items
  whatToTrack: string[]; // Metrics to watch
  followUpRecommendation?: string;
  // Provider notes (internal)
  providerNotes?: string;
  // AI draft (if used)
  aiDrafted?: boolean;
  aiDraftApprovedAt?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  userId: string;
  visitSummaryId?: string;
  // Content
  title: string;
  description?: string;
  dueDate?: string;
  // Status
  completed: boolean;
  completedAt?: string;
  // Source
  source: 'visit-summary' | 'provider' | 'user' | 'ai';
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GET CARE INTAKE
// ============================================================================

export interface GetCareIntake {
  // Step 1: Reason
  visitReason: string;
  concernId?: string;
  // Step 2: Who
  whoIsThisFor: 'child' | 'parent' | 'family';
  // Step 3: Location
  userState: string;
  userCity?: string;
  // Step 4: Visit type
  visitFormat: VisitFormat;
  preferredVisitType?: VisitType;
}

// ============================================================================
// BOOKING FLOW
// ============================================================================

export interface BookingState {
  // Intake
  intake?: GetCareIntake;
  // Selected provider & slot
  selectedProviderId?: string;
  selectedSlotId?: string;
  selectedSlot?: TimeSlot;
  // Payment
  paymentIntentClientSecret?: string;
  // Confirmation
  appointmentId?: string;
}

// ============================================================================
// WAITLIST
// ============================================================================

export interface WaitlistEntry {
  id: string;
  userId: string;
  userState: string;
  concernId?: string;
  visitReason?: string;
  preferredVisitType?: VisitType;
  notifyEmail: boolean;
  notifySms: boolean;
  status: 'waiting' | 'notified' | 'converted' | 'expired';
  createdAt: string;
  notifiedAt?: string;
  convertedAt?: string;
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export type TelehealthAnalyticsEvent =
  | 'care_entry_clicked'
  | 'concern_selected'
  | 'get_care_submitted'
  | 'availability_viewed'
  | 'slot_selected'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_failed'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_no_show'
  | 'visit_summary_viewed'
  | 'action_item_completed'
  | 'waitlist_joined'
  | 'provider_portal_availability_updated'
  | 'provider_portal_visit_summary_submitted';

export interface TelehealthAnalyticsPayload {
  event: TelehealthAnalyticsEvent;
  userId?: string;
  providerId?: string;
  concernId?: string;
  concernName?: string;
  visitType?: VisitType;
  userState?: string;
  appointmentId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// US STATES
// ============================================================================

export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

// ============================================================================
// MOCK DATA FOR DEVELOPMENT
// ============================================================================

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'provider-1',
    firstName: 'Sarah',
    lastName: 'Chen',
    credentials: 'BCBA, LBA',
    role: 'bcba',
    roleDisplayName: 'Board Certified Behavior Analyst',
    bio: 'Specializing in early intervention and parent coaching for families navigating autism. 10+ years experience with evidence-based approaches.',
    avatarUrl: '/avatars/sarah-chen.jpg',
    hasVideoIntro: true,
    licensedStates: ['AZ', 'CA', 'TX', 'FL', 'NY'],
    offersConsult: true,
    offersDeepReview: true,
    consultPrice: 85,
    deepReviewPrice: 165,
    organization: 'independent',
    rating: 4.9,
    reviewCount: 127,
    isActive: true,
    acceptingNewPatients: true,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'provider-2',
    firstName: 'Michael',
    lastName: 'Rodriguez',
    credentials: 'PhD, BCBA-D',
    role: 'bcba',
    roleDisplayName: 'Board Certified Behavior Analyst - Doctoral',
    bio: 'Clinical director with expertise in complex behavior support plans and crisis intervention. Passionate about family-centered care.',
    avatarUrl: '/avatars/michael-rodriguez.jpg',
    licensedStates: ['AZ', 'NV', 'UT', 'CO'],
    offersConsult: true,
    offersDeepReview: true,
    consultPrice: 95,
    deepReviewPrice: 185,
    organization: 'aact',
    referralTags: ['aact-pilot'],
    rating: 4.8,
    reviewCount: 89,
    isActive: true,
    acceptingNewPatients: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  },
  {
    id: 'provider-3',
    firstName: 'Emily',
    lastName: 'Thompson',
    credentials: 'LCSW',
    role: 'therapist',
    roleDisplayName: 'Licensed Clinical Social Worker',
    bio: 'Supporting parents through the emotional journey of raising neurodivergent children. Specializing in caregiver burnout and family systems.',
    avatarUrl: '/avatars/emily-thompson.jpg',
    licensedStates: ['AZ', 'CA', 'OR', 'WA'],
    offersConsult: true,
    offersDeepReview: true,
    consultPrice: 75,
    deepReviewPrice: 145,
    organization: 'independent',
    rating: 4.9,
    reviewCount: 203,
    isActive: true,
    acceptingNewPatients: true,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  },
  {
    id: 'provider-4',
    firstName: 'James',
    lastName: 'Wilson',
    credentials: 'MS, CCC-SLP',
    role: 'slp',
    roleDisplayName: 'Speech-Language Pathologist',
    bio: 'Pediatric SLP specializing in AAC implementation and early language development. Helping families unlock communication.',
    avatarUrl: '/avatars/james-wilson.jpg',
    licensedStates: ['AZ', 'TX', 'GA', 'NC'],
    offersConsult: true,
    offersDeepReview: true,
    consultPrice: 80,
    deepReviewPrice: 155,
    organization: 'rise',
    referralTags: ['rise-pilot'],
    rating: 4.7,
    reviewCount: 156,
    isActive: true,
    acceptingNewPatients: true,
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z'
  },
  {
    id: 'provider-5',
    firstName: 'Lisa',
    lastName: 'Park',
    credentials: 'Certified Parent Coach',
    role: 'parent-coach',
    roleDisplayName: 'Parent Coach',
    bio: 'Former special education teacher turned parent coach. Practical strategies for everyday challenges. Mother of two neurodivergent children.',
    avatarUrl: '/avatars/lisa-park.jpg',
    licensedStates: ['AZ', 'CA', 'NV', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA'],
    offersConsult: true,
    offersDeepReview: true,
    consultPrice: 65,
    deepReviewPrice: 125,
    organization: 'independent',
    rating: 4.9,
    reviewCount: 312,
    isActive: true,
    acceptingNewPatients: true,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  }
];
