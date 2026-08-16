/**
 * Things activity route — /things-to-do/:destinationSlug/:activitySlug
 *
 * T2D-B1: the T2D-A shell becomes a resolver-driven dynamic page.
 *
 *   - the destination segment is validated against the canonical destination
 *     registry ONLY (unknown destination → NotFound, no resolver call)
 *   - the activity is resolved server-side by the read-only
 *     things-activity-public Edge Function (exact slug pair only — no
 *     title-derived fallback, no fuzzy matching, no provider calls)
 *   - loading / not-found / infrastructure-unavailable are distinct states;
 *     retry genuinely re-runs the resolver
 *   - canonical self-link is emitted ONLY after canonical identity genuinely
 *     resolves; robots stays noindex,follow ALWAYS in this phase (activity
 *     pages are not yet indexable — rich enrichment and the publication gate
 *     are still incomplete)
 *   - no Product/Offer/Review/FAQ structured data is added yet
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NotFound from "@/pages/NotFound";
import { getThingsDestinationBySlug } from "@/lib/thingsDestinations";
import { thingsActivityPath } from "@/lib/thingsActivities";
import { resolveThingsActivityDetail } from "@/services/thingsActivityDetail";
import type { ThingsActivityDetail } from "@/types/thingsActivityDetail";
import ActivityDetailPage from "@/components/activity/ActivityDetailPage";
import ActivityDetailSkeleton from "@/components/activity/ActivityDetailSkeleton";
import ActivityDetailUnavailable from "@/components/activity/ActivityDetailUnavailable";

const SITE_URL = "https://bookingsfinder.com";

type ActivityView =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "not-found" }
  | { kind: "resolved"; detail: ThingsActivityDetail };

const ThingsToDoActivityRoute = () => {
  const { destinationSlug, activitySlug } = useParams<{
    destinationSlug: string;
    activitySlug: string;
  }>();

  // Destination identity is registry-owned: no slug is ever manufactured
  // from URL text, and a provider product ID is never interpreted as
  // activity identity.
  const destination = destinationSlug
    ? getThingsDestinationBySlug(destinationSlug)
    : null;

  const [view, setView] = useState<ActivityView>({ kind: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    // Unknown destination fails closed immediately — no resolver call.
    if (!destination || !destinationSlug || !activitySlug) {
      setView({ kind: "not-found" });
      return;
    }

    let cancelled = false;
    setView({ kind: "loading" });

    resolveThingsActivityDetail(destinationSlug, activitySlug)
      .then((result) => {
        if (cancelled) return;
        if (result.state === "resolved") {
          setView({ kind: "resolved", detail: result.detail });
        } else if (result.state === "not-found") {
          setView({ kind: "not-found" });
        } else {
          setView({ kind: "unavailable" });
        }
      })
      .catch(() => {
        if (!cancelled) setView({ kind: "unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, [destination, destinationSlug, activitySlug, retryKey]);

  // ── UNKNOWN DESTINATION ──────────────────────────────────────
  if (!destination) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <NotFound />
      </>
    );
  }

  // ── LOADING ──────────────────────────────────────────────────
  if (view.kind === "loading") {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <ActivityDetailSkeleton />
      </>
    );
  }

  // ── INFRASTRUCTURE UNAVAILABLE (≠ not-found) ─────────────────
  if (view.kind === "unavailable") {
    return (
      <>
        <Helmet>
          <title>Experience unavailable | BookingsFinder</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <ActivityDetailUnavailable onRetry={() => setRetryKey((k) => k + 1)} />
      </>
    );
  }

  // ── NOT FOUND (unknown or archived activity) ─────────────────
  if (view.kind === "not-found") {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <NotFound />
      </>
    );
  }

  // ── RESOLVED ─────────────────────────────────────────────────
  // Canonical emitted ONLY because identity genuinely resolved. Robots stays
  // noindex,follow even if publication_status is published: T2D-B1 is not
  // the publication phase (rich enrichment, the content/value gate, ingestion
  // and sitemap publication are all still incomplete).
  const { detail } = view;
  const canonicalPath = `${SITE_URL}${thingsActivityPath(detail.activity)}`;

  return (
    <>
      <Helmet>
        <title>{detail.activity.canonicalTitle} | BookingsFinder</title>
        <link rel="canonical" href={canonicalPath} />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <ActivityDetailPage detail={detail} destination={destination} />
    </>
  );
};

export default ThingsToDoActivityRoute;
