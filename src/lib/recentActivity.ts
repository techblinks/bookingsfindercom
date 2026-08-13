/**
 * Recent Activity — versioned localStorage for the returning-user experience.
 *
 * Mobile V2 Phase 2A-1. DATA MODEL ONLY: this module has no UI, no callers
 * yet, and deliberately no imports at all.
 *
 * ── What this stores ──────────────────────────────────────────────────────
 * Committed travel-search intent, and nothing else:
 *
 *   flight  origin/destination IATA pair, optional explicit dates,
 *           travellers and cabin
 *   stay    destination, optional explicit check-in/check-out, guests, rooms
 *   things  city and an optional short query
 *
 * Entries are recorded only when a user COMMITS a search. Page views, focus,
 * typing, autocomplete selections and surface changes are not activity.
 *
 * ── What this does NOT store ──────────────────────────────────────────────
 * Prices, fares, affiliate or provider URLs, raw hrefs, email, user or session
 * identifiers, Supabase auth data, IP, latitude/longitude, referrers, Trip Cost
 * money fields, or free-form notes. Every entry is rebuilt field-by-field from
 * a known allowlist on the way in AND on the way out, so an unknown field can
 * never survive a round trip — including one written by a tampered store, which
 * is repaired on the next read.
 *
 * Parameters are stored, never URLs. Callers rebuild the destination URL at
 * render time; that keeps tracking parameters out of storage and lets the
 * restore rules change without a storage migration.
 *
 * ── Size ──────────────────────────────────────────────────────────────────
 * Every user-controlled string is bounded before it is persisted: display
 * labels at MAX_LABEL_LENGTH characters, things-to-do queries at
 * MAX_QUERY_LENGTH. Over-length values are truncated, not rejected — a long
 * city name is still a usable shortcut — and the dedupe key is derived from the
 * truncated text, so key and label can never describe different places. With
 * MAX_STORED_ITEMS entries the store cannot exceed roughly 4 KB.
 *
 * ── What this is NOT ──────────────────────────────────────────────────────
 * Not a trip. The current trip lives in `bf_trip_context` and the Trip Cost
 * draft lives in `bookingsfinder.trip-cost.draft.v1`; both remain separate
 * sources of truth and neither is read or written here. A later slice may
 * combine all three at a higher composition layer — which is why the selectors
 * below operate on supplied arrays rather than reaching into storage.
 *
 * Per-device only. No backend, no account sync, no cookies, no analytics.
 *
 * ── Date invariant ────────────────────────────────────────────────────────
 * A date is STORED when it was explicitly supplied and internally consistent:
 * a real YYYY-MM-DD calendar date, with returnDate >= departureDate and
 * checkOut > checkIn, and a closing date is dropped when its opening date is
 * missing. Nothing is ever fabricated, substituted or rewritten.
 *
 * A stored date is USABLE FOR RESTORE only while it has not fallen before the
 * local calendar date of `now`. Storage keeps the user's own dates verbatim
 * until the entry expires, but every function that hands an entry back —
 * loadRecentActivity, recordActivity, selectContinuationCandidate,
 * selectRecentItems — applies that same `now` test first. There is therefore no
 * path on which the store, the loader and the selectors disagree about whether
 * a date may be restored.
 *
 * ── Failure model ─────────────────────────────────────────────────────────
 * Reads never throw. Writes silently no-op. A malformed ENVELOPE (bad JSON,
 * wrong version, non-array items) discards the store; a malformed ITEM inside
 * a valid envelope is dropped on its own and every sibling is kept. The store
 * is a list, so one bad row must not destroy unrelated history.
 *
 * STORAGE KEY:      "bf_recent_activity"
 * CURRENT VERSION:  1
 *
 * Migration strategy for future versions:
 *   - Increment RECENT_ACTIVITY_VERSION when the entry schema changes
 *   - Add a migration path in readStoredEntries for the previous version
 *   - Unknown versions fail safely: the key is cleared and history restarts
 */

// ── Constants ──

export const RECENT_ACTIVITY_STORAGE_KEY = "bf_recent_activity";
export const RECENT_ACTIVITY_VERSION = 1;

/** Hard cap on persisted entries. */
export const MAX_STORED_ITEMS = 8;

