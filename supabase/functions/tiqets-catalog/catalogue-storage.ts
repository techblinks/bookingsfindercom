/**
 * tiqets-catalog storage adapter — NormalizedProduct → durable product row
 * (T4A-P2).
 *
 * This module is the TypeScript half of the durable product storage contract:
 *
 *   NormalizedProduct
 *         ↓  toCatalogueProductRow (this file — pure)
 *   CatalogueProductRow  (JSON-safe)
 *         ↓  public.upsert_experience_products(p_provider, p_products)
 *   public.experience_products
 *
 * PURITY CONTRACT — deliberately enforced by tests:
 *   - no Supabase client, no `createClient`, no `.rpc(`, no `.upsert(`
 *   - no `fetch`, no provider client, no network
 *   - no `Deno.env`, no globals of any kind
 *   - no hidden clock: `observedAt` is an explicit input so a row is a pure
 *     function of (product, observedAt) and tests are deterministic
 *
 * NOT WIRED INTO A REQUEST PATH. T4A-P1 left `refresh-catalogue` fail-closed
 * (503 `catalogue_sync_not_ready`) and P2 does not re-enable it: nothing
 * imports this module from `index.ts`. P2 builds and proves the contract; P3
 * owns the sync engine that will eventually call it. The module is still
 * `deno check`ed (see `check:edge:tiqets-catalog`) so disabled code cannot
 * escape type checking.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FIELD OWNERSHIP MODEL
 * ─────────────────────────────────────────────────────────────────────────
 *
 * A. PROVIDER CATALOGUE SNAPSHOT OWNED (this adapter emits them; every
 *    genuine observation overwrites the stored value, INCLUDING overwriting
 *    with null when the latest observation is null). The catalogue records
 *    *current observed provider state* — never a "last known good" merge.
 *
 * B. DETAIL ENRICHMENT OWNED (`description`, `images`). Catalogue discovery
 *    is NOT an authoritative source for these, so this adapter never emits
 *    them and the RPC never writes them on conflict. `experience_products`
 *    rows are already read for descriptions by things-activity-public's
 *    offer enrichment; list ingestion must not erase richer data sourced
 *    elsewhere.
 *
 * C. DATABASE OWNED (`provider`, `slug`, `created_at`, `updated_at`, and
 *    `provider_updated_at` — there is no proven upstream timestamp in the
 *    Tiqets `/products` contract, so it is left untouched rather than
 *    invented). `provider` is supplied to the RPC as its own scalar
 *    argument, never per row.
 */

import type { NormalizedProduct } from "../_shared/tiqets-normalizer.ts";

// ═══════════════════════════════════════════════════════════════
// Row shape
// ═══════════════════════════════════════════════════════════════

/**
 * One JSON-safe element of the `p_products` array accepted by
 * `public.upsert_experience_products`.
 *
 * Every key here is SNAPSHOT-OWNED. `description` and `images` are
 * deliberately absent from the type: they are enrichment-owned, and a row
 * that cannot express them cannot accidentally erase them.
 *
 * `provider` is absent too — identity scoping is the RPC's `p_provider`
 * argument, so a batch can never mix providers.
 */
