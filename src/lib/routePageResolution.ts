/**
 * routePageResolution.ts — BF1-C pure helpers for /flights/:slug pages.
 *
 * BF-0R trust rule, extended by BF1-C: a route slug is either backed by REAL
 * reference data (BF1-B tables via src/lib/airportResolution.ts) or by an
 * explicitly published seo_route_pages row — never by a fabricated IATA code.
 * The previous behaviour (`cityName.substring(0,3).toUpperCase()`) invented
 * codes like "WOL" for wollongong-to-paris and sent travellers searching for
 * airports that do not exist. That path is gone; unknown slugs fail closed to
 * an honest "route not supported" state instead.
 *
 * Pure functions only — no I/O — so the fail-closed decision is unit-testable.
 */

export interface ParsedRouteSlug {
  originCity: string;
  destinationCity: string;
  originSlug: string;
  destinationSlug: string;
}

/** Convert slug like "london-to-dubai" to route info. Null when not a route. */
export function parseRouteSlug(slug: string): ParsedRouteSlug | null {
  const toIndex = slug.indexOf("-to-");
  if (toIndex < 1 || toIndex + 4 >= slug.length - 0) return null;

  const originSlug = slug.substring(0, toIndex);
  const destinationSlug = slug.substring(toIndex + 4);
  if (!originSlug || !destinationSlug) return null;
  // Slugs are lowercase-hyphen words; anything else cannot name a city.
  if (!/^[a-z]+(-[a-z]+)*$/.test(originSlug) || !/^[a-z]+(-[a-z]+)*$/.test(destinationSlug)) {
    return null;
  }

  const capitalize = (s: string) =>
    s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return {
    originCity: capitalize(originSlug),
    destinationCity: capitalize(destinationSlug),
    originSlug,
    destinationSlug,
  };
}

export interface RouteSupportInput {
  /** IATA codes from the published seo_route_pages row, when present. */
  publishedOriginIata?: string | null;
  publishedDestinationIata?: string | null;
  /** Resolver outcomes for the slug city names (null = unresolved). */
  originResolution: { providerCode: string } | null;
  destinationResolution: { providerCode: string } | null;
}

export interface RouteSupportDecision {
  status: "ready" | "unsupported";
  originCode: string | null;
  destinationCode: string | null;
}

const VALID_IATA = /^[A-Z]{3}$/;

/**
 * Fail-closed decision: a search CTA may render ONLY when both endpoints carry
 * a real reference-backed (or published-row) IATA code. Anything else is
 * honestly unsupported — no invented codes, no half-working search button.
 */
export function describeRouteSupport(input: RouteSupportInput): RouteSupportDecision {
  const pick = (
    published: string | null | undefined,
    resolved: { providerCode: string } | null,
  ): string | null => {
    if (typeof published === "string" && VALID_IATA.test(published.toUpperCase())) {
      return published.toUpperCase();
    }
    if (resolved && VALID_IATA.test(resolved.providerCode)) return resolved.providerCode;
    return null;
  };

  const originCode = pick(input.publishedOriginIata, input.originResolution);
  const destinationCode = pick(input.publishedDestinationIata, input.destinationResolution);

  return originCode && destinationCode
    ? { status: "ready", originCode, destinationCode }
    : { status: "unsupported", originCode: originCode ?? null, destinationCode: destinationCode ?? null };
}
