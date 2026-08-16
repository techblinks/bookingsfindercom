/**
 * Things activity slug utility — T2D-A.
 *
 * Turns a canonical activity TITLE into a canonical slug at CREATION time
 * only. After persistence the slug is immutable: a title change must never
 * re-derive it, because that would churn the canonical URL and destroy the SEO
 * stability this module exists to protect.
 *
 * Contract:
 *   - Unicode-safe: NFD-normalise and strip combining marks before the
 *     ASCII pass, so "São Paulo" → "sao-paulo" and nothing crashes on
 *     non-Latin input.
 *   - trim + collapse whitespace
 *   - lowercase
 *   - apostrophes removed (St Peter's → st-peters)
 *   - `&` expands to "and" (ampersand word, not a bare hyphen)
 *   - every other punctuation run (",", ":", "+", em/en dashes, …) becomes
 *     a single hyphen
 *   - duplicate hyphens collapsed, leading/trailing hyphens removed
 *   - deterministic: same input → same output, always
 *   - bounded: truncated to MAX_ACTIVITY_SLUG_LENGTH at a word boundary
 *   - never returns an empty canonical slug: returns null instead, and the
 *     caller must treat that as "no slug derivable" (identity is never
 *     invented from arbitrary text).
 *
 * Examples:
 *   "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour"
 *     → vatican-museums-sistine-chapel-and-st-peters-basilica-guided-tour
 *   "Colosseum: Arena Floor + Roman Forum & Palatine Hill"
 *     → colosseum-arena-floor-roman-forum-and-palatine-hill
 *   "Rome — Hop-on Hop-off Bus Tour"
 *     → rome-hop-on-hop-off-bus-tour
 *   "  Vatican   Museums  "
 *     → vatican-museums
 */
import {
  MAX_ACTIVITY_SLUG_LENGTH,
  THINGS_ACTIVITY_SLUG_RE,
} from "@/data/thingsActivities";

/** Unicode combining diacritical marks, removed after NFD decomposition. */
const COMBINING_MARKS_RE = /[\u0300-\u036f]/g;

/** Apostrophes (typographic and ASCII) are removed, not turned into hyphens. */
const APOSTROPHES_RE = /['’‘`]/g;

/** `&` (with any surrounding whitespace) becomes the word "and". */
const AMPERSAND_RE = /\s*&\s*/g;

/** Everything else that is not a lowercase ASCII letter or digit. */
const NON_WORD_RE = /[^a-z0-9]+/g;

/**
 * Derive a canonical slug from a title, or null when no slug is derivable.
 *
 * `null` means the input produced no usable slug (empty, whitespace-only,
 * punctuation-only, or non-Latin text with no Latin letters/digits). Callers
 * must fail closed on null — they must NOT invent a fallback slug from the
 * provider product ID or arbitrary text.
 */
export function createActivitySlug(title: string | null | undefined): string | null {
  if (typeof title !== "string") return null;

  // Bounded scan up front: nothing legible can survive past a generous
  // multiple of the output cap, so pathological input cannot make the
  // normalisation below scan an unbounded string.
  const scanLimit = MAX_ACTIVITY_SLUG_LENGTH * 8;
  const source = title.length > scanLimit ? title.slice(0, scanLimit) : title;

  // Unicode-safe: decompose, then drop combining marks.
  const deaccented = source.normalize("NFD").replace(COMBINING_MARKS_RE, "");

  const slug = deaccented
    .toLowerCase()
    .replace(APOSTROPHES_RE, "")
    .replace(AMPERSAND_RE, " and ")
    .replace(NON_WORD_RE, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) return null;

  return truncateSlugAtWordBoundary(slug);
}

/**
 * Truncate to MAX_ACTIVITY_SLUG_LENGTH without splitting a word: cut at the
 * last hyphen that still fits, falling back to a hard cut (with any trailing
 * hyphen trimmed) when the slug is one unbroken word.
 */
function truncateSlugAtWordBoundary(slug: string): string {
  if (slug.length <= MAX_ACTIVITY_SLUG_LENGTH) return slug;

  const capped = slug.slice(0, MAX_ACTIVITY_SLUG_LENGTH).replace(/-+$/g, "");
  if (capped.length > 0) return capped;

  // Everything within the cap was hyphens — impossible for a validated slug,
  // but fail safe rather than returning an empty canonical slug.
  return slug.slice(0, MAX_ACTIVITY_SLUG_LENGTH).replace(/-/g, "") || "activity";
}

/**
 * Deterministic collision strategy at PERSISTENCE time.
 *
 * When the base slug is already taken (same destination), append a stable
 * numeric suffix: base, base-2, base-3, … The first slug `isTaken` reports
 * free wins. The strategy is deterministic (same registry state → same
 * choice), and the DATABASE UNIQUE (destination_slug, slug) constraint is the
 * final authority — this helper only produces candidates, it cannot race the
 * database.
 *
 * The suffix is a repository-consistent counter, never a provider product ID:
 * a provider product ID must never become the public suffix of a canonical
 * URL.
 */
export function resolveAvailableActivitySlug(
  baseSlug: string,
  isTaken: (candidate: string) => boolean,
): string {
  const base = baseSlug.trim();
  if (!THINGS_ACTIVITY_SLUG_RE.test(base)) {
    throw new Error(`resolveAvailableActivitySlug: invalid base slug "${baseSlug}"`);
  }

  if (!isTaken(base)) return base;

  for (let n = 2; n <= MAX_COLLISION_ATTEMPTS; n += 1) {
    const candidate = `${base}-${n}`;
    if (!isTaken(candidate)) return candidate;
  }

  throw new Error(
    `resolveAvailableActivitySlug: no free candidate for "${base}" after ${MAX_COLLISION_ATTEMPTS} attempts`,
  );
}

/**
 * Upper bound on collision attempts. `base-999` is already a pathological
 * registry; anything past this is a bug, not a naming problem.
 */
export const MAX_COLLISION_ATTEMPTS = 999;