export interface CatalogueProductRow {
  /** Provider catalogue identity. Preserved verbatim — never trimmed, cased or re-derived. */
  provider_product_id: string;
  title: string;
  /** Numeric upstream IDs rendered as text: `experience_products.city_id` is `text`. */
  city_id: string | null;
  city_name: string | null;
  country_id: string | null;
  country_name: string | null;
  tagline: string | null;
  venue_name: string | null;
  rating: number | null;
  review_count: number | null;
  price_amount: number | null;
  price_currency: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_credit: string | null;
  /** A genuine JSON array of upstream tag IDs — NEVER a JSON string. */
  tag_ids: number[];
  wheelchair_accessible: boolean | null;
  skip_the_line: boolean | null;
  smartphone_ticket: boolean | null;
  /**
   * The provider's OWN claim: the ticket is delivered instantly.
   *
   * Deliberately NOT `instant_confirmation`. "Instant ticket delivery" and
   * "instant confirmation" are different traveller promises, and the public
   * `instantConfirmation` field is a booking-confirmation claim the Tiqets
   * `/products` contract does not make. The live Tiqets ExperienceProduct
   * adapter (`src/services/experiences.ts`) sets `instantConfirmation: null`
   * for exactly this reason; storing delivery under a confirmation name would
   * eventually manufacture the stronger claim.
   */
  instant_ticket_delivery: boolean | null;
  duration: string | null;
  cancellation: string | null;
  /** Nullable: an absent provider URL means "not currently known", never "invalid product". */
  product_url: string | null;
  product_checkout_url: string | null;
  /** Raw normalized provider status, verbatim. Never translated. */
  sale_status: string | null;
  /** ISO-8601 UTC instant of this observation — supplied by the caller. */
  last_seen_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Column ownership — the single source of truth shared with the SQL tests
// ═══════════════════════════════════════════════════════════════

/**
 * Row identity. Emitted by the adapter because the upsert needs it to find the
 * row, and NEVER reassigned on conflict — `(provider, provider_product_id)` is
 * the locked provider catalogue identity. The `provider` half is the RPC's own
 * argument, so only this half travels in the row.
 */
export const CATALOGUE_ROW_IDENTITY_COLUMNS = ["provider_product_id"] as const;

/**
 * A. Snapshot-owned columns. The catalogue upsert MUST refresh every one of
 * these on conflict, null included. Asserted against the migration's
 * `DO UPDATE SET` block by the migration contract test.
 */
export const CATALOGUE_SNAPSHOT_OWNED_COLUMNS = [
  "title",
  "city_id",
  "city_name",
  "country_id",
  "country_name",
  "tagline",
  "venue_name",
  "rating",
  "review_count",
  "price_amount",
  "price_currency",
  "image_url",
  "image_alt",
  "image_credit",
  "tag_ids",
  "wheelchair_accessible",
  "skip_the_line",
  "smartphone_ticket",
  "instant_ticket_delivery",
  "duration",
  "cancellation",
  "product_url",
  "product_checkout_url",
  "sale_status",
  "last_seen_at",
] as const;

/**
 * B. Enrichment-owned columns. Catalogue discovery must never write these —
 * not on insert, not on conflict.
 */
export const CATALOGUE_ENRICHMENT_OWNED_COLUMNS = ["description", "images"] as const;

/**
 * C. Database-owned columns. Set by the table default, the RPC argument, or a
 * generated expression — never carried by a product row.
 */
export const CATALOGUE_DATABASE_OWNED_COLUMNS = [
  "provider",
  "slug",
  "created_at",
  "updated_at",
  "provider_updated_at",
] as const;

/** Every column a product row may legitimately carry, in no particular order. */
export const CATALOGUE_ROW_COLUMNS = [
  ...CATALOGUE_ROW_IDENTITY_COLUMNS,
  ...CATALOGUE_SNAPSHOT_OWNED_COLUMNS,
] as const;

// ═══════════════════════════════════════════════════════════════
// Validation contract
// ═══════════════════════════════════════════════════════════════

/**
 * Why a normalized product is not storable. Stable machine-readable codes so
 * the future sync engine can count and report rejections without parsing
 * prose.
 */
export const CATALOGUE_ROW_REJECTIONS = [
  "missing_provider_product_id",
  "missing_title",
  "invalid_observed_at",
] as const;
export type CatalogueRowRejection = (typeof CATALOGUE_ROW_REJECTIONS)[number];

/**
 * Typed result — the repo's edge-function convention (see
 * `things-activity-core.ts` `validateResolveInput`). A rejected product is a
 * first-class outcome, not an exception: the sync engine must be able to
 * distinguish VALID ROW from REJECTED INVALID PROVIDER PRODUCT and skip the
 * latter without aborting.
 */
export type CatalogueProductRowResult =
  | { ok: true; row: CatalogueProductRow }
  | { ok: false; reason: CatalogueRowRejection; providerProductId: string | null };

/** Blank means "no genuine value": empty, whitespace-only, or not a string. */
function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
}

/**
 * Nullable text passthrough. Only `null`/`undefined` become null — an empty
 * string from upstream is not silently rewritten here (the normalizer already
 * maps absent optional strings to null).
 */
function textOrNull(value: string | null | undefined): string | null {
  return value ?? null;
}

/**
 * Nullable numeric passthrough.
 *
 * `?? null`, never `|| null`: a genuine provider `0` (price 0, rating 0,
 * review count 0) is real data and must survive to Postgres as 0. Non-finite
 * values (NaN/Infinity) are not JSON-safe and would serialise to `null`
 * anyway, so they are mapped to null explicitly rather than implicitly.
 */
function numberOrNull(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) ? value : null;
}

/** Nullable boolean passthrough — `false` is a genuine value, never dropped. */
function booleanOrNull(value: boolean | null | undefined): boolean | null {
  return value ?? null;
}

/**
 * `experience_products.city_id` / `country_id` are `text` columns and the
 * catalogue reader filters them with string equality
 * (`tiqets-public` catalogue-search `.eq("city_id", destinationId)`), while
 * `NormalizedProduct` carries them as numbers. Render exactly, and keep 0 as
 * `"0"` rather than treating it as absent.
 */
function idToTextOrNull(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) ? String(value) : null;
}

// ═══════════════════════════════════════════════════════════════
// Transformation
// ═══════════════════════════════════════════════════════════════

