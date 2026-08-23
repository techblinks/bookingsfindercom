import { useEffect, useState } from "react";

/**
 * BF-FLIGHTS-LIVE-3 Phase D — the exact Travelpayouts-generated public
 * loader for White Label Widget wl_id=21209. Do not substitute another
 * script host (e.g. the generic tpwgts.com used in Travelpayouts' own
 * documentation examples) — this project's account serves from tpemb.com.
 * No private key is required for this public embed.
 */
export const TRAVELPAYOUTS_WIDGET_SCRIPT_SRC = "https://tpemb.com/wl_web/main.js?wl_id=21209";

export type TravelpayoutsWidgetState = "loading" | "ready" | "error";

/**
 * BF-FLIGHTS-LIVE-3 Round 2 Issue 2: a script can stall indefinitely
 * (network hang, ad-blocker silently dropping the request without firing
 * `error`, etc.) without ever calling onload or onerror. Without a bound,
 * useTravelpayoutsWidget would show a loading spinner forever. 12s sits in
 * the requested 10–15s range.
 */
export const WIDGET_LOAD_TIMEOUT_MS = 12000;

/**
 * Module-level (not component-level) load state and promise cache.
 *
 * This is deliberately outside React state: the script must be inserted
 * into the document at most once for the entire page lifetime, regardless
 * of how many times a component using this hook mounts — including React
 * StrictMode's dev-only double-invoke of effects, and multiple components
 * (e.g. the page-level Live Flights section AND the Business cabin panel,
 * which render on mutually exclusive branches but both could in principle
 * call this hook) sharing the same in-flight load. The timeout below lives
 * inside this same module-scope promise for the same reason: one timer for
 * the one real script insertion, never one per hook instance/mount, so
 * StrictMode's double-invoke never creates a second timer either.
 */
let widgetLoadPromise: Promise<void> | null = null;

/**
 * BF-FLIGHTS-LIVE-3 Round 2 Issue 3: set exactly once, the first time the
 * widget script genuinely finishes loading. Confirmed by direct testing
 * (browser + a static harness reproducing React's own unmount/remount):
 * the widget attaches a Shadow DOM root to the #tpwl-search/#tpwl-tickets
 * element INSTANCES present when its own script executes, and never
 * rediscovers replacement elements with the same ids later — there is no
 * MutationObserver/polling, and no documented reinitialization API exists
 * to ask it to look again (Travelpayouts Widget SPA limitation; see the
 * BF-FLIGHTS-LIVE-3 Round 2 report for the full writeup). So once this
 * flag is true, any FUTURE mount of useTravelpayoutsWidget knows it is
 * looking at fresh containers the already-finished script will never
 * populate — see needsReloadForRemount below, which turns that fact into
 * an honest UI state instead of a silently blank "ready" section.
 */
let hasWidgetEverReachedReady = false;

/**
 * True once ANY component has mounted useTravelpayoutsWidget before.
 * Distinguishes a genuine SPA remount (unmount fully completed, then a
 * later mount) from React StrictMode's dev-only double-invoke (both
 * invocations happen synchronously, before the script's async load could
 * possibly have resolved yet) — see needsReloadForRemount's derivation.
 */
let hasAnyComponentMountedBefore = false;

/**
 * Races a load promise against a timeout, guaranteeing exactly one
 * resolution/rejection and always clearing the timer — on success, on
 * script error, AND on timeout itself — so nothing is left running.
 */
