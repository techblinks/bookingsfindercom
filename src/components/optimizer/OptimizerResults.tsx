import { format } from "date-fns";
import {
  DollarSign,
  ExternalLink,
  RotateCcw,
  Plane,
  Info,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  OptimizerRequest,
  OptimizerSuccess,
  FactualNote,
  useOptimizer,
} from "@/hooks/useOptimizer";

interface OptimizerResultsProps {
  result: OptimizerSuccess;
  request: OptimizerRequest;
  onReset: () => void;
}

const NoteCard = ({ note }: { note: FactualNote }) => (
  <div className="flex gap-3 p-4 rounded-lg border border-blue-500/50 bg-blue-500/5">
    <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
    <p className="text-sm text-muted-foreground">{note.message}</p>
  </div>
);

const OptimizerResults = ({ result, request, onReset }: OptimizerResultsProps) => {
  const { trackAffiliateClick } = useOptimizer();

  // An affiliate link is rendered ONLY when the provider supplied a genuine
  // deep link. No search URL is synthesised to stand in for a missing result.
  const affiliateUrl = result.affiliateLinks?.[0]?.url ?? null;

  const compareUrl = `/flights?origin=${request.origin}&destination=${request.destination}&date=${request.travelWindowStart}`;

  const handleAffiliateClick = async (
    action: "redirect" | "compare" | "view_deal",
    url: string,
  ) => {
    await trackAffiliateClick({
      type: "flight",
      action,
      origin: request.origin,
      destination: request.destination,
      departureDate: request.travelWindowStart,
      returnDate: request.travelWindowEnd,
      price: result.fare,
      redirectUrl: url,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Route Summary Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Plane className="h-4 w-4" />
              Returned option
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {request.origin} → {request.destination}
            </h2>
            <p className="text-muted-foreground">
              {format(new Date(request.travelWindowStart), "EEE, MMM d")}
              {request.travelWindowEnd &&
                ` — ${format(new Date(request.travelWindowEnd), "EEE, MMM d")}`}
            </p>
          </div>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Search
          </Button>
        </div>

        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-1">Route</p>
          <p className="font-medium text-foreground">{result.recommendedRoute.summary}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {[
              result.recommendedRoute.airline,
              result.recommendedRoute.stops === undefined
                ? null
                : result.recommendedRoute.stops === 0
                  ? "Direct"
                  : `${result.recommendedRoute.stops} stop(s)`,
              result.recommendedRoute.duration === undefined
                ? null
                : `${Math.floor(result.recommendedRoute.duration / 60)}h ${result.recommendedRoute.duration % 60}m`,
            ]
              .filter(Boolean)
              .join(" • ") || "The provider reported no further itinerary detail."}
          </p>
        </div>

        {/* Aggregates over the options actually returned */}
        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Options returned for this search
            </span>
            <Badge variant="outline" className="text-xs">
              {result.priceContext.optionsFound} returned
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Lowest</p>
              <p className="font-semibold text-emerald-600">
                ${result.priceContext.lowestPrice}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-semibold text-foreground">
                ${result.priceContext.averagePrice}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Highest</p>
              <p className="font-semibold text-muted-foreground">
                ${result.priceContext.highestPrice}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fare — the only monetary figure we can substantiate */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Provider-quoted fare</h3>
        </div>

        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">Fare</span>
          </div>
          <span className="text-2xl font-bold text-primary">
            ${result.fare.toFixed(2)}
          </span>
        </div>

        {result.fareComparison && (
          <p className="text-sm text-muted-foreground mt-3">{result.fareComparison}</p>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          This is the fare quoted by our flight data provider at the time of the search.
          It does not include baggage, transfers or other fees — BookingsFinder does not
          estimate those. Confirm the final price on the booking partner's site.
        </p>
      </div>

      {/* Factual itinerary notes */}
      {result.notes && result.notes.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-foreground">Itinerary notes</h3>
          </div>

          <div className="space-y-3">
            {result.notes.map((note, index) => (
              <NoteCard key={index} note={note} />
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
        <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
          Ready to compare prices?
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          See availability and pricing on our booking partners’ sites.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {affiliateUrl && (
            <Button
              asChild
              size="lg"
              className="flex-1 max-w-xs"
              onClick={() => handleAffiliateClick("view_deal", affiliateUrl)}
            >
              <a href={affiliateUrl} target="_blank" rel="noopener noreferrer">
                View on Partner Site
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="flex-1 max-w-xs"
            onClick={() => handleAffiliateClick("compare", compareUrl)}
          >
            <a href={compareUrl}>Compare Booking Options</a>
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        BookingsFinder shows flight data returned by our provider. All bookings are
        completed on partner websites, where the final price is confirmed.
      </p>
    </div>
  );
};

export default OptimizerResults;
