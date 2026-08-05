/**
 * HeroMediaCollage — comprehensive tests.
 *
 * Covers:
 *   1.  desktop: 3-img grid when backend data present
 *   2.  mobile:  1-img when backend data present
 *   3.  focalX / focalY → object-position inline style
 *   4.  decorative slot → alt=""
 *   5.  non‑decorative slot → altText
 *   6.  one image error → only that slot falls back; others intact
 *   7.  full backend collage → zero local-fallback URLs
 *   8.  homepage fallback → local images when no backend data
 *   9.  flights fallback → returns null (no DOM)
 *   10. stays fallback → returns null (no DOM)
 *   11. previewSet → renders preview data, ignoring useHeroMedia
 *   12. className prop → applied to container div
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HeroMediaCollage from "@/components/hero/HeroMediaCollage";
import type { HeroMediaSet } from "@/types/hero";

/* ------------------------------------------------------------------ */
/*  Hoisted mock fns so vi.mock factories can close over them          */
/* ------------------------------------------------------------------ */
const { mockUseHeroMedia, mockUseIsMobile } = vi.hoisted(() => ({
  mockUseHeroMedia: vi.fn(),
  mockUseIsMobile: vi.fn(),
}));

vi.mock("@/hooks/useHeroMedia", () => ({
  useHeroMedia: mockUseHeroMedia,
  // re‑export types so the component's type import doesn't break
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: mockUseIsMobile,
}));

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** A complete backend HeroMediaSet with varied slot data. */
const backendSet: HeroMediaSet = {
  main: {
    storagePath: "hero/main.webp",
    publicUrl: "https://cdn.example.com/hero/main.webp",
    altText: "Main hero image",
    isDecorative: false,
    focalX: 30,
    focalY: 70,
  },
  support1: {
    storagePath: "hero/support1.webp",
    publicUrl: "https://cdn.example.com/hero/support1.webp",
    altText: null,
    isDecorative: true,
    focalX: 50,
    focalY: 50,
  },
  support2: {
    storagePath: "hero/support2.webp",
    publicUrl: "https://cdn.example.com/hero/support2.webp",
    altText: "Support image two",
    isDecorative: false,
    focalX: 20,
    focalY: 80,
  },
  mobile: {
    storagePath: "hero/mobile.webp",
    publicUrl: "https://cdn.example.com/hero/mobile.webp",
    altText: null,
    isDecorative: true,
    focalX: 60,
    focalY: 40,
  },
  version: 5,
};

/** A distinct preview set so we can verify it overrides the hook. */
const previewSet: HeroMediaSet = {
  main: {
    storagePath: "draft/main.webp",
    publicUrl: "https://cdn.example.com/draft/main.webp",
    altText: "Draft main",
    isDecorative: false,
    focalX: 10,
    focalY: 90,
  },
  support1: {
    storagePath: "draft/s1.webp",
    publicUrl: "https://cdn.example.com/draft/s1.webp",
    altText: null,
    isDecorative: true,
    focalX: 50,
    focalY: 50,
  },
  support2: {
    storagePath: "draft/s2.webp",
    publicUrl: "https://cdn.example.com/draft/s2.webp",
    altText: "Draft s2",
    isDecorative: false,
    focalX: 80,
    focalY: 20,
  },
  mobile: {
    storagePath: "draft/m.webp",
    publicUrl: "https://cdn.example.com/draft/m.webp",
    altText: null,
    isDecorative: true,
    focalX: 50,
    focalY: 50,
  },
  version: 1,
};

/** Render helper — wraps in QueryClientProvider (useHeroMedia uses react-query). */
function renderCollage(
  props: {
    pageKey?: "home" | "flights" | "stays";
    className?: string;
    previewSet?: HeroMediaSet | null;
  } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HeroMediaCollage pageKey="home" {...props} />
    </QueryClientProvider>,
  );
}

/** Return every <img> in the container (or whole document). */
function allImgs(): HTMLImageElement[] {
  return Array.from(document.querySelectorAll("img"));
}

/* ------------------------------------------------------------------ */
/*  beforeEach – reset mocks to sensible defaults                     */
/* ------------------------------------------------------------------ */
beforeEach(() => {
  vi.clearAllMocks();
  // Default: desktop, backend data present
  mockUseIsMobile.mockReturnValue(false);
  mockUseHeroMedia.mockReturnValue({
    data: backendSet,
    isLoading: false,
    error: null,
    isComplete: true,
    isUsingFallback: false,
  });
});

/* ================================================================== */
/*  Tests                                                              */
/* ================================================================== */

