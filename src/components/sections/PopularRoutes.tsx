import { Plane, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface Route {
  id: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  price: number;
  currency: string;
  trend?: "up" | "down" | "stable";
  savings?: number;
}

const popularRoutes: Route[] = [
  {
    id: "route-1",
    origin: "New York",
    originCode: "JFK",
    destination: "Los Angeles",
    destinationCode: "LAX",
    price: 149,
    currency: "$",
    trend: "down",
    savings: 23,
  },
  {
    id: "route-2",
    origin: "London",
    originCode: "LHR",
    destination: "Paris",
    destinationCode: "CDG",
    price: 89,
    currency: "$",
    trend: "stable",
  },
  {
    id: "route-3",
    origin: "Sydney",
    originCode: "SYD",
    destination: "Tokyo",
    destinationCode: "NRT",
    price: 599,
    currency: "$",
    trend: "down",
    savings: 15,
  },
  {
    id: "route-4",
    origin: "Dubai",
    originCode: "DXB",
    destination: "London",
    destinationCode: "LHR",
    price: 449,
    currency: "$",
    trend: "up",
  },
  {
    id: "route-5",
    origin: "Singapore",
    originCode: "SIN",
    destination: "Bali",
    destinationCode: "DPS",
    price: 129,
    currency: "$",
    trend: "down",
    savings: 31,
  },
  {
    id: "route-6",
    origin: "Los Angeles",
    originCode: "LAX",
    destination: "Honolulu",
    destinationCode: "HNL",
    price: 199,
    currency: "$",
    trend: "stable",
  },
];

const PopularRoutes = () => {
  // Get tomorrow's date for search
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 14);
  const departureDate = tomorrow.toISOString().split("T")[0];

  return (
    <section className="py-12 md:py-16 bg-secondary/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              Popular Routes
            </h2>
            <p className="text-muted-foreground">
              Trending flight routes with the best prices
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Updated hourly</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularRoutes.map((route) => (
            <Link
              key={route.id}
              to={`/flights?origin=${route.originCode}&destination=${route.destinationCode}&departureDate=${departureDate}&passengers=1&cabinClass=economy`}
              className="group bg-card rounded-xl border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {route.originCode}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {route.origin}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 shrink-0">
                      <div className="w-8 h-px bg-border" />
                      <Plane className="h-4 w-4 text-primary rotate-90 shrink-0" />
                      <div className="w-8 h-px bg-border" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {route.destinationCode}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {route.destination}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <p className="text-lg font-bold text-foreground">
                    {route.currency}{route.price}
                  </p>
                  {route.savings && route.savings > 0 && (
                    <p className="text-xs font-medium text-success">
                      Save {route.savings}%
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Round trip from
                </span>
                <span className="text-xs font-medium text-primary group-hover:underline flex items-center gap-1">
                  View deals
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularRoutes;