/**
 * Map one normalized provider product to a durable catalogue row.
 *
 * PURE: no clock, no I/O, no environment. Same inputs → same output.
 *
 * Rejects (rather than repairs) a product without a provider product ID or
 * without a title. Both are required for a durable catalogue product:
 * identity cannot be invented, and a fabricated or empty-string title would
 * satisfy `NOT NULL` while poisoning the generated slug and every reader.
 * Nothing else is rejected — in particular a product with no `product_url`,
 * no price, no rating or no image IS storable; absence is a fact worth
 * recording.
 *
 * @param product   a normalized Tiqets product
 * @param observedAt the instant this observation was made, supplied by the
 *                   caller so the row is deterministic and testable
 */
export function toCatalogueProductRow(
  product: NormalizedProduct,
  observedAt: Date,
): CatalogueProductRowResult {
  const providerProductId = product?.id;

  if (isBlank(providerProductId)) {
    return { ok: false, reason: "missing_provider_product_id", providerProductId: null };
  }
  if (isBlank(product?.title)) {
    return { ok: false, reason: "missing_title", providerProductId };
  }
  if (!(observedAt instanceof Date) || !Number.isFinite(observedAt.getTime())) {
    return { ok: false, reason: "invalid_observed_at", providerProductId };
  }

  // One selected best image, or none. The normalizer exposes no genuine
  // gallery, so `images` is NOT fabricated from this single image — see the
  // enrichment-ownership note at the top of this file.
  const image = product.image ?? null;

  return {
    ok: true,
    row: {
      provider_product_id: providerProductId,
      title: product.title,

      city_id: idToTextOrNull(product.cityId),
      city_name: textOrNull(product.city),
      country_id: idToTextOrNull(product.countryId),
      country_name: textOrNull(product.country),

      tagline: textOrNull(product.tagline),
      venue_name: textOrNull(product.venue?.name ?? null),

      rating: numberOrNull(product.rating?.average),
      review_count: numberOrNull(product.rating?.count),
      price_amount: numberOrNull(product.minPrice?.amount),
      price_currency: textOrNull(product.minPrice?.currency),

      image_url: image ? image.url : null,
      image_alt: image ? textOrNull(image.altText) : null,
      image_credit: image ? textOrNull(image.credit) : null,

      // A real array. `JSON.stringify` here would land a JSON *string* in a
      // jsonb column — the exact defect the T4A audit found in the legacy
      // writer. Copied so a later mutation of the source cannot alter the row.
      tag_ids: Array.isArray(product.tagIds) ? [...product.tagIds] : [],

      wheelchair_accessible: booleanOrNull(product.wheelchairAccessible),
      skip_the_line: booleanOrNull(product.skipTheLine),
      smartphone_ticket: booleanOrNull(product.smartphoneTicket),
      // Exact provider semantic, exact column name. Never widened into a
      // booking-confirmation claim — see the field comment above.
      instant_ticket_delivery: booleanOrNull(product.instantTicketDelivery),

      duration: textOrNull(product.duration),
      // Stored as the provider's own text. Deliberately NOT reduced to a
      // `free_cancellation` boolean: "free cancellation up to 24h" and
      // "non-refundable" are not the same proposition as true/false.
      cancellation: textOrNull(product.cancellation),

      product_url: textOrNull(product.productUrl),
      product_checkout_url: textOrNull(product.productCheckoutUrl),

      // Verbatim. `available`/`unavailable` are not re-spelled as
      // `on_sale`/`sold_out`; the availability predicate lives in the
      // normalizer and is not duplicated here.
      sale_status: textOrNull(product.saleStatus),

      last_seen_at: observedAt.toISOString(),
    },
  };
}

/** Outcome of mapping a page of normalized products. */
export interface CatalogueProductBatch {
  rows: CatalogueProductRow[];
  rejected: Array<{ reason: CatalogueRowRejection; providerProductId: string | null }>;
}

/**
 * Map a batch, partitioning valid rows from rejected products.
 *
 * Rejected products are reported, never written and never silently coerced
 * into a storable shape. Batch orchestration (chunking, retry, ordering) is
 * P3's concern — this only performs the mapping.
 */
export function toCatalogueProductRows(
  products: readonly NormalizedProduct[],
  observedAt: Date,
): CatalogueProductBatch {
  const rows: CatalogueProductRow[] = [];
  const rejected: CatalogueProductBatch["rejected"] = [];

  for (const product of products) {
    const result = toCatalogueProductRow(product, observedAt);
    if (result.ok) {
      rows.push(result.row);
    } else {
      rejected.push({ reason: result.reason, providerProductId: result.providerProductId });
    }
  }

  return { rows, rejected };
}
