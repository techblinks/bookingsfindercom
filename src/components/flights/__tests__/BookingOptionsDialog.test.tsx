/**
 * BF-FLIGHTS-LIVE-4 Round 2 Phase 3/4/W — booking options dialog shows a
 * working CTA only for a completable (GET, no post_data) handoff; a
 * resolver (post_data) option shows truthful info with no deceptive CTA.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: (name: string) => `https://mock.test/functions/v1/${name}`,
}));

import BookingOptionsDialog from "@/components/flights/BookingOptionsDialog";

const searchContext = {
  origin: "SYD", destination: "MEL", departureDate: "2099-01-10",
  tripType: "one_way" as const, adults: 1, children: 0, infants: 0,
  cabinClass: "economy" as const, currency: "AUD",
};

function stubOptions(options: unknown[]) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: "ok", options }) }));
}

function renderDialog(props: Partial<React.ComponentProps<typeof BookingOptionsDialog>> = {}) {
  const onOpenFullFlightSearch = vi.fn();
  const utils = render(
    <MemoryRouter>
      <BookingOptionsDialog
        open
        onOpenChange={vi.fn()}
        bookingToken="BOOK1"
        searchContext={searchContext}
        currencySymbol="A$"
        route="SYD-MEL"
        onOpenFullFlightSearch={onOpenFullFlightSearch}
        {...props}
      />
    </MemoryRouter>,
  );
  return { ...utils, onOpenFullFlightSearch };
}

describe("BookingOptionsDialog — GET (completable) option", () => {
  it("shows a working Continue CTA and navigates to /live-flight-redirect with the deeplink", async () => {
    mockNavigate.mockClear();
    stubOptions([{ bookingProvider: "Qantas", price: 450, currency: "AUD", localPrice: null, localCurrency: null, baggagePolicyUrl: null, bookingRequest: { url: "https://qantas.com/book", postData: null } }]);
    renderDialog();

    const btn = await screen.findByRole("button", { name: /^continue$/i });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/live-flight-redirect", expect.objectContaining({
      state: expect.objectContaining({ url: "https://qantas.com/book", postData: null, bookingProvider: "Qantas" }),
    }));
  });
});

describe("BookingOptionsDialog — POST (resolver) option fails closed", () => {
  it("never renders a working Continue button for a post_data-bearing option — only the White Label fallback", async () => {
    stubOptions([{ bookingProvider: "Expedia", price: 470, currency: "AUD", localPrice: null, localCurrency: null, baggagePolicyUrl: null, bookingRequest: { url: "https://www.google.com/travel/clk/f", postData: "u=abc123" } }]);
    const { onOpenFullFlightSearch } = renderDialog();

    await screen.findByText("Expedia");
    expect(screen.queryByRole("button", { name: /^continue$/i })).toBeNull();

    const fallback = screen.getByRole("button", { name: /open full flight search/i });
    fireEvent.click(fallback);
    expect(onOpenFullFlightSearch).toHaveBeenCalled();
  });

  it("shows truthful seller and price info even though booking can't be completed", async () => {
    stubOptions([{ bookingProvider: "Expedia", price: 470, currency: "AUD", localPrice: null, localCurrency: null, baggagePolicyUrl: null, bookingRequest: { url: "https://www.google.com/travel/clk/f", postData: "u=abc123" } }]);
    renderDialog();

    expect(await screen.findByText("Expedia")).toBeTruthy();
    expect(screen.getByText(/470/)).toBeTruthy();
  });
});

describe("BookingOptionsDialog — invalid handoff also fails closed", () => {
  it("offers the fallback, not a broken button, for an unsafe url", async () => {
    stubOptions([{ bookingProvider: "SketchySite", price: 300, currency: "AUD", localPrice: null, localCurrency: null, baggagePolicyUrl: null, bookingRequest: { url: "javascript:alert(1)", postData: null } }]);
    renderDialog();

    await screen.findByText("SketchySite");
    expect(screen.queryByRole("button", { name: /^continue$/i })).toBeNull();
    expect(screen.getByRole("button", { name: /open full flight search/i })).toBeTruthy();
  });
});

describe("BookingOptionsDialog — never fabricates a seller", () => {
  it("drops an option object with no together/departing/returning shape rather than inventing one (server-side, already covered) — dialog just renders what it's given", async () => {
    stubOptions([]);
    renderDialog();
    expect(await screen.findByText(/no booking options were returned/i)).toBeTruthy();
  });
});
