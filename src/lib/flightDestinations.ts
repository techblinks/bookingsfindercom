/**
 * Phase 7G — Flight Destination Manager: shared types, constants and pure
 * helpers. Kept framework-free so the admin page, the public consumer and the
 * unit tests all share one source of truth.
 */

export const FLIGHT_DESTINATIONS_TABLE = "flight_destinations" as const;
export const FLIGHT_DESTINATIONS_BUCKET = "flight-destinations" as const;
export const FLIGHT_DESTINATIONS_FUNCTION = "flight-destinations" as const;

/** Master image target for the first version (see IMAGE_VARIANT_PHASE note). */
export const MASTER_IMAGE_WIDTH = 800;
export const MASTER_IMAGE_HEIGHT = 600; // 4:3
export const MASTER_IMAGE_MIME = "image/webp" as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_UPLOAD_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

// ── Row + public shapes ──────────────────────────────────────────

export interface FlightDestinationRow {
  id: string;
  city: string;
  country: string;
  iata_code: string;
  slug: string;
  description: string | null;
  alt_text: string | null;
  image_path: string | null;
  focal_x: number;
  focal_y: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Fields that are safe to expose publicly (no audit/internal columns). */
export interface PublicFlightDestination {
  id: string;
  city: string;
  country: string;
  iata_code: string;
  slug: string;
  description: string | null;
  alt_text: string | null;
  image_path: string | null;
  focal_x: number;
  focal_y: number;
  display_order: number;
}

/** Editable subset used by the admin form. */
export interface FlightDestinationInput {
  city: string;
  country: string;
  iata_code: string;
  slug: string;
  description: string;
  alt_text: string;
  focal_x: number;
  focal_y: number;
  display_order: number;
  is_active: boolean;
}

// ── Validation ───────────────────────────────────────────────────

const IATA_RE = /^[A-Z]{3}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface FieldError {
  field: keyof FlightDestinationInput;
  message: string;
}

/** Validate an admin form input. Returns [] when valid. Never throws. */
export function validateDestinationInput(input: Partial<FlightDestinationInput>): FieldError[] {
  const errors: FieldError[] = [];

  if (!input.city || input.city.trim().length === 0) {
    errors.push({ field: "city", message: "City is required" });
  }
  if (!input.country || input.country.trim().length === 0) {
    errors.push({ field: "country", message: "Country is required" });
  }
  if (!input.iata_code || !IATA_RE.test(input.iata_code)) {
    errors.push({ field: "iata_code", message: "IATA code must be 3 uppercase letters (e.g. KTM)" });
  }
  if (!input.slug || !SLUG_RE.test(input.slug)) {
    errors.push({ field: "slug", message: "Slug must be lowercase words separated by hyphens" });
  }
  if (input.focal_x === undefined || !isNormalised(input.focal_x)) {
    errors.push({ field: "focal_x", message: "Focal X must be between 0 and 1" });
  }
  if (input.focal_y === undefined || !isNormalised(input.focal_y)) {
    errors.push({ field: "focal_y", message: "Focal Y must be between 0 and 1" });
  }
  if (input.display_order === undefined || !Number.isInteger(input.display_order) || input.display_order < 0) {
    errors.push({ field: "display_order", message: "Display order must be a non-negative whole number" });
  }
  return errors;
}

function isNormalised(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
}

/** Clamp a focal component into 0..1 (rounded to 4 dp). NaN → 0.5 (centre);
 *  ±Infinity clamp to the nearer bound. */
export function clampFocal(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  const clamped = Math.min(1, Math.max(0, n)); // Math.min/max handle ±Infinity
  return Math.round(clamped * 10000) / 10000;
}

/** Generate a URL-safe slug from a city name. */
export function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Selection / ordering / projection ────────────────────────────

/** Active rows only, sorted by display_order then city (stable). */
export function selectActiveSorted<T extends { is_active: boolean; display_order: number; city: string }>(
  rows: T[],
): T[] {
  return rows
    .filter((r) => r.is_active)
    .sort((a, b) => a.display_order - b.display_order || a.city.localeCompare(b.city));
}

/** Project a full row down to the safe public fields only. */
export function toPublicDestination(row: FlightDestinationRow): PublicFlightDestination {
  return {
    id: row.id,
    city: row.city,
    country: row.country,
    iata_code: row.iata_code,
    slug: row.slug,
    description: row.description ?? null,
    alt_text: row.alt_text ?? null,
    image_path: row.image_path ?? null,
    focal_x: Number(row.focal_x),
    focal_y: Number(row.focal_y),
    display_order: row.display_order,
  };
}

/** Storage path for a destination's master image (first version = 800×600 WebP). */
export function masterImagePath(slug: string): string {
  return `${slug}/master-${MASTER_IMAGE_WIDTH}x${MASTER_IMAGE_HEIGHT}.webp`;
}

/** CSS object-position string from a normalised focal point. */
export function focalToObjectPosition(focalX: number, focalY: number): string {
  return `${clampFocal(focalX) * 100}% ${clampFocal(focalY) * 100}%`;
}

/**
 * IMAGE_VARIANT_PHASE — deferred.
 * Browsers cannot reliably encode AVIF via <canvas>, so the first version stores
 * only the master 800×600 WebP (client-side canvas encode). The full responsive
 * matrix (480×360 + 800×600 in AVIF/WebP/JPG) is generated in a later phase by a
 * server-side pipeline (ImageMagick/sharp edge job) that reads the master and
 * writes the six variants back to the bucket. Not faked here.
 */
