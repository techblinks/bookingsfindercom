/**
 * Things V2 (T2D-B2B-5C) — provider → canonical mapping client tests.
 *
 * Locks the mapping service contract (matrix A–R):
 *
 *   A.  builds ONE map-provider-products request for multiple products
 *   B.  sends provider + providerProductId only
 *   C.  does not send title/city/outboundUrl
 *   D.  zero items causes no function invocation
 *   E.  valid Tiqets mapping accepted
 *   F.  valid Viator mapping accepted
 *   G.  draft accepted
 *   H.  published accepted
 *   I.  archived rejected
 *   J.  malformed status rejected
 *   K.  malformed mappings array fails safe
 *   L.  unsupported provider mapping ignored
 *   M.  mapping for identity not in request ignored
 *   N.  malformed destination slug ignored
 *   O.  malformed activity slug ignored
 *   P.  canonicalPath inconsistent with returned slugs ignored
 *   Q.  same providerProductId across two providers remains separate
 *   R.  function/network error produces mapping-unavailable state, not thrown
 *
 * The supabase client is mocked at the module boundary; no network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapProviderProducts,
  providerScopedKey,
  type CanonicalActivityMapping,
  type ProviderIdentity,
} from "@/services/thingsActivityMapping";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

/** Canonical production-shaped fixture — lives in fixtures, never in source. */
function mapping(overrides?: Partial<CanonicalActivityMapping>): CanonicalActivityMapping {
  return {
    provider: "tiqets",
    providerProductId: "1111450",
    destinationSlug: "rome",
    activitySlug: "vatican-museums-sistine-chapel-fast-track-ticket",
    canonicalPath: "/things-to-do/rome/vatican-museums-sistine-chapel-fast-track-ticket",
    publicationStatus: "draft",
    ...overrides,
  };
}

function okResponse(mappings: unknown[] = []): { data: Record<string, unknown> } {
  return {
    data: {
      status: "ok",
      requestedCount: mappings.length,
      mappedCount: mappings.length,
      mappings,
    },
  };
}

interface InvokeArgs {
  action?: unknown;
  items?: Array<Record<string, unknown>>;
}

function invokeArgs(): InvokeArgs {
  const call = invokeMock.mock.calls[0] as [string, { body?: Record<string, unknown> }];
  return (call[1]?.body ?? {}) as InvokeArgs;
}

const TIQETS_1111450: ProviderIdentity = { provider: "tiqets", providerProductId: "1111450" };

beforeEach(() => {
  invokeMock.mockReset();
});

// ── REQUEST BUILDING ──────────────────────────────────────────────

describe("mapProviderProducts — request building", () => {
  it("A. builds ONE map-provider-products request for multiple products", async () => {
    invokeMock.mockResolvedValue(okResponse());
    await mapProviderProducts([
      { provider: "tiqets", providerProductId: "1111450" },
      { provider: "viator", providerProductId: "3731VATICAN" },
      { provider: "tiqets", providerProductId: "11489P12" },
    ]);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock.mock.calls[0][0]).toBe("things-activity-public");
    expect(invokeArgs()).toEqual({
      action: "map-provider-products",
      items: [
        { provider: "tiqets", providerProductId: "1111450" },
        { provider: "viator", providerProductId: "3731VATICAN" },
        { provider: "tiqets", providerProductId: "11489P12" },
      ],
    });
  });

  it("B/C. sends provider + providerProductId ONLY — never title/city/outboundUrl", async () => {
    invokeMock.mockResolvedValue(okResponse());
    await mapProviderProducts([TIQETS_1111450]);

    const body = JSON.stringify(invokeArgs());
    for (const forbidden of ["title", "city", "outboundUrl", "price", "image", "description", "rating", "url"]) {
      expect(body).not.toContain(forbidden);
    }
    expect(invokeArgs().items).toEqual([{ provider: "tiqets", providerProductId: "1111450" }]);
  });

  it("duplicate identities are deduplicated into one request item", async () => {
    invokeMock.mockResolvedValue(okResponse());
    await mapProviderProducts([TIQETS_1111450, TIQETS_1111450]);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeArgs().items).toEqual([{ provider: "tiqets", providerProductId: "1111450" }]);
  });

  it("D. zero items causes no function invocation", async () => {
    const result = await mapProviderProducts([]);

    expect(invokeMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "available", mappings: [] });
  });
});

// ── ACCEPTED MAPPINGS ─────────────────────────────────────────────

describe("mapProviderProducts — accepted mappings", () => {
  it("E. a valid Tiqets mapping is accepted (canonical production example)", async () => {
    invokeMock.mockResolvedValue(okResponse([mapping()]));
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [mapping()] });
  });

  it("F. a valid Viator mapping is accepted", async () => {
    const viator = mapping({
      provider: "viator",
      providerProductId: "3731VATICAN",
      activitySlug: "vatican-museums-sistine-chapel",
      canonicalPath: "/things-to-do/rome/vatican-museums-sistine-chapel",
    });
    invokeMock.mockResolvedValue(okResponse([viator]));
    const result = await mapProviderProducts([{ provider: "viator", providerProductId: "3731VATICAN" }]);

    expect(result).toEqual({ status: "available", mappings: [viator] });
  });

  it("G. draft mappings are accepted", async () => {
    invokeMock.mockResolvedValue(okResponse([mapping({ publicationStatus: "draft" })]));
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.mappings[0].publicationStatus).toBe("draft");
    }
  });

  it("H. published mappings are accepted", async () => {
    invokeMock.mockResolvedValue(okResponse([mapping({ publicationStatus: "published" })]));
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.mappings[0].publicationStatus).toBe("published");
    }
  });
});

