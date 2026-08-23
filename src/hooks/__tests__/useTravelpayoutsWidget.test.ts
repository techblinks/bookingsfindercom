/**
 * BF-FLIGHTS-LIVE-3 Phase D/P — the Travelpayouts Widget script loader.
 *
 * jsdom does not actually fetch external <script src> resources by
 * default (no `resources: "usable"` in vitest.config.ts), so these tests
 * exercise the loader's own bookkeeping (dedup, exact src, state
 * transitions) rather than relying on a real network fetch — a script's
 * onload/onerror never fires here, so tests that need "ready" or "error"
 * drive it explicitly by invoking the handlers the loader attached.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useTravelpayoutsWidget,
  TRAVELPAYOUTS_WIDGET_SCRIPT_SRC,
  WIDGET_LOAD_TIMEOUT_MS,
  __resetTravelpayoutsWidgetLoaderForTests,
} from "../useTravelpayoutsWidget";

function findScriptTags(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll(`script[src="${TRAVELPAYOUTS_WIDGET_SCRIPT_SRC}"]`));
}

beforeEach(() => {
  __resetTravelpayoutsWidgetLoaderForTests();
  document.querySelectorAll("script").forEach((s) => s.remove());
});

afterEach(() => {
  document.querySelectorAll("script").forEach((s) => s.remove());
});

describe("useTravelpayoutsWidget — script identity", () => {
  it("item 2/3: inserts a script with exactly wl_id=21209 on the tpemb.com host", () => {
    renderHook(() => useTravelpayoutsWidget());
    const tags = findScriptTags();
    expect(tags.length).toBe(1);
    expect(tags[0].src).toBe(TRAVELPAYOUTS_WIDGET_SCRIPT_SRC);
    expect(tags[0].src).toContain("tpemb.com");
    expect(tags[0].src).toContain("wl_id=21209");
  });

  it("sets type=module and async=true, matching the Travelpayouts-generated loader exactly", () => {
    renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    expect(tag.type).toBe("module");
    expect(tag.async).toBe(true);
  });

  it("never uses a different script host even though Travelpayouts' own generic docs use tpwgts.com", () => {
    renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    expect(tag.src).not.toContain("tpwgts.com");
  });
});

describe("useTravelpayoutsWidget — item 1/8: loads once, never duplicates", () => {
  it("a second hook instance mounted at the same time does not insert a second script", () => {
    renderHook(() => useTravelpayoutsWidget());
    renderHook(() => useTravelpayoutsWidget());
    expect(findScriptTags().length).toBe(1);
  });

  it("item 8: unmounting and remounting (simulating StrictMode's double-invoke, or route navigation away and back) does not insert a second script", () => {
    const { unmount } = renderHook(() => useTravelpayoutsWidget());
    unmount();
    renderHook(() => useTravelpayoutsWidget());
    renderHook(() => useTravelpayoutsWidget());
    expect(findScriptTags().length).toBe(1);
  });

  it("three concurrent mounts all resolve to the same ready state once the single script tag loads", async () => {
    const { result: r1 } = renderHook(() => useTravelpayoutsWidget());
    const { result: r2 } = renderHook(() => useTravelpayoutsWidget());
    const { result: r3 } = renderHook(() => useTravelpayoutsWidget());

    const [tag] = findScriptTags();
    tag.onload?.(new Event("load"));

    await waitFor(() => expect(r1.current.state).toBe("ready"));
    await waitFor(() => expect(r2.current.state).toBe("ready"));
    await waitFor(() => expect(r3.current.state).toBe("ready"));
    expect(findScriptTags().length).toBe(1);
  });
});

describe("useTravelpayoutsWidget — state transitions", () => {
  it("starts in 'loading'", () => {
    const { result } = renderHook(() => useTravelpayoutsWidget());
    expect(result.current.state).toBe("loading");
  });

  it("moves to 'ready' when the script's onload fires", async () => {
    const { result } = renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    tag.onload?.(new Event("load"));
    await waitFor(() => expect(result.current.state).toBe("ready"));
  });

  it("item 6: moves to 'error' (truthful failure state) when the script's onerror fires — never silently stays 'loading' forever nor claims 'ready'", async () => {
    const { result } = renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    tag.onerror?.(new Event("error"));
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.state).not.toBe("ready");
  });

  it("does not update state after unmount (no act() warning / stale setState)", async () => {
    const { result, unmount } = renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    unmount();
    // Firing load after unmount must not throw or attempt a state update.
    expect(() => tag.onload?.(new Event("load"))).not.toThrow();
  });
});

describe("useTravelpayoutsWidget — Round 2 Issue 2: bounded load timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("item 4: transitions to 'error' after WIDGET_LOAD_TIMEOUT_MS with no load/error event at all", async () => {
    const { result } = renderHook(() => useTravelpayoutsWidget());
    expect(result.current.state).toBe("loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WIDGET_LOAD_TIMEOUT_MS);
    });
    expect(result.current.state).toBe("error");
  });

  it("item 5: a successful load before the timeout elapses cancels the timer — no late error transition", async () => {
    const { result } = renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    await act(async () => {
      tag.onload?.(new Event("load"));
    });
    expect(result.current.state).toBe("ready");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WIDGET_LOAD_TIMEOUT_MS + 1000);
    });
    expect(result.current.state).toBe("ready");
  });

  it("item 6: a script error before the timeout elapses cancels the timer — state stays 'error', nothing fires again later", async () => {
    const { result } = renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    await act(async () => {
      tag.onerror?.(new Event("error"));
    });
    expect(result.current.state).toBe("error");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WIDGET_LOAD_TIMEOUT_MS + 1000);
    });
    expect(result.current.state).toBe("error");
  });

  it("item 7: a StrictMode-style double mount shares one timer, not two — both instances resolve to 'error' together and only one script tag ever exists", async () => {
    const { result: r1 } = renderHook(() => useTravelpayoutsWidget());
    const { result: r2 } = renderHook(() => useTravelpayoutsWidget());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WIDGET_LOAD_TIMEOUT_MS);
    });
    expect(r1.current.state).toBe("error");
    expect(r2.current.state).toBe("error");
    expect(findScriptTags().length).toBe(1);
  });
});

describe("useTravelpayoutsWidget — Round 2 Issue 3: our-side SPA remount lifecycle", () => {
  it("item 8: confirmed live — the Travelpayouts Widget itself does not rediscover replacement containers after unmount+remount (no MutationObserver, no documented reinit API). Our hook's job is to report that honestly, not to paper over it: after a successful load, a genuine remount sets needsReloadForRemount instead of silently claiming a working 'ready' state.", async () => {
    const { result: first, unmount } = renderHook(() => useTravelpayoutsWidget());
    expect(first.current.needsReloadForRemount).toBe(false);
    const [tag] = findScriptTags();
    tag.onload?.(new Event("load"));
    await waitFor(() => expect(first.current.state).toBe("ready"));

    unmount(); // simulated route away (React fully unmounts the section)

    const { result: second } = renderHook(() => useTravelpayoutsWidget()); // simulated route back
    expect(second.current.needsReloadForRemount).toBe(true);
    // state still (honestly) reflects that the script itself did load once —
    // needsReloadForRemount is the separate, additional signal a caller
    // must check before trusting "ready" to mean visible content.
    expect(second.current.state).toBe("ready");

    // No duplicate script insertion from the remount, and no crash.
    expect(findScriptTags().length).toBe(1);
  });

  it("a StrictMode-style double-invoke before any load resolves is NOT mistaken for a remount", () => {
    const { result: r1 } = renderHook(() => useTravelpayoutsWidget());
    const { result: r2 } = renderHook(() => useTravelpayoutsWidget());
    // Neither instance has seen a successful load yet, so this is not a
    // "remount after success" — both must report false.
    expect(r1.current.needsReloadForRemount).toBe(false);
    expect(r2.current.needsReloadForRemount).toBe(false);
  });

  it("a remount BEFORE the widget ever reached ready (e.g. still loading, or errored) is not mistaken for the post-success remount case either", async () => {
    const { result: first, unmount } = renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    tag.onerror?.(new Event("error"));
    await waitFor(() => expect(first.current.state).toBe("error"));

    unmount();
    const { result: second } = renderHook(() => useTravelpayoutsWidget());
    // The widget never successfully loaded even once, so there is nothing
    // stale to warn about — a fresh attempt is exactly right here.
    expect(second.current.needsReloadForRemount).toBe(false);
    expect(second.current.state).toBe("loading");
  });

  it("a second remount after the first already resolved needsReloadForRemount stays true (does not flip back)", async () => {
    const { unmount: unmount1 } = renderHook(() => useTravelpayoutsWidget());
    const [tag] = findScriptTags();
    tag.onload?.(new Event("load"));
    await waitFor(() => expect(findScriptTags().length).toBe(1));

    unmount1();
    const { result: second, unmount: unmount2 } = renderHook(() => useTravelpayoutsWidget());
    await waitFor(() => expect(second.current.needsReloadForRemount).toBe(true));

    unmount2();
    const { result: third } = renderHook(() => useTravelpayoutsWidget());
    expect(third.current.needsReloadForRemount).toBe(true);
  });
});
