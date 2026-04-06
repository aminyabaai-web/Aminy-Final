// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Credentialing Engine
 *
 * Replaces Headway's functionality for the ABA/speech/OT vertical,
 * making Aminy a one-stop-shop for families AND providers.
 *
 * Handles:
 * - CAQH ProView integration (profile fetch, attestation check)
 * - Payer enrollment (application lifecycle, document management)
 * - Credentialing status tracking & dashboard aggregation
 * - Multi-state licensure & telehealth compact awareness
 * - Re-credentialing & renewal workflows
 * - Mock data for development
 *
 * Industry Context:
 * CAQH ProView is the universal provider credentialing repository used by
 * ~1.4M providers and 1,300+ health plans. Pre-populating from CAQH saves
 * providers 20+ hours of manual form-filling per payer application.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// Supabase Edge Function URL for secure credentialing operations
const CREDENTIALING_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/credentialing`;

// CAQH ProView API (routed through Supabase edge function for key security)
const CAQH_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/caqh`;

// Use edge function in production
const USE_EDGE_FUNCTION = import.meta.env.PROD || import.meta.env.VITE_USE_EDGE_FUNCTIONS === 'true';

// Dev mode flag
const IS_DEV = import.meta.env.DEV && import.meta.env.VITE_USE_EDGE_FUNCTIONS !== 'true';

// ============================================================================
// Types
// ============================================================================

export type CredentialingStatus =
  | 'not-started'
  | 'documents-pending'
  | 'submitted'
  | 'under-review'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'renewal-needed';

export type PayerType = 'medicaid' | 'chip' | 'private' | 'tricare' | 'workers-comp';

export type ProviderType = 'bcba' | 'bcaba' | 'rbt' | 'slp' | 'ot' | 'psychologist' | 'lcsw';

export type DocumentType =
  | 'license'
  | 'npi'
  | 'liability-insurance'
  | 'caqh-profile'
  | 'board-certification'
  | 'cv-resume'
  | 'w9'
  | 'drivers-license'
  | 'dea-certificate'
  | 'supervision-agreement'
  | 'background-check'
  | 'immunization-records'
  | 'continuing-education';

export interface CredentialingDocument {
  id: string;
  type: DocumentType;
  name: string;
  required: boolean;
  uploaded: boolean;
  uploadedAt: string | null;
  expirationDate: string | null;
  fileUrl: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface CredentialingEvent {
  id: string;
  timestamp: string;
  type: 'status-change' | 'document-uploaded' | 'document-approved' | 'document-rejected'
    | 'note-added' | 'submission' | 'follow-up' | 'payer-response' | 'renewal-initiated';
  description: string;
  actor: string; // 'system' | 'provider' | 'payer' | userId
  metadata?: Record<string, unknown>;
}

export interface CredentialingApplication {
  id: string;
  providerId: string;
  payerId: string;
  payerName: string;
  payerType: PayerType;
  status: CredentialingStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  // Provider info
  npiNumber: string;
  taxId: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiration: string;
  caqhNumber: string | null;
  // Tracking
  documentsRequired: CredentialingDocument[];
  documentsSubmitted: CredentialingDocument[];
  notes: string[];
  timeline: CredentialingEvent[];
}

export interface CAQHProfile {
  caqhNumber: string;
  providerId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  suffix: string | null;
  npiNumber: string;
  taxId: string;
  dateOfBirth: string;
  ssn: string | null; // Masked in most API responses
  gender: 'M' | 'F' | 'O';
  // Practice info
  practiceAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zip: string;
  };
  mailingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  fax: string | null;
  email: string;
  // Credentials
  licenses: Array<{
    licenseNumber: string;
    state: string;
    type: string;
    issueDate: string;
    expirationDate: string;
    status: 'active' | 'inactive' | 'revoked' | 'pending';
  }>;
  boardCertifications: Array<{
    board: string;
    specialty: string;
    certificationNumber: string;
    issueDate: string;
    expirationDate: string;
    status: 'active' | 'inactive' | 'expired';
  }>;
  education: Array<{
    institution: string;
    degree: string;
    graduationDate: string;
  }>;
  // Insurance
  liabilityInsurance: {
    carrier: string;
    policyNumber: string;
    coverageAmount: number;
    expirationDate: string;
  } | null;
  // Attestation
  attestationDate: string | null;
  attestationStatus: 'current' | 'expired' | 'not-attested';
  nextAttestationDue: string | null;
}

export interface CAQHAttestationStatus {
  caqhNumber: string;
  isAttested: boolean;
  attestationDate: string | null;
  nextAttestationDue: string | null;
  status: 'current' | 'expired' | 'not-attested' | 'in-progress';
  daysUntilExpiration: number | null;
}

export interface PayerRequirements {
  payerId: string;
  payerName: string;
  payerType: PayerType;
  acceptingNewProviders: boolean;
  requiredDocuments: DocumentType[];
  estimatedProcessingDays: number;
  recredentialingIntervalMonths: number;
  supportsElectronicSubmission: boolean;
  applicationUrl: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string[];
  // Provider-type-specific requirements
  providerTypeRequirements: Partial<Record<ProviderType, {
    accepted: boolean;
    additionalDocuments: DocumentType[];
    supervisorRequired: boolean;
    minimumExperienceYears: number;
    notes: string[];
  }>>;
  // State-specific details
  statesAccepting: string[];
}

export interface CredentialingReport {
  providerId: string;
  generatedAt: string;
  summary: {
    totalApplications: number;
    approved: number;
    pending: number;
    denied: number;
    expired: number;
    renewalNeeded: number;
  };
  applications: Array<{
    payerName: string;
    payerType: PayerType;
    status: CredentialingStatus;
    effectiveDate: string | null;
    expirationDate: string | null;
    documentsComplete: boolean;
    missingDocuments: string[];
  }>;
  expiringCredentials: Array<{
    payerName: string;
    expirationDate: string;
    daysUntilExpiration: number;
  }>;
  licensure: Array<{
    state: string;
    licenseNumber: string;
    expirationDate: string;
    status: string;
  }>;
}

export interface StateLicensureRequirement {
  state: string;
  stateName: string;
  providerType: ProviderType;
  requiresStateLicense: boolean;
  licensingBoard: string;
  applicationUrl: string;
  supervisedPracticeHours: number | null;
  examRequired: string | null;
  continuingEducationHours: number | null;
  renewalIntervalYears: number;
  teleheathAllowed: boolean;
  telehealthCompactMember: boolean;
  interstateCompactMember: boolean;
  notes: string[];
}

// ============================================================================
// CAQH Integration
// ============================================================================

/**
 * Fetch a provider's CAQH ProView profile.
 * Pre-populates credentialing forms, saving providers hours of data entry.
 *
 * In production, this routes through a Supabase Edge Function that holds
 * the CAQH API credentials. In dev, returns mock data.
 */