describe("HeroMediaCollage — desktop (useIsMobile → false)", () => {
  it("1. renders 3 img elements when backend data is present", () => {
    renderCollage();
    const imgs = allImgs();
    expect(imgs).toHaveLength(3);
  });

  it("desktop container has the lg:grid layout class", () => {
    renderCollage();
    // The outer div is the desktop-only container
    const container = document.querySelector(".lg\\:grid");
    expect(container).toBeTruthy();
  });

  it("container is aria-hidden (decorative)", () => {
    renderCollage();
    const container = document.querySelector('[aria-hidden="true"]');
    expect(container).toBeTruthy();
  });
});

describe("HeroMediaCollage — mobile (useIsMobile → true)", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(true);
  });

  it("2. renders exactly 1 img element", () => {
    renderCollage();
    expect(allImgs()).toHaveLength(1);
  });

  it("mobile container uses aspect-[16/9]", () => {
    renderCollage();
    const container = document.querySelector(".aspect-\\[16\\/9\\]");
    expect(container).toBeTruthy();
  });
});

describe("HeroMediaCollage — focalX / focalY → object-position", () => {
  it("3. backend main image gets objectPosition from focalX/focalY", () => {
    renderCollage();
    const imgs = allImgs();
    // main is the first image in the desktop grid (col-span-2 row)
    const mainImg = imgs[0];
    expect(mainImg.style.objectPosition).toBe("30% 70%");
  });

  it("backend support1 image gets its own focal point", () => {
    renderCollage();
    const imgs = allImgs();
    // support1 is the second image
    const s1 = imgs[1];
    expect(s1.style.objectPosition).toBe("50% 50%");
  });

  it("backend support2 image gets 20% 80%", () => {
    renderCollage();
    const imgs = allImgs();
    const s2 = imgs[2];
    expect(s2.style.objectPosition).toBe("20% 80%");
  });

  it("mobile slot gets its focal point when mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    renderCollage();
    const img = allImgs()[0];
    expect(img.style.objectPosition).toBe("60% 40%");
  });
});

describe("HeroMediaCollage — alt text", () => {
  it("4. decorative slot (support1) uses alt=\"\"", () => {
    renderCollage();
    const imgs = allImgs();
    const s1 = imgs[1]; // support1 is decorative
    expect(s1.getAttribute("alt")).toBe("");
  });

  it("5. non‑decorative slot (main) uses altText", () => {
    renderCollage();
    const imgs = allImgs();
    const mainImg = imgs[0];
    expect(mainImg.getAttribute("alt")).toBe("Main hero image");
  });

  it("non‑decorative slot (support2) uses its altText", () => {
    renderCollage();
    const imgs = allImgs();
    const s2 = imgs[2];
    expect(s2.getAttribute("alt")).toBe("Support image two");
  });
});

describe("HeroMediaCollage — image error fallback", () => {
  it("6. one image error → only that slot falls back; other images unchanged", () => {
    renderCollage();
    const imgsBefore = allImgs();
    expect(imgsBefore).toHaveLength(3);

    // Verify all 3 are backend URLs before error
    for (const img of imgsBefore) {
      expect(img.src).toContain("cdn.example.com");
    }

    // Fire error on the main image (first one)
    fireEvent.error(imgsBefore[0]);

    const imgsAfter = allImgs();
    expect(imgsAfter).toHaveLength(3);

    // main should now be a local fallback
    expect(imgsAfter[0].src).not.toContain("cdn.example.com");
    expect(imgsAfter[0].src).toContain("/flights/hero/");

    // support1 and support2 should still be backend URLs
    expect(imgsAfter[1].src).toContain("cdn.example.com");
    expect(imgsAfter[2].src).toContain("cdn.example.com");
  });

  it("errored mobile slot falls back to local fallback", () => {
    mockUseIsMobile.mockReturnValue(true);
    renderCollage();
    const img = allImgs()[0];
    expect(img.src).toContain("cdn.example.com");

    fireEvent.error(img);

    const after = allImgs()[0];
    expect(after.src).not.toContain("cdn.example.com");
    expect(after.src).toContain("/flights/hero/");
  });
});

describe("HeroMediaCollage — full backend collage (no fallback leakage)", () => {
  it("7. zero local-fallback URLs when all 4 backend images succeed", () => {
    renderCollage();
    const imgs = allImgs();
    expect(imgs).toHaveLength(3);

    for (const img of imgs) {
      expect(img.src).toContain("cdn.example.com");
      expect(img.src).not.toContain("/flights/hero/");
      // version query param
      expect(img.src).toContain("?v=5");
    }
  });

  it("mobile: backend URL + version param, no fallback", () => {
    mockUseIsMobile.mockReturnValue(true);
    renderCollage();
    const img = allImgs()[0];
    expect(img.src).toContain("cdn.example.com");
    expect(img.src).toContain("?v=5");
    expect(img.src).not.toContain("/flights/hero/");
  });
});

