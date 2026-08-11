/**
 * Viator service layer — calls viator-catalog Edge Function.
 * Never calls api.sandbox.viator.com directly. Never references VIATOR_API_KEY.
 */
import { supabase } from "@/integrations/supabase/client";
import { FUNCTION_NAME } from "@/types/viator";
import type {
  ViatorHealthRequest,
  ViatorHealthResponse,
  ViatorCallError,
} from "@/types/viator";

async function invokeViator<T>(body: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw callError("auth", "Not authenticated");

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    const status = (error as unknown as { status?: number })?.status;
    const ctx = (error as unknown as { context?: unknown })?.context;
    if (status === 401) throw callError("auth", "Authentication failed");
    if (status === 403) throw callError("forbidden", "Admin role required");
    if (status === 429) throw callError("rate_limit", "Rate limited", status);
    if (status === 504) throw callError("timeout", "Upstream timeout", status);
    if (status === 503) throw callError("unavailable", "Service unavailable", status);
    if (status && status >= 500) throw callError("upstream", "Upstream error", status);
    const body = ctx as { error?: string };
    if (body?.error) throw callError("upstream", body.error, status);
    throw callError("unknown", error.message || "Unknown error", status);
  }

  return data as unknown as T;
}

function callError(
  type: ViatorCallError["type"],
  message: string,
  status?: number
): ViatorCallError {
  return { type, message, status };
}

export async function fetchViatorHealth(): Promise<ViatorHealthResponse> {
  const body: ViatorHealthRequest = { action: "health" };
  return invokeViator<ViatorHealthResponse>(body);
}