export async function fetchCAQHProfile(caqhNumber: string): Promise<CAQHProfile> {
  if (IS_DEV) {
    return getMockCAQHProfile(caqhNumber);
  }

  const response = await fetch(`${CAQH_FUNCTION_URL}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ caqhNumber }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`CAQH profile fetch failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Map CAQH ProView data to Aminy's credentialing application format.
 * Transforms the flat CAQH structure into what our enrollment forms expect.
 */
export function mapCAQHToCredentialingForm(caqhData: CAQHProfile): Partial<CredentialingApplication> {
  const primaryLicense = caqhData.licenses.find(l => l.status === 'active') ?? caqhData.licenses[0];

  const documentsFromCAQH: CredentialingDocument[] = [];

  // Map license documents
  for (const license of caqhData.licenses.filter(l => l.status === 'active')) {
    documentsFromCAQH.push({
      id: `caqh-license-${license.state}-${license.licenseNumber}`,
      type: 'license',
      name: `${license.state} ${license.type} License #${license.licenseNumber}`,
      required: true,
      uploaded: true,
      uploadedAt: new Date().toISOString(),
      expirationDate: license.expirationDate,
      fileUrl: null, // CAQH stores the actual doc; we reference it
      status: new Date(license.expirationDate) > new Date() ? 'approved' : 'expired',
    });
  }

  // Map board certifications
  for (const cert of caqhData.boardCertifications.filter(c => c.status === 'active')) {
    documentsFromCAQH.push({
      id: `caqh-cert-${cert.board}-${cert.certificationNumber}`,
      type: 'board-certification',
      name: `${cert.board} - ${cert.specialty} #${cert.certificationNumber}`,
      required: true,
      uploaded: true,
      uploadedAt: new Date().toISOString(),
      expirationDate: cert.expirationDate,
      fileUrl: null,
      status: new Date(cert.expirationDate) > new Date() ? 'approved' : 'expired',
    });
  }

  // Map liability insurance
  if (caqhData.liabilityInsurance) {
    documentsFromCAQH.push({
      id: `caqh-insurance-${caqhData.liabilityInsurance.policyNumber}`,
      type: 'liability-insurance',
      name: `${caqhData.liabilityInsurance.carrier} - Policy #${caqhData.liabilityInsurance.policyNumber}`,
      required: true,
      uploaded: true,
      uploadedAt: new Date().toISOString(),
      expirationDate: caqhData.liabilityInsurance.expirationDate,
      fileUrl: null,
      status: new Date(caqhData.liabilityInsurance.expirationDate) > new Date() ? 'approved' : 'expired',
    });
  }

  return {
    npiNumber: caqhData.npiNumber,
    taxId: caqhData.taxId,
    caqhNumber: caqhData.caqhNumber,
    licenseNumber: primaryLicense?.licenseNumber ?? '',
    licenseState: primaryLicense?.state ?? '',
    licenseExpiration: primaryLicense?.expirationDate ?? '',
    documentsSubmitted: documentsFromCAQH,
  };
}

/**
 * Check whether a provider's CAQH attestation is current.
 * CAQH requires re-attestation every 120 days. If expired, the provider
 * must log into CAQH ProView and re-attest before payers will process applications.
 */
export async function checkCAQHAttestationStatus(caqhNumber: string): Promise<CAQHAttestationStatus> {
  if (IS_DEV) {
    return getMockCAQHAttestationStatus(caqhNumber);
  }

  const response = await fetch(`${CAQH_FUNCTION_URL}/attestation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ caqhNumber }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`CAQH attestation check failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ============================================================================
// Payer Enrollment Engine
// ============================================================================

/**
 * Manages the full lifecycle of provider-payer credentialing applications.
 * From initial enrollment through approval (or denial), document management,
 * and status tracking.
 */
export class PayerEnrollmentEngine {
  // In-memory store for dev; Supabase in production
  private applications: Map<string, CredentialingApplication> = new Map();

  /**
   * List payers accepting new providers in a given state and provider type.
   * Filters the payer database by state availability and provider-type acceptance.
   */
  async getAvailablePayers(state: string, providerType: ProviderType): Promise<PayerRequirements[]> {
    if (IS_DEV) {
      return MOCK_PAYER_DATABASE.filter(payer =>
        payer.statesAccepting.includes(state) &&
        payer.acceptingNewProviders &&
        payer.providerTypeRequirements[providerType]?.accepted !== false
      );
    }

    const response = await fetch(`${CREDENTIALING_FUNCTION_URL}/payers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ state, providerType }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch available payers: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Initialize a new credentialing application for a provider with a payer.
   * Sets up required documents based on payer requirements and provider type.
   */
  async startEnrollment(
    providerId: string,
    payerId: string,
    providerInfo: {
      npiNumber: string;
      taxId: string;
      licenseNumber: string;
      licenseState: string;
      licenseExpiration: string;
      caqhNumber?: string;
      providerType: ProviderType;
    },
  ): Promise<CredentialingApplication> {
    // Fetch payer requirements
    const payerReqs = IS_DEV
      ? MOCK_PAYER_DATABASE.find(p => p.payerId === payerId)
      : await this.fetchPayerRequirements(payerId);

    if (!payerReqs) {
      throw new Error(`Payer ${payerId} not found in database`);
    }

    // Build required documents list
    const baseDocuments = payerReqs.requiredDocuments;
    const providerSpecificDocs = payerReqs.providerTypeRequirements[providerInfo.providerType]?.additionalDocuments ?? [];
    const allRequired = [...new Set([...baseDocuments, ...providerSpecificDocs])];

    const documentsRequired: CredentialingDocument[] = allRequired.map((docType, index) => ({
      id: `doc-${payerId}-${docType}-${index}`,
      type: docType,
      name: DOCUMENT_TYPE_NAMES[docType] ?? docType,
      required: true,
      uploaded: false,
      uploadedAt: null,
      expirationDate: null,
      fileUrl: null,
      status: 'pending' as const,
    }));

    const application: CredentialingApplication = {
      id: `cred-${providerId}-${payerId}-${Date.now()}`,
      providerId,
      payerId,
      payerName: payerReqs.payerName,
      payerType: payerReqs.payerType,
      status: 'not-started',
      submittedAt: null,
      approvedAt: null,
      effectiveDate: null,
      expirationDate: null,
      npiNumber: providerInfo.npiNumber,
      taxId: providerInfo.taxId,
      licenseNumber: providerInfo.licenseNumber,
      licenseState: providerInfo.licenseState,
      licenseExpiration: providerInfo.licenseExpiration,
      caqhNumber: providerInfo.caqhNumber ?? null,
      documentsRequired,
      documentsSubmitted: [],
      notes: [],
      timeline: [{
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'status-change',
        description: `Credentialing application initiated with ${payerReqs.payerName}`,
        actor: 'system',
      }],
    };

    if (IS_DEV) {
      this.applications.set(application.id, application);
    } else {
      await this.persistApplication(application);
    }

    return application;
  }

  /**
   * Submit a completed credentialing application to the payer.
   * Validates all required documents are uploaded before submission.
   */
  async submitApplication(applicationId: string): Promise<{ success: boolean; errors: string[] }> {
    const app = await this.getApplication(applicationId);
    if (!app) {
      return { success: false, errors: ['Application not found'] };
    }

    // Validate all required documents are uploaded
    const missingDocs = app.documentsRequired.filter(doc =>
      doc.required && !app.documentsSubmitted.some(sub => sub.type === doc.type && sub.status !== 'rejected')
    );

    if (missingDocs.length > 0) {
      return {
        success: false,
        errors: missingDocs.map(d => `Missing required document: ${d.name}`),
      };
    }

    // Check license isn't expired
    if (new Date(app.licenseExpiration) <= new Date()) {
      return { success: false, errors: ['Provider license has expired. Please renew before submitting.'] };
    }

    // Update application status
    app.status = 'submitted';
    app.submittedAt = new Date().toISOString();
    app.timeline.push({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'submission',
      description: `Application submitted to ${app.payerName}`,
      actor: 'system',
    });

    if (IS_DEV) {
      this.applications.set(app.id, app);
    } else {
      await this.persistApplication(app);
      // Trigger the actual submission via edge function
      await fetch(`${CREDENTIALING_FUNCTION_URL}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ applicationId: app.id }),
      });
    }

    return { success: true, errors: [] };
  }

  /**
   * Check the current status of a credentialing application.
   * In production, polls the payer or clearinghouse for updates.
   */
  async checkApplicationStatus(applicationId: string): Promise<CredentialingApplication | null> {
    if (IS_DEV) {
      const app = this.applications.get(applicationId) ?? null;
      if (app && app.status === 'submitted') {
        // Simulate progress in dev mode
        app.status = 'under-review';
        app.timeline.push({
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'payer-response',
          description: 'Application received and under review by payer',
          actor: 'payer',
        });
        this.applications.set(applicationId, app);
      }
      return app;
    }

    const response = await fetch(`${CREDENTIALING_FUNCTION_URL}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ applicationId }),
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get the list of documents required by a specific payer for a provider type.
   */
  async getRequiredDocuments(payerId: string, providerType: ProviderType): Promise<CredentialingDocument[]> {
    const payerReqs = IS_DEV
      ? MOCK_PAYER_DATABASE.find(p => p.payerId === payerId)
      : await this.fetchPayerRequirements(payerId);

    if (!payerReqs) {
      throw new Error(`Payer ${payerId} not found`);
    }

    const baseDocuments = payerReqs.requiredDocuments;
    const providerSpecificDocs = payerReqs.providerTypeRequirements[providerType]?.additionalDocuments ?? [];
    const allRequired = [...new Set([...baseDocuments, ...providerSpecificDocs])];

    return allRequired.map((docType, index) => ({
      id: `doc-${payerId}-${docType}-${index}`,
      type: docType,
      name: DOCUMENT_TYPE_NAMES[docType] ?? docType,
      required: true,
      uploaded: false,
      uploadedAt: null,
      expirationDate: null,
      fileUrl: null,
      status: 'pending' as const,
    }));
  }

  /**
   * Upload a credentialing document for an application.
   * Validates document type, updates application status, and persists the file.
   */
  async uploadDocument(
    applicationId: string,
    document: { type: DocumentType; name: string; expirationDate?: string },
    _file: File | Blob,
  ): Promise<{ success: boolean; documentId: string; error?: string }> {
    const app = await this.getApplication(applicationId);
    if (!app) {
      return { success: false, documentId: '', error: 'Application not found' };
    }

    // Verify this document type is required
    const isRequired = app.documentsRequired.some(d => d.type === document.type);
    if (!isRequired) {
      // Still allow optional document uploads
      console.warn(`Document type ${document.type} is not in the required list for this application`);
    }

    const documentId = `doc-${applicationId}-${document.type}-${Date.now()}`;
    let fileUrl: string | null = null;

    if (!IS_DEV) {
      // Upload file to Supabase Storage
      const formData = new FormData();
      formData.append('file', _file);
      formData.append('applicationId', applicationId);
      formData.append('documentType', document.type);

      const uploadResponse = await fetch(`${CREDENTIALING_FUNCTION_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        return { success: false, documentId: '', error: `Upload failed: ${uploadResponse.status}` };
      }

      const uploadResult = await uploadResponse.json();
      fileUrl = uploadResult.fileUrl;
    }

    const newDoc: CredentialingDocument = {
      id: documentId,
      type: document.type,
      name: document.name,
      required: isRequired,
      uploaded: true,
      uploadedAt: new Date().toISOString(),
      expirationDate: document.expirationDate ?? null,
      fileUrl,
      status: 'pending', // Will be approved/rejected after review
    };

    app.documentsSubmitted.push(newDoc);
    app.timeline.push({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'document-uploaded',
      description: `Document uploaded: ${document.name}`,
      actor: 'provider',
    });

    // Check if all required documents are now uploaded
    const allDocsUploaded = app.documentsRequired.every(req =>
      app.documentsSubmitted.some(sub => sub.type === req.type)
    );

    if (allDocsUploaded && app.status === 'not-started') {
      app.status = 'documents-pending'; // All docs uploaded, awaiting review
    }

    if (IS_DEV) {
      this.applications.set(app.id, app);
    } else {
      await this.persistApplication(app);
    }

    return { success: true, documentId };
  }

  // -- Private helpers -------------------------------------------------------

  private async getApplication(applicationId: string): Promise<CredentialingApplication | null> {
    if (IS_DEV) {
      return this.applications.get(applicationId) ?? null;
    }

    const response = await fetch(`${CREDENTIALING_FUNCTION_URL}/application/${applicationId}`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });

    if (!response.ok) return null;
    return response.json();
  }

  private async fetchPayerRequirements(payerId: string): Promise<PayerRequirements | null> {
    const response = await fetch(`${CREDENTIALING_FUNCTION_URL}/payer/${payerId}`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });

    if (!response.ok) return null;
    return response.json();
  }

  private async persistApplication(application: CredentialingApplication): Promise<void> {
    await fetch(`${CREDENTIALING_FUNCTION_URL}/application`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(application),
    });
  }
}

