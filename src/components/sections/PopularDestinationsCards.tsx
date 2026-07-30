/**
 * PopularDestinationsCards — Phase 7F: Custom destination cards.
 *
 * Replaces Travelpayouts/Weedle widgets with owned BookingsFinder cards.
 * - 6 cards on desktop (2×3 grid), 3 on mobile (1×3 stack)
 * - Monthly/seasonal rotation — stable within each calendar month
 * - Always includes at least 1 India or Nepal destination
 * - No live prices — clean, minimal travel design
 * - Each card links to White Label flight search with preserved currency/locale
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Destination data ──────────────────────────────────────────────

interface DestinationCard {
  iata: string;
  city: string;
  country: string;
  descriptor: string;
  /** Image path relative to /public or absolute URL. */
  image: string;
}

const ALL_DESTINATIONS: DestinationCard[] = [
  { iata: "LON",  city: "London",    country: "United Kingdom", descriptor: "Royal history meets modern edge",                image: "/destinations/london.svg" },
  { iata: "NYC",  city: "New York",  country: "United States",  descriptor: "The city that never sleeps",                     image: "/destinations/new-york.svg" },
  { iata: "DXB",  city: "Dubai",     country: "UAE",            descriptor: "Futuristic skyline in the desert",               image: "/destinations/dubai.svg" },
  { iata: "SIN",  city: "Singapore", country: "Singapore",      descriptor: "A garden city of endless discovery",              image: "/destinations/singapore.svg" },
  { iata: "BKK",  city: "Bangkok",   country: "Thailand",       descriptor: "Vibrant street life and golden temples",          image: "/destinations/bangkok.svg" },
  { iata: "DPS",  city: "Bali",      country: "Indonesia",      descriptor: "Island paradise of rice terraces and surf",      image: "/destinations/bali.svg" },
  { iata: "DEL",  city: "Delhi",     country: "India",          descriptor: "Where ancient forts meet bustling bazaars",       image: "/destinations/delhi.svg" },
  { iata: "KTM",  city: "Kathmandu", country: "Nepal",          descriptor: "Gateway to the roof of the world",                image: "/destinations/kathmandu.svg" },
  { iata: "TYO",  city: "Tokyo",     country: "Japan",          descriptor: "Neon lights and timeless traditions",             image: "/destinations/tokyo.svg" },
  { iata: "PAR",  city: "Paris",     country: "France",         descriptor: "The timeless city of light and love",             image: "/destinations/paris.svg" },
  { iata: "YTO",  city: "Toronto",   country: "Canada",         descriptor: "Cosmopolitan charm on the Great Lakes",           image: "/destinations/toronto.svg" },
  { iata: "SYD",  city: "Sydney",    country: "Australia",      descriptor: "Harbour city with sun-drenched beaches",         image: "/destinations/sydney.svg" },
];

// India / Nepal IATA codes — at least one must always appear
const INDIA_NEPAL_CODES = new Set(["DEL", "KTM", "BOM", "MAA", "BLR", "CCU"]);

/**
 * Stable monthly rotation: picks 6 destinations based on (year, month).
 * Same destinations for the entire calendar month. Always includes
 * at least one India or Nepal destination.
 */
function getMonthlyDestinations(year: number, month: number): DestinationCard[] {
  // Deterministic seed from year-month
  const seed = year * 12 + (month - 1);

  // Separate India/Nepal from the rest
  const indiaNepal = ALL_DESTINATIONS.filter((d) => INDIA_NEPAL_CODES.has(d.iata));
  const others = ALL_DESTINATIONS.filter((d) => !INDIA_NEPAL_CODES.has(d.iata));

  // Pick one India/Nepal destination deterministically
  const inIndex = seed % indiaNepal.length;
  const pickedIndiaNepal = indiaNepal[inIndex];

  // Shuffle others using Fisher-Yates with the seed
  const shuffled = [...others];
  let state = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take 5 from others + 1 India/Nepal = 6 total
  const selected = shuffled.slice(0, 5);
  // Insert India/Nepal at position (seed % 6)
  const insertAt = seed % 6;
  selected.splice(insertAt, 0, pickedIndiaNepal);

  return selected;
}

// ── Component ────────────────────────────────────────────────────

export function PopularDestinationsCards() {
  const destinations = useMemo(() => {
    const now = new Date();
    return getMonthlyDestinations(now.getFullYear(), now.getMonth() + 1);
  }, []);

  const getBookingUrl = (dest: DestinationCard) => {
    // Preserve current locale/currency by routing through /flights
    const params = new URLSearchParams({
      destination: dest.iata,
      passengers: "1",
      cabinClass: "economy",
    });
    return `/flights?${params.toString()}`;
  };

  return (
    <section aria-labelledby="popular-dest-heading" className="py-10 md:py-14">
      <div className="container max-w-7xl mx-auto px-4">
        <h2
          id="popular-dest-heading"
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight text-center mb-2"
        >
          Where would you like to go?
        </h2>
        <p className="text-base text-muted-foreground text-center max-w-xl mx-auto mb-8 md:mb-10">
          Hand-picked destinations to inspire your next trip. Explore flights and start planning.
        </p>

        {/* Desktop: 2×3 grid | Mobile: 3 cards */}
        <ul
          className={cn(
            "grid gap-4 sm:gap-5",
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {destinations.map((dest) => (
            <li key={dest.iata}>
              <Link
                to={getBookingUrl(dest)}
                className={cn(
                  "group relative flex flex-col rounded-2xl overflow-hidden",
                  "bg-card border border-border",
                  "hover:border-primary/40 hover:shadow-lg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "transition-all duration-300",
                )}
              >
                {/* Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  <img
                    src={dest.image}
                    alt={`${dest.city}, ${dest.country} — ${dest.descriptor}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Subtle bottom gradient for text readability */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-4 sm:p-5">
                  <div className="flex items-start gap-1.5 mb-1">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground text-base sm:text-lg leading-snug">
                        {dest.city}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {dest.country}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2 mb-4 leading-relaxed line-clamp-2">
                    {dest.descriptor}
                  </p>

                  <span
                    className={cn(
                      "mt-auto inline-flex items-center gap-1.5",
                      "text-sm font-medium text-primary",
                      "group-hover:gap-2.5 transition-all",
                    )}
                  >
                    Explore flights
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
