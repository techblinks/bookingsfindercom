/**
 * Viator provider-adapter contract tests - pageSize boundary.
 *
 * Regression suite for the browser HTTP 400 from viator-public: the Things
 * page sends PAGE_SIZE 24 into the shared ExperienceSearchFilters, Tiqets
 * consumes that as its own page_size, but viator-public's Zod search schema
 * accepts pageSize only in [1, 20]. The Viator adapter must bound the value
 * before it leaves the browser.
 *
 * These tests exercise the real searchExperiences adapter (with the supabase
 * client mocked) and inspect the request bodies it actually sends to the
 * Edge Functions - observable behaviour, not implementation text.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchExperiences } from "@/services/experiences";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

interface CapturedCall {
  fn: string;
  body: Record<string, unknown>;
}

function capturedBodies(): CapturedCall[] {
  return invokeMock.mock.calls.map((call) => {
    const args = call as unknown as [string, { body?: Record<string, unknown> }];
    return { fn: args[0], body: args[1]?.body ?? {} };
  });
}

const viatorCalls = (): CapturedCall[] =>
  capturedBodies().filter((c) => c.fn === "viator-public");

const tiqetsCalls = (): CapturedCall[] =>
  capturedBodies().filter((c) => c.fn === "tiqets-public");

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (fn: string) => {
    if (fn === "tiqets-public") return { data: { products: [] } };
    if (fn === "viator-public")
      return { data: { products: [], status: "available" } };
    return { data: null, error: new Error("unexpected function: " + fn) };
  });
});

describe("Viator pageSize adapter boundary", () => {
  it("A. Things page/filter pageSize 24 is capped to 20 in the Viator request", async () => {
    await searchExperiences({
      destination: "Rome",
      destinationId: 511,
      sort: "popularity_desc",
      page: 1,
      pageSize: 24,
    });

    const viator = viatorCalls();
    expect(viator).toHaveLength(1);
    expect(viator[0].body.pageSize).toBe(20);
  });

  it("B. Tiqets request still receives page_size 24", async () => {
    await searchExperiences({ destination: "Rome", pageSize: 24 });

    const tiqets = tiqetsCalls();
    expect(tiqets).toHaveLength(1);
    expect(tiqets[0].body.page_size).toBe(24);
  });

  it("C. Viator pageSize 10 remains 10", async () => {
    await searchExperiences({ pageSize: 10 });
    expect(viatorCalls()[0].body.pageSize).toBe(10);
  });

  it("D. Viator pageSize 20 remains 20", async () => {
    await searchExperiences({ pageSize: 20 });
    expect(viatorCalls()[0].body.pageSize).toBe(20);
  });

  it("E. Viator pageSize above 20 is capped to 20", async () => {
    await searchExperiences({ pageSize: 100 });
    expect(viatorCalls()[0].body.pageSize).toBe(20);
  });

  it("undefined pageSize keeps the safe 10 default", async () => {
    await searchExperiences({});
    expect(viatorCalls()[0].body.pageSize).toBe(10);
  });

  it("F. Rome destinationId 511 remains unchanged", async () => {
    await searchExperiences({ destination: "Rome", destinationId: 511, pageSize: 24 });
    expect(viatorCalls()[0].body.destinationId).toBe(511);
  });

  it("G. sort popularity_desc still maps to relevance", async () => {
    await searchExperiences({ sort: "popularity_desc", pageSize: 24 });
    expect(viatorCalls()[0].body.sort).toBe("relevance");
  });

  it("H. no Viator request ever uses pageSize 24", async () => {
    await searchExperiences({ pageSize: 24 });
    await searchExperiences({ pageSize: 10 });
    await searchExperiences({ pageSize: 20 });
    await searchExperiences({ pageSize: 100 });
    await searchExperiences({});

    const bodies = viatorCalls().map((c) => c.body.pageSize);
    expect(bodies).not.toContain(24);
    for (const n of bodies) {
      expect(typeof n).toBe("number");
      expect(n as number).toBeGreaterThanOrEqual(1);
      expect(n as number).toBeLessThanOrEqual(20);
    }
  });
});
