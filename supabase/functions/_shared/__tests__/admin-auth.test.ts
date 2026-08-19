/**
 * admin-auth — fail-closed authorization gate for privileged AI generation
 * endpoints (BF-0R-3).
 *
 * `evaluateAdminAuthState` is pure and tested directly. `requireAdmin` is
 * tested against a fake Supabase client (duck-typed to the two calls it
 * makes: `auth.getUser` and a `user_roles` select) — no real network or
 * database access, consistent with "no real network/provider/API calls in
 * tests".
 */
import { describe, it, expect } from "vitest";
import { evaluateAdminAuthState, requireAdmin } from "../admin-auth.ts";

/** The exact client type requireAdmin expects, derived rather than imported/duplicated. */
type SupabaseLike = Parameters<typeof requireAdmin>[1];

describe("evaluateAdminAuthState — pure decision table", () => {
  it("denies with 401 when there is no Authorization header at all", () => {
    const result = evaluateAdminAuthState({ hasAuthHeader: false, userId: null, userLookupError: false, hasAdminRole: false });
    expect(result).toEqual({ ok: false, status: 401, error: expect.stringContaining("Unauthorized") });
  });

  it("denies with 401 when the token is present but invalid/expired", () => {
    const result = evaluateAdminAuthState({ hasAuthHeader: true, userId: null, userLookupError: true, hasAdminRole: false });
    if (result.ok) throw new Error("expected denial");
    expect(result.status).toBe(401);
  });

  it("denies with 401 when getUser resolves no user and no error (defensive)", () => {
    const result = evaluateAdminAuthState({ hasAuthHeader: true, userId: null, userLookupError: false, hasAdminRole: false });
    if (result.ok) throw new Error("expected denial");
    expect(result.status).toBe(401);
  });

  it("denies with 403 when the caller is a genuine, authenticated NON-admin user", () => {
    const result = evaluateAdminAuthState({ hasAuthHeader: true, userId: "user-123", userLookupError: false, hasAdminRole: false });
    expect(result).toEqual({ ok: false, status: 403, error: expect.stringContaining("Forbidden") });
  });

  it("grants access only when authenticated AND holding the admin role", () => {
    const result = evaluateAdminAuthState({ hasAuthHeader: true, userId: "admin-456", userLookupError: false, hasAdminRole: true });
    expect(result).toEqual({ ok: true, userId: "admin-456" });
  });
});

/** Minimal duck-typed fake of the Supabase client surface requireAdmin uses. */
function fakeSupabase(opts: {
  getUserResult: { data: { user: { id: string } | null }; error: unknown };
  roleRow: { role: string } | null;
  roleError?: unknown;
}) {
  return {
    auth: {
      getUser: async (_token: string) => opts.getUserResult,
    },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          eq: (_col2: string, _val2: string) => ({
            maybeSingle: async () => ({ data: opts.roleRow, error: opts.roleError ?? null }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseLike;
}

function requestWithAuth(header: string | null): Request {
  const headers = new Headers();
  if (header) headers.set("Authorization", header);
  return new Request("https://example.com/fn", { headers });
}

describe("requireAdmin — end-to-end against a fake client", () => {
  it("rejects an anonymous request with no bearer token before any DB call", async () => {
    const supabase = fakeSupabase({ getUserResult: { data: { user: null }, error: null }, roleRow: null });
    const result = await requireAdmin(requestWithAuth(null), supabase);
    expect(result).toEqual({ ok: false, status: 401, error: expect.any(String) });
  });

  it("rejects a request with an invalid token", async () => {
    const supabase = fakeSupabase({ getUserResult: { data: { user: null }, error: new Error("bad token") }, roleRow: null });
    const result = await requireAdmin(requestWithAuth("Bearer not-a-real-token"), supabase);
    expect(result).toEqual({ ok: false, status: 401, error: expect.any(String) });
  });

  it("rejects a valid, authenticated, but non-admin caller — privileged mutation must not be reachable", async () => {
    const supabase = fakeSupabase({
      getUserResult: { data: { user: { id: "regular-user" } }, error: null },
      roleRow: null, // no admin row for this user
    });
    const result = await requireAdmin(requestWithAuth("Bearer valid-user-token"), supabase);
    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });

  it("rejects when the role lookup itself errors — fails closed, never open", async () => {
    const supabase = fakeSupabase({
      getUserResult: { data: { user: { id: "some-user" } }, error: null },
      roleRow: { role: "admin" },
      roleError: new Error("db unavailable"),
    });
    const result = await requireAdmin(requestWithAuth("Bearer valid-token"), supabase);
    expect(result.ok).toBe(false);
  });

  it("grants access to a genuine admin", async () => {
    const supabase = fakeSupabase({
      getUserResult: { data: { user: { id: "admin-user" } }, error: null },
      roleRow: { role: "admin" },
    });
    const result = await requireAdmin(requestWithAuth("Bearer admin-token"), supabase);
    expect(result).toEqual({ ok: true, userId: "admin-user" });
  });
});