function withLoadTimeout(
  attach: (resolve: () => void, reject: (err: Error) => void) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Travelpayouts widget script load timed out"));
    }, WIDGET_LOAD_TIMEOUT_MS);

    attach(
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function loadTravelpayoutsWidgetScript(): Promise<void> {
  if (widgetLoadPromise) return widgetLoadPromise;

  // If a script with this exact src is already present in the document
  // (e.g. a Vite/React Fast Refresh module re-evaluation in dev, or a
  // second independent call before this module's own promise was read),
  // treat it as already loading/loaded rather than inserting a duplicate.
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${TRAVELPAYOUTS_WIDGET_SCRIPT_SRC}"]`
  );
  if (existing) {
    widgetLoadPromise = withLoadTimeout((resolve, reject) => {
      // The existing tag may already have fired its load/error event
      // before we attached these listeners (e.g. cached in a fast
      // reload) — readyState-style detection isn't reliable for
      // type="module" scripts, so this is a best-effort attach. If it
      // already loaded silently, the effect below still resolves once
      // this promise's caller's own onload/onerror wiring in the
      // fresh-script branch would have handled it; this branch exists
      // only to avoid ever creating a second <script> tag.
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Travelpayouts widget script failed to load")), { once: true });
    });
    return widgetLoadPromise;
  }

  widgetLoadPromise = withLoadTimeout((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.type = "module";
    script.src = TRAVELPAYOUTS_WIDGET_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Travelpayouts widget script failed to load"));
    document.head.appendChild(script);
  });

  return widgetLoadPromise;
}

/**
 * Shared load state for the Travelpayouts Widget script. Multiple call
 * sites (the page-level Live Flights section, the Business cabin panel)
 * can use this independently — the underlying script insertion is
 * deduplicated at module scope, not per-hook-instance.
 *
 * "ready" means the script downloaded and executed without error — it is
 * NOT a claim that a search has been performed or that results exist; it
 * only means the widget's own search form (#tpwl-search) should be usable.
 * This codebase has no way to detect a deeper internal widget failure
 * (e.g. a misconfigured wl_id that loads fine but never renders) without
 * inspecting Travelpayouts' internal DOM/state, which is out of scope.
 *
 * "error" is reached either from a genuine script load failure (onerror)
 * or from WIDGET_LOAD_TIMEOUT_MS elapsing with no load/error event at all
 * (Round 2 Issue 2) — both are reported identically to the caller, since
 * neither leaves this codebase able to say more than "it didn't load".
 *
 * `needsReloadForRemount` (Round 2 Issue 3): true when THIS mount is a
 * genuine SPA remount (route away, then back, no full reload) after the
 * widget had already reached "ready" in a PRIOR mount. `state` will still
 * report "ready" in this case (the script itself really did load
 * successfully once), but the current #tpwl-search/#tpwl-tickets DOM nodes
 * are freshly-created replacements the script never saw and will never
 * populate — see the confirmed limitation above. Callers must treat this
 * as a distinct, honest UI state ("this needs a reload to work again"),
 * not silently render "ready" over what would otherwise be blank
 * containers.
 */
export function useTravelpayoutsWidget(): { state: TravelpayoutsWidgetState; needsReloadForRemount: boolean } {
  const [state, setState] = useState<TravelpayoutsWidgetState>(hasWidgetEverReachedReady ? "ready" : "loading");
  const [needsReloadForRemount] = useState(() => {
    const isRemountAfterSuccess = hasAnyComponentMountedBefore && hasWidgetEverReachedReady;
    hasAnyComponentMountedBefore = true;
    return isRemountAfterSuccess;
  });

  useEffect(() => {
    // A remount-after-success mount already knows its containers are
    // stale and will never be populated by the already-finished script —
    // resubscribing to loadTravelpayoutsWidgetScript() would only ever
    // resolve "ready" again, which needsReloadForRemount already conveys
    // more honestly. Nothing further to do.
    if (needsReloadForRemount) return;

    let cancelled = false;
    loadTravelpayoutsWidgetScript()
      .then(() => {
        hasWidgetEverReachedReady = true;
        if (!cancelled) setState("ready");
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [needsReloadForRemount]);

  return { state, needsReloadForRemount };
}

/**
 * Test-only: resets every module-level singleton (script load state AND
 * the remount-detection flags) so each test starts fresh, as if from a
 * real full page load.
 */
export function __resetTravelpayoutsWidgetLoaderForTests(): void {
  widgetLoadPromise = null;
  hasWidgetEverReachedReady = false;
  hasAnyComponentMountedBefore = false;
}