/** Hard cap on entries a homepage surface may render. */
export const MAX_RECENT_ITEMS = 3;

/** Entries older than this are dropped on both load and record. */
export const RETENTION_DAYS = 30;

/** Things-to-do queries are trimmed and truncated to this many characters. */
export const MAX_QUERY_LENGTH = 40;

/** Cities, destinations and display labels are truncated to this many characters. */
export const MAX_LABEL_LENGTH = 100;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RETENTION_MS = RETENTION_DAYS * MS_PER_DAY;

/**
 * Tolerance for entries timestamped ahead of `now`. Device clocks drift and a
 * far-future timestamp would otherwise pin an entry to the top of the list
 * forever, so anything beyond this is treated as corrupt.
 */
const FUTURE_TIMESTAMP_TOLERANCE_MS = MS_PER_DAY;

/**
 * Whitespace collapsing runs before truncation, so a pathological input could
 * otherwise make us scan megabytes to produce 100 characters. Nothing legible
 * survives past this many raw characters, so cut there first.
 */
const RAW_INPUT_SCAN_LIMIT = 8;

const IATA_RE = /^[A-Z]{3}$/;
const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Unicode combining diacritical marks, removed after an NFD decomposition. */
const COMBINING_MARKS_RE = /[\u0300-\u036f]/g;

const CABIN_CLASSES = ["economy", "premium", "business", "first"] as const;

const MIN_GUESTS = 1;
const MAX_GUESTS = 20;
const MIN_ROOMS = 1;
const MAX_ROOMS = 10;

// ── Types ──

export type RecentActivityKind = "flight" | "stay" | "things";

export type CabinClass = (typeof CABIN_CLASSES)[number];

export interface ActivityTravellers {
  adults: number;
  children: number;
  infants: number;
}

interface RecentActivityBase {
  kind: RecentActivityKind;
  /** Stable dedupe key. Always recomputed from the payload, never trusted. */
  key: string;
  /**
   * Display label — the destination as the user saw it. Always derived from the
   * payload on rebuild, so it can never drift from the fields it describes.
   */
  label: string;
  /** ISO timestamp of the last meaningful interaction. Sorting and expiry only. */
  at: string;
}

export interface FlightActivity extends RecentActivityBase {
  kind: "flight";
  /** Uppercase IATA. */
  origin: string;
  /** Uppercase IATA, always distinct from origin. */
  destination: string;
  originLabel?: string;
  destinationLabel?: string;
  /** YYYY-MM-DD calendar date, only ever a date the user explicitly chose. */
  departureDate?: string;
  /** YYYY-MM-DD calendar date, never earlier than departureDate. */
  returnDate?: string;
  travellers?: ActivityTravellers;
  cabinClass?: CabinClass;
}

export interface StayActivity extends RecentActivityBase {
  kind: "stay";
  destination: string;
  /** YYYY-MM-DD calendar date. */
  checkIn?: string;
  /** YYYY-MM-DD calendar date, always later than checkIn. */
  checkOut?: string;
  guests?: number;
  rooms?: number;
}

export interface ThingsActivity extends RecentActivityBase {
  kind: "things";
  city: string;
  /** Trimmed and truncated to MAX_QUERY_LENGTH characters. */
  query?: string;
}

export type RecentActivityEntry = FlightActivity | StayActivity | ThingsActivity;

/** The persisted envelope. Internal: nothing outside should construct one. */
interface StoredRecentActivity {
  v: number;
  items: RecentActivityEntry[];
}

// ── Inputs ──

export interface FlightActivityInput {
  kind: "flight";
  origin: string;
  destination: string;
  originLabel?: string;
  destinationLabel?: string;
  departureDate?: string;
  returnDate?: string;
  travellers?: ActivityTravellers;
  cabinClass?: string;
}

export interface StayActivityInput {
  kind: "stay";
  destination: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
}

export interface ThingsActivityInput {
  kind: "things";
  city: string;
  query?: string;
}

export type RecentActivityInput =
  | FlightActivityInput
  | StayActivityInput
  | ThingsActivityInput;

/**
 * Narrowing helper for the one case the selectors care about. Stays and
 * things-to-do entries narrow perfectly well on `entry.kind`, so they need no
 * exported guard of their own.
 */
