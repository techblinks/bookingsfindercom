/**
 * tiqets-catalog core — action contract, validation and dispatch (T4A-P1).
 *
 * This file deliberately contains NO Deno globals, NO database access and no
 * provider I/O so the vitest suite can import it directly (the repo's
 * edge-function test convention — same as sitemap/sitemap-core.ts and
 * things-activity-public/things-activity-core.ts). The only import is the Zod
 * build the Edge Functions already use; vitest maps that specifier to the
 * bundled npm `zod` via `resolve.alias`.
 *
 * Fail-closed contract (T4A-P1):
 *   `refresh-catalogue` is a DECLARED but UNAVAILABLE action. It is recognised
 *   and validated here, and it always resolves to a terminal non-success
 *   result — `parseCatalogueRequest` can never hand an executable
 *   `refresh-catalogue` back to the request handler. Durable catalogue
 *   persistence stays disabled until the storage/RPC contracts are repaired in
 *   T4A-P2, so no code path may reach Tiqets, the catalogue tables or the
 *   sync-state checkpoint through this action.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ═══════════════════════════════════════════════════════════════
// Declared action contract
// ═══════════════════════════════════════════════════════════════

/** Every action the function recognises. Source of truth for dispatch + errors. */
export const CATALOGUE_ACTIONS = ["health", "products", "refresh-catalogue"] as const;
export type CatalogueAction = (typeof CATALOGUE_ACTIONS)[number];

/** Actions the function will actually execute. `refresh-catalogue` is absent by design. */
export const EXECUTABLE_CATALOGUE_ACTIONS = ["health", "products"] as const;
export type ExecutableCatalogueAction = (typeof EXECUTABLE_CATALOGUE_ACTIONS)[number];

export const SUPPORTED_LANGUAGES = ["en", "nl", "fr", "de", "it", "es", "pt", "ja", "zh"] as const;

// ═══════════════════════════════════════════════════════════════
// Validation schemas
// ═══════════════════════════════════════════════════════════════

export const healthSchema = z.object({
  action: z.literal("health"),
});

export const productsSchema = z.object({
  action: z.literal("products"),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(20).default(10),
  destination_id: z.number().int().positive().optional(),
  sale_status: z.enum(["on_sale", "sold_out", "cancelled"]).optional(),
});

/**
 * Minimal refresh contract. Strict on purpose: no sync controls (destination_id,
 * max_pages, resume tokens, force, reset, …) exist yet, and callers must not be
 * able to depend on ones that were never declared. T4A-P2 owns the real shape.
 */
export const refreshCatalogueSchema = z.object({
  action: z.literal("refresh-catalogue"),
}).strict();

export type HealthRequest = z.infer<typeof healthSchema>;
export type ProductsRequest = z.infer<typeof productsSchema>;
export type RefreshCatalogueRequest = z.infer<typeof refreshCatalogueSchema>;
export type CatalogueActionBody = HealthRequest | ProductsRequest | RefreshCatalogueRequest;

// ═══════════════════════════════════════════════════════════════
// Stable error contract
// ═══════════════════════════════════════════════════════════════

/** Machine-readable code for the disabled durable refresh path. */
export const CATALOGUE_SYNC_NOT_READY = "catalogue_sync_not_ready";

/** Durable refresh is unavailable, not broken: 503 + a calm admin-safe message. */
export const CATALOGUE_SYNC_NOT_READY_STATUS = 503;

const CATALOGUE_SYNC_NOT_READY_MESSAGE =
  "Durable catalogue refresh is not available in this deployment. " +
  "Catalogue persistence stays disabled until the storage contract is repaired.";

/** Human-readable list used by the missing/unknown-action errors. */
export const CATALOGUE_ACTION_LIST = CATALOGUE_ACTIONS.join(" | ");

// ═══════════════════════════════════════════════════════════════
// Dispatch
// ═══════════════════════════════════════════════════════════════

export type CatalogueDispatch =
  | { ok: true; action: "health"; body: HealthRequest }
  | { ok: true; action: "products"; body: ProductsRequest }
  | { ok: false; status: number; body: Record<string, unknown> };

function invalid(status: number, body: Record<string, unknown>): CatalogueDispatch {
  return { ok: false, status, body };
}

/** True when `value` is a declared action of this function. */
export function isCatalogueAction(value: unknown): value is CatalogueAction {
  return typeof value === "string" && (CATALOGUE_ACTIONS as readonly string[]).includes(value);
}

/**
 * Validate a parsed request body and decide what the handler may execute.
 *
 * Returns `ok: true` only for actions that are safe to run. `refresh-catalogue`
 * is validated and then always returned as a terminal `ok: false` result, so no
 * caller can execute it, and no `ok: true` refresh response can exist.
 */
export function parseCatalogueRequest(rawBody: unknown): CatalogueDispatch {
  const action = (rawBody as Record<string, unknown> | null | undefined)?.action;

  if (!action || typeof action !== "string") {
    return invalid(400, { error: `action is required (${CATALOGUE_ACTION_LIST})` });
  }

  if (!isCatalogueAction(action)) {
    return invalid(400, { error: `Unknown action: ${action}` });
  }

  if (action === "health") {
    const parsed = healthSchema.safeParse(rawBody);
    if (!parsed.success) {
      return invalid(400, { error: "Invalid health request", details: parsed.error.flatten() });
    }
    return { ok: true, action: "health", body: parsed.data };
  }

  if (action === "products") {
    const parsed = productsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return invalid(400, { error: "Invalid product request", details: parsed.error.flatten() });
    }
    return { ok: true, action: "products", body: parsed.data };
  }

  // ── refresh-catalogue: recognised, validated, permanently unavailable ──
  const parsed = refreshCatalogueSchema.safeParse(rawBody);
  if (!parsed.success) {
    return invalid(400, {
      ok: false,
      error: "invalid_refresh_catalogue_request",
      details: parsed.error.flatten(),
    });
  }

  return invalid(CATALOGUE_SYNC_NOT_READY_STATUS, {
    ok: false,
    error: CATALOGUE_SYNC_NOT_READY,
    message: CATALOGUE_SYNC_NOT_READY_MESSAGE,
  });
}
