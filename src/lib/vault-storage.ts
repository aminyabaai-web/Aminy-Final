// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Vault Storage Service
 *
 * Handles file uploads to Supabase Storage for the Document Vault.
 * Supports multiple file types with validation, progress tracking, and error handling.
 */

import { supabase } from '../utils/supabase/client';
import { getStorageLimitBytes, type TierType } from './tier-utils';

// ============================================================================
// Constants
// ============================================================================

const VAULT_BUCKET = 'vault-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ============================================================================
// Types
// ============================================================================

export interface UploadResult {
  success: boolean;
  fileId?: string;
  filePath?: string;
  url?: string;
  error?: string;
  /** True when the upload was rejected because the tier's storage quota is full */
  quotaExceeded?: boolean;
}

export interface VaultDocument {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  recordType: VaultRecordType;
  source: VaultDocumentSource;
  visibility: 'private' | 'shared';
  uploadedAt: string;
  metadata?: VaultDocumentMetadata;
}

export type VaultRecordType =
  | 'iep'
  | 'evaluation'
  | 'report'
  | 'prescription'
  | 'care-plan'
  | 'uploaded'
  | 'coach-note'
  | 'session-artifact'
  | 'school-letter'
  | 'other';

export type VaultDocumentSource =
  | 'parent-upload'
  | 'junior'
  | 'coach'
  | 'school'
  | 'clinic'
  | 'other';

export interface VaultDocumentMetadata {
  childId?: string;
  childName?: string;
  extractedText?: string;
  ocrStatus?: 'pending' | 'processing' | 'complete' | 'failed';
  extractedFields?: {
    studentName?: string;
    docDate?: string;
    district?: string;
    services?: string[];
  };
  tags?: string[];
  notes?: string;
}

export interface UploadProgressCallback {
  (progress: number, fileName: string): void;
}

// ============================================================================
// Row mapping — the vault_documents table is snake_case (see migrations
// 016_vault_storage.sql / 20260304000000_schema_alignment.sql). All reads and
// writes below MUST use snake_case column names; this mapper converts rows to
// the camelCase VaultDocument shape the app consumes.
// ============================================================================

function mapVaultRow(row: Record<string, unknown>): VaultDocument {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    fileName: (row.file_name as string) || '',
    fileType: (row.file_type as string) || '',
    filePath: (row.file_path as string) || '',
    fileSize: (row.file_size as number) || 0,
    mimeType: (row.mime_type as string) || '',
    recordType: ((row.record_type as VaultRecordType) || 'other'),
    source: ((row.source as VaultDocumentSource) || 'parent-upload'),
    visibility: ((row.visibility as 'private' | 'shared') || 'private'),
    uploadedAt: (row.uploaded_at as string) || new Date().toISOString(),
    metadata: (row.metadata as VaultDocumentMetadata) || {},
  };
}

// ============================================================================
// Bucket Initialization
// ============================================================================

/**
 * Ensure the vault bucket exists
 * Note: In production, buckets should be created via migrations
 */
async function ensureBucketExists(): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }

  const bucketExists = buckets?.some(b => b.name === VAULT_BUCKET);

  if (!bucketExists) {
    // Create bucket if it doesn't exist
    // Note: This requires service role key in production
    const { error: createError } = await supabase.storage.createBucket(VAULT_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (createError && !createError.message.includes('already exists')) {
      console.error('Error creating bucket:', createError);
    }
  }
}

// ============================================================================
// File Validation
// ============================================================================

/**
 * Validate a file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported`
    };
  }

  // Check file name for special characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(file.name)) {
    return {
      valid: false,
      error: 'File name contains invalid characters'
    };
  }

  return { valid: true };
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a single file to the vault
 */
