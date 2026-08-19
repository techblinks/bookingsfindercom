/**
 * AdminRouteGenerator review gate — BF-0R-3 review follow-up, P0-3.
 *
 * The list previously had a one-click Publish button directly beside an
 * "Awaiting review" row, wired straight to `is_published: true` with no
 * content actually shown. This suite proves the replacement: publication is
 * reachable ONLY by opening a review dialog that shows the full generated
 * content, is clearly labelled as unsourced AI editorial copy, and requires
 * an explicit confirmation checkbox before Publish is even clickable.
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
  },
  spyUpdate: vi.fn(),
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
        return { eq: () => Promise.resolve({ data: null, error: null }) };
      },
      upsert: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
    functions: { invoke: vi.fn() },
  },
}));

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
  }, 20000);

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
    await goToAwaitingReview();
    fireEvent.click(within(await screen.findByTestId("route-row-london-to-dubai")).getByRole("button", { name: /^review$/i }));

    const dialog = await screen.findByTestId("route-review-dialog");
    await within(dialog).findByText(H.fullContent.title);

    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^publish$/i }));

    await waitFor(() =>
      expect(H.spyUpdate).toHaveBeenCalledWith({ is_published: true, generation_status: "published" }),
    );
  }, 20000);

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
  });
});
