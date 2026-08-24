import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { classifyBookingHandoff, navigateToLiveFlightBookingDeeplink } from "@/lib/liveFlightBookingRedirect";
import { logAffiliateClick } from "@/lib/analytics";

/**
 * BF-FLIGHTS-LIVE-4 Round 2 — explicit-click handoff for a live-flight
 * booking option's GET direct deeplink ONLY. See liveFlightBookingRedirect.ts
 * for the corrected security model: a booking_request carrying post_data is
 * Google's own click-resolver flow, deferred (fails closed) this round —
 * BookingOptionsDialog.tsx never sends this page a postData-bearing
 * handoff, so this page only ever has to validate/execute a plain GET
 * navigation to a direct deeplink (which, unlike the resolver case, CAN
 * legitimately be any airline/OTA — hence no auto-redirect and no
 * "verified partner" trust badge; the traveller makes the call).
 *
 * Reached only via in-app navigation carrying router state (see
 * BookingOptionsDialog.tsx) — never a bookmarkable/shareable URL.
 */

interface LiveFlightBookingRedirectState {
  url: string;
  postData: string | null;
  bookingProvider: string;
  price: number | null;
  currency: string;
  route: string;
}

const LiveFlightBookingRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LiveFlightBookingRedirectState | null;

  const decision = classifyBookingHandoff(state ? { url: state.url, postData: state.postData } : null);
  const canContinue = !!state && decision.kind === "get";

  const handleContinue = () => {
    if (!state || decision.kind !== "get") return;
    void logAffiliateClick({
      partner: state.bookingProvider,
      partnerType: "flight",
      route: state.route,
      price: state.price ?? undefined,
      currency: state.currency,
      whiteLabelUsed: false,
      fallbackUsed: false,
      outboundHost: (() => {
        try {
          return new URL(decision.url).hostname;
        } catch {
          return undefined;
        }
      })(),
      landingPage: "/flights",
    }).catch(() => {});

    navigateToLiveFlightBookingDeeplink(decision.url);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <BrandLogo variant="default" context="desktop" className="mx-auto" />
          </div>

          {!canContinue ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <h1 className="text-lg font-semibold text-foreground mb-1">Cannot open booking link</h1>
              <p className="text-sm text-muted-foreground">
                This booking option is no longer available. Please go back and choose a flight again.
              </p>
              <Button variant="link" onClick={() => navigate("/flights")} className="mt-2">
                Return to search
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-foreground mb-2">
                  Continue to {state.bookingProvider}
                </h1>
                <p className="text-sm text-muted-foreground">
                  You're leaving BookingsFinder to complete this booking with {state.bookingProvider}.
                  {typeof state.price === "number" && ` ${state.currency} ${state.price} `}
                  BookingsFinder does not process payment or confirm this booking — final price and
                  availability are set by {state.bookingProvider}.
                </p>
              </div>

              <div className="flex items-start gap-2 text-left bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This link goes directly to {state.bookingProvider}'s own site over a secure (HTTPS)
                  connection. BookingsFinder does not pre-verify every booking partner returned by our
                  live flight search, the same as clicking a result link on any flight search engine.
                </span>
              </div>

              <Button onClick={handleContinue} className="gap-2">
                Continue to {state.bookingProvider}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LiveFlightBookingRedirect;