export async function uploadVaultFile(
  file: File,
  userId: string,
  options: {
    recordType?: VaultRecordType;
    source?: VaultDocumentSource;
    childId?: string;
    metadata?: Partial<VaultDocumentMetadata>;
    onProgress?: UploadProgressCallback;
    /** User's subscription tier — enables per-tier storage quota enforcement */
    tier?: TierType | string | null;
    trialEndsAt?: string | null;
  } = {}
): Promise<UploadResult> {
  const {
    recordType = 'uploaded',
    source = 'parent-upload',
    childId,
    metadata = {},
    onProgress,
    tier,
    trialEndsAt,
  } = options;

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Per-tier storage quota check (free 100MB / Core 5GB / Pro 25GB / Family unlimited)
  if (tier !== undefined) {
    const limitBytes = getStorageLimitBytes(tier, trialEndsAt);
    if (limitBytes !== null) {
      const { usedBytes } = await getStorageUsage(userId);
      if (usedBytes + file.size > limitBytes) {
        const limitMb = Math.round(limitBytes / 1024 / 1024);
        const usedMb = Math.round(usedBytes / 1024 / 1024);
        return {
          success: false,
          error: `Storage limit reached (${usedMb}MB of ${limitMb >= 1000 ? `${limitMb / 1000}GB` : `${limitMb}MB`} used). Upgrade your plan for more vault space.`,
          quotaExceeded: true,
        };
      }
    }
  }

  try {
    // Ensure bucket exists
    await ensureBucketExists();

    // Generate unique file path
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${childId || 'general'}/${timestamp}-${randomId}-${safeFileName}`;

    // Report initial progress
    onProgress?.(10, file.name);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(VAULT_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    onProgress?.(60, file.name);

    // Get signed URL (valid for 7 days)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(VAULT_BUCKET)
      .createSignedUrl(filePath, 7 * 24 * 60 * 60); // 7 days in seconds

    if (urlError) {
      console.error('URL generation error:', urlError);
    }

    onProgress?.(80, file.name);

    // Create database record (snake_case — matches the applied schema)
    const documentRecord = {
      user_id: userId,
      file_name: file.name,
      file_type: fileExt,
      file_path: uploadData.path,
      file_size: file.size,
      mime_type: file.type,
      record_type: recordType,
      source,
      visibility: 'private',
      uploaded_at: new Date().toISOString(),
      metadata: {
        childId,
        ocrStatus: 'pending',
        ...metadata,
      },
    };

    const { data: dbData, error: dbError } = await supabase
      .from('vault_documents')
      .insert(documentRecord)
      .select('id')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // File was uploaded but DB record failed - still return partial success
      return {
        success: true,
        filePath: uploadData.path,
        url: urlData?.signedUrl,
        error: 'File uploaded but metadata save failed',
      };
    }

    onProgress?.(100, file.name);

    return {
      success: true,
      fileId: dbData.id,
      filePath: uploadData.path,
      url: urlData?.signedUrl,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Upload multiple files to the vault
 */
export async function uploadMultipleFiles(
  files: File[],
  userId: string,
  options: {
    recordType?: VaultRecordType;
    source?: VaultDocumentSource;
    childId?: string;
    onProgress?: (overallProgress: number, currentFile: string) => void;
  } = {}
): Promise<{ results: UploadResult[]; successCount: number; failureCount: number }> {
  const results: UploadResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileProgress = (progress: number) => {
      const overallProgress = ((i + progress / 100) / files.length) * 100;
      options.onProgress?.(overallProgress, file.name);
    };

    const result = await uploadVaultFile(file, userId, {
      ...options,
      onProgress: fileProgress,
    });

    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return { results, successCount, failureCount };
}

// ============================================================================
// Download Functions
// ============================================================================

/**
 * Get a signed download URL for a vault document
 */
export async function getVaultDocumentUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(VAULT_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      return { error: error.message };
    }

    return { url: data.signedUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to get download URL'
    };
  }
}

/**
 * Download a vault document
 */
export async function downloadVaultDocument(
  filePath: string
): Promise<{ blob?: Blob; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(VAULT_BUCKET)
      .download(filePath);

    if (error) {
      return { error: error.message };
    }

    return { blob: data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Download failed'
    };
  }
}

// ============================================================================
// Delete Functions
// ============================================================================

/**
 * Delete a vault document
 */
export async function deleteVaultDocument(
  fileId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(VAULT_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('vault_documents')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}

// ============================================================================
// List Functions
// ============================================================================

/**
 * List vault documents for a user
 */
export async function listVaultDocuments(
  userId: string,
  options: {
    childId?: string;
    recordType?: VaultRecordType;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ documents: VaultDocument[]; error?: string }> {
  try {
    let query = supabase
      .from('vault_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (options.childId) {
      query = query.eq('metadata->>childId', options.childId);
    }

    if (options.recordType) {
      query = query.eq('record_type', options.recordType);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { documents: [], error: error.message };
    }

    return { documents: (data || []).map(mapVaultRow) };
  } catch (error) {
    return {
      documents: [],
      error: error instanceof Error ? error.message : 'Failed to list documents'
    };
  }
}

// ============================================================================
// Share Functions
// ============================================================================

/**
 * Create a shareable link for a vault document
 */
export async function createShareLink(
  fileId: string,
  options: {
    expiresInDays?: number;
    passcode?: string;
    maxViews?: number;
    recipientEmail?: string;
  } = {}
): Promise<{ shareId?: string; shareUrl?: string; error?: string }> {
  const {
    expiresInDays = 7,
    passcode,
    maxViews,
    recipientEmail,
  } = options;

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // snake_case columns + DB-generated UUID id (see schema_alignment migration)
    const { data, error } = await supabase
      .from('vault_share_links')
      .insert({
        document_id: fileId,
        expires_at: expiresAt.toISOString(),
        passcode: passcode || null,
        max_views: maxViews || null,
        view_count: 0,
        recipient_email: recipientEmail || null,
      })
      .select('id')
      .single();

    if (error) {
      return { error: error.message };
    }

    // Generate share URL
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://app.aminy.ai';
    const shareUrl = `${baseUrl}/vault/shared/${data.id}`;

    return { shareId: data.id, shareUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create share link'
    };
  }
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(
  shareId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('vault_share_links')
      .delete()
      .eq('id', shareId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke share link'
    };
  }
}

// ============================================================================
// AI Document Processing
// ============================================================================

export interface ProcessDocumentResult {
  success: boolean;
  chunks?: number;
  error?: string;
}

/**
 * Ask the deployed `process-document` edge function to read a vault document
 * (extract text → chunk → embed → store in the `embeddings` table) so the AI
 * can reference it. Payload: `{ documentId }` (see
 * supabase/functions/process-document/index.ts).
 *
 * Carries the session JWT when available. NEVER throws — a processing failure
 * must not undo a successful upload; callers surface a softer "saved" state.
 */
export async function processVaultDocument(documentId: string): Promise<ProcessDocumentResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl) {
      return { success: false, error: 'Supabase is not configured' };
    }

    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token;
    } catch { /* fall back to anon key */ }

    const response = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || anonKey || ''}`,
        ...(anonKey ? { apikey: anonKey } : {}),
      },
      body: JSON.stringify({ documentId }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error) {
      return { success: false, error: body?.error || `Processing failed (HTTP ${response.status})` };
    }
    // The function returns { success: true, chunks } when text was embedded, or
    // a 200 { message: "Unsupported file type..." } for images — treat the
    // latter as a soft failure so the UI shows "saved" rather than "ready".
    if (body?.success === true) {
      return { success: true, chunks: body.chunks };
    }
    return { success: false, error: body?.message || 'Document type not yet readable' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
}

/**
 * Mark a vault document's metadata as AI-processed (ocrStatus complete) so the
 * "Aminy read it" chip survives reloads. Best-effort; never throws.
 */
export async function markVaultDocumentProcessed(documentId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('vault_documents')
      .select('metadata')
      .eq('id', documentId)
      .single();
    const metadata = { ...((data?.metadata as Record<string, unknown>) || {}), ocrStatus: 'complete' };
    await supabase.from('vault_documents').update({ metadata }).eq('id', documentId);
  } catch { /* cosmetic only */ }
}

// ============================================================================
// Storage Quota
// ============================================================================

/**
 * Get storage usage for a user
 */
export async function getStorageUsage(
  userId: string
): Promise<{ usedBytes: number; fileCount: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('vault_documents')
      .select('file_size')
      .eq('user_id', userId);

    if (error) {
      return { usedBytes: 0, fileCount: 0, error: error.message };
    }

    const usedBytes = data?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
    const fileCount = data?.length || 0;

    return { usedBytes, fileCount };
  } catch (error) {
    return {
      usedBytes: 0,
      fileCount: 0,
      error: error instanceof Error ? error.message : 'Failed to get storage usage'
    };
  }
}

// Export default module
export default {
  uploadVaultFile,
  uploadMultipleFiles,
  processVaultDocument,
  markVaultDocumentProcessed,
  getVaultDocumentUrl,
  downloadVaultDocument,
  deleteVaultDocument,
  listVaultDocuments,
  createShareLink,
  revokeShareLink,
  getStorageUsage,
  validateFile,
};
