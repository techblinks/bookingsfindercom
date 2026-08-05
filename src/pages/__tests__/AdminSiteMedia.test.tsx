/**
 * AdminSiteMedia tests — hero media manager with upload, publish, revert, and preview.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* ──────────────────────────────────────────────────────────────
   Hoisted controllable state + spies shared across all mocks
   ────────────────────────────────────────────────────────────── */
const H = vi.hoisted(() => ({
  isAdmin: true,
  authLoading: false,

  /* supabase data */
  publishedData: null as Record<string, unknown> | null,
  draftData: null as Record<string, unknown> | null,
  historyData: [] as Record<string, unknown>[],

  /* storage */
  signedUrl: "https://cdn.draft.test/hero/home/main/abc.webp",

  /* spies */
  spyRpc: vi.fn(),
  spyStorageUpload: vi.fn(),
  spyStorageRemove: vi.fn(),
  spyEdgeFetch: vi.fn(),
  spyInsert: vi.fn(),
  spyUpdate: vi.fn(),
}));

/* ──────────────────────────────────────────────────────────────
   Mock modules
   ────────────────────────────────────────────────────────────── */

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ isAdmin: H.isAdmin, isLoading: H.authLoading }),
}));

vi.mock("@/hooks/useHeroMedia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useHeroMedia")>();
  return { ...actual, invalidateHeroMediaCache: vi.fn() };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/hero/HeroMediaCollage", () => ({
  default: ({ pageKey, previewSet }: { pageKey: string; previewSet: unknown }) => (
    <div data-testid="hero-media-collage" data-page-key={pageKey} data-preview={!!previewSet}>
      HeroMediaCollage
    </div>
  ),
}));

/* ──────────────────────────────────────────────────────────────
   Supabase mock — builders are thenable (supabase-js convention)
   ────────────────────────────────────────────────────────────── */

let supabaseCallIdx = 0;

function resetSupabaseCalls() {
  supabaseCallIdx = 0;
}

function makeBuilder(opts: {
  table?: string;
  singleResult?: unknown;
  listResult?: unknown;
  error?: unknown;
}): Record<string, Function> & { then: Function } {
  const builder: Record<string, Function> = {
    select: vi.fn(() => builder),
    insert: vi.fn((payload: unknown) => {
      H.spyInsert(payload);
      return builder;
    }),
    update: vi.fn((payload: unknown) => {
      H.spyUpdate(payload);
      return builder;
    }),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() =>
      Promise.resolve({ data: opts.singleResult ?? null, error: opts.error ?? null })
    ),
  };

  /* thenable — resolves to { data, error } for list queries (no maybeSingle) */
  builder.then = vi.fn((resolve: Function, _reject: Function) => {
    return Promise.resolve({ data: opts.listResult ?? null, error: opts.error ?? null }).then(resolve);
  });

  return builder as Record<string, Function> & { then: Function };
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: "fake-token" } }, error: null })
      ),
    },
    from: vi.fn((table: string) => {
      if (table === "site_hero_sets") {
        const idx = supabaseCallIdx++;
        /* Call 0: published query (.maybeSingle) */
        if (idx === 0) return makeBuilder({ table, singleResult: H.publishedData });
        /* Call 1: draft query (.maybeSingle) */
        if (idx === 1) return makeBuilder({ table, singleResult: H.draftData });
        /* Call 2: history query (thenable, list) */
        return makeBuilder({ table, listResult: H.historyData });
      }
      /* site_hero_assets etc. — return empty */
      return makeBuilder({});
    }),
    rpc: vi.fn((fn: string, args: unknown) => {
      H.spyRpc(fn, args);
      return Promise.resolve({ data: "ok", error: null });
    }),
    storage: {
      from: vi.fn((_bucket: string) => ({
        createSignedUrl: vi.fn((_path: string, _expiry: number) =>
          Promise.resolve({ data: { signedUrl: H.signedUrl }, error: null })
        ),
        getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: "https://cdn.test/" + path } })),
        upload: vi.fn((path: string, file: File, _opts: unknown) => {
          H.spyStorageUpload(path, file);
          return Promise.resolve({ data: {}, error: null });
        }),
        remove: vi.fn((paths: string[]) => {
          H.spyStorageRemove(paths);
          return Promise.resolve({ data: {}, error: null });
        }),
      })),
    },
  },
}));

