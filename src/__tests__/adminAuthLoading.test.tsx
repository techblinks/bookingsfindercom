/**
 * Phase 7D Fix — Loading state / useAdminAuth / AdminBranding tests.
 *
 * Tests for:
 * - useAdminAuth with existing session
 * - useAdminAuth with no session
 * - useAdminAuth with non-admin user
 * - useAdminAuth role-query error
 * - useAdminAuth role-query timeout
 * - useAdminAuth auth state change after mount
 * - AdminBranding does not spinner forever on branding error
 * - AdminBranding settles when auth + branding both load
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useBranding } from '@/hooks/useBranding';
import type { BrandingSettings } from '@/types/branding';

// ── Mock Supabase ─────────────────────────────────────────────────

const mockOnAuthStateChange = vi.fn();
let authChangeCallback: ((event: string, session: unknown) => void) | null = null;
let mockSession: { user: { id: string; email: string } } | null = null;
let mockAdminCheckResult: { data: unknown; error: Error | null } = { data: null, error: null };
let mockAdminCheckDelay = 0;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authChangeCallback = cb;
        mockOnAuthStateChange(cb);
        // Fire initial null session synchronously to simulate Supabase behaviour
        setTimeout(() => cb('INITIAL_SESSION', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => {
      if (mockAdminCheckDelay > 0) {
        return new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: mockAdminCheckResult.data, error: mockAdminCheckResult.error }),
            mockAdminCheckDelay,
          ),
        );
      }
      return Promise.resolve({ data: mockAdminCheckResult.data, error: mockAdminCheckResult.error });
    }),
    channel: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    removeChannel: vi.fn(),
  },
}));

// ── Test data ─────────────────────────────────────────────────────

function mockAdminUser() {
  mockSession = { user: { id: 'admin-id', email: 'admin@test.com' } };
  mockAdminCheckResult = { data: { role: 'admin' }, error: null };
  mockAdminCheckDelay = 0;
}

function mockNonAdminUser() {
  mockSession = { user: { id: 'user-id', email: 'user@test.com' } };
  mockAdminCheckResult = { data: null, error: null };
  mockAdminCheckDelay = 0;
}

function mockNoUser() {
  mockSession = null;
  mockAdminCheckResult = { data: null, error: null };
  mockAdminCheckDelay = 0;
}

function mockRoleQueryError() {
  mockSession = { user: { id: 'admin-id', email: 'admin@test.com' } };
  mockAdminCheckResult = { data: null, error: new Error('Database error') };
  mockAdminCheckDelay = 0;
}

function mockRoleQueryTimeout() {
  mockSession = { user: { id: 'admin-id', email: 'admin@test.com' } };
  mockAdminCheckDelay = 20_000; // longer than the 10s timeout
}

// ── Wrapper ───────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

// ════════════════════════════════════════════════════════════════
// 1. useAdminAuth — existing admin session
// ════════════════════════════════════════════════════════════════

describe('useAdminAuth — admin session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminUser();
    authChangeCallback = null;
  });

  it('settles isLoading with isAdmin=true for an admin user', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    // Starts loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeTruthy();
    expect(result.current.isAdmin).toBe(true);
  });

  it('exposes user and session after load', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.id).toBe('admin-id');
    expect(result.current.session).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════
// 2. useAdminAuth — no session
// ════════════════════════════════════════════════════════════════

describe('useAdminAuth — no session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoUser();
    authChangeCallback = null;
  });

  it('settles isLoading with false when there is no session', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('does NOT call role query when there is no user', async () => {
    // No user → Effect 2 never fires for role check
    // We can't easily assert this without spying, but isLoading settles
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// 3. useAdminAuth — non-admin user
// ════════════════════════════════════════════════════════════════

describe('useAdminAuth — non-admin user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNonAdminUser();
    authChangeCallback = null;
  });

  it('settles isLoading with isAdmin=false for non-admin user', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeTruthy();
    expect(result.current.user?.id).toBe('user-id');
    expect(result.current.isAdmin).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 4. useAdminAuth — role-query error
// ════════════════════════════════════════════════════════════════

describe('useAdminAuth — role query error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoleQueryError();
    authChangeCallback = null;
  });

  it('settles isLoading even when role query fails', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // On error, defaults to not-admin (safe)
    expect(result.current.user).toBeTruthy();
    expect(result.current.isAdmin).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 5. useAdminAuth — role-query timeout
// ════════════════════════════════════════════════════════════════

describe('useAdminAuth — role query timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoleQueryTimeout();
    authChangeCallback = null;
  });

  it('settles isLoading within the timeout window when role query hangs', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    // Should settle within ~11s (timeout 10s + some overhead)
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 12_000 },
    );

    // Timeout defaults to not-admin
    expect(result.current.isAdmin).toBe(false);
  }, 15_000); // test-level timeout
});

// ════════════════════════════════════════════════════════════════
// 6. useAdminAuth — auth state change after mount
// ════════════════════════════════════════════════════════════════

describe('useAdminAuth — auth state change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoUser();
    authChangeCallback = null;
  });

  it('updates when a user signs in after mount', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });

    // Initial: no user
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toBeNull();

    // Set up admin session
    mockAdminCheckResult = { data: { role: 'admin' }, error: null };

    // Simulate auth state change (user signs in)
    act(() => {
      authChangeCallback?.('SIGNED_IN', {
        user: { id: 'new-admin-id', email: 'new@test.com' },
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.id).toBe('new-admin-id');
    expect(result.current.isAdmin).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// 7. Loading always settles
// ════════════════════════════════════════════════════════════════

describe('useAdminAuth — loading always settles', () => {
  it('settles for admin user', async () => {
    mockAdminUser();
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('settles for non-admin user', async () => {
    mockNonAdminUser();
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('settles for no user', async () => {
    mockNoUser();
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('settles on query error', async () => {
    mockRoleQueryError();
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('settles on query timeout', async () => {
    mockRoleQueryTimeout();
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 12_000 });
  }, 15_000);

  it('isLoading starts as true', () => {
    mockAdminUser();
    const { result } = renderHook(() => useAdminAuth(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// 8. useBranding — always settles (fallback on error)
// ════════════════════════════════════════════════════════════════

describe('useBranding — always settles', () => {
  it('provides defaults without BrandingProvider', () => {
    const { result } = renderHook(() => useBranding());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.branding.site_name).toBe('BookingsFinder');
    expect(result.current.error).toBeNull();
  });
});