export function isFlightActivity(entry: RecentActivityEntry): entry is FlightActivity {
  return entry.kind === "flight";
}

// ── Small pure helpers ──

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Key normalisation: strip diacritics, collapse whitespace, trim, lowercase.
 * Used ONLY for dedupe keys — display labels keep their original casing and
 * accents so "São Paulo" is never shown as "sao paulo".
 *
 * May legitimately return an empty string (for input that was only whitespace
 * or only combining marks); callers must reject the entry in that case rather
 * than build a key such as "stay:" or "things:|museum".
 */
function normaliseKeyText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Collapse whitespace and truncate to `maxLength` characters, preserving case
 * and accents. Truncation counts code points, so a surrogate pair is never
 * split into a lone half that would corrupt the stored JSON.
 */
function tidyDisplayText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;

  const scanLimit = maxLength * RAW_INPUT_SCAN_LIMIT;
  const source = value.length > scanLimit ? value.slice(0, scanLimit) : value;

  const collapsed = source.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return undefined;

  const codePoints = Array.from(collapsed);
  const capped =
    codePoints.length > maxLength ? codePoints.slice(0, maxLength).join("").trim() : collapsed;

  return capped.length > 0 ? capped : undefined;
}

/**
 * A display value plus the key fragment derived from it. Both are returned
 * together so a caller can never build a key from untruncated text, or keep a
 * label whose key fragment normalised away to nothing.
 */
function coerceNamedPlace(
  value: unknown,
  maxLength: number,
): { display: string; normalised: string } | undefined {
  const display = tidyDisplayText(value, maxLength);
  if (!display) return undefined;

  const normalised = normaliseKeyText(display);
  if (normalised.length === 0) return undefined;

  return { display, normalised };
}

function coerceIata(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  return IATA_RE.test(code) ? code : undefined;
}

/**
 * Accept only a real YYYY-MM-DD calendar date. Rejects impossible dates such
 * as 2026-02-31, which the regex alone would let through.
 */
function coerceCalendarDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!CALENDAR_DATE_RE.test(text)) return undefined;

  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(5, 7));
  const day = Number(text.slice(8, 10));
  const parsed = new Date(year, month - 1, day);
  const roundTrips =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return roundTrips ? text : undefined;
}

function coerceTravellers(value: unknown): ActivityTravellers | undefined {
  if (!isRecord(value)) return undefined;
  const { adults, children, infants } = value;
  const valid =
    typeof adults === "number" && Number.isInteger(adults) && adults >= 1 && adults <= 9 &&
    typeof children === "number" && Number.isInteger(children) && children >= 0 && children <= 9 &&
    typeof infants === "number" && Number.isInteger(infants) && infants >= 0 && infants <= 9;
  return valid ? { adults, children, infants } : undefined;
}

function coerceCabinClass(value: unknown): CabinClass | undefined {
  if (typeof value !== "string") return undefined;
  const cabin = value.trim().toLowerCase();
  return (CABIN_CLASSES as readonly string[]).includes(cabin)
    ? (cabin as CabinClass)
    : undefined;
}

function coerceCount(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  return value >= min && value <= max ? value : undefined;
}

/** Valid ISO timestamp, not absurdly ahead of `now`. */
function coerceTimestamp(value: unknown, now: Date): string | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return undefined;
  if (ms > now.getTime() + FUTURE_TIMESTAMP_TOLERANCE_MS) return undefined;
  return new Date(ms).toISOString();
}

/** Recency ordering, used by both the read pipeline and the selectors. */
function byNewestFirst(a: RecentActivityEntry, b: RecentActivityEntry): number {
  return Date.parse(b.at) - Date.parse(a.at);
}

/** Local calendar date for `now`, matching how the search forms format dates. */
function toLocalCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── Coercion ──
//
// One path builds every entry, whether it arrived from a caller, from storage
// or from an array handed to a selector. Fields are copied individually from an
// allowlist, so unknown properties are dropped in every direction, and the
// dedupe key is always recomputed rather than trusted.