// ============================================================================
// Credentialing Status Tracker
// ============================================================================

/**
 * Provides dashboard-level visibility into a provider's credentialing status
 * across all payers. Handles expiration alerts, report generation, and
 * aggregate statistics.
 */
export class CredentialingTracker {
  private enrollmentEngine: PayerEnrollmentEngine;

  constructor(enrollmentEngine?: PayerEnrollmentEngine) {
    this.enrollmentEngine = enrollmentEngine ?? new PayerEnrollmentEngine();
  }

  /**
   * Get the full credentialing status for a provider across all payers.
   * Returns every application with its current status and timeline.
   */
  async getProviderCredentialingStatus(providerId: string): Promise<CredentialingApplication[]> {
    if (IS_DEV) {
      return getMockProviderApplications(providerId);
    }

    const response = await fetch(`${CREDENTIALING_FUNCTION_URL}/provider/${providerId}/applications`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch credentialing status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Find credentials expiring within a given number of days.
   * Used for proactive renewal reminders.
   */
  async getExpiringCredentials(
    providerId: string,
    daysAhead: number = 90,
  ): Promise<Array<{ application: CredentialingApplication; daysUntilExpiration: number }>> {
    const applications = await this.getProviderCredentialingStatus(providerId);
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return applications
      .filter(app => {
        if (!app.expirationDate || app.status !== 'approved') return false;
        const expDate = new Date(app.expirationDate);
        return expDate > now && expDate <= cutoff;
      })
      .map(app => ({
        application: app,
        daysUntilExpiration: Math.ceil(
          (new Date(app.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
  }

  /**
   * Send an expiration reminder for a specific credentialing application.
   * Triggers a notification to the provider via email and in-app push.
   */
  async sendExpirationReminder(applicationId: string): Promise<{ sent: boolean; error?: string }> {
    if (IS_DEV) {
      console.log(`[DEV] Expiration reminder sent for application ${applicationId}`);
      return { sent: true };
    }

    const response = await fetch(`${CREDENTIALING_FUNCTION_URL}/remind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ applicationId }),
    });

    if (!response.ok) {
      return { sent: false, error: `Reminder failed: ${response.status}` };
    }

    return { sent: true };
  }

  /**
   * Generate a comprehensive credentialing report for a provider.
   * Suitable for display in the provider dashboard or PDF export.
   */
  async generateCredentialingReport(providerId: string): Promise<CredentialingReport> {
    const applications = await this.getProviderCredentialingStatus(providerId);
    const now = new Date();

    const summary = {
      totalApplications: applications.length,
      approved: applications.filter(a => a.status === 'approved').length,
      pending: applications.filter(a => ['submitted', 'under-review', 'documents-pending'].includes(a.status)).length,
      denied: applications.filter(a => a.status === 'denied').length,
      expired: applications.filter(a => a.status === 'expired').length,
      renewalNeeded: applications.filter(a => a.status === 'renewal-needed').length,
    };

    const applicationDetails = applications.map(app => {
      const missingDocs = app.documentsRequired.filter(req =>
        !app.documentsSubmitted.some(sub => sub.type === req.type && sub.status !== 'rejected')
      );

      return {
        payerName: app.payerName,
        payerType: app.payerType,
        status: app.status,
        effectiveDate: app.effectiveDate,
        expirationDate: app.expirationDate,
        documentsComplete: missingDocs.length === 0,
        missingDocuments: missingDocs.map(d => d.name),
      };
    });

    const expiringCredentials = applications
      .filter(a => a.status === 'approved' && a.expirationDate)
      .map(a => ({
        payerName: a.payerName,
        expirationDate: a.expirationDate!,
        daysUntilExpiration: Math.ceil(
          (new Date(a.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .filter(c => c.daysUntilExpiration > 0 && c.daysUntilExpiration <= 180)
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

    // Aggregate unique licenses across all applications
    const licenseMap = new Map<string, { state: string; licenseNumber: string; expirationDate: string; status: string }>();
    for (const app of applications) {
      const key = `${app.licenseState}-${app.licenseNumber}`;
      if (!licenseMap.has(key)) {
        licenseMap.set(key, {
          state: app.licenseState,
          licenseNumber: app.licenseNumber,
          expirationDate: app.licenseExpiration,
          status: new Date(app.licenseExpiration) > now ? 'active' : 'expired',
        });
      }
    }

    return {
      providerId,
      generatedAt: now.toISOString(),
      summary,
      applications: applicationDetails,
      expiringCredentials,
      licensure: Array.from(licenseMap.values()),
    };
  }

  /**
   * Dashboard data: aggregate stats for quick display.
   */
  async getDashboardStats(providerId: string): Promise<{
    credentialedPayers: number;
    pendingApplications: number;
    expiringSoon: number;
    actionRequired: number;
  }> {
    const applications = await this.getProviderCredentialingStatus(providerId);
    const now = new Date();
    const ninetyDaysOut = new Date();
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);

    return {
      credentialedPayers: applications.filter(a => a.status === 'approved').length,
      pendingApplications: applications.filter(a =>
        ['submitted', 'under-review', 'documents-pending', 'not-started'].includes(a.status)
      ).length,
      expiringSoon: applications.filter(a =>
        a.status === 'approved' &&
        a.expirationDate &&
        new Date(a.expirationDate) <= ninetyDaysOut &&
        new Date(a.expirationDate) > now
      ).length,
      actionRequired: applications.filter(a =>
        a.status === 'renewal-needed' ||
        a.status === 'expired' ||
        (a.status === 'not-started' && a.documentsRequired.length > 0)
      ).length,
    };
  }
}

// ============================================================================
// Multi-State Support
// ============================================================================

/**
 * Get licensure requirements for a specific state and provider type.
 * Covers what exams, hours, and documentation each state licensing board needs.
 */
export function getStateLicensureRequirements(
  state: string,
  providerType: ProviderType,
): StateLicensureRequirement | null {
  const key = `${state}-${providerType}`;
  return STATE_LICENSURE_DATABASE[key] ?? null;
}

/**
 * Check all states where a provider currently holds active licensure.
 * Looks across all credentialing applications for unique license states.
 */
export async function checkInterstateLicensure(
  providerId: string,
): Promise<Array<{ state: string; licenseNumber: string; expirationDate: string; active: boolean }>> {
  const tracker = new CredentialingTracker();
  const applications = await tracker.getProviderCredentialingStatus(providerId);
  const now = new Date();

  const stateMap = new Map<string, { licenseNumber: string; expirationDate: string; active: boolean }>();

  for (const app of applications) {
    if (!stateMap.has(app.licenseState) || new Date(app.licenseExpiration) > new Date(stateMap.get(app.licenseState)!.expirationDate)) {
      stateMap.set(app.licenseState, {
        licenseNumber: app.licenseNumber,
        expirationDate: app.licenseExpiration,
        active: new Date(app.licenseExpiration) > now,
      });
    }
  }

  return Array.from(stateMap.entries()).map(([state, info]) => ({ state, ...info }));
}

/**
 * Suggest additional states where a provider should consider getting licensed.
 * Based on telehealth demand, compact membership, and neighboring state patterns.
 */
export function suggestAdditionalStates(
  currentStates: string[],
  providerType: ProviderType,
): Array<{ state: string; reason: string; compactEligible: boolean; telehealthAllowed: boolean }> {
  const suggestions: Array<{ state: string; reason: string; compactEligible: boolean; telehealthAllowed: boolean }> = [];

  // States with high ABA/therapy demand
  const highDemandStates: Record<string, string> = {
    'CA': 'Largest autism services market in the US',
    'TX': 'Second largest market, growing Medicaid ABA coverage',
    'FL': 'Strong private-pay and insurance-mandated ABA market',
    'NY': 'Comprehensive autism insurance mandates',
    'PA': 'Growing demand, favorable reimbursement rates',
    'AZ': 'AHCCCS provides extensive ABA coverage',
    'CO': 'Expanding telehealth ABA regulations',
    'GA': 'Increasing demand with limited provider supply',
    'NC': 'Strong insurance mandates for autism services',
    'WA': 'Progressive telehealth and ABA coverage policies',
  };

  // Telehealth compact states (PSYPACT for psychologists, ASWB for LCSWs, etc.)
  const telehealthCompactStates = TELEHEALTH_COMPACT_STATES[providerType] ?? [];

  for (const [state, reason] of Object.entries(highDemandStates)) {
    if (currentStates.includes(state)) continue;

    const isCompactEligible = telehealthCompactStates.includes(state);
    const licensureReqs = getStateLicensureRequirements(state, providerType);

    suggestions.push({
      state,
      reason,
      compactEligible: isCompactEligible,
      telehealthAllowed: licensureReqs?.teleheathAllowed ?? true,
    });
  }

  // Also suggest compact states the provider isn't in yet
  for (const compactState of telehealthCompactStates) {
    if (currentStates.includes(compactState)) continue;
    if (suggestions.some(s => s.state === compactState)) continue;

    suggestions.push({
      state: compactState,
      reason: 'Interstate compact member - streamlined licensure via telehealth compact',
      compactEligible: true,
      telehealthAllowed: true,
    });
  }

  return suggestions.slice(0, 10); // Return top 10 suggestions
}

/** Telehealth compact membership by provider type */
const TELEHEALTH_COMPACT_STATES: Partial<Record<ProviderType, string[]>> = {
  psychologist: [ // PSYPACT member states
    'AL', 'AZ', 'AR', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'ID',
    'IL', 'IN', 'KS', 'KY', 'ME', 'MD', 'MI', 'MN', 'MO', 'NE',
    'NV', 'NH', 'NJ', 'NC', 'ND', 'OH', 'OK', 'PA', 'RI', 'SC',
    'TN', 'TX', 'UT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ],
  lcsw: [ // Social work compact states (emerging)
    'AL', 'AR', 'AZ', 'CO', 'CT', 'DE', 'GA', 'IN', 'IA', 'KS',
    'KY', 'ME', 'MD', 'MN', 'MO', 'MT', 'NE', 'NH', 'NC', 'ND',
    'OH', 'OK', 'SC', 'SD', 'TN', 'UT', 'VA', 'WA', 'WV', 'WI',
  ],
  slp: [ // ASLP-IC compact states (emerging)
    'AL', 'AZ', 'AR', 'CO', 'FL', 'GA', 'ID', 'IN', 'IA', 'KS',
    'KY', 'LA', 'ME', 'MD', 'MN', 'MS', 'MO', 'MT', 'NE', 'NH',
    'NC', 'ND', 'OH', 'OK', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA',
    'WA', 'WV', 'WI', 'WY',
  ],
  ot: [ // OT compact states (emerging)
    'AL', 'AZ', 'AR', 'CO', 'FL', 'GA', 'ID', 'IN', 'IA', 'KS',
    'KY', 'LA', 'ME', 'MD', 'MN', 'MS', 'MO', 'MT', 'NE', 'NH',
    'NC', 'ND', 'OH', 'OK', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA',
    'WA', 'WV', 'WI', 'WY',
  ],
};

// ============================================================================
// Re-credentialing & Renewal Engine
// ============================================================================

/**
 * Schedule re-credentialing for an approved application.
 * Most payers require re-credentialing every 2-3 years (24-36 months).
 * Schedules reminders at 90, 60, and 30 days before expiration.
 */
export async function scheduleRecredentialing(
  applicationId: string,
  expirationDate: string,
): Promise<{ scheduled: boolean; reminderDates: string[] }> {
  const expDate = new Date(expirationDate);
  const reminderDates: string[] = [];

  // Schedule reminders at 90, 60, and 30 days before expiration
  for (const daysBefore of [90, 60, 30]) {
    const reminderDate = new Date(expDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    if (reminderDate > new Date()) {
      reminderDates.push(reminderDate.toISOString().split('T')[0]);
    }
  }

  if (IS_DEV) {
    console.log(`[DEV] Re-credentialing scheduled for ${applicationId}:`, reminderDates);
    return { scheduled: true, reminderDates };
  }

  const response = await fetch(`${CREDENTIALING_FUNCTION_URL}/schedule-renewal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ applicationId, expirationDate, reminderDates }),
  });

  if (!response.ok) {
    return { scheduled: false, reminderDates: [] };
  }

  return { scheduled: true, reminderDates };
}

/**
 * Check all renewal deadlines for a provider.
 * Returns applications sorted by urgency.
 */
export async function checkRenewalDeadlines(
  providerId: string,
): Promise<Array<{
  applicationId: string;
  payerName: string;
  expirationDate: string;
  daysRemaining: number;
  urgency: 'critical' | 'warning' | 'upcoming' | 'ok';
}>> {
  const tracker = new CredentialingTracker();
  const applications = await tracker.getProviderCredentialingStatus(providerId);
  const now = new Date();

  return applications
    .filter(app => app.status === 'approved' && app.expirationDate)
    .map(app => {
      const daysRemaining = Math.ceil(
        (new Date(app.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let urgency: 'critical' | 'warning' | 'upcoming' | 'ok';
      if (daysRemaining <= 0) urgency = 'critical';
      else if (daysRemaining <= 30) urgency = 'critical';
      else if (daysRemaining <= 60) urgency = 'warning';
      else if (daysRemaining <= 90) urgency = 'upcoming';
      else urgency = 'ok';

      return {
        applicationId: app.id,
        payerName: app.payerName,
        expirationDate: app.expirationDate!,
        daysRemaining,
        urgency,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Initiate renewal for an expiring credentialing application.
 * Pre-populates the renewal application from the existing approved application,
 * so the provider only needs to update changed information.
 */
export async function initiateRenewal(
  applicationId: string,
): Promise<{ renewalApplicationId: string; prePopulated: boolean }> {
  const tracker = new CredentialingTracker();
  const engine = new PayerEnrollmentEngine();

  // Fetch existing application to use as template
  const existingApps = await tracker.getProviderCredentialingStatus(''); // Provider lookup by app
  const existingApp = existingApps.find(a => a.id === applicationId);

  if (!existingApp) {
    throw new Error(`Application ${applicationId} not found`);
  }

  if (existingApp.status !== 'approved' && existingApp.status !== 'renewal-needed' && existingApp.status !== 'expired') {
    throw new Error(`Application ${applicationId} is not eligible for renewal (status: ${existingApp.status})`);
  }

  // Create new application pre-populated from existing
  const renewalApp = await engine.startEnrollment(
    existingApp.providerId,
    existingApp.payerId,
    {
      npiNumber: existingApp.npiNumber,
      taxId: existingApp.taxId,
      licenseNumber: existingApp.licenseNumber,
      licenseState: existingApp.licenseState,
      licenseExpiration: existingApp.licenseExpiration,
      caqhNumber: existingApp.caqhNumber ?? undefined,
      providerType: 'bcba', // Will be determined from provider record in production
    },
  );

  // Copy over previously approved documents that haven't expired
  const now = new Date();
  for (const doc of existingApp.documentsSubmitted) {
    if (doc.status === 'approved' && (!doc.expirationDate || new Date(doc.expirationDate) > now)) {
      renewalApp.documentsSubmitted.push({
        ...doc,
        id: `renewal-${doc.id}`,
        status: 'pending', // Re-verify even previously approved docs
      });
    }
  }

  renewalApp.timeline.push({
    id: `evt-${Date.now()}`,
    timestamp: now.toISOString(),
    type: 'renewal-initiated',
    description: `Renewal initiated from previous application ${applicationId}`,
    actor: 'system',
  });

  // Mark the old application
  existingApp.status = 'renewal-needed';
  existingApp.timeline.push({
    id: `evt-${Date.now() + 1}`,
    timestamp: now.toISOString(),
    type: 'status-change',
    description: `Renewal application created: ${renewalApp.id}`,
    actor: 'system',
  });

  return {
    renewalApplicationId: renewalApp.id,
    prePopulated: true,
  };
}

// ============================================================================
// Document Type Display Names
// ============================================================================

const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  'license': 'State Professional License',
  'npi': 'NPI Confirmation',
  'liability-insurance': 'Professional Liability Insurance (Malpractice)',
  'caqh-profile': 'CAQH ProView Profile',
  'board-certification': 'Board Certification',
  'cv-resume': 'Curriculum Vitae / Resume',
  'w9': 'W-9 Tax Form',
  'drivers-license': 'Government-Issued Photo ID',
  'dea-certificate': 'DEA Certificate',
  'supervision-agreement': 'Supervision Agreement',
  'background-check': 'Background Check Results',
  'immunization-records': 'Immunization Records',
  'continuing-education': 'Continuing Education Credits',
};

// ============================================================================
// State Licensure Database (Partial — key states for ABA/SLP/OT)
// ============================================================================

const STATE_LICENSURE_DATABASE: Record<string, StateLicensureRequirement> = {
  'CA-bcba': {
    state: 'CA', stateName: 'California', providerType: 'bcba',
    requiresStateLicense: true, licensingBoard: 'Board of Behavioral Sciences',
    applicationUrl: 'https://www.bbs.ca.gov', supervisedPracticeHours: 1500,
    examRequired: 'BCBA Exam', continuingEducationHours: 32,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['California requires separate state licensure in addition to BACB certification'],
  },
  'TX-bcba': {
    state: 'TX', stateName: 'Texas', providerType: 'bcba',
    requiresStateLicense: true, licensingBoard: 'Texas Dept of Licensing and Regulation',
    applicationUrl: 'https://www.tdlr.texas.gov', supervisedPracticeHours: 1500,
    examRequired: 'BCBA Exam', continuingEducationHours: 32,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['Texas licenses BCBAs under the Licensed Behavior Analyst (LBA) designation'],
  },
  'FL-bcba': {
    state: 'FL', stateName: 'Florida', providerType: 'bcba',
    requiresStateLicense: true, licensingBoard: 'Board of Applied Behavior Analysis',
    applicationUrl: 'https://flhealthsource.gov', supervisedPracticeHours: 1500,
    examRequired: 'BCBA Exam', continuingEducationHours: 30,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['Florida has specific telehealth registration requirements for out-of-state providers'],
  },
  'NY-bcba': {
    state: 'NY', stateName: 'New York', providerType: 'bcba',
    requiresStateLicense: true, licensingBoard: 'NY State Education Department',
    applicationUrl: 'http://www.op.nysed.gov', supervisedPracticeHours: 1500,
    examRequired: 'BCBA Exam', continuingEducationHours: 36,
    renewalIntervalYears: 3, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['New York uses Licensed Behavior Analyst (LBA) designation'],
  },
  'AZ-bcba': {
    state: 'AZ', stateName: 'Arizona', providerType: 'bcba',
    requiresStateLicense: true, licensingBoard: 'Board of Psychologist Examiners',
    applicationUrl: 'https://psychboard.az.gov', supervisedPracticeHours: 1500,
    examRequired: 'BCBA Exam', continuingEducationHours: 30,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['Arizona requires BCBA certification plus state registration'],
  },
  'CA-slp': {
    state: 'CA', stateName: 'California', providerType: 'slp',
    requiresStateLicense: true, licensingBoard: 'Speech-Language Pathology & Audiology Board',
    applicationUrl: 'https://www.speechandhearing.ca.gov', supervisedPracticeHours: 300,
    examRequired: 'Praxis SLP Exam', continuingEducationHours: 24,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['Requires CCC-SLP or equivalent, plus California RPE completion'],
  },
  'TX-slp': {
    state: 'TX', stateName: 'Texas', providerType: 'slp',
    requiresStateLicense: true, licensingBoard: 'Dept of State Health Services',
    applicationUrl: 'https://www.dshs.texas.gov', supervisedPracticeHours: 300,
    examRequired: 'Praxis SLP Exam', continuingEducationHours: 20,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: true, interstateCompactMember: true,
    notes: ['Texas is an ASLP-IC compact member state'],
  },
  'CA-ot': {
    state: 'CA', stateName: 'California', providerType: 'ot',
    requiresStateLicense: true, licensingBoard: 'Board of Occupational Therapy',
    applicationUrl: 'https://www.bot.ca.gov', supervisedPracticeHours: 480,
    examRequired: 'NBCOT Exam', continuingEducationHours: 24,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['California requires NBCOT certification and state license'],
  },
  'TX-ot': {
    state: 'TX', stateName: 'Texas', providerType: 'ot',
    requiresStateLicense: true, licensingBoard: 'Executive Council of Physical Therapy & OT Examiners',
    applicationUrl: 'https://www.ptot.texas.gov', supervisedPracticeHours: 480,
    examRequired: 'NBCOT Exam', continuingEducationHours: 24,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: true, interstateCompactMember: true,
    notes: ['Texas is an OT compact member state'],
  },
  'FL-slp': {
    state: 'FL', stateName: 'Florida', providerType: 'slp',
    requiresStateLicense: true, licensingBoard: 'Board of Speech-Language Pathology and Audiology',
    applicationUrl: 'https://flhealthsource.gov', supervisedPracticeHours: 300,
    examRequired: 'Praxis SLP Exam', continuingEducationHours: 24,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: true, interstateCompactMember: true,
    notes: ['Florida is an ASLP-IC compact member state'],
  },
  'FL-ot': {
    state: 'FL', stateName: 'Florida', providerType: 'ot',
    requiresStateLicense: true, licensingBoard: 'Board of Occupational Therapy Practice',
    applicationUrl: 'https://flhealthsource.gov', supervisedPracticeHours: 480,
    examRequired: 'NBCOT Exam', continuingEducationHours: 24,
    renewalIntervalYears: 2, teleheathAllowed: true,
    telehealthCompactMember: true, interstateCompactMember: true,
    notes: ['Florida is an OT compact member state'],
  },
  'NY-slp': {
    state: 'NY', stateName: 'New York', providerType: 'slp',
    requiresStateLicense: true, licensingBoard: 'NY State Education Department',
    applicationUrl: 'http://www.op.nysed.gov', supervisedPracticeHours: 360,
    examRequired: 'Praxis SLP Exam', continuingEducationHours: null,
    renewalIntervalYears: 3, teleheathAllowed: true,
    telehealthCompactMember: false, interstateCompactMember: false,
    notes: ['New York does not require CE for SLP license renewal but requires re-registration every 3 years'],
  },
};

// ============================================================================
// Mock Data & Development Helpers
// ============================================================================

function getMockCAQHProfile(caqhNumber: string): CAQHProfile {
  return {
    caqhNumber,
    providerId: 'mock-provider-001',
    firstName: 'Sarah',
    lastName: 'Martinez',
    middleName: 'L',
    suffix: null,
    npiNumber: '1234567890',
    taxId: '12-3456789',
    dateOfBirth: '1985-03-15',
    ssn: null,
    gender: 'F',
    practiceAddress: {
      line1: '1234 Therapy Lane',
      line2: 'Suite 200',
      city: 'Phoenix',
      state: 'AZ',
      zip: '85001',
    },
    mailingAddress: {
      line1: '1234 Therapy Lane',
      line2: 'Suite 200',
      city: 'Phoenix',
      state: 'AZ',
      zip: '85001',
    },
    phone: '602-555-0123',
    fax: '602-555-0124',
    email: 'sarah.martinez@example.com',
    licenses: [
      {
        licenseNumber: 'BCBA-12345',
        state: 'AZ',
        type: 'Board Certified Behavior Analyst',
        issueDate: '2019-06-01',
        expirationDate: '2027-05-31',
        status: 'active',
      },
      {
        licenseNumber: 'BCBA-CA-67890',
        state: 'CA',
        type: 'Licensed Behavior Analyst',
        issueDate: '2020-01-15',
        expirationDate: '2026-01-14',
        status: 'active',
      },
    ],
    boardCertifications: [
      {
        board: 'BACB',
        specialty: 'Board Certified Behavior Analyst',
        certificationNumber: 'BCBA-12345',
        issueDate: '2019-06-01',
        expirationDate: '2027-05-31',
        status: 'active',
      },
    ],
    education: [
      {
        institution: 'Arizona State University',
        degree: 'Master of Science in Applied Behavior Analysis',
        graduationDate: '2018-05-15',
      },
    ],
    liabilityInsurance: {
      carrier: 'HPSO Professional Liability',
      policyNumber: 'PLI-2024-789456',
      coverageAmount: 1000000,
      expirationDate: '2027-03-31',
    },
    attestationDate: '2025-11-15',
    attestationStatus: 'current',
    nextAttestationDue: '2026-03-15',
  };
}

function getMockCAQHAttestationStatus(caqhNumber: string): CAQHAttestationStatus {
  return {
    caqhNumber,
    isAttested: true,
    attestationDate: '2025-11-15',
    nextAttestationDue: '2026-03-15',
    status: 'current',
    daysUntilExpiration: 10,
  };
}

function getMockProviderApplications(providerId: string): CredentialingApplication[] {
  const baseTimestamp = new Date();
  return [
    {
      id: `cred-${providerId}-aetna-001`,
      providerId,
      payerId: 'aetna',
      payerName: 'Aetna',
      payerType: 'private',
      status: 'approved',
      submittedAt: '2025-06-15T10:00:00Z',
      approvedAt: '2025-09-01T14:30:00Z',
      effectiveDate: '2025-10-01',
      expirationDate: '2027-09-30',
      npiNumber: '1234567890',
      taxId: '12-3456789',
      licenseNumber: 'BCBA-12345',
      licenseState: 'AZ',
      licenseExpiration: '2027-05-31',
      caqhNumber: '12345678',
      documentsRequired: [],
      documentsSubmitted: [],
      notes: ['Initial credentialing approved'],
      timeline: [
        {
          id: 'evt-001', timestamp: '2025-06-15T10:00:00Z',
          type: 'submission', description: 'Application submitted to Aetna', actor: 'system',
        },
        {
          id: 'evt-002', timestamp: '2025-09-01T14:30:00Z',
          type: 'status-change', description: 'Application approved by Aetna', actor: 'payer',
        },
      ],
    },
    {
      id: `cred-${providerId}-bcbs-002`,
      providerId,
      payerId: 'bcbs-az',
      payerName: 'BCBS of Arizona',
      payerType: 'private',
      status: 'under-review',
      submittedAt: '2025-12-01T09:00:00Z',
      approvedAt: null,
      effectiveDate: null,
      expirationDate: null,
      npiNumber: '1234567890',
      taxId: '12-3456789',
      licenseNumber: 'BCBA-12345',
      licenseState: 'AZ',
      licenseExpiration: '2027-05-31',
      caqhNumber: '12345678',
      documentsRequired: [],
      documentsSubmitted: [],
      notes: ['Under payer review'],
      timeline: [
        {
          id: 'evt-003', timestamp: '2025-12-01T09:00:00Z',
          type: 'submission', description: 'Application submitted to BCBS of Arizona', actor: 'system',
        },
        {
          id: 'evt-004', timestamp: '2025-12-15T11:00:00Z',
          type: 'payer-response', description: 'Application received and under review', actor: 'payer',
        },
      ],
    },
    {
      id: `cred-${providerId}-medicaid-az-003`,
      providerId,
      payerId: 'medicaid-az',
      payerName: 'Arizona AHCCCS (Medicaid)',
      payerType: 'medicaid',
      status: 'approved',
      submittedAt: '2025-04-01T08:00:00Z',
      approvedAt: '2025-07-15T16:00:00Z',
      effectiveDate: '2025-08-01',
      expirationDate: '2026-04-15',
      npiNumber: '1234567890',
      taxId: '12-3456789',
      licenseNumber: 'BCBA-12345',
      licenseState: 'AZ',
      licenseExpiration: '2027-05-31',
      caqhNumber: '12345678',
      documentsRequired: [],
      documentsSubmitted: [],
      notes: ['Approved - renewal due soon'],
      timeline: [
        {
          id: 'evt-005', timestamp: '2025-04-01T08:00:00Z',
          type: 'submission', description: 'Application submitted to Arizona AHCCCS', actor: 'system',
        },
        {
          id: 'evt-006', timestamp: '2025-07-15T16:00:00Z',
          type: 'status-change', description: 'Application approved by Arizona AHCCCS', actor: 'payer',
        },
      ],
    },
    {
      id: `cred-${providerId}-united-004`,
      providerId,
      payerId: 'united',
      payerName: 'UnitedHealthcare',
      payerType: 'private',
      status: 'documents-pending',
      submittedAt: null,
      approvedAt: null,
      effectiveDate: null,
      expirationDate: null,
      npiNumber: '1234567890',
      taxId: '12-3456789',
      licenseNumber: 'BCBA-12345',
      licenseState: 'AZ',
      licenseExpiration: '2027-05-31',
      caqhNumber: '12345678',
      documentsRequired: [
        { id: 'doc-uhc-1', type: 'license', name: 'State Professional License', required: true, uploaded: true, uploadedAt: baseTimestamp.toISOString(), expirationDate: '2027-05-31', fileUrl: null, status: 'approved' },
        { id: 'doc-uhc-2', type: 'liability-insurance', name: 'Professional Liability Insurance', required: true, uploaded: false, uploadedAt: null, expirationDate: null, fileUrl: null, status: 'pending' },
        { id: 'doc-uhc-3', type: 'w9', name: 'W-9 Tax Form', required: true, uploaded: false, uploadedAt: null, expirationDate: null, fileUrl: null, status: 'pending' },
      ],
      documentsSubmitted: [
        { id: 'doc-uhc-1', type: 'license', name: 'State Professional License', required: true, uploaded: true, uploadedAt: baseTimestamp.toISOString(), expirationDate: '2027-05-31', fileUrl: null, status: 'approved' },
      ],
      notes: ['Awaiting liability insurance and W-9 upload'],
      timeline: [
        {
          id: 'evt-007', timestamp: baseTimestamp.toISOString(),
          type: 'status-change', description: 'Credentialing application initiated with UnitedHealthcare', actor: 'system',
        },
      ],
    },
    {
      id: `cred-${providerId}-cigna-005`,
      providerId,
      payerId: 'cigna',
      payerName: 'Cigna / Evernorth',
      payerType: 'private',
      status: 'denied',
      submittedAt: '2025-08-01T10:00:00Z',
      approvedAt: null,
      effectiveDate: null,
      expirationDate: null,
      npiNumber: '1234567890',
      taxId: '12-3456789',
      licenseNumber: 'BCBA-12345',
      licenseState: 'AZ',
      licenseExpiration: '2027-05-31',
      caqhNumber: '12345678',
      documentsRequired: [],
      documentsSubmitted: [],
      notes: ['Denied - network full in provider\'s service area. Appeal recommended.'],
      timeline: [
        {
          id: 'evt-008', timestamp: '2025-08-01T10:00:00Z',
          type: 'submission', description: 'Application submitted to Cigna', actor: 'system',
        },
        {
          id: 'evt-009', timestamp: '2025-10-15T09:00:00Z',
          type: 'payer-response', description: 'Application denied - network capacity full', actor: 'payer',
        },
      ],
    },
  ];
}

/** Mock payer requirement database — realistic data for the 10+ most common ABA/therapy payers */
const MOCK_PAYER_DATABASE: PayerRequirements[] = [
  {
    payerId: 'aetna',
    payerName: 'Aetna',
    payerType: 'private',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'caqh-profile', 'board-certification', 'w9', 'cv-resume'],
    estimatedProcessingDays: 90,
    recredentialingIntervalMonths: 36,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.aetna.com/healthcare-professionals/join-our-network.html',
    contactPhone: '1-800-624-0756',
    contactEmail: null,
    notes: ['Requires CAQH ProView attestation within 120 days', 'Uses Availity for electronic credentialing'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'supervision-agreement'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['BACB certification required'] },
      bcaba: { accepted: true, additionalDocuments: ['board-certification', 'supervision-agreement'], supervisorRequired: true, minimumExperienceYears: 0, notes: ['Must have active BCBA supervisor'] },
      rbt: { accepted: false, additionalDocuments: [], supervisorRequired: true, minimumExperienceYears: 0, notes: ['RBTs credential under supervising BCBA'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['CCC-SLP required'] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['NBCOT certification required'] },
    },
    statesAccepting: ['AL', 'AZ', 'CA', 'CO', 'CT', 'FL', 'GA', 'IL', 'IN', 'KY', 'MA', 'MD', 'MI', 'MN', 'MO', 'NC', 'NJ', 'NV', 'NY', 'OH', 'PA', 'SC', 'TN', 'TX', 'VA', 'WA'],
  },
  {
    payerId: 'bcbs',
    payerName: 'Blue Cross Blue Shield (varies by state)',
    payerType: 'private',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'caqh-profile', 'board-certification', 'w9'],
    estimatedProcessingDays: 120,
    recredentialingIntervalMonths: 36,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.bcbs.com/provider',
    contactPhone: null,
    contactEmail: null,
    notes: ['Each BCBS plan is independent — check state-specific requirements', 'Most plans use CAQH for credentialing'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['Requirements vary by state BCBS plan'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['CCC-SLP typically required'] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['NBCOT certification typically required'] },
    },
    statesAccepting: ['AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
  },
  {
    payerId: 'united',
    payerName: 'UnitedHealthcare / Optum',
    payerType: 'private',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'caqh-profile', 'w9', 'board-certification', 'background-check'],
    estimatedProcessingDays: 90,
    recredentialingIntervalMonths: 36,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.uhcprovider.com/en/join-our-network.html',
    contactPhone: '1-877-842-3210',
    contactEmail: null,
    notes: ['Optum handles behavioral health credentialing', 'Background check required for new providers'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'supervision-agreement'], supervisorRequired: false, minimumExperienceYears: 1, notes: ['1 year post-certification experience preferred'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
  },
  {
    payerId: 'cigna',
    payerName: 'Cigna / Evernorth',
    payerType: 'private',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'caqh-profile', 'w9', 'board-certification'],
    estimatedProcessingDays: 60,
    recredentialingIntervalMonths: 36,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://cignaforhcp.cigna.com/app/login',
    contactPhone: '1-800-882-4462',
    contactEmail: null,
    notes: ['Evernorth Behavioral Health handles ABA credentialing', 'Shorter processing times than most payers'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['AZ', 'CA', 'CO', 'CT', 'FL', 'GA', 'IL', 'IN', 'MD', 'MA', 'MI', 'MN', 'MO', 'NJ', 'NY', 'NC', 'OH', 'PA', 'SC', 'TN', 'TX', 'VA', 'WA'],
  },
  {
    payerId: 'tricare',
    payerName: 'TRICARE',
    payerType: 'tricare',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'board-certification', 'w9', 'background-check', 'cv-resume'],
    estimatedProcessingDays: 120,
    recredentialingIntervalMonths: 24,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.tricare.mil/Partners/Becoming',
    contactPhone: '1-800-874-2273',
    contactEmail: null,
    notes: ['Managed by Humana Military', 'ABA requires ECHO/EIBI benefit authorization', 'Re-credentialing every 2 years'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'background-check'], supervisorRequired: false, minimumExperienceYears: 2, notes: ['2 years post-certification experience required', 'Must accept TRICARE rates'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['CCC-SLP required'] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['NBCOT required'] },
    },
    statesAccepting: ['AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
  },
  {
    payerId: 'medicaid-az',
    payerName: 'Arizona AHCCCS (Medicaid)',
    payerType: 'medicaid',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'board-certification', 'w9', 'background-check', 'immunization-records'],
    estimatedProcessingDays: 90,
    recredentialingIntervalMonths: 24,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.azahcccs.gov/PlansProviders/NewProviders/',
    contactPhone: '602-417-4000',
    contactEmail: 'ProviderEnrollment@azahcccs.gov',
    notes: ['AHCCCS requires separate enrollment per managed care plan', 'Background check through AZ DPS required'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'background-check'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['Must enroll with individual AHCCCS health plans (Mercy Care, UHC Community Plan, etc.)'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['AZ'],
  },
  {
    payerId: 'medicaid-ca',
    payerName: 'Medi-Cal (California Medicaid)',
    payerType: 'medicaid',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'board-certification', 'w9', 'background-check', 'drivers-license'],
    estimatedProcessingDays: 150,
    recredentialingIntervalMonths: 24,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.dhcs.ca.gov/provgovpart/Pages/default.aspx',
    contactPhone: '916-323-1945',
    contactEmail: null,
    notes: ['Longest processing times in the US', 'ABA covered through regional centers and managed care plans', 'Requires site visit for some provider types'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'background-check', 'drivers-license'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['Must also enroll with regional center'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['CA'],
  },
  {
    payerId: 'medicaid-tx',
    payerName: 'Texas Medicaid',
    payerType: 'medicaid',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'board-certification', 'w9', 'background-check'],
    estimatedProcessingDays: 90,
    recredentialingIntervalMonths: 24,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.tmhp.com/provider-enrollment',
    contactPhone: '1-800-925-9126',
    contactEmail: null,
    notes: ['Texas Health and Human Services Commission oversees enrollment', 'Must enroll with TMHP for fee-for-service and with MCOs for managed care'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'background-check'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['Must have active LBA license from TDLR'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['TX'],
  },
  {
    payerId: 'medicaid-fl',
    payerName: 'Florida Medicaid',
    payerType: 'medicaid',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'board-certification', 'w9', 'background-check'],
    estimatedProcessingDays: 90,
    recredentialingIntervalMonths: 24,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://portal.flmmis.com/FLPublic/',
    contactPhone: '1-800-289-7799',
    contactEmail: null,
    notes: ['Agency for Health Care Administration manages Medicaid', 'Most ABA services through managed care plans (Sunshine Health, etc.)'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'background-check'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['Must hold Florida BA license'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['FL'],
  },
  {
    payerId: 'medicaid-ny',
    payerName: 'New York Medicaid',
    payerType: 'medicaid',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'board-certification', 'w9', 'background-check', 'immunization-records'],
    estimatedProcessingDays: 120,
    recredentialingIntervalMonths: 24,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.emedny.org/info/ProviderEnrollment/',
    contactPhone: '1-800-343-9000',
    contactEmail: null,
    notes: ['eMedNY is the Medicaid Management Information System', 'ABA covered under EPSDT for children', 'Must also enroll with managed care plans'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification', 'background-check'], supervisorRequired: false, minimumExperienceYears: 0, notes: ['Must hold NY LBA license from NYSED'] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['NY'],
  },
  {
    payerId: 'humana',
    payerName: 'Humana',
    payerType: 'private',
    acceptingNewProviders: true,
    requiredDocuments: ['license', 'npi', 'liability-insurance', 'caqh-profile', 'board-certification', 'w9'],
    estimatedProcessingDays: 90,
    recredentialingIntervalMonths: 36,
    supportsElectronicSubmission: true,
    applicationUrl: 'https://www.humana.com/provider/join-our-network',
    contactPhone: '1-800-626-2741',
    contactEmail: null,
    notes: ['Also manages TRICARE behavioral health in some regions'],
    providerTypeRequirements: {
      bcba: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      slp: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
      ot: { accepted: true, additionalDocuments: ['board-certification'], supervisorRequired: false, minimumExperienceYears: 0, notes: [] },
    },
    statesAccepting: ['AL', 'AZ', 'AR', 'CA', 'CO', 'FL', 'GA', 'IL', 'IN', 'KY', 'LA', 'MD', 'MI', 'MO', 'NC', 'OH', 'PA', 'SC', 'TN', 'TX', 'VA', 'WA', 'WI'],
  },
];

// ============================================================================
// Singleton Export (matches clearinghouse-integration.ts pattern)
// ============================================================================

/** Singleton enrollment engine instance */
export const payerEnrollmentEngine = new PayerEnrollmentEngine();

/** Singleton credentialing tracker instance */
export const credentialingTracker = new CredentialingTracker(payerEnrollmentEngine);