/* ──────────────────────────────────────────────────────────────
   Global fetch mock (Edge Function)
   ────────────────────────────────────────────────────────────── */
beforeEach(() => {
  H.spyEdgeFetch.mockReset();
  H.spyEdgeFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  });
  global.fetch = H.spyEdgeFetch as unknown as typeof fetch;
  resetSupabaseCalls();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/site-media"]}>
        <AdminSiteMedia />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/* Dynamic import so mocks are in place first */
let AdminSiteMedia: React.ComponentType;
beforeEach(async () => {
  vi.resetModules();
  const mod = await import("@/pages/AdminSiteMedia");
  AdminSiteMedia = mod.default;
});

/* ──────────────────────────────────────────────────────────────
   Shared default data builders
   ────────────────────────────────────────────────────────────── */

function makeDraft(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "draft-1", page_key: "home", version_number: 1, status: "draft",
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    created_by: null, published_by: null, published_at: null, archived_at: null,
    based_on_set_id: null, notes: null,
    site_hero_assets: [],
    ...overrides,
  };
}

function makePublished(): Record<string, unknown> {
  return {
    id: "pub-1", page_key: "home", version_number: 2, status: "published",
    created_at: "2026-01-10T00:00:00Z", updated_at: "2026-01-10T00:00:00Z",
    published_at: "2026-01-10T00:00:00Z",
    created_by: null, published_by: null, archived_at: null,
    based_on_set_id: null, notes: null,
  };
}

function makeAsset(slot: string, id?: string, altText?: string): Record<string, unknown> {
  return {
    slot_key: slot, id: id || `asset-${slot}`,
    storage_path: `hero/home/${slot}/1.webp`,
    alt_text: altText ?? null, is_decorative: false,
    focal_x: 50, focal_y: 50,
    mime_type: "image/webp", file_size_bytes: 50000,
  };
}

function makeHistoryVersion(vn: number, status: string): Record<string, unknown> {
  return {
    id: `h${vn}`, page_key: "home", version_number: vn, status,
    created_at: `2026-01-${String(10 + vn).padStart(2, "0")}T00:00:00Z`,
    updated_at: `2026-01-${String(10 + vn).padStart(2, "0")}T00:00:00Z`,
    created_by: null, published_by: null, published_at: null, archived_at: null,
    based_on_set_id: null, notes: null,
  };
}

/* ──────────────────────────────────────────────────────────────
   Test suites
   ────────────────────────────────────────────────────────────── */

describe("AdminSiteMedia — auth states", () => {
  beforeEach(() => {
    H.authLoading = false;
    H.isAdmin = true;
    H.publishedData = null;
    H.draftData = null;
    H.historyData = [];
  });

  it("1. Shows loading spinner when auth is loading", () => {
    H.authLoading = true;
    renderPage();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("2. Shows 'Administrator access required' for non-admin", () => {
    H.isAdmin = false;
    H.authLoading = false;
    renderPage();
    expect(screen.getByText(/Administrator access required/i)).toBeTruthy();
  });
});

describe("AdminSiteMedia — tabs and cards", () => {
  beforeEach(() => {
    H.isAdmin = true;
    H.authLoading = false;
    H.publishedData = null;
    H.draftData = null;
    H.historyData = [];
  });

  it("3. Renders Homepage, Flights, Stays tabs", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });
    expect(screen.getByRole("tab", { name: "Flights" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Stays" })).toBeTruthy();
  });

  it("4. Shows 4 slot cards", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });
    expect(screen.getByText("Hero main image")).toBeTruthy();
    expect(screen.getByText("Supporting image 1")).toBeTruthy();
    expect(screen.getByText("Supporting image 2")).toBeTruthy();
    expect(screen.getByText("Hero mobile image")).toBeTruthy();
  });
});