function coerceFlight(raw: Record<string, unknown>, at: string): FlightActivity | null {
  const origin = coerceIata(raw.origin);
  const destination = coerceIata(raw.destination);
  if (!origin || !destination || origin === destination) return null;

  const originLabel = tidyDisplayText(raw.originLabel, MAX_LABEL_LENGTH);
  const destinationLabel = tidyDisplayText(raw.destinationLabel, MAX_LABEL_LENGTH);

  const entry: FlightActivity = {
    kind: "flight",
    key: `flight:${origin}-${destination}`,
    label: destinationLabel ?? destination,
    at,
    origin,
    destination,
  };

  if (originLabel) entry.originLabel = originLabel;
  if (destinationLabel) entry.destinationLabel = destinationLabel;

  // Dates are optional and never invented. A return date without a departure
  // date, or before it, is meaningless — drop the return, keep the search.
  const departureDate = coerceCalendarDate(raw.departureDate);
  if (departureDate) {
    entry.departureDate = departureDate;
    const returnDate = coerceCalendarDate(raw.returnDate);
    if (returnDate && returnDate >= departureDate) entry.returnDate = returnDate;
  }

  const travellers = coerceTravellers(raw.travellers);
  if (travellers) entry.travellers = travellers;

  const cabinClass = coerceCabinClass(raw.cabinClass);
  if (cabinClass) entry.cabinClass = cabinClass;

  return entry;
}

function coerceStay(raw: Record<string, unknown>, at: string): StayActivity | null {
  const place = coerceNamedPlace(raw.destination, MAX_LABEL_LENGTH);
  if (!place) return null;

  const entry: StayActivity = {
    kind: "stay",
    key: `stay:${place.normalised}`,
    label: place.display,
    at,
    destination: place.display,
  };

  const checkIn = coerceCalendarDate(raw.checkIn);
  if (checkIn) {
    entry.checkIn = checkIn;
    const checkOut = coerceCalendarDate(raw.checkOut);
    if (checkOut && checkOut > checkIn) entry.checkOut = checkOut;
  }

  const guests = coerceCount(raw.guests, MIN_GUESTS, MAX_GUESTS);
  if (guests !== undefined) entry.guests = guests;

  const rooms = coerceCount(raw.rooms, MIN_ROOMS, MAX_ROOMS);
  if (rooms !== undefined) entry.rooms = rooms;

  return entry;
}

function coerceThings(raw: Record<string, unknown>, at: string): ThingsActivity | null {
  const place = coerceNamedPlace(raw.city, MAX_LABEL_LENGTH);
  if (!place) return null;

  // A query whose key fragment normalises away to nothing (whitespace, stray
  // combining marks) is dropped rather than stored, so the payload and the key
  // always agree about whether this search had a query at all.
  const query = coerceNamedPlace(raw.query, MAX_QUERY_LENGTH);

  const entry: ThingsActivity = {
    kind: "things",
    key: `things:${place.normalised}|${query ? query.normalised : ""}`,
    label: place.display,
    at,
    city: place.display,
  };

  if (query) entry.query = query.display;

  return entry;
}

function coerceEntry(raw: unknown, at: string): RecentActivityEntry | null {
  if (!isRecord(raw)) return null;
  switch (raw.kind) {
    case "flight":
      return coerceFlight(raw, at);
    case "stay":
      return coerceStay(raw, at);
    case "things":
      return coerceThings(raw, at);
    default:
      return null;
  }
}

/**
 * The dedupe key an input would be stored under, or null when the input is not
 * recordable. Exposed so a caller can exclude an entry from a list without
 * holding the entry itself.
 *
 * Reverse routes are distinct: SYD-MEL and MEL-SYD never collide.
 */
export function buildDedupeKey(input: RecentActivityInput): string | null {
  // The timestamp is irrelevant to the key; only the payload shapes it.
  const entry = coerceEntry(input, new Date(0).toISOString());
  return entry ? entry.key : null;
}

/** True when a stored object carried properties the rebuilt entry does not. */
function carriesUnknownProperties(
  stored: Record<string, unknown>,
  rebuilt: RecentActivityEntry,
): boolean {
  const allowed = Object.keys(rebuilt);
  return Object.keys(stored).some(property => !allowed.includes(property));
}

// ── Date sanitisation for restore ──

