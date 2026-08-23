import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTravelpayoutsWidget } from "@/hooks/useTravelpayoutsWidget";

interface TravelpayoutsLiveFlightsProps {
  /**
   * Always-available escape hatch to the full Page White Label
   * (flights.bookingsfinder.com) — see BF-FLIGHTS-LIVE-3 Phase G. Called
   * both by the "Open full flight search" link (shown whenever the
   * widget is usable, so this is never a dead end) and as the primary
   * action in the error state.
   */
  onOpenFullSearch: () => void;
}

/**
 * BF-FLIGHTS-LIVE-3 Phase D/E — embeds the Travelpayouts White Label
 * Widget (wl_id=21209) directly on /flights.
 *
 * Phase C finding (Travelpayouts' own "Setting up a White Label with
 * Widget type" documentation, support.travelpayouts.com): the ONLY
 * documented public configuration is `window.TPWL_CONFIGURATION.resultsURL`
 * (used only when results should render on a DIFFERENT page than the
 * search form — not our case, so it's left unset). There is no documented
 * mechanism to programmatically prefill or trigger a search with
 * origin/destination/dates/passengers/cabin/currency from host-page code —
 * "Pre-filled destination" is a static default configured in the
 * Travelpayouts dashboard, not a per-request runtime API. Consistent with
 * the task's explicit instruction not to reverse-engineer, scrape, or
 * simulate input into the widget's internal DOM, this component renders
 * the widget's own visible search form (#tpwl-search) rather than trying
 * to drive it from BookingsFinder's search state. Currency is the same
 * story: the widget's currency dropdown is driven by "Additional
 * currencies" configured in the Travelpayouts dashboard, not by anything
 * this component can pass in — see CurrencySelector's own note and the
 * BF-FLIGHTS-LIVE-3 report for the resulting duplicate-currency-control
 * disclosure.
 */
const TravelpayoutsLiveFlights = ({ onOpenFullSearch }: TravelpayoutsLiveFlightsProps) => {
  const { state, needsReloadForRemount } = useTravelpayoutsWidget();

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/*
        * BF-FLIGHTS-LIVE-3 Round 2 Issue 3: confirmed by direct testing —
        * the Travelpayouts Widget attaches itself to the #tpwl-search/
        * #tpwl-tickets element instances present at its own script
        * execution and never rediscovers replacement elements with the
        * same ids after a React unmount+remount (no MutationObserver, no
        * documented reinitialization API — this is a Travelpayouts Widget
        * SPA limitation, not something fixable from our side without
        * reverse-engineering, which is out of scope). This state is
        * reached only on a genuine SPA remount after a prior successful
        * load — never on first load or a StrictMode double-invoke — and
        * is deliberately its own honest UI rather than silently showing
        * "ready" over containers the script will never populate. A full
        * reload is the smallest supported fix: it re-runs the script
        * against fresh containers exactly as a genuine first load would.
        */}
      {needsReloadForRemount && (
        <div className="rounded-xl border border-border bg-card p-6 md:p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Live flight search needs to reload after navigating within the site.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="gap-1.5">
              Reload live flight search
            </Button>
            <Button variant="outline" onClick={onOpenFullSearch} className="gap-1.5">
              Open full flight search
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!needsReloadForRemount && state === "loading" && (
        <div className="rounded-xl border border-border bg-card p-8 text-center" role="status">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground mb-4">Loading live flight search…</p>
          {/*
            * BF-FLIGHTS-LIVE-3 Round 2 Issue 1/2: a normal initial load no
            * longer redirects the visitor away (see FlightResults.tsx's
            * handleSearchLiveFlights) — this is what they land on instead,
            * for up to WIDGET_LOAD_TIMEOUT_MS before "error" takes over.
            * The explicit fallback stays available the whole time rather
            * than only appearing once something has already gone wrong.
            */}
          <Button variant="outline" size="sm" onClick={onOpenFullSearch} className="gap-1.5">
            Open full flight search
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {!needsReloadForRemount && state === "error" && (
        <div className="rounded-xl border border-border bg-card p-6 md:p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Live flight search couldn't load right now. You can still search live flights on our partner site.
          </p>
          <Button onClick={onOpenFullSearch} className="gap-1.5">
            Open full flight search
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/*
        * BF-FLIGHTS-LIVE-3 Round 2 Issue 5/6: this does NOT say the form
        * was prefilled or has "inherited" the BookingsFinder search above —
        * it hasn't (see the Phase C finding below: no documented mechanism
        * exists to pass origin/destination/dates/passengers/cabin/currency
        * into the widget). It only orients the traveller to what the form
        * below actually is.
        */}
      {!needsReloadForRemount && state === "ready" && (
        <p className="text-xs text-muted-foreground mb-2">Search current live flight availability</p>
      )}

      {/*
        * The documented containers. Rendered only outside the
        * needsReloadForRemount state — a fresh container the finished
        * script will never populate must not sit there looking "ready" as
        * if content could still appear; the reload prompt above replaces
        * this area entirely in that state. Otherwise always mounted (not
        * conditionally unmounted between loading/ready) so a script that
        * finishes loading has stable DOM nodes to attach to; hidden via
        * CSS while not ready rather than removed, and never touched with
        * dangerouslySetInnerHTML or any manual DOM writes — the
        * Travelpayouts script owns everything inside these two divs.
        */}
      {!needsReloadForRemount && (
        <>
          <div id="tpwl-search" className={state === "ready" ? undefined : "hidden"} />
          <div id="tpwl-tickets" className={state === "ready" ? undefined : "hidden"} />
        </>
      )}

      {!needsReloadForRemount && state === "ready" && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onOpenFullSearch}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Open full flight search
          </button>
        </div>
      )}
    </div>
  );
};

export default TravelpayoutsLiveFlights;
