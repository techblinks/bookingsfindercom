/**
 * Things destination route — /things-to-do/:destinationSlug
 *
 * Resolves the URL slug against the canonical BookingsFinder Things
 * destination registry ONLY. There is no fuzzy fallback and no provider-text
 * invention: an unknown slug renders the existing NotFound experience, which
 * is noindex.
 *
 * Known destinations render the shared ThingsToDo page with their canonical
 * identity, so the route-driven search context is always registry-owned:
 *
 *   /things-to-do/rome  →  destination "Rome", destinationId 511 (Viator ref)
 */
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ThingsToDo from "@/pages/ThingsToDo";
import NotFound from "@/pages/NotFound";
import { getThingsDestinationBySlug } from "@/lib/thingsDestinations";

const ThingsToDoDestinationPage = () => {
  const { destinationSlug } = useParams<{ destinationSlug: string }>();
  const destination = destinationSlug
    ? getThingsDestinationBySlug(destinationSlug)
    : null;

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

  return <ThingsToDo destination={destination} />;
};

export default ThingsToDoDestinationPage;
