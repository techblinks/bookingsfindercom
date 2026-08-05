/**
 * useHeroMedia hook tests
 *
 * Covers all return-value states, fallback logic, slot validation,
 * error handling, cache invalidation, and query lifecycle.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useHeroMedia, invalidateHeroMediaCache } from "@/hooks/useHeroMedia";
import type { HeroPageKey } from "@/types/hero";

// ---------------------------------------------------------------------------
// hoisted mutable mock data — shared across all tests, reset in beforeEach
// ---------------------------------------------------------------------------

const mockData = vi.hoisted(() => ({
  publishedSet: {
    id: "set-001",
    version_number: 3,
    status: "published",
  },
  assets: [
    {
      id: "a1",
      hero_set_id: "set-001",
      slot_key: "main",
      storage_path: "hero/home/main.webp",
      alt_text: "Main hero",
      is_decorative: false,
      focal_x: 0.5,
      focal_y: 0.3,
    },
    {
      id: "a2",
      hero_set_id: "set-001",
      slot_key: "support_1",
      storage_path: "hero/home/support1.webp",
      alt_text: null,
      is_decorative: true,
      focal_x: 0.5,
      focal_y: 0.5,
    },
    {
      id: "a3",
      hero_set_id: "set-001",
      slot_key: "support_2",
      storage_path: "hero/home/support2.webp",
      alt_text: "Support two",
      is_decorative: false,
      focal_x: 0.7,
      focal_y: 0.4,
    },
    {
      id: "a4",
      hero_set_id: "set-001",
      slot_key: "mobile",
      storage_path: "hero/home/mobile.webp",
      alt_text: "Mobile hero",
      is_decorative: false,
      focal_x: 0.5,
      focal_y: 0.5,
    },
  ] as {
    id: string;
    hero_set_id: string;
    slot_key: string;
    storage_path: string;
    alt_text: string | null;
    is_decorative: boolean;
    focal_x: number;
    focal_y: number;
  }[],
}));

// ---------------------------------------------------------------------------
// supabase chain builder — mimics the actual supabase query API
// ---------------------------------------------------------------------------

function buildSupabaseMock() {
  const eq = vi.fn().mockReturnThis();
  const limit = vi.fn().mockReturnThis();

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "site_hero_sets") {
      const select = vi.fn().mockReturnValue({ eq, limit });
      return { select };
    }
    if (table === "site_hero_assets") {
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    return { select: vi.fn().mockReturnValue({ eq, limit }) };
  });

  const getPublicUrl = vi
    .fn()
    .mockImplementation((storagePath: string) => ({
      data: { publicUrl: `https://supabase.example/storage/v1/object/public/site-media/${storagePath}` },
    }));

  const storage = {
    from: vi.fn().mockReturnValue({ getPublicUrl }),
  };

  return { from, eq, limit, storage, getPublicUrl };
}

// ---------------------------------------------------------------------------
// module-level mock
// ---------------------------------------------------------------------------

vi.mock("@/integrations/supabase/client", () => {
  const m = buildSupabaseMock();
  return {
    supabase: {
      from: m.from,
      storage: m.storage,
      _getPublicUrl: m.getPublicUrl, // expose for direct assertions
    },
  };
});

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function wrapperFactory(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

const pageKey: HeroPageKey = "home";

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Rebuild supabase mock so eq/limit etc. are fresh per-test
  const rebuilt = buildSupabaseMock();
  const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
  supabaseMock.from = rebuilt.from;
  supabaseMock.storage = rebuilt.storage;

  // Default: full happy path
  rebuilt.eq.mockImplementation((_col: string, _val: unknown) => {
    // Check whether this is site_hero_sets limit chain
    // The chain is: select → eq("page_key",X) → eq("status","published") → limit(1)
    // We can't easily distinguish here, so set up a resolve tracker on the from call.

    // Return `this` to allow chaining — actual resolution is set on `from` below.
    return { eq: rebuilt.eq, limit: rebuilt.limit };
  });

  // ---- Wire up `from` for happy path ----
  rebuilt.from.mockImplementation((table: string) => {
    if (table === "site_hero_sets") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [mockData.publishedSet],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "site_hero_assets") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [...mockData.assets],
            error: null,
          }),
        }),
      };
    }
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
});

// ===========================================================================
// Tests
// ===========================================================================

describe("useHeroMedia", () => {
  // -----------------------------------------------------------------------
  // 1. Happy path — complete set with all 4 slots
  // -----------------------------------------------------------------------
  it("returns complete HeroMediaSet when all 4 slots are present", async () => {
    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      main: {
        storagePath: "hero/home/main.webp",
        publicUrl: "https://supabase.example/storage/v1/object/public/site-media/hero/home/main.webp",
        altText: "Main hero",
        isDecorative: false,
        focalX: 0.5,
        focalY: 0.3,
      },
      support1: {
        storagePath: "hero/home/support1.webp",
        publicUrl: "https://supabase.example/storage/v1/object/public/site-media/hero/home/support1.webp",
        altText: null,
        isDecorative: true,
        focalX: 0.5,
        focalY: 0.5,
      },
      support2: {
        storagePath: "hero/home/support2.webp",
        publicUrl: "https://supabase.example/storage/v1/object/public/site-media/hero/home/support2.webp",
        altText: "Support two",
        isDecorative: false,
        focalX: 0.7,
        focalY: 0.4,
      },
      mobile: {
        storagePath: "hero/home/mobile.webp",
        publicUrl: "https://supabase.example/storage/v1/object/public/site-media/hero/home/mobile.webp",
        altText: "Mobile hero",
        isDecorative: false,
        focalX: 0.5,
        focalY: 0.5,
      },
      version: 3,
    });
  });

  // -----------------------------------------------------------------------
  // 2. No published set → null
  // -----------------------------------------------------------------------
  it("returns null / isUsingFallback when no published set exists", async () => {
    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isUsingFallback).toBe(true);
    expect(result.current.isComplete).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 3. Fewer than 4 assets → null
  // -----------------------------------------------------------------------
  it("returns null when fewer than 4 assets are returned", async () => {
    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockData.publishedSet],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "site_hero_assets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockData.assets[0], mockData.assets[1]], // only 2 assets
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isUsingFallback).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 4. Required slot missing (e.g. no 'mobile')
  // -----------------------------------------------------------------------
  it("returns null when a required slot is missing", async () => {
    // 3 assets covering main, support_1, support_2 — intentionally no 'mobile'
    const threeAssetsNoMobile = [
      { ...mockData.assets[0], slot_key: "main" },
      { ...mockData.assets[1], slot_key: "support_1" },
      { ...mockData.assets[2], slot_key: "support_2" },
      // intentionally missing mobile
    ];

    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockData.publishedSet],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "site_hero_assets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: threeAssetsNoMobile,
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isUsingFallback).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 5. Malformed / unknown slot_key → null
  // -----------------------------------------------------------------------
  it("returns null when a slot has an unknown slot_key", async () => {
    const assetsWithBadSlot = mockData.assets.map((a, i) =>
      i === 3 ? { ...a, slot_key: "not_a_valid_slot" } : a
    );

    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockData.publishedSet],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "site_hero_assets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: assetsWithBadSlot,
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isUsingFallback).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 6. Supabase query throws error
  // -----------------------------------------------------------------------
  it("sets error when supabase query throws", async () => {
    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error("Network error")),
            }),
          }),
        }),
      };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
    expect(result.current.data).toBeNull();
  });

  // -----------------------------------------------------------------------
  // 7. Version number from published set
  // -----------------------------------------------------------------------
  it("returns the version number from the published set", async () => {
    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: "set-v5", version_number: 42, status: "published" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "site_hero_assets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockData.assets.map((a) => ({ ...a, hero_set_id: "set-v5" })),
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.version).toBe(42);
  });

  // -----------------------------------------------------------------------
  // 8. Builds correct publicUrl from site-media bucket
  // -----------------------------------------------------------------------
  it("builds correct publicUrl from site-media bucket", async () => {
    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.main.publicUrl).toBe(
      "https://supabase.example/storage/v1/object/public/site-media/hero/home/main.webp",
    );
    expect(result.current.data?.mobile.publicUrl).toBe(
      "https://supabase.example/storage/v1/object/public/site-media/hero/home/mobile.webp",
    );
  });

  // -----------------------------------------------------------------------
  // 9. isComplete = true when data present and not loading
  // -----------------------------------------------------------------------
  it("isComplete is true when data is present and not loading", async () => {
    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isUsingFallback).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 10. isUsingFallback = true when data is null and not loading
  // -----------------------------------------------------------------------
  it("isUsingFallback is true when data is null and not loading", async () => {
    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isUsingFallback).toBe(true);
    expect(result.current.isComplete).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 11. isLoading transitions during fetch
  // -----------------------------------------------------------------------
  it("isLoading is true during fetch and false after", async () => {
    // Use a deferred promise so we can observe the loading state
    let resolveSets: (value: unknown) => void;
    const setsPromise = new Promise((resolve) => {
      resolveSets = resolve;
    });

    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue(setsPromise),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    // Should be loading immediately
    expect(result.current.isLoading).toBe(true);

    // Resolve the query
    resolveSets!({ data: [mockData.publishedSet], error: null });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 12. error set when query fails
  // -----------------------------------------------------------------------
  it("error is set when query fails (assets fetch error)", async () => {
    const supabaseMock = supabase as unknown as Record<string, vi.Mock>;
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === "site_hero_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockData.publishedSet],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "site_hero_assets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error("Database timeout")),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const qc = createQueryClient();
    const { result } = renderHook(() => useHeroMedia(pageKey), {
      wrapper: wrapperFactory(qc),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Database timeout");
  });
});

// ===========================================================================
// invalidateHeroMediaCache
// ===========================================================================

describe("invalidateHeroMediaCache", () => {
  it("calls queryClient.invalidateQueries with ['heroMedia']", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateHeroMediaCache(queryClient);

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["heroMedia"] });
  });
});
