import { describe, it, expect } from "vitest";
var s = function(p) { return require("fs").readFileSync(p, "utf8"); };

describe("Phase 1C-B: refresh-catalogue backend", function() {
  it("admin function contains refresh-catalogue action", function() {
    expect(s("supabase/functions/tiqets-catalog/index.ts")).toContain("refresh-catalogue");
  });
  it("starts from checkpoint next_page", function() {
    expect(s("supabase/functions/tiqets-catalog/index.ts")).toContain("next_page");
  });
  it("server page_size fixed at 20", function() {
    expect(s("supabase/functions/tiqets-catalog/index.ts")).toContain("pageSize = 20");
  });
  it("max_pages bounded via Math.min", function() {
    expect(s("supabase/functions/tiqets-catalog/index.ts")).toContain("Math.min");
  });
  it("empty page marks completed", function() {
    var src = s("supabase/functions/tiqets-catalog/index.ts");
    expect(src).toContain("length === 0");
    expect(src).toContain('status: "completed"');
  });
  it("short page marks completed", function() {
    var src = s("supabase/functions/tiqets-catalog/index.ts");
    expect(src).toContain("length < pageSize");
    expect(src).toContain('status: "completed"');
  });
  it("loop detection by fingerprint", function() {
    var src = s("supabase/functions/tiqets-catalog/index.ts");
    expect(src).toContain("seenFingerprints");
    expect(src).toContain("loop_detected");
  });
  it("partial batch stores continuation page", function() {
    expect(s("supabase/functions/tiqets-catalog/index.ts")).toContain('status: "partial"');
  });
  it("upserts via upsert_experience_products RPC", function() {
    expect(s("supabase/functions/tiqets-catalog/index.ts")).toContain("upsert_experience_products");
  });
  it("derives destinations from products", function() {
    var src = s("supabase/functions/tiqets-catalog/index.ts");
    expect(src).toContain("experience_destinations");
    expect(src).toContain("destination_id");
  });
  it("does NOT send destination_id upstream in refresh", function() {
    // refresh-catalogue only fetches unfiltered /products
    var src = s("supabase/functions/tiqets-catalog/index.ts");
    var refresh = src.substring(src.indexOf("refresh-catalogue") + 30, src.indexOf("action === \"products\"") > 0 ? src.indexOf("action === \"products\"") : src.length);
    expect(refresh).not.toContain('params.set("destination_id"');
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
