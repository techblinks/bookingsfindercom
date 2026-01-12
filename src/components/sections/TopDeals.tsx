import { Clock, Sparkles, ArrowRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Deal {
  id: string;
  type: "flight" | "hotel" | "package";
  title: string;
  subtitle: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  currency: string;
  discount: number;
  expiresIn: string;
  searchUrl: string;
  badge?: string;
}

const deals: Deal[] = [
  {
    id: "deal-1",
    type: "package",
    title: "Tokyo & Kyoto Adventure",
    subtitle: "7 nights • Flights + 4-star hotels",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    originalPrice: 1899,
    salePrice: 1299,
    currency: "$",
    discount: 32,
    expiresIn: "2 days",
    searchUrl: "/flights?origin=LAX&destination=NRT&departureDate=2026-02-15&returnDate=2026-02-22&passengers=1&cabinClass=economy",
    badge: "Flash Sale",
  },
  {
    id: "deal-2",
    type: "flight",
    title: "New York to Miami",
    subtitle: "Direct flights • Multiple airlines",
    image: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800&q=80",
    originalPrice: 299,
    salePrice: 149,
    currency: "$",
    discount: 50,
    expiresIn: "18 hours",
    searchUrl: "/flights?origin=JFK&destination=MIA&departureDate=2026-02-10&passengers=1&cabinClass=economy",
    badge: "Hot Deal",
  },
  {
    id: "deal-3",
    type: "hotel",
    title: "Maldives Beach Resort",
    subtitle: "5-star • All-inclusive",
    image: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&q=80",
    originalPrice: 599,
    salePrice: 399,
    currency: "$",
    discount: 33,
    expiresIn: "3 days",
    searchUrl: "/hotels?destination=MLE&checkIn=2026-03-01&checkOut=2026-03-05&guests=2&rooms=1",
  },
  {
    id: "deal-4",
    type: "flight",
    title: "London to Barcelona",
    subtitle: "Weekend getaway flights",
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80",
    originalPrice: 189,
    salePrice: 79,
    currency: "$",
    discount: 58,
    expiresIn: "6 hours",
    searchUrl: "/flights?origin=LHR&destination=BCN&departureDate=2026-02-14&returnDate=2026-02-16&passengers=1&cabinClass=economy",
    badge: "Last Minute",
  },
];

const TopDeals = () => {
  return (
    <section id="deals" className="py-12 md:py-16">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-5 w-5 text-orange-500" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Today's Top Deals
              </h2>
            </div>
            <p className="text-muted-foreground">
              Limited time offers on flights, hotels & packages
            </p>
          </div>
          <Link
            to="/deals"
            className="hidden sm:inline-flex text-sm font-medium text-primary hover:underline items-center gap-1"
          >
            View all deals
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              to={deal.searchUrl}
              className="group bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={deal.image}
                  alt={deal.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Badge */}
                {deal.badge && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white shadow-lg">
                      <Sparkles className="h-3 w-3" />
                      {deal.badge}
                    </span>
                  </div>
                )}

                {/* Discount Badge */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-success text-white shadow-lg">
                    -{deal.discount}%
                  </span>
                </div>

                {/* Expiry Timer */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-1.5 text-white/90 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Ends in {deal.expiresIn}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="mb-3">
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    {deal.type}
                  </span>
                  <h3 className="font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
                    {deal.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {deal.subtitle}
                  </p>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground line-through">
                      {deal.currency}{deal.originalPrice}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {deal.currency}{deal.salePrice}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View Deal
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link to="/deals">
            <Button variant="outline">View All Deals</Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TopDeals;