// ── REJECTED / IGNORED MAPPINGS ───────────────────────────────────

describe("mapProviderProducts — rejected and ignored mappings", () => {
  it("I. archived mappings are rejected", async () => {
    invokeMock.mockResolvedValue(okResponse([mapping({ publicationStatus: "archived" })]));
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });

  it("J. a malformed top-level status fails safe", async () => {
    invokeMock.mockResolvedValue({
      data: { status: "something-else", mappings: [mapping()] },
    });
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "unavailable", mappings: [] });
  });

  it("K. a malformed mappings array fails safe (not an array)", async () => {
    invokeMock.mockResolvedValue({ data: { status: "ok", mappings: "not-an-array" } });
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "unavailable", mappings: [] });
  });

  it("K2. a missing mappings field fails safe", async () => {
    invokeMock.mockResolvedValue({ data: { status: "ok" } });
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "unavailable", mappings: [] });
  });

  it("L. an unsupported provider mapping is ignored", async () => {
    invokeMock.mockResolvedValue(
      okResponse([{ ...mapping(), provider: "getyourguide" }]),
    );
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });

  it("M. a mapping for an identity that was not requested is ignored", async () => {
    invokeMock.mockResolvedValue(
      okResponse([mapping({ providerProductId: "9999999" })]),
    );
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });

  it("N. a malformed destination slug is ignored", async () => {
    invokeMock.mockResolvedValue(
      okResponse([{ ...mapping(), destinationSlug: "Bad Slug!" }]),
    );
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });

  it("O. a malformed activity slug is ignored", async () => {
    invokeMock.mockResolvedValue(
      okResponse([{ ...mapping(), activitySlug: "BAD_SLUG" }]),
    );
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });

  it("P. a canonicalPath inconsistent with the returned slugs is ignored", async () => {
    invokeMock.mockResolvedValue(
      okResponse([{ ...mapping(), canonicalPath: "/things-to-do/paris/something-else" }]),
    );
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });

  it("a mapping missing required fields is ignored", async () => {
    invokeMock.mockResolvedValue(
      okResponse([
        {
          provider: "tiqets",
          providerProductId: "1111450",
          destinationSlug: "rome",
          // no activitySlug / canonicalPath / publicationStatus
        },
      ]),
    );
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });
});

// ── PROVIDER SCOPE ────────────────────────────────────────────────

describe("mapProviderProducts — provider scope", () => {
  it("Q. the same providerProductId across two providers stays separate", async () => {
    const tiqets = mapping({
      provider: "tiqets",
      providerProductId: "X",
      activitySlug: "tiqets-x",
      canonicalPath: "/things-to-do/rome/tiqets-x",
    });
    const viator = mapping({
      provider: "viator",
      providerProductId: "X",
      activitySlug: "viator-x",
      canonicalPath: "/things-to-do/rome/viator-x",
    });
    invokeMock.mockResolvedValue(okResponse([tiqets, viator]));
    const result = await mapProviderProducts([
      { provider: "tiqets", providerProductId: "X" },
      { provider: "viator", providerProductId: "X" },
    ]);

    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.mappings.map((m) => providerScopedKey(m.provider, m.providerProductId))).toEqual([
        "tiqets:X",
        "viator:X",
      ]);
    }
    expect(providerScopedKey("tiqets", "X")).not.toBe(providerScopedKey("viator", "X"));
  });

  it("a mapping returned for the WRONG provider with the same ID is ignored", async () => {
    // We asked for tiqets:X only; the server answers with viator:X. Because
    // the provider is part of the identity, this must NOT be trusted.
    invokeMock.mockResolvedValue(
      okResponse([
        {
          provider: "viator",
          providerProductId: "X",
          destinationSlug: "rome",
          activitySlug: "viator-x",
          canonicalPath: "/things-to-do/rome/viator-x",
          publicationStatus: "draft",
        },
      ]),
    );
    const result = await mapProviderProducts([{ provider: "tiqets", providerProductId: "X" }]);

    expect(result).toEqual({ status: "available", mappings: [] });
  });
});

// ── FAILURE SEMANTICS ─────────────────────────────────────────────

describe("mapProviderProducts — failure semantics", () => {
  it("R. a network/function failure yields mapping-unavailable, not a throw", async () => {
    invokeMock.mockRejectedValue(new Error("network down"));

    await expect(mapProviderProducts([TIQETS_1111450])).resolves.toEqual({
      status: "unavailable",
      mappings: [],
    });
  });

  it("R2. a function error response yields mapping-unavailable", async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error("function failed") });
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "unavailable", mappings: [] });
  });

  it("R3. a non-object response yields mapping-unavailable", async () => {
    invokeMock.mockResolvedValue({ data: "nonsense" });
    const result = await mapProviderProducts([TIQETS_1111450]);

    expect(result).toEqual({ status: "unavailable", mappings: [] });
  });
});
