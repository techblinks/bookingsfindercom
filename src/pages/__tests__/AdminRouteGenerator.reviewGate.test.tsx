/**
 * AdminRouteGenerator review gate — BF-0R-3 review follow-up, P0-3 and the
 * final hardening pass's optimistic-concurrency guard.
 *
 * The list previously had a one-click Publish button directly beside an
 * "Awaiting review" row, wired straight to `is_published: true` with no
 * content actually shown. This suite proves the replacement: publication is
 * reachable ONLY by opening a review dialog that shows the full generated
 * content, is clearly labelled as unsourced AI editorial copy, and requires
 * an explicit confirmation checkbox before Publish is even clickable.
 *
 * It also proves the version race is closed: review dialog open on version A
 * → row silently becomes version B (regeneration, or someone else publishing
 * it) → clicking Publish must NOT apply version B under the guise of the
 * version actually reviewed. The publish call is a conditional update keyed
 * on `updated_at` (captured when the dialog opened) plus `is_published =
 * false` and `generation_status = 'generated_pending_review'`; this suite
 * asserts both the exact WHERE-clause shape and both possible outcomes
 * (row still matches → publish; zero rows match → fail closed, no publish).
 *
 * Follows the repo's admin-page test convention (see
 * AdminFlightDestinations.test.tsx): mock useAdminAuth and the Supabase
 * client, render with MemoryRouter, drive it with Testing Library. No
 * network access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const H = vi.hoisted(() => ({
  isAdmin: true,
  authLoading: false,
  user: { id: "admin-1" } as { id: string } | null,
  // "London -> Dubai" is awaiting review and unpublished; "Paris -> Tokyo" is
  // already published. Both city pairs exist in AdminRouteGenerator's
  // internal POPULAR_ROUTES list, so their slugs will actually render.
  rows: [
    { id: "r1", slug: "london-to-dubai", generation_status: "generated_pending_review", is_published: false },
    { id: "r2", slug: "paris-to-tokyo", generation_status: "published", is_published: true },
  ],
  fullContent: {
    title: "Cheap Flights from London to Dubai | BookingsFinder",
    meta_description: "Compare live flight options from London to Dubai.",
    h1_title: "Flights from London to Dubai",
    intro_paragraph: "Search and compare flight options using BookingsFinder.",
    main_content: "## How to compare\nUse BookingsFinder to search live results.",
    travel_tips: [{ title: "Compare dates", content: "Search a few different dates." }],
    faqs: [{ question: "How do I search this route?", answer: "Enter your dates on BookingsFinder." }],
    updated_at: "2026-08-19T10:00:00.000000+00:00",
  },
  spyUpdate: vi.fn(),
  /** Every `.eq(col, val)` call chained onto the last `update(...)`, in order. */
  lastUpdateConditions: [] as [string, unknown][],
  /** What the publish update's `.select('id')` resolves to — override per test. */
  publishResult: { data: [{ id: "r1" }], error: null } as { data: unknown; error: unknown },
}));

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ user: H.user, isLoading: H.authLoading, isAdmin: H.isAdmin }),
}));
vi.mock("@/components/auth/AdminLoginForm", () => ({ AdminLoginForm: () => <div data-testid="login-form">login</div> }));
vi.mock("@/components/layout/Header", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));
vi.mock("react-helmet-async", () => ({ Helmet: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        limit: () => Promise.resolve({ data: H.rows, error: null }),
        eq: (_col: string, _val: string) => ({
          single: () => Promise.resolve({ data: H.fullContent, error: null }),
        }),
      }),
      update: (payload: unknown) => {
        H.spyUpdate(payload);
        H.lastUpdateConditions = [];
        const builder = {
          eq: (col: string, val: unknown) => {
            H.lastUpdateConditions.push([col, val]);
            return builder;
          },
          select: (_cols: string) => Promise.resolve(H.publishResult),
        };
        return builder;
      },
      upsert: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
    functions: { invoke: vi.fn() },
  },
}));

import { toast } from "sonner";

import AdminRouteGenerator from "@/pages/AdminRouteGenerator";

const renderPage = () =>
  render(<MemoryRouter initialEntries={["/admin/route-generator"]}><AdminRouteGenerator /></MemoryRouter>);

/** Narrow the huge (2000+ row) list down to the "Awaiting Review" tab. */
const goToAwaitingReview = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /Awaiting Review/i }));
};

