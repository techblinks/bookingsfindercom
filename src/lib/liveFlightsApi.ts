/**
 * BF-FLIGHTS-LIVE-4 Phase C/D — frontend client for the two live-flight
 * edge functions. This is the ONLY place the frontend knows the network
 * shape of search-live-flights / get-live-flight-booking-options; every
 * caller (useLiveFlightSearch, LiveFlightsSection) only ever sees the
 * BookingsFinder-owned types from src/types/liveFlights.ts.
 *
 * Never calls SerpApi directly — always goes through BookingsFinder's own
 * Supabase Edge Functions, which hold SERPAPI_API_KEY server-side only.
 *
 * Mirrors the existing fetch pattern in useFlightSearch.ts (session token +
 * publishable key headers, AbortController timeout).
 */
import { supabase } from "@/integrations/supabase/client";
import { getFunctionUrl } from "@/lib/supabaseConfig";
import type {
  LiveFlightBookingOptionsResult,
  LiveFlightSearchRequest,
  LiveFlightSearchResult,
} from "@/types/liveFlights";

/** Client-side bound, slightly above the server's own SerpApi timeout (20s) so the server's truthful timeout response wins first in the common case. */
const REQUEST_TIMEOUT_MS = 25_000;

const UNAVAILABLE_RESULT: LiveFlightSearchResult = {
  status: "unavailable",
  itineraries: [],
  currency: "",
  searchedAt: new Date(0).toISOString(),
  errorMessage: "Live flight search is temporarily unavailable. Please try again.",
};

async function callLiveFlightFunction<T>(functionName: string, body: unknown): Promise<
  { ok: true; data: T } | { ok: false; status: number; message: string }
> {
  const url = getFunctionUrl(functionName);
  if (!url) {
    return { ok: false, status: 0, message: "Live flight search is not configured." };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const session = (await supabase.auth.getSession()).data.session;
    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Server-side error text is already a safe, pre-approved message
      // (see search-live-flights/index.ts) — never the raw upstream text.
      return { ok: false, status: response.status, message: data?.error || "Request failed" };
    }

    return { ok: true, data: data as T };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, status: 0, message: "Live flight search timed out." };
    }
    return { ok: false, status: 0, message: "Live flight search is temporarily unavailable." };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Step 1 (initial search) or step 2 (return-leg lookup, when request
 * includes departureToken — Phase H). Never throws: a failure is
 * represented truthfully as status "unavailable", distinct from a genuine
 * empty result ("no_results") — see Phase S.
 */
/** Guards against a malformed/unexpected 200 body (wrong endpoint, stale mock, provider contract drift) — never trust an unrecognized shape as "ok". */
function isWellFormedSearchResult(data: unknown): data is LiveFlightSearchResult {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<LiveFlightSearchResult>;
  return (d.status === "ok" || d.status === "no_results") && Array.isArray(d.itineraries);
}

function isWellFormedBookingOptionsResult(data: unknown): data is LiveFlightBookingOptionsResult {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<LiveFlightBookingOptionsResult>;
  return d.status === "ok" && Array.isArray(d.options);
}

export async function searchLiveFlights(request: LiveFlightSearchRequest): Promise<LiveFlightSearchResult> {
  const result = await callLiveFlightFunction<LiveFlightSearchResult>("search-live-flights", request);
  if (!result.ok) {
    return { ...UNAVAILABLE_RESULT, currency: request.currency, errorMessage: result.message };
  }
  if (!isWellFormedSearchResult(result.data)) {
    return { ...UNAVAILABLE_RESULT, currency: request.currency };
  }
  return result.data;
}

export async function getLiveFlightBookingOptions(
  request: LiveFlightSearchRequest & { bookingToken: string },
): Promise<LiveFlightBookingOptionsResult> {
  const result = await callLiveFlightFunction<LiveFlightBookingOptionsResult>(
    "get-live-flight-booking-options",
    request,
  );
  if (!result.ok) {
    return { status: "unavailable", options: [], errorMessage: result.message };
  }
  if (!isWellFormedBookingOptionsResult(result.data)) {
    return { status: "unavailable", options: [] };
  }
  return result.data;
}
