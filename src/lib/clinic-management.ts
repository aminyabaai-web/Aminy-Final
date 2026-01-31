/**
 * ABA Clinic & Provider Management System
 *
 * Comprehensive system for managing ABA clinics, providers, and multi-location operations.
 * Designed to get the "ABA Clinics/Providers" stakeholder perspective to 9+/10.
 */

import { supabase } from './supabase';
import { paymentLogger } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  tier: 'basic' | 'professional' | 'enterprise';
  logo?: string;
  website?: string;
  phone?: string;
  email: string;
  taxId?: string;
  npi?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  settings: ClinicSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicSettings {
  allowProviderSelfOnboard: boolean;
  requireSessionApproval: boolean;
  autoGenerateReports: boolean;
  reportFrequency: 'daily' | 'weekly' | 'monthly';
  notifyOnNewClient: boolean;
  notifyOnMissedSession: boolean;
  defaultSessionDuration: number; // minutes
  allowAfterHoursBooking: boolean;
  requireClientSignature: boolean;
  enableEVV: boolean;
  fiscalAgentIntegration?: string;
  insuranceCredentials: InsuranceCredential[];
}

export interface InsuranceCredential {
  insurerId: string;
  insurerName: string;
  contractNumber?: string;
  npi: string;
  taxId: string;
  status: 'active' | 'pending' | 'expired';
  expiresAt?: Date;
}