/**
 * Strip dates that have fallen into the past.
 *
 * A search from three weeks ago is still a useful shortcut back to the route,
 * so the entry survives — but its dates must not be handed back as restore
 * values, because restoring them would either search the past or silently
 * become a different trip. Nothing is rewritten or substituted; the dates are
 * simply absent.
 */
function stripPastFlightDates(entry: FlightActivity, today: string): FlightActivity {
  if (!entry.departureDate || entry.departureDate >= today) return entry;
  const { departureDate, returnDate, ...rest } = entry;
  return rest;
}

function stripPastStayDates(entry: StayActivity, today: string): StayActivity {
  if (!entry.checkIn || entry.checkIn >= today) return entry;
  const { checkIn, checkOut, ...rest } = entry;
  return rest;
}

function sanitiseForRestore(entry: RecentActivityEntry, today: string): RecentActivityEntry {
  if (entry.kind === "flight") return stripPastFlightDates(entry, today);
  if (entry.kind === "stay") return stripPastStayDates(entry, today);
  return entry;
}

function sanitiseAllForRestore(
  entries: readonly RecentActivityEntry[],
  now: Date,
): RecentActivityEntry[] {
  const today = toLocalCalendarDate(now);
  return entries.map(entry => sanitiseForRestore(entry, today));
}

// ── Storage access ──

function readRaw(): string | null {
  try {
    return localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, disabled, SSR) — behave as empty.
    return null;
  }
}