describe("AdminSiteMedia — file upload", () => {
  beforeEach(() => {
    H.isAdmin = true;
    H.authLoading = false;
    H.publishedData = null;
    H.draftData = makeDraft();
    H.historyData = [H.draftData];
    /* Clear previous toast mocks */
  });

  it("5. Rejects invalid file types", async () => {
    const { toast } = await import("sonner");
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThanOrEqual(4);

    const badFile = new File(["x"], "test.txt", { type: "text/plain" });
    fireEvent.change(fileInputs[0], { target: { files: [badFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Invalid file type")
      );
    });
  });

  it("6. Rejects files over 5 MB", async () => {
    const { toast } = await import("sonner");
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const largeBuffer = new Uint8Array(6 * 1024 * 1024);
    const largeFile = new File([largeBuffer], "big.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInputs[0], { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("File too large")
      );
    });
  });
});

describe("AdminSiteMedia — draft lifecycle", () => {
  beforeEach(() => {
    H.isAdmin = true;
    H.authLoading = false;
    H.publishedData = null;
    H.draftData = null;
    H.historyData = [];
    H.spyRpc.mockClear();
  });

  it("7. 'Create Draft' button calls RPC create_site_hero_draft", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    const createBtn = screen.getByRole("button", { name: "Create Draft" });
    expect(createBtn).toBeTruthy();
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(H.spyRpc).toHaveBeenCalledWith("create_site_hero_draft", {
        p_page_key: "home",
      });
    });
  });

  it("8. Upload button disabled when no draft", async () => {
    /* H.draftData is null → no draft */
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    /* Each slot card has a hidden file input paired with an Upload button.
       When no draft exists, the disabled prop propagates via asChild.
       Find the text "Upload" and verify its parent element is disabled
       (either as <button disabled> or <span disabled role="button">). */
    const uploadTexts = screen.getAllByText("Upload");
    expect(uploadTexts.length).toBeGreaterThanOrEqual(4);
    for (const el of uploadTexts) {
      /* Walk up to the nearest element that should have disabled */
      const disabledEl = el.closest("[disabled]");
      expect(disabledEl).not.toBeNull();
    }
  });
});

describe("AdminSiteMedia — publish", () => {
  beforeEach(() => {
    H.isAdmin = true;
    H.authLoading = false;
    H.spyRpc.mockClear();
    H.spyEdgeFetch.mockClear();
    H.spyEdgeFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    global.fetch = H.spyEdgeFetch as unknown as typeof fetch;
  });

  it("9. Publish button disabled when fewer than 4 slots are filled", async () => {
    H.publishedData = null;
    H.draftData = makeDraft({
      site_hero_assets: [makeAsset("main"), makeAsset("support_1")],
    });
    H.historyData = [H.draftData];

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    const publishBtn = screen.getByRole("button", { name: "Publish Hero" });
    expect(publishBtn).toBeTruthy();
    expect(publishBtn).toBeDisabled();
  });

  it("10. Publish calls Edge Function with correct payload", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    H.publishedData = null;
    H.draftData = makeDraft({
      site_hero_assets: [
        makeAsset("main"), makeAsset("support_1"),
        makeAsset("support_2"), makeAsset("mobile"),
      ],
    });
    H.historyData = [H.draftData];

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    const publishBtn = screen.getByRole("button", { name: "Publish Hero" });
    expect(publishBtn).not.toBeDisabled();
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(H.spyEdgeFetch).toHaveBeenCalled();
    });

    const [url, init] = H.spyEdgeFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/functions/v1/publish-site-hero");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ draftSetId: "draft-1" });
  });

  it("11. Publish shows confirmation dialog", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    H.publishedData = null;
    H.draftData = makeDraft({
      site_hero_assets: [
        makeAsset("main"), makeAsset("support_1"),
        makeAsset("support_2"), makeAsset("mobile"),
      ],
    });
    H.historyData = [H.draftData];

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Hero" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("Publish this hero set")
    );
    expect(H.spyEdgeFetch).not.toHaveBeenCalled();
  });
});

