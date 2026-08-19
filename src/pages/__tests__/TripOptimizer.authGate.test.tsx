/**
 * Trip Optimizer — customer authentication gate (BF-0R-4).
 *
 * run-optimizer now requires an authenticated user (see BF-0R-4 in
 * BOOKINGSFINDER_PRODUCTION_RECONCILIATION.md). These tests prove the
 * frontend side of that contract:
 *
 *   - a signed-out submit never invokes run-optimizer (no doomed request);
 *   - a held request only continues after a GENUINE Supabase session exists,
 *     driven by the real onAuthStateChange event — never by the sign-in/
 *     sign-up call resolving on its own;
 *   - repeated auth events for the same held request never cause a second
 *     provider call (no duplicate-submit race);
 *   - cancelling the auth requirement discards the held request, so a later,
 *     unrelated auth event cannot resurrect and submit it;
 *   - sign-up never assumes an immediate session (email-confirmation-required
 *     projects return none) — the pending request is never invoked from
 *     inside the sign-up handler itself, only from the auth-state listener.
 *
 * The real Supabase client, useOptimizer hook and Header/Footer/OptimizerForm
 * are all mocked, so no network call and no provider call is ever made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { OptimizerRequest } from "@/hooks/useOptimizer";

const {
  mockGetSession,
  mockOnAuthStateChange,
  mockUnsubscribe,
  mockSignInWithPassword,
  mockSignUp,
  mockRunOptimizer,
  mockToast,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockUnsubscribe: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockRunOptimizer: vi.fn(),
  mockToast: vi.fn(),
}));

let capturedAuthListener: ((event: string, session: unknown) => void) | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        capturedAuthListener = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useOptimizer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useOptimizer")>();
  return {
    ...actual,
    useOptimizer: () => ({
      runOptimizer: mockRunOptimizer,
      trackAffiliateClick: vi.fn(),
      isLoading: false,
      error: null,
      paywallError: null,
      clearPaywallError: vi.fn(),
    }),
  };
});

const FAKE_REQUEST: OptimizerRequest = {
  origin: "SYD",
  destination: "LHR",
  travelWindowStart: "2026-11-02",
  travelWindowEnd: "2026-11-20",
  hasBags: false,
  priority: "cheapest",
};

vi.mock("@/components/optimizer/OptimizerForm", () => ({
  default: ({ onSubmit }: { onSubmit: (data: OptimizerRequest) => void }) => (
    <button onClick={() => onSubmit(FAKE_REQUEST)}>submit-optimizer-form</button>
  ),
}));

vi.mock("@/components/optimizer/OptimizerResults", () => ({ default: () => <div>results</div> }));
vi.mock("@/components/optimizer/OptimizerNoData", () => ({ default: () => <div>no-data</div> }));
vi.mock("@/components/layout/Header", () => ({ default: () => <header>header</header> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer>footer</footer> }));

import TripOptimizer from "@/pages/TripOptimizer";

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/optimizer"]}>
        <TripOptimizer />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const submitForm = () => fireEvent.click(screen.getByText("submit-optimizer-form"));

const emitAuthEvent = (session: unknown) => {
  act(() => {
    capturedAuthListener?.("SIGNED_IN", session);
  });
};

const FAKE_SESSION = { user: { id: "user-1" } };

beforeEach(() => {
  vi.clearAllMocks();
  capturedAuthListener = null;
  mockRunOptimizer.mockResolvedValue(null);
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockSignUp.mockResolvedValue({ data: { session: null, user: { id: "pending-user" } }, error: null });
});

describe("12. signed-out submit never invokes run-optimizer", () => {
  it("holds the request and shows the auth gate instead of calling the optimizer", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    submitForm();

    expect(await screen.findByText("Sign In to Optimize Your Trip")).toBeInTheDocument();
    expect(mockRunOptimizer).not.toHaveBeenCalled();
  });
});

describe("baseline: an already-authenticated submit is not gated", () => {
  it("calls run-optimizer immediately when a session already exists", async () => {
    mockGetSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
    renderPage();

    submitForm();

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));
    expect(mockRunOptimizer).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(screen.queryByText("Sign In to Optimize Your Trip")).not.toBeInTheDocument();
  });
});

describe("13 & 14. the held request continues only after a genuine session event", () => {
  it("does not call run-optimizer merely because the gate is shown", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    submitForm();
    await screen.findByText("Sign In to Optimize Your Trip");

    expect(mockRunOptimizer).not.toHaveBeenCalled();
  });

  it("continues the held request exactly once when the auth-state listener reports a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    submitForm();
    await screen.findByText("Sign In to Optimize Your Trip");

    emitAuthEvent(FAKE_SESSION);

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));
    expect(mockRunOptimizer).toHaveBeenCalledWith(FAKE_REQUEST);
  });
});

describe("17. no duplicate provider call from repeated auth events", () => {
  it("a second auth-state event for the same held request does not call run-optimizer again", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    submitForm();
    await screen.findByText("Sign In to Optimize Your Trip");

    emitAuthEvent(FAKE_SESSION);
    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));

    // e.g. a TOKEN_REFRESHED event firing shortly after SIGNED_IN.
    emitAuthEvent(FAKE_SESSION);
    emitAuthEvent(FAKE_SESSION);

    expect(mockRunOptimizer).toHaveBeenCalledTimes(1);
  });
});

describe("16. cancelling the auth gate discards the held request", () => {
  it("a later auth event after cancel does not submit the discarded request", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    submitForm();
    await screen.findByText("Sign In to Optimize Your Trip");

    fireEvent.click(screen.getByText("Back to search"));

    emitAuthEvent(FAKE_SESSION);

    expect(mockRunOptimizer).not.toHaveBeenCalled();
  });
});

describe("15. sign-up never assumes an immediate session", () => {
  it("shows a confirm-email message and does not invoke the optimizer when signUp returns no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignUp.mockResolvedValue({ data: { session: null, user: { id: "pending-user" } }, error: null });
    renderPage();
    submitForm();
    await screen.findByText("Sign In to Optimize Your Trip");

    // Radix TabsTrigger activates on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Create Account" }));
    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await vi.waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Check your email" }),
    );
    // Confirmation-required signUp never itself continues a held request —
    // only a genuine auth-state event may (proven by 13 & 14 above).
    expect(mockRunOptimizer).not.toHaveBeenCalled();
  });
});
