/**
 * Tiqets service layer — calls the tiqets-catalog Edge Function through
 * the Supabase client. Never calls api.tiqets.com directly from the browser.
 * Never references TIQETS_API_TOKEN.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  TiqetsSearchFilters,
  TiqetsHealthRequest,
  TiqetsHealthResponse,
  TiqetsProductsRequest,
  TiqetsProductsResponse,
  TiqetsErrorResponse,
  TiqetsCallError,
} from "@/types/tiqets";

const FUNCTION_NAME = "tiqets-catalog";

async function invokeTiqets<T>(body: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw callError("auth", "Not authenticated");
  }

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (error) {
    // Check for specific HTTP status via the supabase FunctionsError
    const status = (error as unknown as { status?: number })?.status;
    const context = (error as unknown as { context?: unknown })?.context;

    if (status === 401) throw callError("auth", "Authentication failed");
    if (status === 403) throw callError("authorization", "Admin role required");
    if (status === 429) throw callError("rate_limit", "Rate limited", status, extractRetry(context));
    if (status === 504) throw callError("network", "Upstream timeout", status);
    if (status && status >= 500) throw callError("upstream", "Upstream error", status);

    // Fallback: parse the error response body if available
    const body = context as TiqetsErrorResponse | undefined;
    if (body?.error) {
      throw callError("upstream", body.error, status, body.retryAfterSec ?? undefined);
    }
    throw callError("unknown", error.message || "Unknown error", status);
  }

  // data is typed as the raw response — no 'any' in the public API
  return data as unknown as T;
}

function extractRetry(context: unknown): number | undefined {
  if (context && typeof context === "object" && "retryAfterSec" in context) {
    const r = (context as Record<string, unknown>).retryAfterSec;
    if (typeof r === "number") return r;
  }
  return undefined;
}

function callError(
  type: TiqetsCallError["type"],
  message: string,
  status?: number,
  retryAfterSec?: number
): TiqetsCallError {
  return { type, message, status, retryAfterSec };
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export async function fetchTiqetsHealth(): Promise<TiqetsHealthResponse> {
  const body: TiqetsHealthRequest = { action: "health" };
  return invokeTiqets<TiqetsHealthResponse>(body);
}

export async function fetchTiqetsProducts(
  req: Omit<TiqetsProductsRequest, "action">
): Promise<TiqetsProductsResponse> {
  const body: TiqetsProductsRequest = { action: "products", ...req };
  return invokeTiqets<TiqetsProductsResponse>(body);
}

export async function fetchTiqetsSearch(
  filters: TiqetsSearchFilters
): Promise<TiqetsProductsResponse> {
  const body = { action: "search" as const, ...filters };
  return invokeTiqets<TiqetsProductsResponse>(body);
}
