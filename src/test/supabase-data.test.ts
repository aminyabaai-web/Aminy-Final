/**
 * Supabase Data Service Tests
 *
 * Tests the dataService from src/lib/supabase-data.ts
 * Mocks the Supabase client to isolate business logic from network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock values (vi.hoisted runs before vi.mock factories)
// ---------------------------------------------------------------------------

const { mockSupabaseAuth, mockSupabase, mockFromReturnValueRef } = vi.hoisted(() => {
  const mockSupabaseAuth = {
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  };

  // Use a ref object so the factory closure always reads the latest value
  const mockFromReturnValueRef = { current: null as any };

  const mockSupabase = {
    auth: mockSupabaseAuth,
    from: vi.fn(() => mockFromReturnValueRef.current),
    rpc: vi.fn(),
  };

  return { mockSupabaseAuth, mockSupabase, mockFromReturnValueRef };
});

// ---------------------------------------------------------------------------
// Mock Supabase client module
// ---------------------------------------------------------------------------

vi.mock('../utils/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Import after mocks are set up
import { dataService } from '../lib/supabase-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a chainable query builder mock that resolves to the given value.
 * All methods (select, insert, eq, etc.) return the builder itself,
 * and the builder is thenable so `await` resolves with the value.
 */
function createQueryBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const builder: Record<string, any> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single', 'rpc'];
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Make builder thenable so `await supabase.from(...).select(...)` resolves
  const promise = Promise.resolve(resolvedValue);
  builder.then = promise.then.bind(promise);
  builder.catch = promise.catch.bind(promise);

  return builder;
}

