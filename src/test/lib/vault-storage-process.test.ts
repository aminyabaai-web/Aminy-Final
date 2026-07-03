// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * processVaultDocument — the client-side invoker of the deployed
 * `process-document` edge function (vault → AI embeddings chain).
 *
 * Contract under test (fetch mocked):
 * - POSTs { documentId } to <supabase>/functions/v1/process-document
 * - carries the session JWT when available (falls back to anon key)
 * - NEVER throws: HTTP errors, function errors, and network failures all
 *   resolve to { success: false } so a saved upload is never rolled back
 * - treats the 200 "Unsupported file type" response as a soft failure
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.fn();
vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

import { processVaultDocument } from '../../lib/vault-storage';

const SUPABASE_URL = 'https://test-project.supabase.co'; // from test setup stubEnv

describe('processVaultDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'session-jwt' } } });
    global.fetch = vi.fn();
  });

  it('POSTs the documentId to the process-document function with the session JWT', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, chunks: 7 }),
    });

    const result = await processVaultDocument('doc-42');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${SUPABASE_URL}/functions/v1/process-document`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer session-jwt');
    expect(JSON.parse(init.body)).toEqual({ documentId: 'doc-42' });

    expect(result).toEqual({ success: true, chunks: 7 });
  });

  it('falls back to the anon key when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, chunks: 1 }),
    });

    await processVaultDocument('doc-1');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toMatch(/^Bearer ey/); // anon key from stubEnv
  });

  it('resolves { success: false } on HTTP errors instead of throwing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Failed to fetch document' }),
    });

    const result = await processVaultDocument('doc-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to fetch document');
  });

  it('treats the 200 "Unsupported file type" response as a soft failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Unsupported file type for text extraction.', type: 'image/jpeg' }),
    });

    const result = await processVaultDocument('doc-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('never throws on network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));

    await expect(processVaultDocument('doc-1')).resolves.toEqual({
      success: false,
      error: 'network down',
    });
  });
});
