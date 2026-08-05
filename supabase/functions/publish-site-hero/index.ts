/**
 * publish-site-hero — trusted server-side hero set publisher.
 *
 * Invoked by the admin UI (anon key, admin-auth'd user).
 * The Edge Function uses the service-role key internally so that
 * Storage copy + DB publish operations never expose service-role
 * credentials to the browser.
 *
 * Flow:
 * 1. Authenticate caller via Supabase auth.
 * 2. Confirm admin role.
 * 3. Read draft set + assets from DB.
 * 4. Validate exactly 4 required slots.
 * 5. Copy all 4 files from site-media-drafts → site-media with
 *    immutable UUID paths.
 * 6. Update asset storage_path rows to the new public paths.
 * 7. Call publish_site_hero_set RPC.
 * 8. On failure at any step: clean up any already-copied files,
 *    report error, never leave a partially-published hero.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const REQUIRED_SLOTS = ["main", "support_1", "support_2", "mobile"] as const;
const DRAFT_BUCKET = "site-media-drafts";
const PUBLIC_BUCKET = "site-media";

interface AssetRow {
  id: string;
  slot_key: string;
  storage_path: string;
  alt_text: string | null;
  is_decorative: boolean;
  focal_x: number;
  focal_y: number;
  mime_type: string | null;
}

interface PublishResult {
  success: boolean;
  message: string;
  published_version?: number;
}

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

  const newPublicPaths: string[] = [];

  try {
    // ── Parse request ──
    const body = await req.json();
    const { draftSetId } = body as { draftSetId?: string };

    if (!draftSetId || typeof draftSetId !== "string" || draftSetId.length < 10) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid draft set ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Create clients ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client for auth verification (uses caller's token)
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: `Bearer ${authHeader}` } : {} },
    });

    // Client for privileged operations (service role, never exposed to browser)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Authenticate caller ──
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Confirm admin role ──
    const { data: roleData, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, message: "Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Read draft set + assets ──
    const { data: draftSet, error: setError } = await adminClient
      .from("site_hero_sets")
      .select("id, page_key, version_number, status")
      .eq("id", draftSetId)
      .single();

    if (setError || !draftSet) {
      return new Response(
        JSON.stringify({ success: false, message: "Draft set not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (draftSet.status !== "draft") {
      return new Response(
        JSON.stringify({ success: false, message: "Set is not a draft" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: assets, error: assetError } = await adminClient
      .from("site_hero_assets")
      .select("id, slot_key, storage_path, alt_text, is_decorative, focal_x, focal_y, mime_type")
      .eq("hero_set_id", draftSetId);

    if (assetError || !assets || assets.length < 4) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Incomplete set: ${assets?.length ?? 0}/4 slots filled`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Validate exactly 4 required slots ──
    const bySlot: Record<string, AssetRow> = {};
    for (const a of assets) {
      if (!REQUIRED_SLOTS.includes(a.slot_key as typeof REQUIRED_SLOTS[number])) {
        return new Response(
          JSON.stringify({ success: false, message: `Unknown slot: ${a.slot_key}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!a.storage_path || a.storage_path.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: `Empty storage path for slot ${a.slot_key}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      bySlot[a.slot_key] = a;
    }

    for (const slot of REQUIRED_SLOTS) {
      if (!bySlot[slot]) {
        return new Response(
          JSON.stringify({ success: false, message: `Missing required slot: ${slot}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 5. Copy all 4 files from drafts → public ──
    const copier = adminClient.storage.from(DRAFT_BUCKET);
    const publicStore = adminClient.storage.from(PUBLIC_BUCKET);

    for (const slot of REQUIRED_SLOTS) {
      const asset = bySlot[slot];
      const sourcePath = asset.storage_path;

      // Download from private bucket
      const { data: fileData, error: dlError } = await copier.download(sourcePath);
      if (dlError || !fileData) {
        await cleanupCopies(publicStore, newPublicPaths);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to download draft file for ${slot}: ${dlError?.message ?? "unknown error"}`,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine extension from original path
      const ext = sourcePath.split(".").pop()?.toLowerCase() || "webp";
      const destPath = `hero/${draftSet.page_key}/${slot}/${crypto.randomUUID()}.${ext}`;

      // Upload to public bucket
      const contentType = asset.mime_type || `image/${ext === "jpg" ? "jpeg" : ext}`;
      const { error: upError } = await publicStore.upload(destPath, fileData, {
        contentType,
        upsert: false,
      });

      if (upError) {
        await cleanupCopies(publicStore, newPublicPaths);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to copy file for ${slot} to public bucket: ${upError.message}`,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newPublicPaths.push(destPath);
    }

    // ── 6. Update asset rows with new public paths ──
    const updatePromises = REQUIRED_SLOTS.map((slot, idx) => {
      const asset = bySlot[slot];
      return adminClient
        .from("site_hero_assets")
        .update({ storage_path: newPublicPaths[idx], updated_at: new Date().toISOString() })
        .eq("id", asset.id)
        .eq("hero_set_id", draftSetId);
    });

    const updateResults = await Promise.all(updatePromises);
    for (const r of updateResults) {
      if (r.error) {
        await cleanupCopies(publicStore, newPublicPaths);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to update asset paths: ${r.error.message}`,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 7. Call publish_site_hero_set RPC ──
    const { data: publishResult, error: pubError } = await userClient.rpc(
      "publish_site_hero_set",
      { p_set_id: draftSetId }
    );

    if (pubError) {
      // DB publish failed — clean up copied files and revert asset paths
      await cleanupCopies(publicStore, newPublicPaths);
      // Revert asset paths back to original draft paths
      const revertPromises = REQUIRED_SLOTS.map((slot) => {
        const asset = bySlot[slot];
        return adminClient
          .from("site_hero_assets")
          .update({ storage_path: asset.storage_path, updated_at: new Date().toISOString() })
          .eq("id", asset.id)
          .eq("hero_set_id", draftSetId);
      });
      await Promise.all(revertPromises);

      return new Response(
        JSON.stringify({
          success: false,
          message: `Database publish failed: ${pubError.message}. File cleanup attempted.`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resultStr = typeof publishResult === "string" ? publishResult : String(publishResult ?? "");
    if (resultStr.startsWith("error:")) {
      await cleanupCopies(publicStore, newPublicPaths);
      const revertPromises = REQUIRED_SLOTS.map((slot) => {
        const asset = bySlot[slot];
        return adminClient
          .from("site_hero_assets")
          .update({ storage_path: asset.storage_path, updated_at: new Date().toISOString() })
          .eq("id", asset.id)
          .eq("hero_set_id", draftSetId);
      });
      await Promise.all(revertPromises);

      return new Response(
        JSON.stringify({ success: false, message: resultStr }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 8. Success ──
    console.log(
      `[publish-site-hero] Published ${draftSet.page_key} v${draftSet.version_number} by ${user.id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Published successfully",
        published_version: draftSet.version_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[publish-site-hero] Unexpected error:", message);

    // Best-effort cleanup of any files already copied
    if (newPublicPaths.length > 0) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        await cleanupCopies(adminClient.storage.from(PUBLIC_BUCKET), newPublicPaths);
      } catch {
        console.error("[publish-site-hero] Cleanup after crash also failed");
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: `Unexpected error: ${message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Best-effort cleanup of already-copied files. Failures are logged but
 * not re-thrown — orphaned files will be collected by the periodic
 * orphan-cleanup job.
 */
async function cleanupCopies(
  publicStore: ReturnType<ReturnType<typeof createClient>["storage"]["from"]>,
  paths: string[]
): Promise<void> {
  for (const path of paths) {
    try {
      await publicStore.remove([path]);
    } catch {
      console.error(`[publish-site-hero] Failed to clean up orphan: ${path}`);
    }
  }
}