describe("AdminSiteMedia — version history", () => {
  beforeEach(() => {
    H.isAdmin = true;
    H.authLoading = false;
    H.spyRpc.mockClear();
  });

  it("12. Version history renders", async () => {
    H.publishedData = null;
    H.draftData = makeDraft({ version_number: 3, site_hero_assets: [] });
    H.historyData = [
      H.draftData,
      makeHistoryVersion(2, "archived"),
      makeHistoryVersion(1, "archived"),
    ];

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    /* Click "Version History" toggle (note: spacing is "Version History") */
    fireEvent.click(screen.getByRole("button", { name: /Version History/i }));

    await waitFor(() => {
      expect(screen.getByText("v3")).toBeTruthy();
    });
    expect(screen.getByText("v2")).toBeTruthy();
    expect(screen.getByText("v1")).toBeTruthy();
  });

  it("13. Revert calls RPC with correct params", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    H.publishedData = null;
    H.draftData = makeDraft({ version_number: 3, site_hero_assets: [] });
    H.historyData = [
      H.draftData,
      makeHistoryVersion(2, "archived"),
    ];

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Version History/i }));

    await waitFor(() => {
      expect(screen.getByText("v2")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Revert to v2" }));

    await waitFor(() => {
      expect(H.spyRpc).toHaveBeenCalledWith("revert_site_hero_set", {
        p_page_key: "home",
        p_version_number: 2,
      });
    });
  });
});

describe("AdminSiteMedia — disable and discard", () => {
  beforeEach(() => {
    H.isAdmin = true;
    H.authLoading = false;
    H.spyRpc.mockClear();
  });

  it("14. Disable custom hero shows confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    H.publishedData = makePublished();
    H.draftData = makeDraft({ site_hero_assets: [makeAsset("main")] });
    H.historyData = [H.draftData, H.publishedData];

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Use built-in fallback/i }));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("Disable custom hero")
    );
    expect(H.spyRpc).not.toHaveBeenCalledWith(
      "disable_custom_site_hero",
      expect.anything()
    );
  });

  it("15. Discard draft shows confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    H.publishedData = null;
    H.draftData = makeDraft({ site_hero_assets: [makeAsset("main")] });
    H.historyData = [H.draftData];

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Discard Draft/i }));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("Permanently discard the current draft")
    );
    expect(H.spyRpc).not.toHaveBeenCalledWith(
      "discard_site_hero_draft",
      expect.anything()
    );
  });
});

describe("AdminSiteMedia — metadata editor", () => {
  beforeEach(() => {
    H.isAdmin = true;
    H.authLoading = false;
    H.signedUrl = "https://cdn.draft.test/1.webp";
    H.publishedData = null;
    H.draftData = makeDraft({
      site_hero_assets: [
        makeAsset("main", "asset-main", "A scenic view"),
        makeAsset("support_1", "asset-s1"),
        makeAsset("support_2", "asset-s2"),
        makeAsset("mobile", "asset-mob"),
      ],
    });
    H.historyData = [H.draftData];
  });

  it("16. Metadata editor opens for a slot", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    const editBtns = screen.getAllByRole("button", { name: "Edit metadata" });
    expect(editBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(editBtns[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Descriptive alt text")).toBeTruthy();
    });

    const altInput = screen.getByPlaceholderText("Descriptive alt text") as HTMLInputElement;
    expect(altInput.value).toBe("A scenic view");
    expect(screen.getByRole("checkbox", { name: /Decorative/i })).toBeTruthy();
  });

  it("17. Focal controls render as sliders", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Homepage" })).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit metadata" })[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Descriptive alt text")).toBeTruthy();
    });

    /* Both focal X and Y are range inputs */
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    expect(rangeInputs.length).toBe(2);

    expect(screen.getByText("Focal X (0-100)")).toBeTruthy();
    expect(screen.getByText("Focal Y (0-100)")).toBeTruthy();

    /* Each slider displays current value as percentage */
    const percentages = screen.getAllByText("50%");
    expect(percentages.length).toBeGreaterThanOrEqual(2);
  });
});