function persist(entries: RecentActivityEntry[]): boolean {
  try {
    const payload: StoredRecentActivity = { v: RECENT_ACTIVITY_VERSION, items: entries };
    localStorage.setItem(RECENT_ACTIVITY_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Quota exceeded or storage unavailable — silently do nothing.
    return false;
  }
}

/**
 * Remove recent activity from this device.
 *
 * Clears ONLY `bf_recent_activity`. The trip context, the Trip Cost draft and
 * the recent-airports list are separate concerns and are never touched here.
 * Undo, confirmation and messaging belong to the UI layer.
 */
export function clearRecentActivity(): void {
  try {
    localStorage.removeItem(RECENT_ACTIVITY_STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

// ── Read pipeline ──

interface ReadResult {
  /** Valid, pruned, newest-first entries exactly as they should be stored. */
  entries: RecentActivityEntry[];
  /** True when storage holds something these entries no longer do. */
  needsRepair: boolean;
}

function emptyRead(): ReadResult {
  // A fresh object each time: the caller owns the array and may sort it.
  return { entries: [], needsRepair: false };
}

/**
 * Parse and validate the store.
 *
 * Envelope failures (bad JSON, wrong version, non-array items) discard the
 * whole store and clear the key — there is no salvageable list. Item failures
 * drop that item only.
 *
 * Ordering matters here: entries are sorted by recency BEFORE duplicate keys
 * are collapsed, so the surviving duplicate is always the newest one no matter
 * what order storage happened to hold them in. Sorting is stable, so entries
 * sharing an identical timestamp keep their stored order.
 */
function readStoredEntries(now: Date): ReadResult {
  const raw = readRaw();
  if (!raw) return emptyRead();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearRecentActivity();
    return emptyRead();
  }

  if (!isRecord(parsed) || parsed.v !== RECENT_ACTIVITY_VERSION || !Array.isArray(parsed.items)) {
    clearRecentActivity();
    return emptyRead();
  }

  const storedCount = parsed.items.length;
  const cutoff = now.getTime() - RETENTION_MS;
  const valid: RecentActivityEntry[] = [];
  let sawUnknownProperties = false;

  for (const item of parsed.items) {
    if (!isRecord(item)) continue;

    const at = coerceTimestamp(item.at, now);
    if (!at) continue;
    if (Date.parse(at) < cutoff) continue;

    const entry = coerceEntry(item, at);
    if (!entry) continue;

    if (carriesUnknownProperties(item, entry)) sawUnknownProperties = true;

    valid.push(entry);
  }

  valid.sort(byNewestFirst);

  const seen = new Set<string>();
  const deduped: RecentActivityEntry[] = [];
  for (const entry of valid) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    deduped.push(entry);
  }

  const capped = deduped.slice(0, MAX_STORED_ITEMS);

  return {
    entries: capped,
    needsRepair: capped.length !== storedCount || sawUnknownProperties,
  };
}

/**
 * Write back a pruned list so retention, deduplication and the field allowlist
 * are enforced on disk rather than only in the value we hand back.
 */
function repairStore(entries: RecentActivityEntry[]): void {
  if (entries.length === 0) {
    clearRecentActivity();
    return;
  }
  persist(entries);
}

// ── Public API ──

/**
 * Load recent activity, newest first.
 *
 * Never throws. Prunes expired, malformed and duplicate entries and strips any
 * property outside the allowlist, then writes the repaired list back so those
 * promises hold on disk and not merely in the returned value. Dates that have
 * fallen into the past are stripped from the returned entries but left in
 * storage, since they remain the user's own data until the entry expires.
 *
 * `now` is injectable so behaviour is deterministic and testable.
 */
export function loadRecentActivity(now: Date = new Date()): RecentActivityEntry[] {
  try {
    const { entries, needsRepair } = readStoredEntries(now);
    if (needsRepair) repairStore(entries);
    return sanitiseAllForRestore(entries, now);
  } catch {
    // Nothing above is expected to throw; this is the last line of defence so
    // a returning-user surface can never break the homepage.
    return [];
  }
}

/**
 * Record a committed search and return the resulting list, newest first.
 *
 * Call this on commit only — a submitted search, a confirmed destination —
 * never on typing, focus, hover, autocomplete selection or navigation.
 *
 * Duplicates are replaced wholesale: the previous entry under the same dedupe
 * key is removed and the new payload is inserted at the front. Nothing is
 * merged forward, so a fresh dateless search never inherits the dates of the
 * search it replaced.
 *
 * An input that fails validation is ignored and nothing is written. A storage
 * failure is a silent no-op, and the returned list is then the unchanged stored
 * list — a caller can never be told an activity was saved when it was not.
 */
export function recordActivity(
  input: RecentActivityInput,
  now: Date = new Date(),
): RecentActivityEntry[] {
  try {
    const { entries: existing, needsRepair } = readStoredEntries(now);

    const entry = coerceEntry(input, now.toISOString());
    if (!entry) {
      if (needsRepair) repairStore(existing);
      return sanitiseAllForRestore(existing, now);
    }

    const next = [entry, ...existing.filter(item => item.key !== entry.key)]
      .slice(0, MAX_STORED_ITEMS);

    const stored = persist(next) ? next : existing;
    return sanitiseAllForRestore(stored, now);
  } catch {
    return [];
  }
}

// ── Selectors ──
//
// Pure functions of their arguments. They read no storage and hold no state, so
// a later slice can compose recent-activity candidates with the trip context
// and the Trip Cost draft at a higher layer without this module growing a
// dependency on either.
//
// They do not assume their input came from loadRecentActivity: every entry is
// rebuilt through the same coercion used on write, so a hand-built array cannot
// smuggle in a bogus dedupe key, an unknown property or an invalid route — and
// the same timestamp eligibility window the store enforces, RETENTION_DAYS back
// and FUTURE_TIMESTAMP_TOLERANCE_MS forward, is re-applied here against the
// supplied `now`. Enforcing it twice is deliberate: the UX contract says a
// continuation or a shortcut is eligible only while it is within the window,
// and a selector must honour that whatever array it is handed. Selectors only
// filter what they return; pruning and repairing storage stays the job of
// loadRecentActivity and recordActivity.

/**
 * Eligibility window, matching the loader on both ends:
 *
 *   now - RETENTION_MS  <=  entry.at  <=  now + FUTURE_TIMESTAMP_TOLERANCE_MS
 *
 * Either boundary exactly is still eligible. The upper bound matters because
 * entries sort by `at`: without it a caller-supplied timestamp from next year
 * would outrank every genuine search forever.
 */
function isWithinEligibilityWindow(entry: RecentActivityEntry, now: Date): boolean {
  const at = Date.parse(entry.at);
  if (Number.isNaN(at)) return false;
  return at >= now.getTime() - RETENTION_MS && at <= now.getTime() + FUTURE_TIMESTAMP_TOLERANCE_MS;
}

/** Rebuild caller-supplied entries into canonical ones, dropping the invalid. */
function toCanonicalEntries(value: readonly RecentActivityEntry[]): RecentActivityEntry[] {
  if (!Array.isArray(value)) return [];

  const canonical: RecentActivityEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const at = item.at;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at))) continue;

    const entry = coerceEntry(item, at);
    if (entry) canonical.push(entry);
  }
  return canonical;
}