function mockAuthenticatedUser(userId = 'user-123') {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

function mockUnauthenticatedUser() {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

/**
 * Sets up the mock so that supabase.from(table).method().method()...
 * eventually resolves with { data, error }.
 */
function mockFromChain(result: { data: unknown; error: unknown }) {
  const builder = createQueryBuilder(result);
  mockFromReturnValueRef.current = builder;
  return builder;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('dataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockImplementation on from (clearAllMocks only clears call history, not implementations)
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
    // Re-establish default: from() returns whatever mockFromReturnValueRef.current is
    mockFromReturnValueRef.current = createQueryBuilder({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => mockFromReturnValueRef.current);
    mockUnauthenticatedUser();
  });

  // ========================================================================
  // getProfile
  // ========================================================================
  describe('getProfile', () => {
    it('returns null when user is not authenticated', async () => {
      mockUnauthenticatedUser();
      const result = await dataService.getProfile();
      expect(result).toBeNull();
    });

    it('returns profile data for authenticated user', async () => {
      mockAuthenticatedUser('user-abc');
      const mockProfile = {
        id: 'user-abc',
        parent_name: 'Jane',
        child_name: 'Sam',
        tier: 'core',
        role: 'parent',
        has_completed_onboarding: true,
        created_at: '2024-01-01',
        updated_at: '2024-06-01',
      };
      mockFromChain({ data: mockProfile, error: null });

      const result = await dataService.getProfile();
      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('returns null and handles error gracefully when supabase returns an error', async () => {
      mockAuthenticatedUser('user-err');
      mockFromChain({ data: null, error: { message: 'Something went wrong' } });

      const result = await dataService.getProfile();
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // saveChild
  // ========================================================================
  describe('saveChild', () => {
    it('requires authentication (validates name field implicitly via TypeScript)', async () => {
      // saveChild signature requires { name: string } - this test verifies auth is required
      mockUnauthenticatedUser();

      await expect(
        dataService.saveChild({ name: 'Emma' })
      ).rejects.toThrow('Not authenticated');
    });

    it('saves child record for authenticated user', async () => {
      mockAuthenticatedUser('parent-1');
      const savedChild = {
        id: 'child-1',
        parent_id: 'parent-1',
        name: 'Emma',
        is_primary: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      mockFromChain({ data: savedChild, error: null });

      const result = await dataService.saveChild({ name: 'Emma' });
      expect(result).toEqual(savedChild);
      expect(mockSupabase.from).toHaveBeenCalledWith('children');
    });

    it('returns null when supabase insert fails', async () => {
      mockAuthenticatedUser('parent-1');
      mockFromChain({ data: null, error: { message: 'Insert failed' } });

      const result = await dataService.saveChild({ name: 'Emma' });
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // createConversation
  // ========================================================================
  describe('createConversation', () => {
    it('throws when user is not authenticated', async () => {
      mockUnauthenticatedUser();

      await expect(
        dataService.createConversation('Test conversation')
      ).rejects.toThrow('Not authenticated');
    });

    it('creates conversation for authenticated user', async () => {
      mockAuthenticatedUser('user-conv');
      const mockConv = {
        id: 'conv-1',
        user_id: 'user-conv',
        title: 'My conversation',
        archived: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      mockFromChain({ data: mockConv, error: null });

      const result = await dataService.createConversation('My conversation');
      expect(result).toEqual(mockConv);
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    });

    it('returns null when supabase insert fails', async () => {
      mockAuthenticatedUser('user-conv');
      mockFromChain({ data: null, error: { message: 'DB error' } });

      const result = await dataService.createConversation();
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // saveMessage
  // ========================================================================
  describe('saveMessage', () => {
    it('stores message in correct conversation', async () => {
      const mockMsg = {
        id: 'msg-1',
        conversation_id: 'conv-42',
        role: 'user' as const,
        content: 'Hello Aminy',
        metadata: {},
        tokens_used: 0,
        created_at: '2024-01-01',
      };

      // First call: insert message -> returns saved message
      // Second call: update conversation timestamp
      mockSupabase.from.mockImplementation(((table: string) => {
        if (table === 'messages') {
          return createQueryBuilder({ data: mockMsg, error: null });
        }
        if (table === 'conversations') {
          return createQueryBuilder({ data: null, error: null });
        }
        return createQueryBuilder({ data: null, error: null });
      }) as any);

      const result = await dataService.saveMessage('conv-42', 'user', 'Hello Aminy');
      expect(result).toEqual(mockMsg);
      // Verify it was called with 'messages' table first
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      // Then updates the conversation timestamp
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    });

    it('returns null when message insert fails', async () => {
      mockSupabase.from.mockReturnValue(
        createQueryBuilder({ data: null, error: { message: 'Insert failed' } })
      );

      const result = await dataService.saveMessage('conv-42', 'user', 'Hello');
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // hydrateUserData
  // ========================================================================
  describe('hydrateUserData', () => {
    it('returns null when user is not authenticated', async () => {
      mockUnauthenticatedUser();
      const result = await dataService.hydrateUserData();
      expect(result).toBeNull();
    });

    it('fetches all data in parallel when authenticated', async () => {
      mockAuthenticatedUser('user-hydrate');

      const mockProfile = {
        id: 'user-hydrate',
        parent_name: 'Parent',
        tier: 'core',
        role: 'parent',
        has_completed_onboarding: true,
      };

      const mockChildren = [
        { id: 'child-1', name: 'Emma', is_primary: true },
        { id: 'child-2', name: 'Sam', is_primary: false },
      ];

      // Track which tables are queried
      const queriedTables: string[] = [];

      mockSupabase.from.mockImplementation(((table: string) => {
        queriedTables.push(table);
        switch (table) {
          case 'profiles':
            return createQueryBuilder({ data: mockProfile, error: null });
          case 'children':
            return createQueryBuilder({ data: mockChildren, error: null });
          case 'screening_results':
            return createQueryBuilder({ data: [], error: null });
          case 'treatment_goals':
            return createQueryBuilder({ data: [], error: null });
          case 'conversations':
            return createQueryBuilder({ data: [], error: null });
          case 'usage_tracking':
            return createQueryBuilder({ data: { message_count: 5, tokens_used: 150 }, error: null });
          default:
            return createQueryBuilder({ data: null, error: null });
        }
      }) as any);

      // Also mock RPC for usage if called
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await dataService.hydrateUserData();

      expect(result).not.toBeNull();
      expect(result!.profile).toEqual(mockProfile);
      expect(result!.children).toEqual(mockChildren);
      expect(result!.primaryChild).toEqual(mockChildren[0]); // is_primary = true

      // Verify parallel fetching - all these tables should have been queried
      expect(queriedTables).toContain('profiles');
      expect(queriedTables).toContain('children');
      expect(queriedTables).toContain('screening_results');
      expect(queriedTables).toContain('treatment_goals');
      expect(queriedTables).toContain('conversations');
    });
  });

  // ========================================================================
  // Error handling
  // ========================================================================
  describe('error handling', () => {
    it('getChildren returns empty array on error', async () => {
      mockAuthenticatedUser('user-err');
      mockFromChain({ data: null, error: { message: 'Network error' } });

      const result = await dataService.getChildren();
      expect(result).toEqual([]);
    });

    it('getConversations returns empty array on error', async () => {
      mockAuthenticatedUser('user-err');
      mockFromChain({ data: null, error: { message: 'Network error' } });

      const result = await dataService.getConversations();
      expect(result).toEqual([]);
    });

    it('getScreeningResults returns empty array on error', async () => {
      mockAuthenticatedUser('user-err');
      mockFromChain({ data: null, error: { message: 'Query failed' } });

      const result = await dataService.getScreeningResults();
      expect(result).toEqual([]);
    });

    it('getTreatmentGoals returns empty array on error', async () => {
      mockAuthenticatedUser('user-err');
      mockFromChain({ data: null, error: { message: 'Query failed' } });

      const result = await dataService.getTreatmentGoals();
      expect(result).toEqual([]);
    });

    it('getDailyUsage returns default when no rows exist', async () => {
      mockAuthenticatedUser('user-err');
      mockFromChain({ data: null, error: { code: 'PGRST116', message: 'No rows' } });

      const result = await dataService.getDailyUsage();
      expect(result).toEqual({ message_count: 0, tokens_used: 0 });
    });

    it('updateProfile returns null on error', async () => {
      mockAuthenticatedUser('user-err');
      mockFromChain({ data: null, error: { message: 'Update failed' } });

      const result = await dataService.updateProfile({ parent_name: 'New Name' });
      expect(result).toBeNull();
    });

    it('getMessages returns empty array on error', async () => {
      mockFromChain({ data: null, error: { message: 'Query failed' } });

      const result = await dataService.getMessages('conv-123');
      expect(result).toEqual([]);
    });

    it('unauthenticated calls to getChildren return empty array', async () => {
      mockUnauthenticatedUser();
      const result = await dataService.getChildren();
      expect(result).toEqual([]);
    });

    it('unauthenticated calls to getConversations return empty array', async () => {
      mockUnauthenticatedUser();
      const result = await dataService.getConversations();
      expect(result).toEqual([]);
    });
  });
});
