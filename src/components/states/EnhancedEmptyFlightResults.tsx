import { Link } from "react-router-dom";
import { Plane, Calendar, Search, TrendingUp } from "lucide-react";
import { parseISO, addDays, format, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EnhancedEmptyFlightResultsProps {
  onClearFilters?: () => void;
  /**
   * BF-0R-7.2 Phase F: reopens the in-page edit/search form instead of
   * navigating away. When omitted, "Modify Search" is not rendered rather
   * than falling back to a home-page link — see FlightResults.tsx, which
   * always supplies () => setIsEditingSearch(true).
   */
  onModifySearch?: () => void;
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  /**
   * BF-0R-7.2 Phase D: the validated search's actual traveller/cabin
   * composition, so alternative-date/-destination links don't silently
   * reset a family search to a single economy adult. Defaults preserve the
   * previous behaviour only when a caller genuinely has nothing else to
   * supply.
   */
  adults?: number;
  children?: number;
  infants?: number;
  cabinClass?: string;
  message?: string;
}

/**
 * BF-0R-7.2 Phase E: "alternative", never "popular" — there is no verified
 * popularity dataset behind this list, just a fixed set of major hub
 * destinations to explore from the traveller's origin. BF-0R-7.2 final
 * correction item 1: this list is exploratory only — it deliberately does
 * NOT fetch or display a price. A get-route-prices call keyed to today+14
 * days (never the traveller's actual departure date) and assigned back to
 * routes by array index was not a safe or meaningful number to show next to
 * a link that preserves the traveller's real search date; see the removed
 * "Recent from $X" behaviour in git history for what this replaced.
 */
const ALTERNATIVE_DESTINATIONS = [
  { dest: "SIN", name: "Singapore" },
  { dest: "DXB", name: "Dubai" },
  { dest: "LHR", name: "London" },
  { dest: "LAX", name: "Los Angeles" },
  { dest: "NRT", name: "Tokyo" },
  { dest: "BKK", name: "Bangkok" },
];

const EnhancedEmptyFlightResults = ({
  onClearFilters,
  onModifySearch,
  origin = "",
  destination = "",
  departureDate = "",
  returnDate = "",
  adults = 1,
  children = 0,
  infants = 0,
  cabinClass = "economy",
  message = "No flights found matching your criteria",
}: EnhancedEmptyFlightResultsProps) => {
  /**
   * BF-0R-7.2 final correction item 2: timezone-safe calendar-date
   * arithmetic. departureDate/returnDate are YYYY-MM-DD calendar strings;
   * date-fns' parseISO reads a date-only ISO string as LOCAL midnight
   * (unlike `new Date("YYYY-MM-DD")`, which the spec treats as UTC
   * midnight and can therefore display as the previous calendar day in
   * positive-UTC-offset timezones). addDays/format then stay in that same
   * local calendar throughout, so the rendered label and the URL's date
   * param always name the same day.
   */
  const getAlternativeDates = () => {
    if (!departureDate) return [];

    const base = parseISO(departureDate);
    const returnDateObj = returnDate ? parseISO(returnDate) : null;

    const dates: { date: string; label: string; diff: number }[] = [];

    // -3, -2, -1, +1, +2, +3 days from the requested departure date.
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue; // Skip the original date
      const candidate = addDays(base, i);

      // A round trip's alternative departure must stay before the return
      // date — never offer a "departure" on or after the return.
      if (returnDateObj && !isBefore(candidate, returnDateObj)) continue;

      dates.push({
        date: format(candidate, "yyyy-MM-dd"),
        label: format(candidate, "EEE, MMM d"),
        diff: i,
      });
    }

    return dates;
  };

  const alternativeDates = getAlternativeDates();
  const alternativeDestinations = ALTERNATIVE_DESTINATIONS
    .filter(d => d.dest !== destination)
    .slice(0, 4);

  /**
   * BF-0R-7.2 Phase D: preserves the full supported search contract
   * (adults/children/infants/cabinClass/returnDate) on every suggestion
   * link, rather than resetting to a single economy adult.
   */
  const getFlightSearchUrl = (params: { origin?: string; destination?: string; date?: string }) => {
    const searchParams = new URLSearchParams({
      origin: params.origin || origin,
      destination: params.destination || destination,
      departureDate: params.date || departureDate,
      ...(returnDate && { returnDate }),
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      cabinClass,
    });
    return `/flights?${searchParams.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Main Empty State Card */}
      <Card className="border-border">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Plane className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No Flights Found
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>

          {/* Suggestions */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
            <p className="text-sm font-medium text-foreground mb-3">Try these suggestions:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Choose different travel dates (flexible by a few days)</span>
              </li>
              <li className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Adjust your filters to see more results</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onClearFilters && (
              <Button variant="outline" onClick={onClearFilters}>
                Clear All Filters
              </Button>
            )}
            {/*
              * BF-0R-7.2 Phase F: reopens the in-page edit form rather than
              * navigating to "/" — see the onModifySearch doc comment above.
              */}
            {onModifySearch && (
              <Button className="gap-2" onClick={onModifySearch}>
                <Search className="h-4 w-4" />
                Modify Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alternative Dates Section */}
      {alternativeDates.length > 0 && departureDate && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Try Different Dates</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Flights might be available on nearby dates
            </p>
            <div className="flex flex-wrap gap-2">
              {alternativeDates.map((date) => (
                <Link key={date.date} to={getFlightSearchUrl({ date: date.date })}>
                  <Button variant="outline" size="sm" className="gap-1">
                    {date.label}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {date.diff > 0 ? `+${date.diff}` : date.diff} days
                    </Badge>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Explore Other Destinations — BF-0R-7.2 Phase E: never "Popular";
        * BF-0R-7.2 final correction: no price is fetched or shown here —
        * see the ALTERNATIVE_DESTINATIONS doc comment above. */}
      {alternativeDestinations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Explore other destinations from {origin}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Try another destination from your departure airport.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alternativeDestinations.map((route) => (
                <Link
                  key={route.dest}
                  to={getFlightSearchUrl({ destination: route.dest })}
                >
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Plane className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <div>
                        <p className="font-medium text-sm">{route.name}</p>
                        <p className="text-xs text-muted-foreground">{route.dest}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">View options</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedEmptyFlightResults;
