/**
 * Geo-aware flight route discovery.
 *
 * Extracted from the (now retired) PopularRoutes section so the landing page
 * has ONE route-data source instead of its own hardcoded array.
 *
 * ── Price honesty ─────────────────────────────────────────────────────────
 * `get-popular-directions` proxies Travelpayouts /v1/city-directions, which
 * returns previously-found fares carrying an `expires_at` — cached/indicative,
 * never a live quote, and round-trip when the entry has a return date. So:
 *
 *   - a price is rendered ONLY when the API returned a positive number AND a
 *     currency code we can format;
 *   - the currency comes from the API response, never from the visitor's
 *     region, so a USD result is never labelled AUD;
 *   - failures produce NO price. There is no fallback number, and nothing
 *     hash- or seed-derived. Callers show the route without a price.
 *
 * Fallback routes are claim-safe static suggestions: they carry no price and
 * are flagged `isFallback` so the UI never calls them popular or trending.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getFunctionUrl } from "@/lib/supabaseConfig";

export interface DiscoveredRoute {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  /** Genuine API price, or null when none was returned. Never fabricated. */
  price: number | null;
  /** ISO code from the API response, or null. Never inferred from geo. */
  currency: string | null;
}

export interface RouteDiscovery {
  routes: DiscoveredRoute[];
  loading: boolean;
  /** True when showing static suggestions rather than API-derived routes. */
  isFallback: boolean;
  /** Origin the suggestions were built from, for honest subheading copy. */
  originName: string | null;
}

const IATA_RE = /^[A-Z]{3}$/;

/** Accept a route only when both endpoints are real, distinct IATA codes. */
export function isValidRoute(route: {
  origin?: unknown;
  destination?: unknown;
}): boolean {
  const { origin, destination } = route;
  if (typeof origin !== "string" || typeof destination !== "string") return false;
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  return IATA_RE.test(o) && IATA_RE.test(d) && o !== d;
}

/**
 * A price is usable only if it is a positive finite number AND we have a
 * currency to label it with. Anything else yields null on both fields.
 */
export function normalisePrice(
  price: unknown,
  currency: unknown,
): { price: number | null; currency: string | null } {
  const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  const valid = /^[A-Z]{3}$/.test(code);
  if (!valid) return { price: null, currency: null };
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return { price: null, currency: null };
  }
  return { price, currency: code };
}