/**
 * The key to exclude. An entry is canonicalised first so a caller-built object
 * with a stale or hand-written key still excludes the right item; if it cannot
 * be canonicalised, its own key is used rather than giving up, because
 * over-excluding is safer than showing the same search twice.
 */
function excludedKeyOf(exclude: RecentActivityEntry | string | null | undefined): string | null {
  if (!exclude) return null;
  if (typeof exclude === "string") return exclude;

  const [canonical] = toCanonicalEntries([exclude]);
  if (canonical) return canonical.key;
  return typeof exclude.key === "string" ? exclude.key : null;
}

/**
 * The strongest resumable candidate among recent-activity entries, or null.
 *
 * Only a flight qualifies, and only when it carries a valid distinct route AND
 * a departure date that has not passed. That is the line between the two things
 * the homepage shows: a continuation is state worth resuming, whereas a route
 * with no dates is a shortcut back to an intent and belongs in the recent list.
 * Stays and things-to-do entries are always shortcuts in this model — neither
 * carries enough committed state to headline the section, and a stay cannot be
 * restored at all until the stays surface reads URL params.
 *
 * The entry's timestamp must also sit inside the eligibility window. A search
 * abandoned two months ago is not "where you left off" however far ahead its
 * departure date happens to sit, so an old entry cannot headline the section on
 * the strength of a future date alone — and a timestamp beyond the clock-drift
 * tolerance cannot buy its way to the front of the list either.
 *
 * Both the age test and the future-date test use the supplied `now`, so this
 * never depends on the loader having filtered its input. Ties are broken by
 * recency. Callers that also have a trip-context or Trip Cost candidate rank
 * those against this one at the composition layer.
 */
export function selectContinuationCandidate(
  entries: readonly RecentActivityEntry[],
  now: Date = new Date(),
): FlightActivity | null {
  const today = toLocalCalendarDate(now);

  const candidates = toCanonicalEntries(entries)
    .filter(entry => isWithinEligibilityWindow(entry, now))
    .filter(isFlightActivity)
    .filter(entry => typeof entry.departureDate === "string" && entry.departureDate >= today)
    .sort(byNewestFirst);

  // The filter above already guarantees a future-or-today departure date, so
  // the winner needs no further date sanitisation.
  return candidates[0] ?? null;
}

/**
 * The recent shortcuts to render, newest first, capped at MAX_RECENT_ITEMS.
 *
 * Pass the chosen continuation (entry or key) as `exclude` so the same search
 * can never appear twice on one screen.
 *
 * Entries whose timestamp falls outside the eligibility window are excluded,
 * using the supplied `now`, so neither an expired shortcut nor one stamped in
 * the future can reach a surface through a hand-built array. Dates that have
 * fallen into the past are stripped the same way the loader strips them, so no
 * caller can be handed a stale date from any direction.
 *
 * `limit` may only narrow the result. MAX_RECENT_ITEMS is a product invariant —
 * the homepage shows at most three shortcuts — so a larger value is clamped
 * rather than honoured.
 */
export function selectRecentItems(
  entries: readonly RecentActivityEntry[],
  exclude: RecentActivityEntry | string | null = null,
  limit: number = MAX_RECENT_ITEMS,
  now: Date = new Date(),
): RecentActivityEntry[] {
  const excludedKey = excludedKeyOf(exclude);
  const cap =
    Number.isInteger(limit) && limit >= 0
      ? Math.min(limit, MAX_RECENT_ITEMS)
      : MAX_RECENT_ITEMS;

  const selected = toCanonicalEntries(entries)
    .filter(entry => isWithinEligibilityWindow(entry, now))
    .filter(entry => entry.key !== excludedKey)
    .sort(byNewestFirst)
    .slice(0, cap);

  return sanitiseAllForRestore(selected, now);
}
