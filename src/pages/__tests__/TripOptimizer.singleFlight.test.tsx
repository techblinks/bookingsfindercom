/**
 * Trip Optimizer — synchronous single-flight submit guard (PR #65 round 4).
 *
 * handleSubmit used to `await supabase.auth.getSession()` as its FIRST
 * operation with no synchronous lock in place beforehand — rapid duplicate
 * submits (double-click, double-tap, a stray re-render re-firing onSubmit)
 * could all enter handleSubmit and reach getSession()/runOptimizer
 * concurrently before `isLoading` had propagated through a render. These
 * tests fire the form's onSubmit twice back-to-back, synchronously, in the
 * SAME test body — before either call has had a chance to await anything —
 * which is exactly the race a real double-click produces.
 *
 * Mirrors the mocking setup in TripOptimizer.authGate.test.tsx.
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
  mockRunOptimizer,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockUnsubscribe: vi.fn(),
  mockRunOptimizer: vi.fn(),
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
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

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

const submitButton = () => screen.getByText("submit-optimizer-form");
const FAKE_SESSION = { user: { id: "user-1" } };

/** A getSession() that doesn't resolve until the test releases it — models the real network round-trip a rapid double-click races against. */
function deferredSession() {
  let resolve!: (value: { data: { session: unknown } }) => void;
  const promise = new Promise<{ data: { session: unknown } }>((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedAuthListener = null;
  mockRunOptimizer.mockResolvedValue(null);
});

describe("item 10: rapid duplicate submit invokes the optimizer exactly once (signed-in)", () => {
  it("two synchronous clicks before getSession() resolves call runOptimizer only once", async () => {
    const session = deferredSession();
    mockGetSession.mockReturnValue(session.promise);
    renderPage();

    // Two rapid clicks, back-to-back, before the first getSession() call
    // has resolved — the exact race a real double-click produces.
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());

    await act(async () => {
      session.resolve({ data: { session: FAKE_SESSION } });
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));
    // Give any (incorrect) second in-flight call a chance to also land.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockRunOptimizer).toHaveBeenCalledTimes(1);
  });
});

describe("item 11: signed-out rapid clicks queue exactly one pending request", () => {
  it("two synchronous clicks while signed out only ever hold one pending request, and only one auth-continuation fires", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    fireEvent.click(submitButton());

    await screen.findByText("Sign In to Optimize Your Trip");

    act(() => { capturedAuthListener?.("SIGNED_IN", FAKE_SESSION); });

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockRunOptimizer).toHaveBeenCalledTimes(1);
  });
});

describe("item 14: Reset/Cancel/auth transitions never leave the submit lock stuck", () => {
  it("a signed-out submit, then Cancel, then a fresh signed-in submit both complete normally", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    await screen.findByText("Sign In to Optimize Your Trip");

    fireEvent.click(screen.getByText("Back to search"));
    await screen.findByText("submit-optimizer-form");

    // If the lock were stuck from the first (aborted) attempt, this second,
    // independent submit would silently be dropped.
    mockGetSession.mockResolvedValueOnce({ data: { session: FAKE_SESSION } });
    fireEvent.click(submitButton());

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));
  });

  it("after a completed submit, a later independent submit is not blocked by a stuck lock", async () => {
    mockGetSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
    renderPage();

    fireEvent.click(submitButton());
    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));

    // A second, later, genuinely-new submit (e.g. after Reset) must still work.
    fireEvent.click(submitButton());
    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(2));
  });
});
