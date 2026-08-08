/**
 * viator-catalog — Admin-only Viator API proxy.
 *
 * POST only. JWT-verified. Admin-role check.
 * Proxies the Viator Content API health check only (admin diagnostics).
 * No booking data, no affiliate URLs, no pricing, no traveler data.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { viatorHealthCheck } from "../_shared/viator-client.ts";
import type { ViatorError } from "../_shared/viator-client.ts";

// ═══════════════════════════════════════════════════════════════
// Validation schemas
// ═══════════════════════════════════════════════════════════════

const healthSchema = z.object({
  action: z.literal("health"),
});

type ActionBody = z.infer<typeof healthSchema>;

// ═══════════════════════════════════════════════════════════════
// Admin verification
// ═══════════════════════════════════════════════════════════════

async function verifyAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw { status: 401, message: "Authentication required" };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token.length < 10) {
    throw { status: 401, message: "Invalid token" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  // Check admin role via existing has_role function
  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw { status: 403, message: "Admin role required" };
  }

  return user.id;
}

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Auth ──
  let userId: string;
  try {
    userId = await verifyAdmin(req);
  } catch (e: unknown) {
    const err = e as { status: number; message: string };
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: err.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Parse body ──
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const action = (rawBody as Record<string, unknown>)?.action;
  if (!action || typeof action !== "string") {
    return new Response(
      JSON.stringify({ error: "action is required (health)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Health ──
  if (action === "health") {
    const parsed = healthSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid health request", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const configured = !!Deno.env.get("VIATOR_API_KEY");
      const health = await viatorHealthCheck();

      return new Response(
        JSON.stringify({
          configured,
          connected: health.connected,
          upstreamStatus: health.upstreamStatus,
          responseTimeMs: health.responseTimeMs,
          productCodeReturned: health.productCodeReturned ?? null,
          productStatus: health.productStatus ?? null,
          trackingId: health.trackingId ?? null,
          rateLimitRemaining: health.rateLimitRemaining ?? null,
          checkedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e: unknown) {
      const err = e as ViatorError;
      const statusMap: Record<string, number> = {
        auth: 502,
        not_found: 404,
        rate_limit: 429,
        upstream: 502,
        timeout: 504,
        parse: 502,
        config: 500,
      };
      const status = statusMap[err.type] || 502;

      return new Response(
        JSON.stringify({
          error: err.message,
          trackingId: err.trackingId || null,
          retryAfterSec: err.retryAfterSec || null,
        }),
        {
          status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...(err.retryAfterSec ? { "Retry-After": String(err.retryAfterSec) } : {}),
          },
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: `Unknown action: ${action}` }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