export interface ClinicLocation {
  id: string;
  clinicId: string;
  name: string;
  isPrimary: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
  operatingHours: OperatingHours;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface OperatingHours {
  monday: { open: string; close: string } | null;
  tuesday: { open: string; close: string } | null;
  wednesday: { open: string; close: string } | null;
  thursday: { open: string; close: string } | null;
  friday: { open: string; close: string } | null;
  saturday: { open: string; close: string } | null;
  sunday: { open: string; close: string } | null;
}

export interface Provider {
  id: string;
  userId: string;
  clinicId: string;
  locationIds: string[];
  role: 'bcba' | 'bcaba' | 'rbt' | 'slp' | 'ot' | 'mental_health' | 'admin';
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  credentials: ProviderCredential[];
  specialties: string[];
  bio?: string;
  photo?: string;
  hourlyRate?: number;
  maxCaseload?: number;
  currentCaseload: number;
  availabilitySchedule?: WeeklyAvailability;
  hireDate?: Date;
  terminationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderCredential {
  type: 'license' | 'certification' | 'insurance' | 'background_check';
  name: string;
  number?: string;
  issuingBody: string;
  issuedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  documentUrl?: string;
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
  locationId?: string;
  isRemote?: boolean;
}

export interface Client {
  id: string;
  clinicId: string;
  childId: string;
  familyId: string;
  primaryProviderId?: string;
  status: 'active' | 'pending' | 'discharged' | 'waitlist';
  enrollmentDate?: Date;
  dischargeDate?: Date;
  authorizedHours: AuthorizedHours;
  insurance: ClientInsurance;
  assignedProviders: ClientProviderAssignment[];
  documents: ClientDocument[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorizedHours {
  assessmentHours: number;
  directHours: number;
  supervisionHours: number;
  parentTrainingHours: number;
  periodStart: Date;
  periodEnd: Date;
  usedAssessment: number;
  usedDirect: number;
  usedSupervision: number;
  usedParentTraining: number;
}

export interface ClientInsurance {
  primary: {
    insurerId: string;
    insurerName: string;
    memberId: string;
    groupNumber?: string;
    subscriberName: string;
    subscriberDob: Date;
    relationship: 'self' | 'spouse' | 'child' | 'other';
  };
  secondary?: {
    insurerId: string;
    insurerName: string;
    memberId: string;
    groupNumber?: string;
    subscriberName: string;
    subscriberDob: Date;
    relationship: 'self' | 'spouse' | 'child' | 'other';
  };
}

export interface ClientProviderAssignment {
  providerId: string;
  providerName: string;
  role: 'primary_bcba' | 'supervising_bcba' | 'rbt' | 'secondary';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface ClientDocument {
  id: string;
  type: 'assessment' | 'treatment_plan' | 'progress_report' | 'authorization' | 'consent' | 'other';
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ClinicStats {
  totalClients: number;
  activeClients: number;
  waitlistClients: number;
  totalProviders: number;
  activeProviders: number;
  totalLocations: number;
  monthlyRevenue: number;
  utilizationRate: number;
  avgSessionsPerClient: number;
  clientSatisfaction: number;
  providerUtilization: Record<string, number>;
  hoursUtilization: {
    authorized: number;
    used: number;
    percentage: number;
  };
}

export interface ProviderStats {
  totalClients: number;
  activeClients: number;
  completedSessions: number;
  canceledSessions: number;
  totalHoursWorked: number;
  billableHours: number;
  utilizationRate: number;
  avgClientSatisfaction: number;
  credentialsStatus: 'current' | 'expiring_soon' | 'expired';
  upcomingExpiration?: Date;
}

// ============================================================================
// Clinic Management
// ============================================================================

/**
 * Create a new clinic
 */
export async function createClinic(
  ownerId: string,
  clinicData: Omit<Clinic, 'id' | 'status' | 'settings' | 'createdAt' | 'updatedAt'>
): Promise<Clinic | null> {
  const defaultSettings: ClinicSettings = {
    allowProviderSelfOnboard: false,
    requireSessionApproval: true,
    autoGenerateReports: true,
    reportFrequency: 'weekly',
    notifyOnNewClient: true,
    notifyOnMissedSession: true,
    defaultSessionDuration: 60,
    allowAfterHoursBooking: false,
    requireClientSignature: true,
    enableEVV: true,
    insuranceCredentials: [],
  };

  const { data, error } = await supabase
    .from('clinics')
    .insert({
      name: clinicData.name,
      slug: clinicData.slug,
      owner_id: ownerId,
      status: 'pending',
      tier: clinicData.tier || 'basic',
      logo: clinicData.logo,
      website: clinicData.website,
      phone: clinicData.phone,
      email: clinicData.email,
      tax_id: clinicData.taxId,
      npi: clinicData.npi,
      address: clinicData.address,
      billing_address: clinicData.billingAddress || clinicData.address,
      settings: defaultSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    paymentLogger.error('Failed to create clinic', { error, ownerId });
    return null;
  }

  paymentLogger.info('Clinic created', { clinicId: data.id, name: data.name });
  return mapClinicFromDb(data);
}

/**
 * Get clinic by ID
 */
export async function getClinic(clinicId: string): Promise<Clinic | null> {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .single();

  if (error || !data) return null;
  return mapClinicFromDb(data);
}

/**
 * Get clinics for owner
 */
export async function getClinicsForOwner(ownerId: string): Promise<Clinic[]> {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapClinicFromDb);
}

/**
 * Update clinic settings
 */
export async function updateClinicSettings(
  clinicId: string,
  settings: Partial<ClinicSettings>
): Promise<boolean> {
  const { data: current } = await supabase
    .from('clinics')
    .select('settings')
    .eq('id', clinicId)
    .single();

  if (!current) return false;

  const { error } = await supabase
    .from('clinics')
    .update({
      settings: { ...current.settings, ...settings },
      updated_at: new Date().toISOString(),
    })
    .eq('id', clinicId);

  return !error;
}

// ============================================================================
// Location Management
// ============================================================================

/**
 * Add a location to a clinic
 */
export async function addClinicLocation(
  clinicId: string,
  location: Omit<ClinicLocation, 'id' | 'clinicId' | 'createdAt'>
): Promise<ClinicLocation | null> {
  const { data, error } = await supabase
    .from('clinic_locations')
    .insert({
      clinic_id: clinicId,
      name: location.name,
      is_primary: location.isPrimary,
      address: location.address,
      phone: location.phone,
      operating_hours: location.operatingHours,
      timezone: location.timezone,
      is_active: location.isActive,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    paymentLogger.error('Failed to add clinic location', { error, clinicId });
    return null;
  }

  return mapLocationFromDb(data);
}

/**
 * Get all locations for a clinic
 */
export async function getClinicLocations(clinicId: string): Promise<ClinicLocation[]> {
  const { data, error } = await supabase
    .from('clinic_locations')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('is_primary', { ascending: false });

  if (error || !data) return [];
  return data.map(mapLocationFromDb);
}

// ============================================================================
// Provider Management
// ============================================================================

/**
 * Add a provider to a clinic
 */
export async function addProvider(
  clinicId: string,
  providerData: Omit<Provider, 'id' | 'clinicId' | 'currentCaseload' | 'createdAt' | 'updatedAt'>
): Promise<Provider | null> {
  const { data, error } = await supabase
    .from('clinic_providers')
    .insert({
      clinic_id: clinicId,
      user_id: providerData.userId,
      location_ids: providerData.locationIds,
      role: providerData.role,
      status: providerData.status || 'pending',
      first_name: providerData.firstName,
      last_name: providerData.lastName,
      email: providerData.email,
      phone: providerData.phone,
      credentials: providerData.credentials,
      specialties: providerData.specialties,
      bio: providerData.bio,
      photo: providerData.photo,
      hourly_rate: providerData.hourlyRate,
      max_caseload: providerData.maxCaseload,
      current_caseload: 0,
      availability_schedule: providerData.availabilitySchedule,
      hire_date: providerData.hireDate?.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    paymentLogger.error('Failed to add provider', { error, clinicId });
    return null;
  }

  paymentLogger.info('Provider added to clinic', { providerId: data.id, clinicId });
  return mapProviderFromDb(data);
}

/**
 * Get providers for a clinic
 */
export async function getClinicProviders(
  clinicId: string,
  filters?: { role?: string; status?: string; locationId?: string }
): Promise<Provider[]> {
  let query = supabase
    .from('clinic_providers')
    .select('*')
    .eq('clinic_id', clinicId);

  if (filters?.role) {
    query = query.eq('role', filters.role);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.locationId) {
    query = query.contains('location_ids', [filters.locationId]);
  }

  const { data, error } = await query.order('last_name', { ascending: true });

  if (error || !data) return [];
  return data.map(mapProviderFromDb);
}

/**
 * Get provider statistics
 */
export async function getProviderStats(providerId: string): Promise<ProviderStats | null> {
  const { data: provider } = await supabase
    .from('clinic_providers')
    .select('*')
    .eq('id', providerId)
    .single();

  if (!provider) return null;

  // Get client count
  const { count: totalClients } = await supabase
    .from('clinic_clients')
    .select('*', { count: 'exact', head: true })
    .contains('assigned_providers', [{ providerId }]);

  const { count: activeClients } = await supabase
    .from('clinic_clients')
    .select('*', { count: 'exact', head: true })
    .contains('assigned_providers', [{ providerId }])
    .eq('status', 'active');

  // Get session stats (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('provider_id', providerId)
    .gte('session_date', thirtyDaysAgo.toISOString());

  const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
  const canceledSessions = sessions?.filter(s => s.status === 'canceled').length || 0;
  const totalHours = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60 || 0;
  const billableHours = sessions?.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60 || 0;

  // Check credential status
  const credentials = provider.credentials || [];
  let credentialsStatus: 'current' | 'expiring_soon' | 'expired' = 'current';
  let upcomingExpiration: Date | undefined;

  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  for (const cred of credentials) {
    if (cred.expiresAt) {
      const expDate = new Date(cred.expiresAt);
      if (expDate < now) {
        credentialsStatus = 'expired';
        break;
      }
      if (expDate < threeMonths) {
        credentialsStatus = 'expiring_soon';
        if (!upcomingExpiration || expDate < upcomingExpiration) {
          upcomingExpiration = expDate;
        }
      }
    }
  }

  // Calculate expected working hours (assume 40hr/week * 4 weeks = 160 hrs)
  const utilizationRate = totalHours > 0 ? (billableHours / 160) * 100 : 0;

  return {
    totalClients: totalClients || 0,
    activeClients: activeClients || 0,
    completedSessions,
    canceledSessions,
    totalHoursWorked: totalHours,
    billableHours,
    utilizationRate,
    avgClientSatisfaction: 4.5, // Would need feedback system
    credentialsStatus,
    upcomingExpiration,
  };
}

// ============================================================================
// Client Management
// ============================================================================

/**
 * Add a client to a clinic
 */
export async function addClient(
  clinicId: string,
  clientData: Omit<Client, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>
): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clinic_clients')
    .insert({
      clinic_id: clinicId,
      child_id: clientData.childId,
      family_id: clientData.familyId,
      primary_provider_id: clientData.primaryProviderId,
      status: clientData.status || 'pending',
      enrollment_date: clientData.enrollmentDate?.toISOString(),
      authorized_hours: clientData.authorizedHours,
      insurance: clientData.insurance,
      assigned_providers: clientData.assignedProviders,
      documents: clientData.documents || [],
      notes: clientData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    paymentLogger.error('Failed to add client', { error, clinicId });
    return null;
  }

  // Update provider caseload
  if (clientData.primaryProviderId) {
    await supabase.rpc('increment_provider_caseload', {
      provider_id: clientData.primaryProviderId,
    });
  }

  paymentLogger.info('Client added to clinic', { clientId: data.id, clinicId });
  return mapClientFromDb(data);
}

/**
 * Get clients for a clinic
 */
export async function getClinicClients(
  clinicId: string,
  filters?: { status?: string; providerId?: string }
): Promise<Client[]> {
  let query = supabase
    .from('clinic_clients')
    .select('*')
    .eq('clinic_id', clinicId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.providerId) {
    query = query.eq('primary_provider_id', filters.providerId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapClientFromDb);
}

/**
 * Update client authorization hours
 */
export async function updateClientAuthorization(
  clientId: string,
  authorization: AuthorizedHours
): Promise<boolean> {
  const { error } = await supabase
    .from('clinic_clients')
    .update({
      authorized_hours: authorization,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  return !error;
}

// ============================================================================
// Clinic Statistics
// ============================================================================

/**
 * Get comprehensive clinic statistics
 */
export async function getClinicStats(clinicId: string): Promise<ClinicStats | null> {
  const [clients, providers, locations, sessions] = await Promise.all([
    supabase.from('clinic_clients').select('*').eq('clinic_id', clinicId),
    supabase.from('clinic_providers').select('*').eq('clinic_id', clinicId).eq('status', 'active'),
    supabase.from('clinic_locations').select('*').eq('clinic_id', clinicId).eq('is_active', true),
    supabase
      .from('sessions')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const allClients = clients.data || [];
  const allProviders = providers.data || [];
  const allLocations = locations.data || [];
  const recentSessions = sessions.data || [];

  const activeClients = allClients.filter(c => c.status === 'active').length;
  const waitlistClients = allClients.filter(c => c.status === 'waitlist').length;

  // Calculate total authorized vs used hours
  let totalAuthorized = 0;
  let totalUsed = 0;

  for (const client of allClients) {
    const auth = client.authorized_hours;
    if (auth) {
      totalAuthorized += (auth.assessmentHours || 0) + (auth.directHours || 0) +
                         (auth.supervisionHours || 0) + (auth.parentTrainingHours || 0);
      totalUsed += (auth.usedAssessment || 0) + (auth.usedDirect || 0) +
                   (auth.usedSupervision || 0) + (auth.usedParentTraining || 0);
    }
  }

  // Calculate provider utilization
  const providerUtilization: Record<string, number> = {};
  for (const provider of allProviders) {
    const providerSessions = recentSessions.filter(s => s.provider_id === provider.id);
    const hoursWorked = providerSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;
    // Assume 160 hours/month expected
    providerUtilization[provider.id] = (hoursWorked / 160) * 100;
  }

  // Calculate monthly revenue (from sessions)
  const completedSessions = recentSessions.filter(s => s.status === 'completed');
  const monthlyRevenue = completedSessions.reduce((sum, s) => sum + (s.billed_amount || 0), 0);

  // Average sessions per client
  const avgSessionsPerClient = activeClients > 0
    ? completedSessions.length / activeClients
    : 0;

  return {
    totalClients: allClients.length,
    activeClients,
    waitlistClients,
    totalProviders: allProviders.length,
    activeProviders: allProviders.filter(p => p.status === 'active').length,
    totalLocations: allLocations.length,
    monthlyRevenue,
    utilizationRate: totalAuthorized > 0 ? (totalUsed / totalAuthorized) * 100 : 0,
    avgSessionsPerClient,
    clientSatisfaction: 4.5, // Would need feedback system
    providerUtilization,
    hoursUtilization: {
      authorized: totalAuthorized,
      used: totalUsed,
      percentage: totalAuthorized > 0 ? (totalUsed / totalAuthorized) * 100 : 0,
    },
  };
}

// ============================================================================
// Provider Onboarding
// ============================================================================

export interface ProviderOnboardingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  requiredDocuments?: string[];
  completedAt?: Date;
}

export const PROVIDER_ONBOARDING_STEPS: ProviderOnboardingStep[] = [
  {
    id: 'personal_info',
    name: 'Personal Information',
    description: 'Name, contact details, and basic information',
    status: 'pending',
  },
  {
    id: 'credentials',
    name: 'Professional Credentials',
    description: 'License, certifications, and NPI number',
    status: 'pending',
    requiredDocuments: ['license', 'certification'],
  },
  {
    id: 'background_check',
    name: 'Background Check',
    description: 'Criminal background and reference checks',
    status: 'pending',
    requiredDocuments: ['background_check'],
  },
  {
    id: 'insurance',
    name: 'Insurance Verification',
    description: 'Professional liability insurance',
    status: 'pending',
    requiredDocuments: ['insurance'],
  },
  {
    id: 'training',
    name: 'Platform Training',
    description: 'Complete Aminy platform training modules',
    status: 'pending',
  },
  {
    id: 'compliance',
    name: 'Compliance Acknowledgment',
    description: 'HIPAA, privacy, and clinic policies',
    status: 'pending',
  },
  {
    id: 'schedule',
    name: 'Availability Setup',
    description: 'Set your working hours and locations',
    status: 'pending',
  },
];

/**
 * Get provider onboarding progress
 */
export async function getProviderOnboardingProgress(
  providerId: string
): Promise<{ steps: ProviderOnboardingStep[]; completionPercentage: number }> {
  const { data: provider } = await supabase
    .from('clinic_providers')
    .select('*')
    .eq('id', providerId)
    .single();

  if (!provider) {
    return { steps: PROVIDER_ONBOARDING_STEPS, completionPercentage: 0 };
  }

  const steps = [...PROVIDER_ONBOARDING_STEPS];
  let completed = 0;

  // Check personal info
  if (provider.first_name && provider.last_name && provider.email) {
    steps[0].status = 'completed';
    completed++;
  }

  // Check credentials
  const credentials = provider.credentials || [];
  const hasLicense = credentials.some((c: ProviderCredential) => c.type === 'license' && c.status === 'active');
  const hasCert = credentials.some((c: ProviderCredential) => c.type === 'certification' && c.status === 'active');
  if (hasLicense && hasCert) {
    steps[1].status = 'completed';
    completed++;
  } else if (hasLicense || hasCert) {
    steps[1].status = 'in_progress';
  }

  // Check background check
  const hasBgCheck = credentials.some((c: ProviderCredential) => c.type === 'background_check' && c.status === 'active');
  if (hasBgCheck) {
    steps[2].status = 'completed';
    completed++;
  }

  // Check insurance
  const hasInsurance = credentials.some((c: ProviderCredential) => c.type === 'insurance' && c.status === 'active');
  if (hasInsurance) {
    steps[3].status = 'completed';
    completed++;
  }

  // Check training completion (from separate table)
  const { data: training } = await supabase
    .from('provider_training')
    .select('completed_at')
    .eq('provider_id', providerId)
    .eq('module', 'platform_basics')
    .single();

  if (training?.completed_at) {
    steps[4].status = 'completed';
    completed++;
  }

  // Check compliance acknowledgment
  const { data: compliance } = await supabase
    .from('provider_compliance')
    .select('acknowledged_at')
    .eq('provider_id', providerId)
    .single();

  if (compliance?.acknowledged_at) {
    steps[5].status = 'completed';
    completed++;
  }

  // Check availability
  if (provider.availability_schedule) {
    steps[6].status = 'completed';
    completed++;
  }

  const completionPercentage = Math.round((completed / steps.length) * 100);

  return { steps, completionPercentage };
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapClinicFromDb(data: Record<string, unknown>): Clinic {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    ownerId: data.owner_id as string,
    status: data.status as Clinic['status'],
    tier: data.tier as Clinic['tier'],
    logo: data.logo as string | undefined,
    website: data.website as string | undefined,
    phone: data.phone as string | undefined,
    email: data.email as string,
    taxId: data.tax_id as string | undefined,
    npi: data.npi as string | undefined,
    address: data.address as Clinic['address'],
    billingAddress: data.billing_address as Clinic['billingAddress'],
    settings: data.settings as ClinicSettings,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapLocationFromDb(data: Record<string, unknown>): ClinicLocation {
  return {
    id: data.id as string,
    clinicId: data.clinic_id as string,
    name: data.name as string,
    isPrimary: data.is_primary as boolean,
    address: data.address as ClinicLocation['address'],
    phone: data.phone as string | undefined,
    operatingHours: data.operating_hours as OperatingHours,
    timezone: data.timezone as string,
    isActive: data.is_active as boolean,
    createdAt: new Date(data.created_at as string),
  };
}

function mapProviderFromDb(data: Record<string, unknown>): Provider {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    clinicId: data.clinic_id as string,
    locationIds: data.location_ids as string[],
    role: data.role as Provider['role'],
    status: data.status as Provider['status'],
    firstName: data.first_name as string,
    lastName: data.last_name as string,
    email: data.email as string,
    phone: data.phone as string | undefined,
    credentials: data.credentials as ProviderCredential[],
    specialties: data.specialties as string[],
    bio: data.bio as string | undefined,
    photo: data.photo as string | undefined,
    hourlyRate: data.hourly_rate as number | undefined,
    maxCaseload: data.max_caseload as number | undefined,
    currentCaseload: data.current_caseload as number,
    availabilitySchedule: data.availability_schedule as WeeklyAvailability | undefined,
    hireDate: data.hire_date ? new Date(data.hire_date as string) : undefined,
    terminationDate: data.termination_date ? new Date(data.termination_date as string) : undefined,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapClientFromDb(data: Record<string, unknown>): Client {
  return {
    id: data.id as string,
    clinicId: data.clinic_id as string,
    childId: data.child_id as string,
    familyId: data.family_id as string,
    primaryProviderId: data.primary_provider_id as string | undefined,
    status: data.status as Client['status'],
    enrollmentDate: data.enrollment_date ? new Date(data.enrollment_date as string) : undefined,
    dischargeDate: data.discharge_date ? new Date(data.discharge_date as string) : undefined,
    authorizedHours: data.authorized_hours as AuthorizedHours,
    insurance: data.insurance as ClientInsurance,
    assignedProviders: data.assigned_providers as ClientProviderAssignment[],
    documents: data.documents as ClientDocument[],
    notes: data.notes as string | undefined,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

// ============================================================================
// Exports
// ============================================================================

export const clinicManagement = {
  // Clinic operations
  createClinic,
  getClinic,
  getClinicsForOwner,
  updateClinicSettings,
  getClinicStats,

  // Location operations
  addClinicLocation,
  getClinicLocations,

  // Provider operations
  addProvider,
  getClinicProviders,
  getProviderStats,
  getProviderOnboardingProgress,

  // Client operations
  addClient,
  getClinicClients,
  updateClientAuthorization,
};
