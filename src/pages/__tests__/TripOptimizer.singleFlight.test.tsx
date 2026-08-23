/**
 * Trip Optimizer — synchronous single-flight submit guard (PR #65 round 4),
 * and the execution-level guard closing the auth-resume gap (round 4.1).
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
 * Round 4.1: `submitInFlightRef` alone only guards `handleSubmit`'s own
 * entry. The auth-resumed continuation (`onAuthStateChange` →
 * `executeOptimizer(held)`) runs OUTSIDE `handleSubmit` — by the time it
 * fires, the ORIGINAL signed-out `handleSubmit` call has already released
 * `submitInFlightRef` (it returned right after setting `needsAuth`). A
 * fresh `handleSubmit` call arriving while the auth-resumed request is
 * still awaiting its provider response would therefore pass
 * `submitInFlightRef`'s check cleanly and reach `runOptimizer` a second
 * time. `runOptimizerSingleFlight`'s `optimizerExecutionInFlightRef` is the
 * guard that actually closes this — both `handleSubmit` and the
 * auth-listener continuation now route through the same helper.
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

/** A runOptimizer() call that doesn't resolve until the test releases it — models the real provider round-trip an auth-resumed request is awaiting. */
function deferredOptimizerResult() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((res) => { resolve = res; });
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

describe("round 4.1: execution-level guard closes the auth-resume gap (item 3-5)", () => {
  it("item 3: the held request begins exactly once when auth resolves", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    await screen.findByText("Sign In to Optimize Your Trip");

    act(() => { capturedAuthListener?.("SIGNED_IN", FAKE_SESSION); });

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));
  });

  it("item 4/CRITICAL: a fresh submit arriving WHILE the auth-resumed call is still pending does not invoke runOptimizer again", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    await screen.findByText("Sign In to Optimize Your Trip");

    // The auth-resumed request's provider call is held open — it does NOT
    // resolve during this test until explicitly released below.
    const first = deferredOptimizerResult();
    mockRunOptimizer.mockReturnValueOnce(first.promise);

    // Auth resolves — the held request begins via the auth LISTENER, not
    // via handleSubmit, so submitInFlightRef alone would not protect it.
    await act(async () => {
      capturedAuthListener?.("SIGNED_IN", FAKE_SESSION);
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));

    // The auth gate is gone and the form is back. This test's useOptimizer
    // mock hardcodes isLoading: false, so the form button being clickable
    // here is NOT "UI hid the button while loading" — it genuinely proves
    // the ref-based execution guard is what stops the second call, not a
    // disabled/hidden button.
    await screen.findByText("submit-optimizer-form");

    // A fresh, independent, already-authenticated submit arrives while the
    // auth-resumed request is still awaiting its provider response.
    mockGetSession.mockResolvedValueOnce({ data: { session: FAKE_SESSION } });
    fireEvent.click(submitButton());
    await new Promise((r) => setTimeout(r, 0));

    // Must NOT have invoked runOptimizer a second time.
    expect(mockRunOptimizer).toHaveBeenCalledTimes(1);

    // Release the first (auth-resumed) call so the test doesn't leak a
    // pending promise into the next test.
    await act(async () => {
      first.resolve(null);
      await Promise.resolve();
    });
  });

  it("item 5: after the auth-resumed call settles, a later genuinely-new submit is allowed", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    await screen.findByText("Sign In to Optimize Your Trip");

    const first = deferredOptimizerResult();
    mockRunOptimizer.mockReturnValueOnce(first.promise);

    await act(async () => {
      capturedAuthListener?.("SIGNED_IN", FAKE_SESSION);
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));

    // Let the auth-resumed call settle.
    await act(async () => {
      first.resolve(null);
      await Promise.resolve();
    });

    // NOW a later, genuinely-new submit must succeed.
    await screen.findByText("submit-optimizer-form");
    mockGetSession.mockResolvedValueOnce({ data: { session: FAKE_SESSION } });
    fireEvent.click(submitButton());

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(2));
  });

  it("item 6: auth callback firing twice does not duplicate the held request", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    await screen.findByText("Sign In to Optimize Your Trip");

    act(() => {
      capturedAuthListener?.("SIGNED_IN", FAKE_SESSION);
      capturedAuthListener?.("TOKEN_REFRESHED", FAKE_SESSION);
    });

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockRunOptimizer).toHaveBeenCalledTimes(1);
  });

  it("item 7: Cancel before auth resolves still prevents continuation", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    await screen.findByText("Sign In to Optimize Your Trip");

    fireEvent.click(screen.getByText("Back to search"));

    act(() => { capturedAuthListener?.("SIGNED_IN", FAKE_SESSION); });

    expect(mockRunOptimizer).not.toHaveBeenCalled();
  });

  it("item 8: no stuck execution lock after a thrown error in the auth-resumed call", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();

    fireEvent.click(submitButton());
    await screen.findByText("Sign In to Optimize Your Trip");

    mockRunOptimizer.mockRejectedValueOnce(new Error("boom"));

    await act(async () => {
      capturedAuthListener?.("SIGNED_IN", FAKE_SESSION);
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(1));

    // The execution lock must have been released despite the throw — a
    // later genuinely-new submit must still work.
    await screen.findByText("submit-optimizer-form");
    mockGetSession.mockResolvedValueOnce({ data: { session: FAKE_SESSION } });
    mockRunOptimizer.mockResolvedValueOnce(null);
    fireEvent.click(submitButton());

    await vi.waitFor(() => expect(mockRunOptimizer).toHaveBeenCalledTimes(2));
  });
});
