/**
 * BookingsFinder Analytics Service
 * Phase 6A — Analytics Foundation
 *
 * Fire-and-forget event logging. Failures never break the user experience.
 * Uses the same supabase client and pattern as existing trackAffiliateEvent.
 */

import { supabase } from "@/integrations/supabase/client";
import { isApprovedOutboundHost } from "@/lib/travelConfig";

// ── Types ────────────────────────────────────────────────────────

export interface SearchEventPayload {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabinClass?: string;
  tripType?: "oneway" | "roundtrip" | "multi";
  currency?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ClickEventPayload {
  searchEventId?: string;
  partner: string;
  partnerType: "flight" | "hotel";
  route?: string;
  airline?: string;
  price?: number;
  currency?: string;
  whiteLabelUsed?: boolean;
  fallbackUsed?: boolean;
  outboundHost?: string;
  landingPage?: string;
}

export interface DashboardSummary {
  searchesToday: number;
  clicksToday: number;
  ctr: number;
  topRoutes: Array<{ route: string; count: number }>;
  topDestinations: Array<{ destination: string; count: number }>;
  recentSearches: SearchEventRow[];
  recentClicks: ClickEventRow[];
}

export interface SearchEventRow {
  id: string;
  created_at: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  cabin_class: string;
  device: string;
}

export interface ClickEventRow {
  id: string;
  created_at: string;
  partner: string;
  partner_type: string;
  route: string;
  price: number;
  white_label_used: boolean;
  fallback_used: boolean;
}

export interface TopRoute {
  route: string;
  count: number;
}

export interface TopDestination {
  destination: string;
  count: number;
}

export interface DailyMetric {
  date: string;
  total_searches: number;
  total_clicks: number;
  flight_searches: number;
  hotel_searches: number;
  flight_clicks: number;
  hotel_clicks: number;
  white_label_clicks: number;
  fallback_clicks: number;
  ctr: number;
}


export interface KPIData {
  totalSearches: number;
  totalClicks: number;
  flightSearches: number;
  hotelSearches: number;
  flightClicks: number;
  hotelClicks: number;
  wlClicks: number;
  fallbackClicks: number;
  avgClickedFare: number;
  dominantCurrency: string;
  currencies: string;
  mixedCurrency: boolean;
  ctr: number;
}

export interface RouteRow {
  origin: string;
  destination: string;
  searches: number;
  clicks: number;
  ctr: number;
  avgPrice: number;
  topPartner: string;
}

export interface DestinationRow {
  destination: string;
  searches: number;
  clicks: number;
  ctr: number;
}

export interface PartnerRow {
  partner: string;
  partnerType: string;
  clicks: number;
  clickShare: number;
  avgPrice: number;
  wlClicks: number;
  fallbackClicks: number;
}

export interface AirlineRow {
  airline: string;
  clicks: number;
  avgPrice: number;
  topRoute: string;
}

export interface LandingPageRow {
  landingPage: string;
  searches: number;
  clicks: number;
  ctr: number;
}

export interface TrafficSourceRow {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  searches: number;
}

export interface WLVsFallbackData {
  whiteLabelClicks: number;
  fallbackClicks: number;
  totalClicks: number;
  wlPercentage: number;
  fbPercentage: number;
  wlTopRoutes: Array<{ route: string; clicks: number }>;
  fbTopRoutes: Array<{ route: string; clicks: number }>;
}

export interface DailyTrendRow {
  day: string;
  searches: number;
  clicks: number;
  ctr: number;
  wlClicks: number;
  fbClicks: number;
}

// ── Session helpers ──────────────────────────────────────────────

function getSessionId(): string {
  let sid = sessionStorage.getItem("bf_analytics_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("bf_analytics_sid", sid);
  }
  return sid;
}

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

function getCurrentPath(): string | null {
  return typeof window !== "undefined" ? window.location.pathname : null;
}

function getReferrer(): string | null {
  return typeof document !== "undefined" ? document.referrer || null : null;
}

function getUtmParams(): { source: string | null; medium: string | null; campaign: string | null } {
  if (typeof window === "undefined") return { source: null, medium: null, campaign: null };
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
  };
}

// ── Logging functions (fire-and-forget) ──────────────────────────

/**
 * Log a flight or hotel search event.
 * Fire-and-forget — never throws, never blocks the user.
 * Returns the search event ID for linking click events.
 */
