// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Recording Storage Service
 *
 * Manages the full lifecycle of telehealth session recordings:
 *
 * 1. Consent tracking (HIPAA-compliant audit trail)
 * 2. Recording metadata persistence in `telehealth_recordings` table
 * 3. Upload recording artifacts to Supabase Storage
 * 4. Link recording references back to the session
 *
 * Daily.co cloud recordings produce a download URL after processing.
 * This service bridges that URL into Supabase Storage so that
 * recordings are governed by our own retention and access policies.
 */

import { supabase } from '../utils/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordingConsent {
  sessionId: string;
  userId: string;
  userName: string;
  role: 'provider' | 'patient';
  consentGiven: boolean;
  consentTimestamp: string;
  ipAddress?: string;
}

export interface RecordingMetadata {
  id: string;
  sessionId: string;
  appointmentId?: string;
  providerId: string;
  patientId: string;
  /** Daily.co recording ID */
  dailyRecordingId?: string;
  /** Public URL from Daily.co (temporary) */
  dailyDownloadUrl?: string;
  /** Permanent path in Supabase Storage */
  storagePath?: string;
  /** Signed URL for playback (time-limited) */
  signedUrl?: string;
  signedUrlExpiresAt?: string;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'deleted';
  durationSeconds?: number;
  fileSizeBytes?: number;
  /** All consent records for this recording */
  consents: RecordingConsent[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_BUCKET = 'telehealth-recordings';
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour
const LOCAL_RECORDINGS_KEY = 'aminy_recording_metadata';

// ---------------------------------------------------------------------------
// Consent Management
// ---------------------------------------------------------------------------

/**
 * Log a recording consent decision to the database.
 * This creates an auditable HIPAA §164.508(a) consent trail.
 */
export async function logRecordingConsent(
  consent: RecordingConsent,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('telehealth_recording_consents')
      .insert({
        session_id: consent.sessionId,
        user_id: consent.userId,
        user_name: consent.userName,
        role: consent.role,
        consent_given: consent.consentGiven,
        consent_timestamp: consent.consentTimestamp,
        ip_address: consent.ipAddress,
      });

    if (error) {
      console.warn('[recording-storage] Consent log failed (Supabase):', error.message);
      // Fall back to localStorage for offline compliance
      saveConsentLocally(consent);
      return true; // Still consider it "logged" since we have a local copy
    }

    return true;
  } catch (err) {
    console.error('[recording-storage] Consent log error:', err);
    saveConsentLocally(consent);
    return true;
  }
}

function saveConsentLocally(consent: RecordingConsent): void {
  try {
    const key = `aminy_recording_consents_${consent.sessionId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(consent);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // Storage full — last resort
  }
}

/**
 * Check if all required participants have given consent for a session.
 */
export async function hasAllConsents(sessionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('telehealth_recording_consents')
      .select('consent_given, role')
      .eq('session_id', sessionId);

    if (error || !data || data.length === 0) return false;

    // At minimum, both the provider and at least one patient must consent
    const providerConsent = data.find(
      (c: Record<string, unknown>) => c.role === 'provider' && c.consent_given === true,
    );
    const patientConsent = data.find(
      (c: Record<string, unknown>) => c.role === 'patient' && c.consent_given === true,
    );

    return !!(providerConsent && patientConsent);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Recording Metadata
// ---------------------------------------------------------------------------

/**
 * Create a recording metadata entry when recording starts.
 */
export async function createRecordingMetadata(params: {
  sessionId: string;
  appointmentId?: string;
  providerId: string;
  patientId: string;
  dailyRecordingId?: string;
}): Promise<RecordingMetadata> {
  const now = new Date().toISOString();
  const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const metadata: RecordingMetadata = {
    id,
    sessionId: params.sessionId,
    appointmentId: params.appointmentId,
    providerId: params.providerId,
    patientId: params.patientId,
    dailyRecordingId: params.dailyRecordingId,
    status: 'pending',
    consents: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { error } = await supabase
      .from('telehealth_recordings')
      .insert({
        id: metadata.id,
        session_id: metadata.sessionId,
        appointment_id: metadata.appointmentId,
        provider_id: metadata.providerId,
        patient_id: metadata.patientId,
        daily_recording_id: metadata.dailyRecordingId,
        status: metadata.status,
        created_at: metadata.createdAt,
        updated_at: metadata.updatedAt,
      });

    if (error) {
      console.warn('[recording-storage] Metadata insert failed:', error.message);
      saveRecordingLocally(metadata);
    }
  } catch (err) {
    console.warn('[recording-storage] Metadata insert error:', err);
    saveRecordingLocally(metadata);
  }

  return metadata;
}

/**
 * Update recording metadata (e.g., when Daily.co finishes processing).
 */
export async function updateRecordingMetadata(
  recordingId: string,
  updates: Partial<Pick<
    RecordingMetadata,
    'dailyDownloadUrl' | 'storagePath' | 'status' | 'durationSeconds' | 'fileSizeBytes'
  >>,
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('telehealth_recordings')
      .update({
        ...(updates.dailyDownloadUrl && { daily_download_url: updates.dailyDownloadUrl }),
        ...(updates.storagePath && { storage_path: updates.storagePath }),
        ...(updates.status && { status: updates.status }),
        ...(updates.durationSeconds !== undefined && { duration_seconds: updates.durationSeconds }),
        ...(updates.fileSizeBytes !== undefined && { file_size_bytes: updates.fileSizeBytes }),
        updated_at: now,
      })
      .eq('id', recordingId);

    if (error) {
      console.warn('[recording-storage] Metadata update failed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[recording-storage] Metadata update error:', err);
    return false;
  }
}

/**
 * Get recording metadata for a session.
 */
export async function getRecordingForSession(
  sessionId: string,
): Promise<RecordingMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('telehealth_recordings')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return mapRowToMetadata(data);
  } catch {
    // Try local
    return getRecordingLocally(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Supabase Storage Upload
// ---------------------------------------------------------------------------

/**
 * Upload a recording blob to Supabase Storage and update metadata.
 *
 * This is typically called after fetching the recording from Daily.co's
 * download URL. The recording is stored in a path that enforces
 * tenant isolation: `{providerId}/{sessionId}/{recordingId}.webm`
 */
export async function uploadRecordingToStorage(
  recordingId: string,
  sessionId: string,
  providerId: string,
  blob: Blob,
): Promise<string | null> {
  const filePath = `${providerId}/${sessionId}/${recordingId}.webm`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('[recording-storage] Upload failed:', uploadError.message);
      await updateRecordingMetadata(recordingId, { status: 'failed' });
      return null;
    }

    // Update metadata with storage path
    await updateRecordingMetadata(recordingId, {
      storagePath: filePath,
      status: 'ready',
      fileSizeBytes: blob.size,
    });

    return filePath;
  } catch (err) {
    console.error('[recording-storage] Upload error:', err);
    await updateRecordingMetadata(recordingId, { status: 'failed' });
    return null;
  }
}

/**
 * Fetch the Daily.co recording download, then upload to Supabase Storage.
 *
 * Call this after the `recording-stopped` event when Daily provides
 * the download URL (via webhook or polling).
 */
export async function transferDailyRecordingToStorage(
  recordingId: string,
  sessionId: string,
  providerId: string,
  dailyDownloadUrl: string,
): Promise<string | null> {
  try {
    // 1. Update metadata with the Daily URL
    await updateRecordingMetadata(recordingId, {
      dailyDownloadUrl,
      status: 'processing',
    });

    // 2. Fetch the recording from Daily
    const response = await fetch(dailyDownloadUrl);
    if (!response.ok) {
      throw new Error(`Daily download failed: ${response.status}`);
    }

    const blob = await response.blob();

    // 3. Upload to Supabase Storage
    return await uploadRecordingToStorage(recordingId, sessionId, providerId, blob);
  } catch (err) {
    console.error('[recording-storage] Transfer failed:', err);
    await updateRecordingMetadata(recordingId, { status: 'failed' });
    return null;
  }
}

/**
 * Generate a time-limited signed URL for playback.
 */
export async function getRecordingPlaybackUrl(
  storagePath: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      console.error('[recording-storage] Signed URL error:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[recording-storage] Signed URL error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local Storage Fallback
// ---------------------------------------------------------------------------

function saveRecordingLocally(metadata: RecordingMetadata): void {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_RECORDINGS_KEY) || '[]');
    existing.push(metadata);
    localStorage.setItem(LOCAL_RECORDINGS_KEY, JSON.stringify(existing));
  } catch {
    // Ignore
  }
}

function getRecordingLocally(sessionId: string): RecordingMetadata | null {
  try {
    const existing: RecordingMetadata[] = JSON.parse(
      localStorage.getItem(LOCAL_RECORDINGS_KEY) || '[]',
    );
    return existing.find(r => r.sessionId === sessionId) || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Row Mapper
// ---------------------------------------------------------------------------

function mapRowToMetadata(row: Record<string, unknown>): RecordingMetadata {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    appointmentId: row.appointment_id as string | undefined,
    providerId: row.provider_id as string,
    patientId: row.patient_id as string,
    dailyRecordingId: row.daily_recording_id as string | undefined,
    dailyDownloadUrl: row.daily_download_url as string | undefined,
    storagePath: row.storage_path as string | undefined,
    signedUrl: undefined,
    signedUrlExpiresAt: undefined,
    status: row.status as RecordingMetadata['status'],
    durationSeconds: row.duration_seconds as number | undefined,
    fileSizeBytes: row.file_size_bytes as number | undefined,
    consents: [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default {
  logRecordingConsent,
  hasAllConsents,
  createRecordingMetadata,
  updateRecordingMetadata,
  getRecordingForSession,
  uploadRecordingToStorage,
  transferDailyRecordingToStorage,
  getRecordingPlaybackUrl,
};
