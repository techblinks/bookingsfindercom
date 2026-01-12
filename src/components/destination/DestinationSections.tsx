import { Calendar, Plane, TrendingDown, TrendingUp, Minus, Star, MapPin, Users, ArrowRight } from "lucide-react";
import { MonthPrice, Provider, TravelTip } from "@/data/destinationData";
import { Button } from "@/components/ui/button";

// Icon mapping for travel tips
const tipIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  passport: Users,
  luggage: MapPin,
  car: ArrowRight,
  map: MapPin,
  train: ArrowRight,
  sparkles: Star,
};

interface CheapestMonthTableProps {
  months: MonthPrice[];
  type: "flights" | "hotels";
}

export const CheapestMonthTable = ({ months, type }: CheapestMonthTableProps) => {
  const getTrendIcon = (trend: "low" | "medium" | "high") => {
    switch (trend) {
      case "low":
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case "high":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTrendLabel = (trend: "low" | "medium" | "high") => {
    switch (trend) {
      case "low":
        return "Great time to book";
      case "high":
        return "Peak season";
      default:
        return "Average prices";
    }
  };

  return (
    <section className="mb-12" aria-labelledby="price-calendar-heading">
      <h2 id="price-calendar-heading" className="text-2xl font-bold text-foreground mb-4">
        {type === "flights" ? "Cheapest Months to Fly" : "Best Time to Book"}
      </h2>
      <p className="text-muted-foreground mb-6">
        Plan your trip around the best prices. Prices shown are averages and may vary.
      </p>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="bg-secondary/50">
                <th scope="col" className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                  Month
                </th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                  Avg. Price
                </th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                  Price Trend
                </th>
                <th scope="col" className="text-left px-4 py-3 text-sm font-semibold text-foreground hidden sm:table-cell">
                  Recommendation
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((month, index) => (
                <tr
                  key={month.month}
                  className={`border-t border-border ${index % 2 === 0 ? "bg-background" : "bg-secondary/20"}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {month.month}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-lg font-bold text-foreground">
                      {month.currency}{month.avgPrice}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      {getTrendIcon(month.trend)}
                      <span className={`text-sm font-medium capitalize ${
                        month.trend === "low" ? "text-green-600" :
                        month.trend === "high" ? "text-red-500" : "text-amber-500"
                      }`}>
                        {month.trend}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {getTrendLabel(month.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

interface PopularProvidersProps {
  providers: Provider[];
  type: "flights" | "hotels";
}

export const PopularProviders = ({ providers, type }: PopularProvidersProps) => {
  return (
    <section className="mb-12" aria-labelledby="providers-heading">
      <h2 id="providers-heading" className="text-2xl font-bold text-foreground mb-4">
        {type === "flights" ? "Popular Airlines" : "Top-Rated Hotels"}
      </h2>
      <p className="text-muted-foreground mb-6">
        {type === "flights" 
          ? "Compare airlines operating this route" 
          : "Hand-picked accommodations loved by travelers"
        }
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <article
            key={provider.id}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            itemScope
            itemType={type === "flights" ? "https://schema.org/Airline" : "https://schema.org/Hotel"}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground" itemProp="name">
                    {provider.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium" itemProp="ratingValue">{provider.rating}</span>
                    <span className="text-muted-foreground">
                      ({provider.reviewCount.toLocaleString()} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-xl font-bold text-foreground">
                  {provider.currency}{provider.priceFrom}
                </p>
              </div>
              <Button size="sm" variant="outline">
                View Deals
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

interface TravelTipsProps {
  tips: TravelTip[];
  destination: string;
}

export const TravelTipsSection = ({ tips, destination }: TravelTipsProps) => {
  return (
    <section className="mb-12" aria-labelledby="tips-heading">
      <h2 id="tips-heading" className="text-2xl font-bold text-foreground mb-4">
        Tips for Traveling to {destination}
      </h2>
      <p className="text-muted-foreground mb-6">
        Essential information to help plan your perfect trip
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {tips.map((tip, index) => {
          const IconComponent = tipIcons[tip.icon] || Calendar;
          return (
            <article
              key={index}
              className="bg-card rounded-xl border border-border p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tip.content}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