/** Validate, de-duplicate and cap a raw route list. Order is preserved. */
export function selectRoutes(raw: unknown, currency: unknown, limit: number): DiscoveredRoute[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: DiscoveredRoute[] = [];

  for (const r of raw) {
    if (!r || !isValidRoute(r)) continue;
    const origin = String(r.origin).toUpperCase();
    const destination = String(r.destination).toUpperCase();
    const key = `${origin}-${destination}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const { price, currency: code } = normalisePrice(r.price, currency);
    out.push({
      origin,
      destination,
      originName: typeof r.originName === "string" && r.originName ? r.originName : origin,
      destinationName:
        typeof r.destinationName === "string" && r.destinationName ? r.destinationName : destination,
      price,
      currency: code,
    });
    if (out.length >= limit) break;
  }

  return out;
}

/**
 * Format a price using the API's own currency — never the visitor's region, and
 * never an FX conversion.
 *
 * `normalisePrice` has already guaranteed a well-formed 3-letter code, so Intl
 * renders a real symbol when it knows one (AUD -> "A$219") and otherwise prints
 * the ISO code itself ("ZZZ 219"). Both are honest; neither invents a symbol.
 * The catch remains as a guard against a future caller passing a malformed code.
 */
export function formatIndicativePrice(price: number | null, currency: string | null): string | null {
  if (price === null || !currency) return null;
  try {
    /*
     * Formatted with a fixed en-GB locale rather than the viewer's.
     *
     * Under a viewer's own locale Intl drops the disambiguating prefix for the
     * local currency — an AUD fare shows to an Australian as a bare "$129",
     * which is correct but ambiguous on a site that quotes many currencies.
     * en-GB always qualifies the symbol (A$129, US$129, £129, €129, ₹129), so
     * the currency being quoted is unmistakable wherever the page is read.
     */
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return null;
  }
}

/** The parts of useGeoLocation's regionConfig this hook depends on. */
interface RegionConfigShape {
  defaultOrigin: string;
  defaultOriginName: string;
  currency: string;
  popularRoutes: {
    origin: string;
    originName: string;
    destination: string;
    destinationName: string;
  }[];
}

export interface UseRouteDiscoveryOptions {
  /** Origin already chosen by the user (e.g. URL prefill) — wins over geo. */
  preferredOrigin?: string;
  /** Maximum routes to return. Discovery, not a directory. */
  limit?: number;
}

export function useRouteDiscovery({
  preferredOrigin,
  limit = 8,
}: UseRouteDiscoveryOptions = {}): RouteDiscovery {
  /*
   * `regionConfig` is always present from the real hook, but this section must
   * never be the reason /flights fails to render, so every read is guarded.
   */
  const geo = useGeoLocation() ?? {};
  const { geoData, loading: geoLoading } = geo as {
    geoData?: { defaultOrigin?: string; defaultOriginName?: string } | null;
    loading?: boolean;
  };
  const regionConfig = (geo as { regionConfig?: Partial<RegionConfigShape> }).regionConfig ?? {};
  const [routes, setRoutes] = useState<DiscoveredRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  /** Guards against a slow response for a previous origin overwriting a newer one. */
  const requestId = useRef(0);

  const origin = useMemo(() => {
    const candidate = preferredOrigin?.toUpperCase();
    if (candidate && IATA_RE.test(candidate)) return candidate;
    return geoData?.defaultOrigin || regionConfig.defaultOrigin || null;
  }, [preferredOrigin, geoData?.defaultOrigin, regionConfig.defaultOrigin]);

  /*
   * Name the origin the RESULTS actually share, not the one we asked for.
   *
   * Naming the requested origin produced a false claim whenever the feed
   * answered with routes from somewhere else ("Suggested routes from London"
   * above a list of SYD departures). Returning null unless every route shares
   * one origin means the UI can only make the claim when it is true.
   */
  const originName = useMemo(() => {
    if (routes.length === 0) return null;
    const first = routes[0];
    if (!routes.every((r) => r.origin === first.origin)) return null;
    return first.originName || first.origin;
  }, [routes]);

  /** Claim-safe static suggestions — one explicit source, never priced. */
  const fallbackRoutes = useMemo<DiscoveredRoute[]>(
    () =>
      selectRoutes(
        (regionConfig.popularRoutes ?? []).map((r) => ({ ...r, price: null })),
        "XXX", // deliberately unusable so no price survives
        limit,
      ).map((r) => ({ ...r, price: null, currency: null })),
    [regionConfig.popularRoutes, limit],
  );

  useEffect(() => {
    // Don't render anything route-shaped until geo has settled.
    if (geoLoading) return;

    if (!origin) {
      setRoutes(fallbackRoutes);
      setIsFallback(true);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    const controller = new AbortController();
    let cancelled = false;

    const useFallback = () => {
      if (cancelled || id !== requestId.current) return;
      setRoutes(fallbackRoutes);
      setIsFallback(true);
      setLoading(false);
    };

    const run = async () => {
      setLoading(true);
      const url = getFunctionUrl("get-popular-directions");
      if (!url) {
        useFallback();
        return;
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, currency: regionConfig.currency, limit: limit * 2 }),
          signal: controller.signal,
        });

        if (!response.ok) {
          useFallback();
          return;
        }

        const data = await response.json();
        // Currency is taken from the response, not from the request or geo.
        const selected = selectRoutes(data?.routes, data?.currency, limit);

        if (cancelled || id !== requestId.current) return;

        if (selected.length === 0) {
          useFallback();
          return;
        }

        setRoutes(selected);
        setIsFallback(false);
        setLoading(false);
      } catch {
        // Aborted requests must not flip the UI into the fallback state.
        if (controller.signal.aborted) return;
        useFallback();
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [geoLoading, origin, regionConfig.currency, fallbackRoutes, limit]);

  return { routes, loading, isFallback, originName };
}
