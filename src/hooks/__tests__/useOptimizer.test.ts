/**
 * useOptimizer — attempt-ID guard against stale-response/stale-error
 * overwrite (PR #65 round 4).
 *
 * Two overlapping `runOptimizer` calls can happen (e.g. TripOptimizer's
 * auth-triggered re-submit racing a fresh user action). Whichever network
 * response resolves LAST used to always win the final isLoading/error/
 * paywallError state, regardless of which attempt was actually started
 * most recently. These tests drive two real overlapping calls against a
 * controllable (deferred) mocked `supabase.functions.invoke` and resolve
 * them out of order to prove the newer attempt always wins.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOptimizer, type OptimizerRequest } from "../useOptimizer";

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const REQUEST: OptimizerRequest = {
  origin: "SYD",
  destination: "LHR",
  travelWindowStart: "2026-11-02",
  travelWindowEnd: "2026-11-20",
  hasBags: false,
  priority: "cheapest",
};

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("item 12/13 groundwork: a stale earlier response must not overwrite a newer accepted attempt", () => {
  it("only the SECOND (newer) attempt's result reaches state when the first resolves after the second", async () => {
    const first = deferred<{ data: unknown; error: null }>();
    const second = deferred<{ data: unknown; error: null }>();
    mockInvoke.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useOptimizer());

    let firstCallResult: unknown;
    let secondCallResult: unknown;
    act(() => {
      result.current.runOptimizer(REQUEST).then((r) => { firstCallResult = r; });
    });
    act(() => {
      result.current.runOptimizer(REQUEST).then((r) => { secondCallResult = r; });
    });

    // The SECOND attempt's provider response arrives first.
    await act(async () => {
      second.resolve({ data: { status: "ok", fare: 900, recommendedRoute: {}, selectionCriterion: "price", priceContext: {}, fareComparison: null, notes: [], affiliateLinks: [] }, error: null });
    });
    await waitFor(() => expect(secondCallResult).toBeTruthy());

    // The FIRST (now stale) attempt's response arrives afterwards.
    await act(async () => {
      first.resolve({ data: { status: "ok", fare: 100, recommendedRoute: {}, selectionCriterion: "price", priceContext: {}, fareComparison: null, notes: [], affiliateLinks: [] }, error: null });
    });

    // The stale first response must be discarded (its own promise resolves
    // to null) and must never have re-flipped isLoading back to true or
    // otherwise disturbed the second attempt's already-settled state.
    expect(firstCallResult).toBeNull();
    expect((secondCallResult as { fare: number })?.fare).toBe(900);
    expect(result.current.isLoading).toBe(false);
  });

  it("a stale error from an earlier attempt does not overwrite the current attempt's state (item 13)", async () => {
    const first = deferred<{ data: unknown; error: null }>();
    const second = deferred<{ data: unknown; error: null }>();
    mockInvoke.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useOptimizer());

    act(() => { result.current.runOptimizer(REQUEST); });
    act(() => { result.current.runOptimizer(REQUEST); });

    // The newer (second) attempt succeeds first.
    await act(async () => {
      second.resolve({ data: { status: "ok", fare: 900, recommendedRoute: {}, selectionCriterion: "price", priceContext: {}, fareComparison: null, notes: [], affiliateLinks: [] }, error: null });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();

    // The stale first attempt then REJECTS.
    await act(async () => {
      first.reject(new Error("stale network failure"));
    });

    // The stale error must not appear — the successful, newer attempt's
    // clean state stands.
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("a stale paywall from an earlier attempt does not overwrite a newer successful attempt (item 13)", async () => {
    const first = deferred<{ data: unknown; error: null }>();
    const second = deferred<{ data: unknown; error: null }>();
    mockInvoke.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useOptimizer());

    act(() => { result.current.runOptimizer(REQUEST); });
    act(() => { result.current.runOptimizer(REQUEST); });

    await act(async () => {
      second.resolve({ data: { status: "ok", fare: 900, recommendedRoute: {}, selectionCriterion: "price", priceContext: {}, fareComparison: null, notes: [], affiliateLinks: [] }, error: null });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      first.resolve({ data: { error: "paywall", message: "stale paywall", upgradeUrl: "/pricing" }, error: null });
    });

    expect(result.current.paywallError).toBeNull();
  });
});
