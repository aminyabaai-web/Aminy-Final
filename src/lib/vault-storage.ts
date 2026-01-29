/**
 * Vault Storage Service
 *
 * Handles file uploads to Supabase Storage for the Document Vault.
 * Supports multiple file types with validation, progress tracking, and error handling.
 */

import { supabase } from '../utils/supabase/client';

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
  } = {}
): Promise<UploadResult> {
  const {
    recordType = 'uploaded',
    source = 'parent-upload',
    childId,
    metadata = {},
    onProgress,
  } = options;

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
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

    // Create database record
    const documentRecord: Partial<VaultDocument> = {
      userId,
      fileName: file.name,
      fileType: fileExt,
      filePath: uploadData.path,
      fileSize: file.size,
      mimeType: file.type,
      recordType,
      source,
      visibility: 'private',
      uploadedAt: new Date().toISOString(),
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
      .eq('userId', userId)
      .order('uploadedAt', { ascending: false });

    if (options.childId) {
      query = query.eq('metadata->>childId', options.childId);
    }

    if (options.recordType) {
      query = query.eq('recordType', options.recordType);
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

    return { documents: data || [] };
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
    const shareId = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data, error } = await supabase
      .from('vault_share_links')
      .insert({
        id: shareId,
        documentId: fileId,
        expiresAt: expiresAt.toISOString(),
        passcode: passcode || null,
        maxViews: maxViews || null,
        viewCount: 0,
        recipientEmail: recipientEmail || null,
        createdAt: new Date().toISOString(),
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
    const shareUrl = `${baseUrl}/vault/shared/${shareId}`;

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
      .select('fileSize')
      .eq('userId', userId);

    if (error) {
      return { usedBytes: 0, fileCount: 0, error: error.message };
    }

    const usedBytes = data?.reduce((sum, doc) => sum + (doc.fileSize || 0), 0) || 0;
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
  getVaultDocumentUrl,
  downloadVaultDocument,
  deleteVaultDocument,
  listVaultDocuments,
  createShareLink,
  revokeShareLink,
  getStorageUsage,
  validateFile,
};