export async function logSearch(payload: SearchEventPayload): Promise<string | null> {
  try {
    const utm = getUtmParams();
    const { data, error } = await supabase
      .from("search_events")
      .insert({
        session_id: getSessionId(),
        origin: payload.origin?.toUpperCase() ?? null,
        destination: payload.destination?.toUpperCase() ?? null,
        departure_date: payload.departureDate || null,
        return_date: payload.returnDate || null,
        adults: payload.adults ?? null,
        children: payload.children ?? null,
        infants: payload.infants ?? null,
        cabin_class: payload.cabinClass ?? null,
        trip_type: payload.tripType ?? "oneway",
        currency: payload.currency ?? "AUD",
        device: getDevice(),
        landing_page: payload.landingPage || getCurrentPath(),
        referrer: getReferrer(),
        utm_source: payload.utmSource ?? utm.source,
        utm_medium: payload.utmMedium ?? utm.medium,
        utm_campaign: payload.utmCampaign ?? utm.campaign,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[analytics] search event insert failed:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.warn("[analytics] logSearch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Log a hotel search event. Convenience wrapper around logSearch.
 */
export async function logHotelSearch(payload: {
  destination: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  currency?: string;
}): Promise<string | null> {
  return logSearch({
    destination: payload.destination,
    departureDate: payload.checkIn,
    returnDate: payload.checkOut,
    adults: payload.guests ?? 1,
    landingPage: "/hotels",
    currency: payload.currency,
  });
}

/**
 * Log an affiliate click event (View Deal).
 * Fire-and-forget — never throws, never blocks navigation.
 */
export async function logAffiliateClick(payload: ClickEventPayload): Promise<void> {
  try {
    const { error } = await supabase.from("click_events").insert({
      session_id: getSessionId(),
      search_event_id: payload.searchEventId ?? null,
      partner: payload.partner,
      partner_type: payload.partnerType,
      route: payload.route ?? null,
      airline: payload.airline ?? null,
      price: payload.price ?? null,
      currency: payload.currency ?? "AUD",
      white_label_used: payload.whiteLabelUsed ?? false,
      fallback_used: payload.fallbackUsed ?? false,
      // Phase 6A v2: Sanitise outbound_host — only store approved hostnames
      outbound_host: payload.outboundHost && isApprovedOutboundHost(payload.outboundHost, payload.partnerType)
        ? payload.outboundHost
        : null,
      landing_page: payload.landingPage || getCurrentPath(),
      device: getDevice(),
    });

    if (error) {
      console.warn("[analytics] click event insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[analytics] logAffiliateClick failed:", err instanceof Error ? err.message : err);
  }
}

// ── Dashboard queries (admin, authenticated) ─────────────────────

async function requireAdmin(): Promise<void> {
  if (!_adminCheckPromise) {
    _adminCheckPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (roleError || !roleData) throw new Error("Admin access required");
    })();
  }
  return _adminCheckPromise;
}

let _adminCheckPromise: Promise<void> | null = null;
export function resetAdminCheck(): void { _adminCheckPromise = null; }

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

let _generation = 0;
export function nextGeneration(): number { return ++_generation; }
function isCurrentGeneration(gen: number): boolean { return gen === _generation; }


/**
 * Get dashboard summary: today's counts, CTR, top routes, recent activity.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  await requireAdmin();

  const today = new Date().toISOString().split("T")[0];

  const [
    searchesRes,
    clicksRes,
    topRoutesRes,
    topDestRes,
    recentSearchesRes,
    recentClicksRes,
  ] = await Promise.all([
    supabase.from("search_events").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("click_events").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("search_events").select("origin, destination").gte("created_at", today).order("created_at", { ascending: false }).limit(200),
    supabase.from("search_events").select("destination").gte("created_at", today).order("created_at", { ascending: false }).limit(200),
    supabase.from("search_events").select("id,created_at,origin,destination,departure_date,return_date,cabin_class,device").order("created_at", { ascending: false }).limit(10),
    supabase.from("click_events").select("id,created_at,partner,partner_type,route,price,white_label_used,fallback_used").order("created_at", { ascending: false }).limit(10),
  ]);

  const searchesToday = searchesRes.count ?? 0;
  const clicksToday = clicksRes.count ?? 0;

  // Compute top routes
  const routeMap = new Map<string, number>();
  (topRoutesRes.data || []).forEach((r: { origin?: string; destination?: string }) => {
    if (r.origin && r.destination) {
      const key = r.origin + "-" + r.destination;
      routeMap.set(key, (routeMap.get(key) || 0) + 1);
    }
  });
  const topRoutes: TopRoute[] = Array.from(routeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));

  // Compute top destinations
  const destMap = new Map<string, number>();
  (topDestRes.data || []).forEach((r: { destination?: string }) => {
    if (r.destination) {
      destMap.set(r.destination, (destMap.get(r.destination) || 0) + 1);
    }
  });
  const topDestinations: TopDestination[] = Array.from(destMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([destination, count]) => ({ destination, count }));

  return {
    searchesToday,
    clicksToday,
    ctr: searchesToday > 0 ? Math.round((clicksToday / searchesToday) * 10000) / 100 : 0,
    topRoutes,
    topDestinations,
    recentSearches: (recentSearchesRes.data || []) as SearchEventRow[],
    recentClicks: (recentClicksRes.data || []) as ClickEventRow[],
  };
}

/**
 * Get top routes for a date range.
 */
export async function getTopRoutes(days = 7): Promise<TopRoute[]> {
  await requireAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("search_events")
    .select("origin, destination")
    .gte("created_at", since);

  if (error || !data) return [];

  const map = new Map<string, number>();
  for (const r of data as Array<{ origin?: string; destination?: string }>) {
    if (r.origin && r.destination) {
      const key = r.origin + "-" + r.destination;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));
}

/**
 * Get top destinations for a date range.
 */
export async function getTopDestinations(days = 7): Promise<TopDestination[]> {
  await requireAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("search_events")
    .select("destination")
    .gte("created_at", since);

  if (error || !data) return [];

  const map = new Map<string, number>();
  for (const r of data as Array<{ destination?: string }>) {
    if (r.destination) {
      map.set(r.destination, (map.get(r.destination) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([destination, count]) => ({ destination, count }));
}

/**
 * Get daily metrics from the pre-aggregated table.
 */
export async function getDailyMetrics(days = 30): Promise<DailyMetric[]> {
  await requireAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("*")
    .gte("date", since)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data as DailyMetric[];
}

// ── Phase 6B: RPC-backed dashboard queries ──────────────────────

function dateRange(from: string, to: string): { start: string; end: string } {
  return { start: new Date(from).toISOString(), end: new Date(to).toISOString() };
}

export async function fetchKPIs(from: string, to: string, gen?: number): Promise<KPIData | null> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_dashboard_kpis", {
    start_date: start,
    end_date: end,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  if (error || !data) {
    console.warn("[analytics] fetchKPIs failed:", error?.message);
    return null;
  }
  const d = data as Record<string, unknown>;
  const totalSearches = Number(d.total_searches ?? 0);
  const totalClicks = Number(d.total_clicks ?? 0);
  const mixed = d.mixed_currency === true;
  return {
    totalSearches,
    totalClicks,
    flightSearches: Number(d.flight_searches ?? 0),
    hotelSearches: Number(d.hotel_searches ?? 0),
    flightClicks: Number(d.flight_clicks ?? 0),
    hotelClicks: Number(d.hotel_clicks ?? 0),
    wlClicks: Number(d.wl_clicks ?? 0),
    fallbackClicks: Number(d.fallback_clicks ?? 0),
    avgClickedFare: mixed ? null : Number(d.avg_clicked_fare ?? 0),
    dominantCurrency: String(d.dominant_currency ?? "AUD"),
    currencies: String(d.currencies ?? ""),
    mixedCurrency: mixed,
    ctr: totalSearches > 0 ? Math.round((totalClicks / totalSearches) * 10000) / 100 : 0,
  };
}

export async function fetchTopRoutes(from: string, to: string, limit = 10, gen?: number): Promise<RouteRow[]> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_top_routes", {
    start_date: start, end_date: end, limit_rows: limit,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  return error || !data ? [] : (data as unknown as RouteRow[]);
}

export async function fetchTopDestinations(from: string, to: string, limit = 10, gen?: number): Promise<DestinationRow[]> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_top_destinations", {
    start_date: start, end_date: end, limit_rows: limit,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  return error || !data ? [] : (data as unknown as DestinationRow[]);
}

export async function fetchPartnerPerformance(from: string, to: string, gen?: number): Promise<PartnerRow[]> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_partner_performance", {
    start_date: start, end_date: end,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  return error || !data ? [] : (data as unknown as PartnerRow[]);
}

export async function fetchAirlinePerformance(from: string, to: string, limit = 10, gen?: number): Promise<AirlineRow[]> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_airline_performance", {
    start_date: start, end_date: end, limit_rows: limit,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  return error || !data ? [] : (data as unknown as AirlineRow[]);
}

export async function fetchLandingPagePerformance(from: string, to: string, gen?: number): Promise<LandingPageRow[]> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_landing_page_performance", {
    start_date: start, end_date: end,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  return error || !data ? [] : (data as unknown as LandingPageRow[]);
}

export async function fetchTrafficSources(from: string, to: string, gen?: number): Promise<TrafficSourceRow[]> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_traffic_sources", {
    start_date: start, end_date: end,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  return error || !data ? [] : (data as unknown as TrafficSourceRow[]);
}

export async function fetchWLvsFallback(from: string, to: string, gen?: number): Promise<WLVsFallbackData | null> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_wl_vs_fallback", {
    start_date: start, end_date: end,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  return {
    whiteLabelClicks: Number(d.white_label_clicks ?? 0),
    fallbackClicks: Number(d.fallback_clicks ?? 0),
    totalClicks: Number(d.total_clicks ?? 0),
    wlPercentage: Number(d.wl_percentage ?? 0),
    fbPercentage: Number(d.fb_percentage ?? 0),
    wlTopRoutes: (d.wl_top_routes as Array<{ route: string; clicks: number }>) || [],
    fbTopRoutes: (d.fb_top_routes as Array<{ route: string; clicks: number }>) || [],
  };
}

export async function fetchDailyTrends(from: string, to: string, gen?: number): Promise<DailyTrendRow[]> {
  const { start, end } = dateRange(from, to);
  const { data, error } = await withTimeout(supabase.rpc("get_daily_trends", {
    start_date: start, end_date: end,
  }), 15000);
  if (gen !== undefined && !isCurrentGeneration(gen)) throw new Error("Stale request");
  return error || !data ? [] : (data as unknown as DailyTrendRow[]);
}
