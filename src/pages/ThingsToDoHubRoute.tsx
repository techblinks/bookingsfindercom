/**
 * Things hub route — /things-to-do
 *
 * T2B legacy URL migration. A legacy canonical city on the hub query contract
 * is migrated to its canonical path AT THE ROUTE BOUNDARY, before the legacy
 * ThingsToDo hub component mounts — so no unnecessary provider search fires
 * for it:
 *
 *   /things-to-do?city=Rome              → /things-to-do/rome
 *   /things-to-do?city=Rome&q=colosseum  → /things-to-do/rome?q=colosseum
 *
 * Every non-city parameter is preserved; `city` is removed because the path
 * identity replaces it.
 *
 * HONESTY: this is a CLIENT-SIDE React Router navigation with `replace`
 * (history.replace), NOT an HTTP 301/308 redirect. No edge-level redirect
 * infrastructure is added in this phase — Rome is still draft/noindex, so the
 * edge-level publication concern stays separate.
 *
 * Non-canonical cities (Paris, Sydney, Melbourne, …) are not in the canonical
 * registry, so they render the legacy hub exactly as before:
 *
 *   /things-to-do?city=Paris  →  hub, ?city=Paris search contract unchanged
 */
import { Navigate, useSearchParams } from "react-router-dom";
import ThingsToDo from "@/pages/ThingsToDo";
import {
  resolveThingsDestinationFromLegacyCity,
  thingsDestinationPath,
} from "@/lib/thingsDestinations";

/**
 * The canonical target for a legacy hub URL, or null when the URL stays on the
 * hub. Pure and exported so the migration contract is testable directly.
 */
export function buildLegacyHubRedirect(searchParams: URLSearchParams): string | null {
  const city = searchParams.get("city");
  if (!city) return null;
  const destination = resolveThingsDestinationFromLegacyCity(city);
  if (!destination) return null;
  // Path identity replaces ?city=; every other parameter is preserved.
  const params = new URLSearchParams(searchParams);
  params.delete("city");
  const search = params.toString();
  return `${thingsDestinationPath(destination)}${search ? `?${search}` : ""}`;
}

const ThingsToDoHubRoute = () => {
  const [searchParams] = useSearchParams();
  const target = buildLegacyHubRedirect(searchParams);

  // Client-side history.replace. The legacy URL is not left in the history
  // stack and the hub component never mounts, so it cannot search.
  if (target) {
    return <Navigate to={target} replace />;
  }

  return <ThingsToDo />;
};

export default ThingsToDoHubRoute;
