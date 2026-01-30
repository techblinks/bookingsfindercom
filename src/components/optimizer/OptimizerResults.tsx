import { format } from "date-fns";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  RotateCcw,
  Plane,
  Briefcase,
  Bus,
  Receipt,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OptimizerRequest, OptimizerResult, RiskAlert } from "@/hooks/useOptimizer";
import { cn } from "@/lib/utils";

interface OptimizerResultsProps {
  result: OptimizerResult;
  request: OptimizerRequest;
  onReset: () => void;
}

const TimingIcon = ({ advice }: { advice: string }) => {
  switch (advice) {
    case "buy":
      return <TrendingDown className="h-5 w-5 text-emerald-600" />;
    case "wait":
      return <TrendingUp className="h-5 w-5 text-amber-600" />;
    default:
      return <Minus className="h-5 w-5 text-blue-600" />;
  }
};

const TimingBadge = ({ advice }: { advice: string }) => {
  const config = {
    buy: { label: "Good time to compare", variant: "default" as const, className: "bg-emerald-500" },
    wait: { label: "Consider waiting", variant: "secondary" as const, className: "bg-amber-500" },
    neutral: { label: "Average pricing", variant: "outline" as const, className: "" },
  };

  const { label, className } = config[advice as keyof typeof config] || config.neutral;

  return (
    <Badge className={cn("text-white", className)}>
      {label}
    </Badge>
  );
};

const RiskAlertCard = ({ alert }: { alert: RiskAlert }) => {
  const severityConfig = {
    high: { icon: XCircle, className: "border-destructive/50 bg-destructive/5" },
    medium: { icon: AlertTriangle, className: "border-amber-500/50 bg-amber-500/5" },
    low: { icon: Info, className: "border-blue-500/50 bg-blue-500/5" },
  };

  const { icon: Icon, className } = severityConfig[alert.severity];

  return (
    <div className={cn("flex gap-3 p-4 rounded-lg border", className)}>
      <Icon className={cn(
        "h-5 w-5 shrink-0 mt-0.5",
        alert.severity === "high" && "text-destructive",
        alert.severity === "medium" && "text-amber-600",
        alert.severity === "low" && "text-blue-600"
      )} />
      <div>
        <p className="font-medium text-foreground text-sm">{alert.type.replace(/_/g, " ")}</p>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
      </div>
    </div>
  );
};

const OptimizerResults = ({ result, request, onReset }: OptimizerResultsProps) => {
  const affiliateUrl = result.affiliateLinks?.[0]?.url || 
    `https://www.aviasales.com/search/${request.origin}${format(new Date(request.travelWindowStart), "ddMM")}${request.destination}${request.travelWindowEnd ? format(new Date(request.travelWindowEnd), "ddMM") : ""}1`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Route Summary Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Plane className="h-4 w-4" />
              Best Balance Option
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {request.origin} → {request.destination}
            </h2>
            <p className="text-muted-foreground">
              {format(new Date(request.travelWindowStart), "EEE, MMM d")}
              {request.travelWindowEnd && ` — ${format(new Date(request.travelWindowEnd), "EEE, MMM d")}`}
            </p>
          </div>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Search
          </Button>
        </div>

        {/* Recommended Route */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-1">Recommended Route</p>
          <p className="font-medium text-foreground">{result.recommendedRoute.summary}</p>
          {result.recommendedRoute.airline && (
            <p className="text-sm text-muted-foreground mt-1">
              {result.recommendedRoute.airline} • {result.recommendedRoute.stops === 0 ? "Direct" : `${result.recommendedRoute.stops} stop(s)`}
              {result.recommendedRoute.duration && ` • ${Math.floor(result.recommendedRoute.duration / 60)}h ${result.recommendedRoute.duration % 60}m`}
            </p>
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Estimated Total Cost</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">Base Fare</span>
            </div>
            <span className="font-medium">${result.costBreakdown.fare.toFixed(2)}</span>
          </div>

          {result.costBreakdown.baggage > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Baggage (estimated)</span>
              </div>
              <span className="font-medium">${result.costBreakdown.baggage.toFixed(2)}</span>
            </div>
          )}

          {result.costBreakdown.transfers > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <Bus className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Transfers (estimated)</span>
              </div>
              <span className="font-medium">${result.costBreakdown.transfers.toFixed(2)}</span>
            </div>
          )}

          {result.costBreakdown.extraFees > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Other Fees (estimated)</span>
              </div>
              <span className="font-medium">${result.costBreakdown.extraFees.toFixed(2)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between items-center py-2">
            <span className="text-lg font-semibold text-foreground">Total Estimate</span>
            <span className="text-2xl font-bold text-primary">
              ${result.estimatedTotalCost.toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          * Estimates based on typical prices. Actual costs may vary at time of booking.
        </p>
      </div>

      {/* Timing Advice */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Timing Advice</h3>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-muted">
            <TimingIcon advice={result.timingAdvice} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TimingBadge advice={result.timingAdvice} />
            </div>
            <p className="text-muted-foreground">
              {result.timingReason || "Based on current pricing trends for this route."}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      {result.riskAlerts && result.riskAlerts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-foreground">Risk Alerts</h3>
          </div>

          <div className="space-y-3">
            {result.riskAlerts.map((alert, index) => (
              <RiskAlertCard key={index} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* No Risks */}
      {(!result.riskAlerts || result.riskAlerts.length === 0) && (
        <div className="bg-card border border-emerald-500/30 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-foreground">No Major Risks Detected</h3>
              <p className="text-sm text-muted-foreground">This route looks straightforward with no significant concerns.</p>
            </div>
          </div>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
        <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
          Ready to compare live prices?
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          See real-time availability and pricing from our booking partners.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="flex-1 max-w-xs">
            <a href={affiliateUrl} target="_blank" rel="noopener noreferrer">
              View Live Prices
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1 max-w-xs">
            <a
              href={`/flights?origin=${request.origin}&destination=${request.destination}&date=${request.travelWindowStart}`}
            >
              Compare Booking Options
            </a>
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        BookingsFinder provides travel insights. All bookings are completed on partner websites.
        Prices shown are estimates and may vary.
      </p>
    </div>
  );
};

export default OptimizerResults;
