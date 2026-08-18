/**
 * Infrastructure-unavailable state for the activity detail page (T3E).
 *
 * Deliberately distinct from NotFound: a resolver or network failure is NOT
 * "no such activity". The copy therefore blames nothing the traveller did — it
 * never says the experience doesn't exist, never suggests another destination
 * and never suggests changing filters — and "Try again" genuinely re-runs the
 * resolver with the same canonical slug pair rather than navigating away.
 *
 * T3E only changes how it looks: the same site chrome as the resolved page, a
 * single calm card on the T3C canvas, and an escape hatch back to the
 * destination the traveller came from.
 */
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface ActivityDetailUnavailableProps {
  /** Re-runs the resolver with the same slug pair. */
  onRetry: () => void;
  /**
   * Canonical destination path to step back to, when the route genuinely
   * resolved a registry destination. Never manufactured from URL text.
   */
  destinationPath?: string | null;
  /** Canonical destination display name, paired with `destinationPath`. */
  destinationName?: string | null;
}

const ActivityDetailUnavailable = ({
  onRetry,
  destinationPath,
  destinationName,
}: ActivityDetailUnavailableProps) => (
  <>
    <Header />

    <main
      id="main-content"
      className="flex min-h-[60vh] items-center justify-center bg-things-surface-page px-4 py-14 sm:px-6 lg:py-20"
      data-testid="activity-detail-unavailable"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-things-border bg-things-surface-card px-6 py-8 text-center shadow-card sm:px-8"
        role="status"
      >
        <span
          className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-things-brand-soft"
          aria-hidden="true"
        >
          <RefreshCw className="h-5 w-5 text-primary" />
        </span>

        <h1 className="text-xl font-bold leading-snug text-things-text-primary">
          We couldn&apos;t load this experience right now.
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-things-text-secondary">
          Please try again in a moment. Your destination and search are unchanged.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-things-action px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-things-action-hover active:bg-things-action-strong things-focus-ring-action sm:w-auto sm:px-8"
        >
          Try again
        </button>

        {destinationPath && destinationName && (
          <p className="mt-4 text-sm text-things-text-secondary">
            <Link
              to={destinationPath}
              className="font-medium text-primary hover:underline things-focus-ring"
            >
              Back to things to do in {destinationName}
            </Link>
          </p>
        )}
      </div>
    </main>

    <Footer />
  </>
);

export default ActivityDetailUnavailable;
