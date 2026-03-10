// @ts-nocheck — test file, type-check deferred
/**
 * Secure Fetch Tests
 * Tests for secureFetch wrapper and secureApi convenience methods
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { secureFetch, secureApi } from '../lib/security/secure-fetch';

// Mock the CSRF module
vi.mock('../lib/security/csrf', () => ({
  getOrCreateCSRFToken: vi.fn(() => 'mock-csrf-token-abc123'),
  addCSRFHeader: vi.fn((headers: Record<string, string> = {}) => ({
    ...headers,
    'X-CSRF-Token': 'mock-csrf-token-abc123',
  })),
}));

// Import mocked functions so we can inspect calls
import { getOrCreateCSRFToken, addCSRFHeader } from '../lib/security/csrf';

// Helper to create an AbortError that matches what AbortController produces
function createAbortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

// Helper to create a mock Response
function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  body?: unknown;
  contentType?: string;
}): Response {
  const { ok = true, status = 200, body = null, contentType = 'application/json' } = options;

  const headers = new Headers();
  if (contentType) {
    headers.set('content-type', contentType);
  }

  return {
    ok,
    status,
    headers,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('secureFetch', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------------
  // 1. CSRF token injection
  // ----------------------------------------------------------------
  describe('CSRF token injection', () => {
    it('should add CSRF header to POST requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { success: true } }));

      await secureFetch('/api/data', { method: 'POST' });

      expect(addCSRFHeader).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers).toHaveProperty('X-CSRF-Token', 'mock-csrf-token-abc123');
    });

    it('should add CSRF header to PUT requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { success: true } }));

      await secureFetch('/api/data', { method: 'PUT' });

      expect(addCSRFHeader).toHaveBeenCalled();
    });

    it('should add CSRF header to PATCH requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { success: true } }));

      await secureFetch('/api/data', { method: 'PATCH' });

      expect(addCSRFHeader).toHaveBeenCalled();
    });

    it('should add CSRF header to DELETE requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { success: true } }));

      await secureFetch('/api/data', { method: 'DELETE' });

      expect(addCSRFHeader).toHaveBeenCalled();
    });

    it('should NOT add CSRF header to GET requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { data: 'test' } }));

      await secureFetch('/api/data', { method: 'GET' });

      expect(addCSRFHeader).not.toHaveBeenCalled();
    });

    it('should NOT add CSRF header when method defaults to GET', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { data: 'test' } }));

      await secureFetch('/api/data');

      expect(addCSRFHeader).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // 2. skipCSRF option
  // ----------------------------------------------------------------
  describe('skipCSRF option', () => {
    it('should not add CSRF header when skipCSRF is true', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { success: true } }));

      await secureFetch('/api/data', { method: 'POST', skipCSRF: true });

      expect(addCSRFHeader).not.toHaveBeenCalled();
    });

    it('should still add CSRF header when skipCSRF is false on POST', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { success: true } }));

      await secureFetch('/api/data', { method: 'POST', skipCSRF: false });

      expect(addCSRFHeader).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // 3. Successful JSON response parsing
  // ----------------------------------------------------------------
  describe('successful JSON response parsing', () => {
    it('should parse JSON response and return data', async () => {
      const responseBody = { id: 1, name: 'Test Item' };
      mockFetch.mockResolvedValue(createMockResponse({ body: responseBody }));

      const result = await secureFetch('/api/items/1');

      expect(result).toEqual({
        data: responseBody,
        error: null,
        status: 200,
        ok: true,
      });
    });

    it('should return null data when content-type is not JSON', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ body: 'plain text', contentType: 'text/plain' })
      );

      const result = await secureFetch('/api/text');

      expect(result.data).toBeNull();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should return null data when JSON parsing fails', async () => {
      const badResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      } as unknown as Response;

      mockFetch.mockResolvedValue(badResponse);

      const result = await secureFetch('/api/malformed');

      expect(result.data).toBeNull();
      expect(result.ok).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // 4. Error response with .message field
  // ----------------------------------------------------------------
  describe('error response with .message field', () => {
    it('should extract error from response body .message', async () => {
      const errorBody = { message: 'Validation failed: email is required' };
      mockFetch.mockResolvedValue(
        createMockResponse({ ok: false, status: 422, body: errorBody })
      );

      const result = await secureFetch('/api/users', { method: 'POST' });

      expect(result).toEqual({
        data: null,
        error: 'Validation failed: email is required',
        status: 422,
        ok: false,
      });
    });
  });

  // ----------------------------------------------------------------
  // 5. Error response with .error field
  // ----------------------------------------------------------------
  describe('error response with .error field', () => {
    it('should extract error from response body .error when .message is absent', async () => {
      const errorBody = { error: 'Unauthorized access' };
      mockFetch.mockResolvedValue(
        createMockResponse({ ok: false, status: 401, body: errorBody })
      );

      const result = await secureFetch('/api/protected');

      expect(result).toEqual({
        data: null,
        error: 'Unauthorized access',
        status: 401,
        ok: false,
      });
    });

    it('should prefer .message over .error when both present', async () => {
      const errorBody = { message: 'Primary error', error: 'Secondary error' };
      mockFetch.mockResolvedValue(
        createMockResponse({ ok: false, status: 400, body: errorBody })
      );

      const result = await secureFetch('/api/data');

      expect(result.error).toBe('Primary error');
    });

    it('should fall back to generic message when neither .message nor .error', async () => {
      const errorBody = { code: 'ERR_UNKNOWN' };
      mockFetch.mockResolvedValue(
        createMockResponse({ ok: false, status: 500, body: errorBody })
      );

      const result = await secureFetch('/api/data');

      expect(result.error).toBe('Request failed with status 500');
    });
  });

  // ----------------------------------------------------------------
  // 6. Timeout returns status 408
  // ----------------------------------------------------------------
  describe('timeout handling', () => {
    it('should return status 408 and "Request timed out" on AbortError', async () => {
      const abortError = createAbortError();
      mockFetch.mockRejectedValue(abortError);

      const result = await secureFetch('/api/slow', { timeout: 100 });

      expect(result).toEqual({
        data: null,
        error: 'Request timed out',
        status: 408,
        ok: false,
      });
    });
  });

  // ----------------------------------------------------------------
  // 7. CSRF error returns status 403
  // ----------------------------------------------------------------
  describe('CSRF error handling', () => {
    it('should return status 403 when error message includes CSRF', async () => {
      const csrfError = new Error('CSRF token validation failed');
      mockFetch.mockRejectedValue(csrfError);

      const result = await secureFetch('/api/data', { method: 'POST' });

      expect(result).toEqual({
        data: null,
        error: 'CSRF token validation failed',
        status: 403,
        ok: false,
      });
    });

    it('should return status 403 for any error containing CSRF', async () => {
      const csrfError = new Error('Invalid CSRF header');
      mockFetch.mockRejectedValue(csrfError);

      const result = await secureFetch('/api/data', { method: 'DELETE' });

      expect(result.status).toBe(403);
      expect(result.ok).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // 8. Retry logic with exponential backoff
  // ----------------------------------------------------------------
  describe('retry logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on network error up to retries count', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(createMockResponse({ body: { recovered: true } }));

      const fetchPromise = secureFetch('/api/flaky', { retries: 2, retryDelay: 100 });

      // First retry after 100ms (retryDelay * (0 + 1))
      await vi.advanceTimersByTimeAsync(100);
      // Second retry after 200ms (retryDelay * (1 + 1))
      await vi.advanceTimersByTimeAsync(200);

      const result = await fetchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ recovered: true });
    });

    it('should return error after exhausting all retries', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(networkError);

      const fetchPromise = secureFetch('/api/down', { retries: 2, retryDelay: 100 });

      // Advance through all retry delays
      await vi.advanceTimersByTimeAsync(100); // retry 1: 100 * 1
      await vi.advanceTimersByTimeAsync(200); // retry 2: 100 * 2

      const result = await fetchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(result).toEqual({
        data: null,
        error: 'Failed to fetch',
        status: 0,
        ok: false,
      });
    });

    it('should use exponential backoff for retry delays', async () => {
      const networkError = new TypeError('Network error');
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(createMockResponse({ body: { ok: true } }));

      const fetchPromise = secureFetch('/api/data', { retries: 3, retryDelay: 1000 });

      // attempt 0 fails immediately, then sleep(1000 * (0+1)) = 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // attempt 1 fails, then sleep(1000 * (1+1)) = 2000ms
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // attempt 2 fails, then sleep(1000 * (2+1)) = 3000ms
      await vi.advanceTimersByTimeAsync(3000);
      expect(mockFetch).toHaveBeenCalledTimes(4);

      const result = await fetchPromise;
      expect(result.ok).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // 9. No retry on timeout (AbortError)
  // ----------------------------------------------------------------
  describe('no retry on timeout', () => {
    it('should not retry when request times out with AbortError', async () => {
      const abortError = createAbortError();
      mockFetch.mockRejectedValue(abortError);

      const result = await secureFetch('/api/slow', { retries: 3, timeout: 100 });

      // Should only call fetch once -- no retries on AbortError
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(408);
      expect(result.error).toBe('Request timed out');
    });
  });

  // ----------------------------------------------------------------
  // 10. No retry on CSRF error
  // ----------------------------------------------------------------
  describe('no retry on CSRF error', () => {
    it('should not retry when error is CSRF-related', async () => {
      const csrfError = new Error('CSRF token mismatch');
      mockFetch.mockRejectedValue(csrfError);

      const result = await secureFetch('/api/data', { method: 'POST', retries: 3 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(403);
      expect(result.error).toBe('CSRF token mismatch');
    });
  });

  // ----------------------------------------------------------------
  // Default headers and credentials
  // ----------------------------------------------------------------
  describe('default headers and credentials', () => {
    it('should set Content-Type to application/json by default', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));

      await secureFetch('/api/data');

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should set credentials to same-origin', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));

      await secureFetch('/api/data');

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].credentials).toBe('same-origin');
    });

    it('should pass the correct URL to fetch', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));

      await secureFetch('/api/users/42');

      expect(mockFetch).toHaveBeenCalledWith('/api/users/42', expect.any(Object));
    });

    it('should pass an AbortSignal for timeout', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));

      await secureFetch('/api/data', { timeout: 5000 });

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
    });
  });
});

// ================================================================
// 11. secureApi convenience methods
// ================================================================
describe('secureApi convenience methods', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn().mockResolvedValue(createMockResponse({ body: { ok: true } }));
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('secureApi.get should call fetch with GET method', async () => {
    await secureApi.get('/api/items');

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].method).toBe('GET');
    expect(addCSRFHeader).not.toHaveBeenCalled();
  });

  it('secureApi.post should call fetch with POST method and JSON body', async () => {
    const payload = { name: 'New Item', value: 42 };
    await secureApi.post('/api/items', payload);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].body).toBe(JSON.stringify(payload));
    expect(addCSRFHeader).toHaveBeenCalled();
  });

  it('secureApi.post should work without body', async () => {
    await secureApi.post('/api/trigger');

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].body).toBeUndefined();
  });

  it('secureApi.put should call fetch with PUT method and JSON body', async () => {
    const payload = { name: 'Updated Item' };
    await secureApi.put('/api/items/1', payload);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].method).toBe('PUT');
    expect(fetchCall[1].body).toBe(JSON.stringify(payload));
    expect(addCSRFHeader).toHaveBeenCalled();
  });

  it('secureApi.patch should call fetch with PATCH method and JSON body', async () => {
    const payload = { status: 'active' };
    await secureApi.patch('/api/items/1', payload);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].method).toBe('PATCH');
    expect(fetchCall[1].body).toBe(JSON.stringify(payload));
    expect(addCSRFHeader).toHaveBeenCalled();
  });

  it('secureApi.delete should call fetch with DELETE method', async () => {
    await secureApi.delete('/api/items/1');

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].method).toBe('DELETE');
    expect(addCSRFHeader).toHaveBeenCalled();
  });

  it('secureApi.get should forward extra options', async () => {
    await secureApi.get('/api/items', { timeout: 5000, retries: 2 });

    // The options are consumed by secureFetch internally,
    // but we can verify the signal exists (timeout creates AbortController)
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
  });

  it('secureApi.post should forward extra options', async () => {
    await secureApi.post('/api/items', { x: 1 }, { skipCSRF: true });

    // skipCSRF should prevent CSRF header
    expect(addCSRFHeader).not.toHaveBeenCalled();
  });
});