/* ------------------------------------------------------------------ */
/*  Fallback rendering (hook says "no data")                           */
/* ------------------------------------------------------------------ */

describe("HeroMediaCollage — homepage fallback", () => {
  beforeEach(() => {
    mockUseHeroMedia.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isComplete: false,
      isUsingFallback: true,
    });
  });

  it("8. homepage renders local fallback images (3 on desktop)", () => {
    renderCollage({ pageKey: "home" });
    const imgs = allImgs();
    expect(imgs).toHaveLength(3);

    for (const img of imgs) {
      expect(img.src).toContain("/flights/hero/");
      expect(img.src).not.toContain("cdn.example.com");
    }
  });

  it("homepage mobile fallback renders 1 local image with srcSet", () => {
    mockUseIsMobile.mockReturnValue(true);
    renderCollage({ pageKey: "home" });
    const imgs = allImgs();
    expect(imgs).toHaveLength(1);
    expect(imgs[0].src).toContain("/flights/hero/hero-wide-960.webp");
    expect(imgs[0].getAttribute("srcset")).toBeTruthy();
  });

  it("homepage fallback images are decorative (alt=\"\")", () => {
    renderCollage({ pageKey: "home" });
    for (const img of allImgs()) {
      expect(img.getAttribute("alt")).toBe("");
    }
  });
});

describe("HeroMediaCollage — flights fallback → null", () => {
  beforeEach(() => {
    mockUseHeroMedia.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isComplete: false,
      isUsingFallback: true,
    });
  });

  it("9. flights pageKey with no backend data returns null (no DOM output)", () => {
    const { container } = renderCollage({ pageKey: "flights" });
    expect(container.innerHTML).toBe("");
    expect(allImgs()).toHaveLength(0);
  });
});

describe("HeroMediaCollage — stays fallback → null", () => {
  beforeEach(() => {
    mockUseHeroMedia.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isComplete: false,
      isUsingFallback: true,
    });
  });

  it("10. stays pageKey with no backend data returns null", () => {
    const { container } = renderCollage({ pageKey: "stays" });
    expect(container.innerHTML).toBe("");
    expect(allImgs()).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  previewSet                                                         */
/* ------------------------------------------------------------------ */

describe("HeroMediaCollage — previewSet", () => {
  beforeEach(() => {
    // Hook returns some unrelated data, but previewSet should win
    mockUseHeroMedia.mockReturnValue({
      data: backendSet,
      isLoading: false,
      error: null,
      isComplete: true,
      isUsingFallback: false,
    });
  });

  it("11. previewSet renders preview images instead of hook data", () => {
    renderCollage({ previewSet });
    const imgs = allImgs();
    expect(imgs).toHaveLength(3);

    // All src should come from previewSet, not backendSet
    for (const img of imgs) {
      expect(img.src).toContain("cdn.example.com/draft/");
      expect(img.src).not.toContain("cdn.example.com/hero/");
    }
  });

  it("previewSet overrides even when hook says fallback", () => {
    mockUseHeroMedia.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isComplete: false,
      isUsingFallback: true,
    });
    renderCollage({ previewSet });
    const imgs = allImgs();
    expect(imgs).toHaveLength(3);
    expect(imgs[0].src).toContain("cdn.example.com/draft/");
  });

  it("previewSet alt text is used", () => {
    renderCollage({ previewSet });
    const imgs = allImgs();
    // main: "Draft main"
    expect(imgs[0].getAttribute("alt")).toBe("Draft main");
    // support1: decorative → ""
    expect(imgs[1].getAttribute("alt")).toBe("");
    // support2: "Draft s2"
    expect(imgs[2].getAttribute("alt")).toBe("Draft s2");
  });

  it("previewSet focal points are applied", () => {
    renderCollage({ previewSet });
    const imgs = allImgs();
    expect(imgs[0].style.objectPosition).toBe("10% 90%");
    expect(imgs[1].style.objectPosition).toBe("50% 50%");
    expect(imgs[2].style.objectPosition).toBe("80% 20%");
  });
});

/* ------------------------------------------------------------------ */
/*  className                                                          */
/* ------------------------------------------------------------------ */

describe("HeroMediaCollage — className prop", () => {
  it("12. className is applied to the container div (desktop)", () => {
    const { container } = renderCollage({ className: "my-custom-class" });
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("my-custom-class");
  });

  it("className is applied to the mobile container too", () => {
    mockUseIsMobile.mockReturnValue(true);
    const { container } = renderCollage({ className: "mobile-extra" });
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("mobile-extra");
  });
});
