/**
 * Things activity route shell — /things-to-do/:destinationSlug/:activitySlug
 *
 * T2D-A establishes the canonical URL contract and the identity foundation;
 * the final activity-detail product page is deferred to T2D-B. This shell
 * therefore:
 *
 *   - recognises the canonical route shape ONLY
 *   - resolves identity strictly against the canonical registries (destination
 *     registry + activity registry) — never against arbitrary URL text
 *   - fails closed: an unknown destination or unknown activity renders the
 *     existing NotFound experience (noindex,follow), with NO provider call,
 *     NO affiliate redirect, NO fake content and NO fake availability
 *   - for a genuinely resolved activity (none exist yet — the canonical
 *     activity registry is empty in this phase) emits a minimal honest shell:
 *     self-canonical, robots noindex,follow unless the activity is genuinely
 *     published, and nothing that pretends to be a live product page.
 *
 * PAGE EXISTS != PAGE INDEXABLE. All activity-detail functionality stays
 * non-indexable by default; publication/indexing comes later, only after a
 * genuine content/value/inventory gate.
 */
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NotFound from "@/pages/NotFound";
import { getThingsDestinationBySlug } from "@/lib/thingsDestinations";
import {
  getThingsActivityBySlug,
  isThingsActivityPublished,
  thingsActivityPath,
} from "@/lib/thingsActivities";

const SITE_URL = "https://bookingsfinder.com";

const ThingsToDoActivityRoute = () => {
  const { destinationSlug, activitySlug } = useParams<{
    destinationSlug: string;
    activitySlug: string;
  }>();

  // Identity is resolved against the registries ONLY. No slug is ever
  // manufactured from the URL text, and a provider product ID is never
  // interpreted as an activity identity.
  const destination = destinationSlug
    ? getThingsDestinationBySlug(destinationSlug)
    : null;
  const activity =
    destination && activitySlug
      ? getThingsActivityBySlug(destinationSlug, activitySlug)
      : null;

  // ── FAIL CLOSED ───────────────────────────────────────────────
  // Unknown destination or unresolved activity: not-found experience,
  // noindex, and no identity is emitted. This is the default behaviour for
  // every activity URL while the canonical registry is empty.
  if (!destination || !activity) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <NotFound />
      </>
    );
  }

  // ── RESOLVED (no canonical activity exists yet in this phase) ─
  // Minimal honest shell only. No affiliate redirect, no fake availability,
  // no provider copy. The self-canonical is emitted only because identity is
  // genuinely resolved; robots stay noindex,follow unless the activity has
  // passed the real publication gate.
  const canonicalPath = thingsActivityPath(activity);
  const published = isThingsActivityPublished(activity);

  return (
    <>
      <Helmet>
        <title>{activity.canonicalTitle} | BookingsFinder</title>
        <link rel="canonical" href={`${SITE_URL}${canonicalPath}`} />
        {!published && <meta name="robots" content="noindex,follow" />}
      </Helmet>
      <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 text-center">
        <h1 className="text-2xl font-bold text-[#0F172A]">
          {activity.canonicalTitle}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          This experience is being reviewed. Details will appear here when the
          activity is published.
        </p>
      </main>
    </>
  );
};

export default ThingsToDoActivityRoute;
