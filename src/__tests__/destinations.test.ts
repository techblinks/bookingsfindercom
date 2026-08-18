import { describe, it, expect } from "vitest";
var s = function(p) { return require("fs").readFileSync(p, "utf8"); };

/**
 * T4A-P1 superseded the Phase 1C-B expectations below.
 *
 * The Phase 1C-B tests asserted that the durable sync loop existed in
 * tiqets-catalog (checkpointing, loop detection, upsert RPC). The T4A audit
 * showed that loop never compiled — it referenced an unbound `parsed` and an
 * undefined `supabaseAdmin` — and that the storage contracts underneath it are
 * unsafe. P1 removed it and made `refresh-catalogue` explicitly unavailable, so
 * these tests now assert the fail-closed state instead.
 *
 * Full behavioural coverage of the action contract lives in
 * supabase/functions/tiqets-catalog/__tests__/catalogue-contract.test.ts.
 */
describe("T4A-P1: refresh-catalogue is declared but fail-closed", function() {
  const src = s("supabase/functions/tiqets-catalog/index.ts");
  const core = s("supabase/functions/tiqets-catalog/catalogue-core.ts");

  it("declares refresh-catalogue in the action contract", function() {
    expect(core).toContain('"refresh-catalogue"');
    expect(core).toContain("CATALOGUE_ACTIONS");
  });
  it("answers refresh-catalogue with catalogue_sync_not_ready", function() {
    expect(core).toContain("catalogue_sync_not_ready");
    expect(core).toContain("CATALOGUE_SYNC_NOT_READY_STATUS = 503");
  });
  it("no longer carries the uncompilable sync loop", function() {
    expect(src).not.toContain("supabaseAdmin");
    expect(src).not.toContain("seenFingerprints");
    expect(src).not.toContain("pageSize = 20");
    expect(src).not.toContain("loop_detected");
  });
  it("no longer writes catalogue checkpoints", function() {
    expect(src).not.toContain("experience_catalog_sync_state");
    expect(src).not.toContain("next_page");
    expect(src).not.toContain('status: "partial"');
    expect(src).not.toContain('status: "completed"');
  });
  it("no longer writes catalogue products or destinations", function() {
    expect(src).not.toContain("upsert_experience_products");
    expect(src).not.toContain("experience_destinations");
    expect(src).not.toContain(".upsert(");
  });
  it("keeps the durable catalogue tables owned by the public reader only", function() {
    // Reads stay in tiqets-public; the admin function performs no catalogue write.
    expect(s("supabase/functions/tiqets-public/index.ts")).toContain("experience_products");
  });
});

describe("Phase 1C-B: catalogue-search backend", function() {
  it("public function contains catalogue-search action", function() {
    expect(s("supabase/functions/tiqets-public/index.ts")).toContain("catalogue-search");
  });
  it("queries experience_products table locally", function() {
    expect(s("supabase/functions/tiqets-public/index.ts")).toContain("experience_products");
  });
  it("supports destinationId filter", function() {
    expect(s("supabase/functions/tiqets-public/index.ts")).toContain("destinationId");
  });
  it("supports countryId filter", function() {
    expect(s("supabase/functions/tiqets-public/index.ts")).toContain("countryId");
  });
  it("supports pagination with pageSize", function() {
    expect(s("supabase/functions/tiqets-public/index.ts")).toContain("pageSize");
  });
  it("returns accurate count from Supabase count", function() {
    expect(s("supabase/functions/tiqets-public/index.ts")).toContain("count: count");
  });
});

describe("Phase 1C-B: migration completeness", function() {
  it("has upsert_experience_products RPC", function() {
    expect(s("supabase/migrations/20260808000000_phase1c_experience_destinations.sql")).toContain("upsert_experience_products");
  });
  it("has ON CONFLICT for idempotent upsert", function() {
    expect(s("supabase/migrations/20260808000000_phase1c_experience_destinations.sql")).toContain("ON CONFLICT");
  });
  it("RLS enabled on 3 tables", function() {
    var m = s("supabase/migrations/20260808000000_phase1c_experience_destinations.sql");
    var rlsCount = (m.match(/ENABLE ROW LEVEL SECURITY/g) || []).length;
    expect(rlsCount).toBeGreaterThanOrEqual(3);
  });
  it("PUBLIC execute revoked on upsert RPC", function() {
    expect(s("supabase/migrations/20260808000000_phase1c_experience_destinations.sql")).toContain("REVOKE ALL");
  });
  it("COALESCE present in upsert for null safety", function() {
    expect(s("supabase/migrations/20260808000000_phase1c_experience_destinations.sql")).toContain("COALESCE");
  });
  it("has SECURITY DEFINER on RPC", function() {
    expect(s("supabase/migrations/20260808000000_phase1c_experience_destinations.sql")).toContain("SECURITY DEFINER");
  });
  it("has SET search_path = empty string", function() {
    expect(s("supabase/migrations/20260808000000_phase1c_experience_destinations.sql")).toContain("SET search_path = ''");
  });
});
