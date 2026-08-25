/**
 * Friendly location label resolution for flight-search prefill.
 *
 * BF1-C STATUS: KEEP TEMPORARILY. The source of truth for airport/metro/city
 * resolution is now src/lib/airportResolution.ts over the BF1-B reference
 * tables. This map remains ONLY as a synchronous display-label fallback for
 * prefill in ModernFlightSearch/MobileFlightSearch; it never fabricates codes
 * (unknown codes render as themselves) and must not gain new consumers.
 * Migrating its consumers to async resolver labels is deferred to avoid
 * churning two large search components within BF1-C scope.
 *
 * Explore-route cards and URL params carry IATA airport codes — and
 * occasionally Travelpayouts "city codes": metropolitan-area codes such as MOW
 * (Moscow) or TYO (Tokyo) that are not real airport codes. The airport
 * autocomplete feed knows SVO/DME for Moscow but not MOW, so this module keeps
 * a small curated map of the common city codes alongside the compact airport
 * map the flight landing page already used for headings.
 *
 * Resolution is graceful: a syntactically valid code that is not in the map is
 * rendered as itself — never rejected, never guessed, never converted.
 */

const IATA_RE = /^[A-Z]{3}$/;

/**
 * Compact airport/city code → friendly city name map.
 *
 * The airport entries mirror the existing small KNOWN_AIRPORTS map used for
 * landing-page headings; the city-code entries (MOW, TYO, PAR, LON, NYC, …)
 * cover the metropolitan codes Travelpayouts can return. This is deliberately
 * NOT an exhaustive airport database — unknown valid codes fall back to the
 * code itself.
 */
export const LOCATION_LABELS: Record<string, string> = {
  // Oceania
  BNE: "Brisbane", SYD: "Sydney", MEL: "Melbourne", PER: "Perth",
  ADL: "Adelaide", OOL: "Gold Coast", CNS: "Cairns", HBA: "Hobart",
  AKL: "Auckland", CHC: "Christchurch", WLG: "Wellington", NAN: "Nadi",
  // North America
  JFK: "New York", LAX: "Los Angeles", SFO: "San Francisco",
  ORD: "Chicago", MIA: "Miami", BOS: "Boston", ATL: "Atlanta",
  DFW: "Dallas", DEN: "Denver", SEA: "Seattle", LAS: "Las Vegas",
  YYZ: "Toronto", YVR: "Vancouver", MEX: "Mexico City", HNL: "Honolulu",
  CUN: "Cancun",
  // Europe
  LHR: "London", LGW: "London", STN: "London", LTN: "London",
  CDG: "Paris", FRA: "Frankfurt", AMS: "Amsterdam",
  MAD: "Madrid", BCN: "Barcelona", FCO: "Rome", IST: "Istanbul",
  MUC: "Munich", ZRH: "Zurich", VIE: "Vienna", PRG: "Prague",
  BUD: "Budapest", WAW: "Warsaw", ATH: "Athens", CPH: "Copenhagen",
  ARN: "Stockholm", HEL: "Helsinki", DUB: "Dublin", BRU: "Brussels",
  LIS: "Lisbon", MAN: "Manchester", EDI: "Edinburgh",
  // Middle East
  DXB: "Dubai", AUH: "Abu Dhabi", DOH: "Doha",
  // Asia
  SIN: "Singapore", HKG: "Hong Kong", NRT: "Tokyo", HND: "Tokyo",
  ICN: "Seoul", DEL: "New Delhi", BOM: "Mumbai", KTM: "Kathmandu",
  BKK: "Bangkok", KUL: "Kuala Lumpur", CGK: "Jakarta", MNL: "Manila",
  TPE: "Taipei", PVG: "Shanghai", PEK: "Beijing", MLE: "Male",
  // Africa
  JNB: "Johannesburg", CPT: "Cape Town", CAI: "Cairo", NBO: "Nairobi",
  // South America
  GRU: "São Paulo", EZE: "Buenos Aires", SCL: "Santiago",
  // Travelpayouts city codes (metropolitan areas, not single airports)
  MOW: "Moscow", TYO: "Tokyo", OSA: "Osaka", PAR: "Paris",
  LON: "London", NYC: "New York", WAS: "Washington", SEL: "Seoul",
  ROM: "Rome", MIL: "Milan", BER: "Berlin", STO: "Stockholm",
  BUE: "Buenos Aires", SAO: "São Paulo", RIO: "Rio de Janeiro",
};

/**
 * Resolve a location code to a friendly city name.
 *
 * Returns null for empty/malformed input and for valid codes with no known
 * label — callers then show the raw code rather than failing.
 */
export function resolveLocationLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (!IATA_RE.test(c)) return null;
  return LOCATION_LABELS[c] ?? null;
}

/**
 * Build the display string used by the desktop combobox input: "City (CODE)"
 * when the code can be resolved, otherwise the raw code. Never throws.
 */
export function resolveLocationDisplay(code: string | null | undefined): string {
  if (!code) return "";
  const c = code.trim().toUpperCase();
  if (!IATA_RE.test(c)) return code.trim();
  const label = LOCATION_LABELS[c];
  return label ? `${label} (${c})` : c;
}
