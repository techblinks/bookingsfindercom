/**
 * Admin authorization gate for privileged edge functions — BF-0R-3.
 *
 * `supabase/config.toml` sets `verify_jwt = false` on every function in this
 * repo (required so the sitemap and public catalogue endpoints stay reachable
 * by crawlers and anonymous shoppers who cannot present a JWT). That setting
 * only disables Supabase's platform-level JWT gate; it does NOT mean a
 * function may skip its own authorization. Functions that perform privileged,
 * service-role database mutation (writing AI-generated content, admin stats)
 * MUST verify the caller themselves and fail closed. This mirrors the
 * existing convention in get-admin-stats/index.ts: read the bearer token,
 * resolve the user via `auth.getUser`, then require an explicit 'admin' row
 * in `user_roles` (the same table and role the client-side `useAdminAuth`
 * hook and the `has_role` RLS policies already trust).
 *
 * `requireAdmin` takes the resolved Supabase client and the incoming Request
 * so it has no Deno-specific dependency of its own; `evaluateAdminAuthState`
 * below is the pure decision function used for testing without a real
 * network/DB round-trip.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Pure decision logic, given already-resolved inputs. Exported separately so
 * it can be unit tested without constructing a real Supabase client or making
 * a network call — the only thing under test is "does this input combination
 * grant or deny access", not the DB round-trip itself.
 */
export function evaluateAdminAuthState(input: {
  hasAuthHeader: boolean;
  userId: string | null;
  userLookupError: boolean;
  hasAdminRole: boolean;
}): AdminAuthResult {
  if (!input.hasAuthHeader) {
    return { ok: false, status: 401, error: "Unauthorized: missing bearer token" };
  }
  if (input.userLookupError || !input.userId) {
    return { ok: false, status: 401, error: "Unauthorized: invalid or expired token" };
  }
  if (!input.hasAdminRole) {
    return { ok: false, status: 403, error: "Forbidden: admin role required" };
  }
  return { ok: true, userId: input.userId };
}

/**
 * Resolve the caller from the Authorization header and require an 'admin'
 * row in `user_roles`. Fails closed on every ambiguous case: missing header,
 * invalid token, lookup error, or no admin row.
 */
export async function requireAdmin(
  req: Request,
  supabase: SupabaseClient,
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return evaluateAdminAuthState({
      hasAuthHeader: false,
      userId: null,
      userLookupError: false,
      hasAdminRole: false,
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id ?? null;

  if (userError || !userId) {
    return evaluateAdminAuthState({
      hasAuthHeader: true,
      userId: null,
      userLookupError: true,
      hasAdminRole: false,
    });
  }

  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return evaluateAdminAuthState({
    hasAuthHeader: true,
    userId,
    userLookupError: false,
    hasAdminRole: !roleError && !!roleData,
  });
}
