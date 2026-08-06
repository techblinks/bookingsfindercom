/**
 * Shared Tiqets API client.
 *
 * Server-side only — never import in frontend code.
 * Reads TIQETS_API_TOKEN from Deno.env.
 * Uses the official Tiqets Distributor API v2.
 *
 * Authentication: Authorization: Token <TIQETS_API_TOKEN>
 * Base URL: https://api.tiqets.com/v2 (overridable via TIQETS_API_BASE_URL)
 */

const DEFAULT_BASE_URL = "https://api.tiqets.com/v2";
const UPSTREAM_TIMEOUT_MS = 8_000;

export interface TiqetsClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export interface TiqetsError {
  type: "auth" | "not_found" | "rate_limit" | "upstream" | "timeout" | "parse" | "config";
  status?: number;
  message: string;
  upstreamRequestId?: string;
  retryAfterSec?: number;
}

export interface TiqetsRequestContext {
  endpoint: string;
  params?: URLSearchParams;
}

export interface TiqetsResponse<T> {
  data: T;
  status: number;
  upstreamRequestId?: string;
  responseTimeMs: number;
}

/**
 * Centralised Tiqets HTTP client. Never logs tokens or authorization headers.
 */
export async function tiqetsRequest<T>(
  ctx: TiqetsRequestContext,
  options: TiqetsClientOptions = {}
): Promise<TiqetsResponse<T>> {
  const token = Deno.env.get("TIQETS_API_TOKEN");
  if (!token) {
    throw tiqetsError("config", "TIQETS_API_TOKEN is not configured");
  }

  const baseUrl = Deno.env.get("TIQETS_API_BASE_URL") || DEFAULT_BASE_URL;
  if (!baseUrl.startsWith("https://api.tiqets.com")) {
    throw tiqetsError("config", "TIQETS_API_BASE_URL must be on api.tiqets.com");
  }

  const url = new URL(`${baseUrl}${ctx.endpoint}`);
  if (ctx.params) {
    url.search = ctx.params.toString();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? UPSTREAM_TIMEOUT_MS);

  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Token ${token}`,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    const name = (e as Error)?.name || "";
    if (name === "AbortError" || name === "TimeoutError") {
      throw tiqetsError("timeout", `Tiqets request timed out after ${options.timeoutMs ?? UPSTREAM_TIMEOUT_MS}ms`);
    }
    throw tiqetsError("upstream", `Tiqets request failed: ${(e as Error).message}`);
  }
  clearTimeout(timer);

  const elapsed = Math.round(performance.now() - started);
  const requestId = response.headers.get("x-request-id") || response.headers.get("x-tiqets-request-id") || undefined;
  const retryAfter = response.headers.get("retry-after");

  // 401 / 403
  if (response.status === 401 || response.status === 403) {
    throw tiqetsError("auth", `Tiqets authentication failed (${response.status})`, response.status, requestId);
  }

  // 404
  if (response.status === 404) {
    throw tiqetsError("not_found", "Tiqets resource not found", 404, requestId);
  }

  // 429
  if (response.status === 429) {
    const sec = retryAfter ? parseInt(retryAfter, 10) : undefined;
    throw tiqetsError("rate_limit", "Tiqets rate limit exceeded", 429, requestId, sec || undefined);
  }

  // 5xx
  if (response.status >= 500) {
    throw tiqetsError("upstream", `Tiqets server error (${response.status})`, response.status, requestId);
  }

  // Parse JSON
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw tiqetsError("parse", "Tiqets response is not valid JSON", response.status, requestId);
  }

  return {
    data: body as T,
    status: response.status,
    upstreamRequestId: requestId,
    responseTimeMs: elapsed,
  };
}

function tiqetsError(
  type: TiqetsError["type"],
  message: string,
  status?: number,
  upstreamRequestId?: string,
  retryAfterSec?: number
): TiqetsError {
  // Log safely — never include the token or authorization header
  console.error(`[tiqets] ${type} error: ${message}${upstreamRequestId ? ` [req=${upstreamRequestId}]` : ""}`);
  return { type, message, status, upstreamRequestId, retryAfterSec };
}

/**
 * Quick connectivity check by requesting the first page of products
 * with minimal fields. Used by the admin health endpoint.
 */
export async function tiqetsHealthCheck(): Promise<{
  connected: boolean;
  upstreamStatus: number | null;
  responseTimeMs: number;
  upstreamRequestId?: string;
}> {
  const t0 = performance.now();
  try {
    const res = await tiqetsRequest<unknown>({
      endpoint: "/products",
      params: new URLSearchParams({ page_size: "1", lang: "en" }),
    });
    return {
      connected: true,
      upstreamStatus: res.status,
      responseTimeMs: res.responseTimeMs,
      upstreamRequestId: res.upstreamRequestId,
    };
  } catch (e: unknown) {
    const err = e as TiqetsError;
    return {
      connected: false,
      upstreamStatus: err.status || null,
      responseTimeMs: Math.round(performance.now() - t0),
      upstreamRequestId: err.upstreamRequestId,
    };
  }
}
