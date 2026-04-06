// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useVaultData Hook
 * Loads vault document data from Supabase with localStorage fallback.
 *
 * Tables: vault_documents, vault_share_links
 * Storage: vault-documents bucket
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface VaultDocument {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  recordType: string;
  source: string;
  visibility: 'private' | 'shared';
  uploadedAt: string;
  metadata: Record<string, unknown>;
}

export interface VaultCategory {
  type: string;
  count: number;
  totalSize: number;
}

export interface VaultData {
  documents: VaultDocument[];
  categories: VaultCategory[];
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEY = 'aminy-vault-cache';

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ============================================================================
// Row mapper
// ============================================================================

function mapDocument(row: Record<string, unknown>): VaultDocument {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    fileName: (row.file_name as string) || '',
    fileType: (row.file_type as string) || '',
    filePath: (row.file_path as string) || '',
    fileSize: (row.file_size as number) || 0,
    mimeType: (row.mime_type as string) || '',
    recordType: (row.record_type as string) || 'other',
    source: (row.source as string) || 'parent-upload',
    visibility: (row.visibility as 'private' | 'shared') || 'private',
    uploadedAt: (row.uploaded_at as string) || new Date().toISOString(),
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}

function buildCategories(docs: VaultDocument[]): VaultCategory[] {
  const map = new Map<string, VaultCategory>();
  for (const doc of docs) {
    const existing = map.get(doc.recordType);
    if (existing) {
      existing.count++;
      existing.totalSize += doc.fileSize;
    } else {
      map.set(doc.recordType, { type: doc.recordType, count: 1, totalSize: doc.fileSize });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ============================================================================
// Hook
// ============================================================================

export function useVaultData(userId?: string): VaultData & {
  refresh: () => Promise<void>;
  uploadDocument: (file: File, recordType: string, metadata?: Record<string, unknown>) => Promise<VaultDocument | null>;
  deleteDocument: (documentId: string) => Promise<void>;
  shareDocument: (documentId: string, recipientEmail: string, expiresInHours?: number) => Promise<string | null>;
} {
  const [data, setData] = useState<VaultData>({
    documents: [],
    categories: [],
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const { data: rows, error } = await supabase
        .from('vault_documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const documents = (rows || []).map((r: Record<string, unknown>) => mapDocument(r));
      const categories = buildCategories(documents);

      writeCache(CACHE_KEY, { documents, categories });

      setData({ documents, categories, loading: false, error: null });
    } catch (error: unknown) {
      console.error('[Vault] Load failed, using cache:', error);
      const cached = readCache<{ documents: VaultDocument[]; categories: VaultCategory[] }>(CACHE_KEY, { documents: [], categories: [] });
      setData({
        documents: cached.documents,
        categories: cached.categories,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load vault data',
      });
    }
  }, [userId]);

  const uploadDocument = useCallback(async (
    file: File,
    recordType: string,
    metadata?: Record<string, unknown>,
  ): Promise<VaultDocument | null> => {
    if (!userId) return null;

    try {
      const filePath = `${userId}/${Date.now()}-${file.name}`;

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('vault-documents')
        .upload(filePath, file, { contentType: file.type });

      if (storageError) throw storageError;

      // Insert document record
      const { data: row, error: dbError } = await supabase
        .from('vault_documents')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_type: file.name.split('.').pop() || '',
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          record_type: recordType,
          source: 'parent-upload',
          visibility: 'private',
          metadata: metadata || {},
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const doc = mapDocument(row as Record<string, unknown>);
      setData(prev => {
        const documents = [doc, ...prev.documents];
        const categories = buildCategories(documents);
        writeCache(CACHE_KEY, { documents, categories });
        return { ...prev, documents, categories };
      });

      return doc;
    } catch (err) {
      console.error('[Vault] Upload failed:', err);
      return null;
    }
  }, [userId]);

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!userId) return;

    try {
      // Find the file path
      const doc = data.documents.find(d => d.id === documentId);
      if (doc) {
        await supabase.storage.from('vault-documents').remove([doc.filePath]);
      }
      await supabase.from('vault_documents').delete().eq('id', documentId).eq('user_id', userId);

      setData(prev => {
        const documents = prev.documents.filter(d => d.id !== documentId);
        const categories = buildCategories(documents);
        writeCache(CACHE_KEY, { documents, categories });
        return { ...prev, documents, categories };
      });
    } catch (err) {
      console.error('[Vault] Delete failed:', err);
    }
  }, [userId, data.documents]);

  const shareDocument = useCallback(async (
    documentId: string,
    recipientEmail: string,
    expiresInHours: number = 48,
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      const shareId = crypto.randomUUID?.() || `share-${Date.now()}`;
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

      await supabase.from('vault_share_links').insert({
        id: shareId,
        document_id: documentId,
        expires_at: expiresAt,
        recipient_email: recipientEmail,
        created_by: userId,
        max_views: 10,
      });

      return shareId;
    } catch (err) {
      console.error('[Vault] Share failed:', err);
      return null;
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh: loadData,
    uploadDocument,
    deleteDocument,
    shareDocument,
  };
}

export default useVaultData;