describe("AdminRouteGenerator — review gate", () => {
  beforeEach(() => {
    H.isAdmin = true; H.authLoading = false; H.user = { id: "admin-1" };
    H.spyUpdate.mockClear();
    H.lastUpdateConditions = [];
    H.publishResult = { data: [{ id: "r1" }], error: null };
    (toast.error as ReturnType<typeof vi.fn>).mockClear();
    (toast.success as ReturnType<typeof vi.fn>).mockClear();
  }, 20000);

  /** Drives the dialog open, confirms review, and clicks Publish. */
  const reviewAndPublish = async () => {
    await goToAwaitingReview();
    fireEvent.click(within(await screen.findByTestId("route-row-london-to-dubai")).getByRole("button", { name: /^review$/i }));
    const dialog = await screen.findByTestId("route-review-dialog");
    await within(dialog).findByText(H.fullContent.title);
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^publish$/i }));
    return dialog;
  };

  it("shows a Review action for an awaiting-review row, never a direct Publish button on the row", async () => {
    renderPage();
    await goToAwaitingReview();

    const row = await screen.findByTestId("route-row-london-to-dubai");
    expect(within(row).getByRole("button", { name: /^review$/i })).toBeTruthy();
    expect(within(row).queryByRole("button", { name: /^publish$/i })).toBeNull();
    // No dialog is open yet — clicking Review is required first.
    expect(screen.queryByTestId("route-review-dialog")).toBeNull();
  }, 20000);

  it("opens the review dialog with the full generated content and an unsourced-content disclosure", async () => {
    renderPage();
    await goToAwaitingReview();

    const row = await screen.findByTestId("route-row-london-to-dubai");
    fireEvent.click(within(row).getByRole("button", { name: /^review$/i }));

    const dialog = await screen.findByTestId("route-review-dialog");
    expect(within(dialog).getByText(H.fullContent.title)).toBeTruthy();
    expect(within(dialog).getByText(H.fullContent.meta_description)).toBeTruthy();
    expect(within(dialog).getByText(H.fullContent.h1_title)).toBeTruthy();
    expect(within(dialog).getByText(/AI-generated editorial content/i)).toBeTruthy();
    expect(within(dialog).getByText(/no provider or official/i)).toBeTruthy();
  }, 20000);

  it("keeps Publish disabled until the reviewer explicitly confirms, then allows it", async () => {
    renderPage();
    await goToAwaitingReview();
    fireEvent.click(within(await screen.findByTestId("route-row-london-to-dubai")).getByRole("button", { name: /^review$/i }));

    const dialog = await screen.findByTestId("route-review-dialog");
    await within(dialog).findByText(H.fullContent.title);

    const publishBtn = within(dialog).getByRole("button", { name: /^publish$/i });
    expect(publishBtn).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("checkbox"));
    expect(publishBtn).not.toBeDisabled();
  }, 20000);

  it("publishing from the dialog updates is_published and generation_status, and only after confirmation", async () => {
    renderPage();
    await reviewAndPublish();

    await waitFor(() =>
      expect(H.spyUpdate).toHaveBeenCalledWith({ is_published: true, generation_status: "published" }),
    );
  }, 20000);

  describe("optimistic-concurrency guard (BF-0R-3 final hardening)", () => {
    it("the publish query conditions on the exact reviewed version, not just the row id", async () => {
      renderPage();
      await reviewAndPublish();

      await waitFor(() => expect(H.lastUpdateConditions.length).toBeGreaterThan(0));
      const conditions = Object.fromEntries(H.lastUpdateConditions);
      // 1 & 4: only a still-unpublished row can match.
      expect(conditions.is_published).toBe(false);
      // 3: only a row still awaiting review can match.
      expect(conditions.generation_status).toBe("generated_pending_review");
      // 2: only the EXACT version captured when the dialog opened can match.
      expect(conditions.updated_at).toBe(H.fullContent.updated_at);
    }, 20000);

    it("publishes when the row is still exactly the reviewed version", async () => {
      H.publishResult = { data: [{ id: "r1" }], error: null };
      renderPage();
      await reviewAndPublish();

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(toast.error).not.toHaveBeenCalled();
      // Dialog closes on success.
      await waitFor(() => expect(screen.queryByTestId("route-review-dialog")).toBeNull());
    }, 20000);

    it("fails closed — does not publish — when the row changed after review (regenerated / republished elsewhere)", async () => {
      // Zero rows matched the WHERE clause: the row is no longer exactly
      // what was reviewed (e.g. a regeneration bumped updated_at, or it was
      // published by another admin in the meantime).
      H.publishResult = { data: [], error: null };
      renderPage();
      await reviewAndPublish();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/changed after you opened it/i)));
      expect(toast.success).not.toHaveBeenCalled();
      // The stale review is closed rather than left open on outdated content
      // — the admin must reopen Review to see the current version.
      await waitFor(() => expect(screen.queryByTestId("route-review-dialog")).toBeNull());
    }, 20000);

    it("a null data response from a stale/failed match is also treated as not-published, never as success", async () => {
      H.publishResult = { data: null, error: null };
      renderPage();
      await reviewAndPublish();

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
    }, 20000);
  });

  it("Cancel closes the dialog without publishing", async () => {
    renderPage();
    await goToAwaitingReview();
    fireEvent.click(within(await screen.findByTestId("route-row-london-to-dubai")).getByRole("button", { name: /^review$/i }));

    const dialog = await screen.findByTestId("route-review-dialog");
    await within(dialog).findByText(H.fullContent.title);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByTestId("route-review-dialog")).toBeNull());
    expect(H.spyUpdate).not.toHaveBeenCalled();
  }, 20000);

  it("an already-published row offers no Review action and is never a candidate for the dialog", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /^Published/i }));

    const row = await screen.findByTestId("route-row-paris-to-tokyo");
    expect(within(row).getByText("Published")).toBeTruthy();
    expect(within(row).queryByRole("button", { name: /^review$/i })).toBeNull();
  }, 20000);
});
