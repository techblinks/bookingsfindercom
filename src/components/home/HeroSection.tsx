import ModernSearchBox from "@/components/search/ModernSearchBox";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHeroSearch from "@/components/search/MobileHeroSearch";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, TrendingDown, Clock, Shield } from "lucide-react";
import worldMapPattern from "@/assets/world-map-pattern.png";

interface HeroSectionProps {
  showFlights?: boolean;
  showHotels?: boolean;
}

const HeroSection = ({ showFlights = true, showHotels = true }: HeroSectionProps) => {
  const isMobile = useIsMobile();

  return (
    <section className="relative bg-primary py-10 md:py-20 overflow-hidden">
      {/* World map pattern overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.15] pointer-events-none"
        style={{ backgroundImage: `url(${worldMapPattern})` }}
      />
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

      <div className="container relative">
        {/* Hero Title */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-2 md:mb-3 tracking-tight leading-tight">
            {isMobile ? "Find cheap flights" : "Compare flights & hotels"}
          </h1>
          <p className="text-sm md:text-lg text-primary-foreground/75 max-w-xl mx-auto font-normal">
            Search hundreds of travel sites at once
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-5xl mx-auto">
          {isMobile ? (
            <div className="px-1">
              <MobileHeroSearch showFlights={showFlights} showHotels={showHotels} />
            </div>
          ) : (
            <div className="bg-card rounded-2xl p-5 shadow-2xl border border-border/50">
              <ModernSearchBox showFlights={showFlights} showHotels={showHotels} />
            </div>
          )}
        </div>

        {/* Trip Optimizer CTA - Compact */}
        <div className="max-w-3xl mx-auto mt-4 md:mt-6">
          <Link to="/optimizer" className="block group">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/15 hover:bg-primary-foreground/15 transition-all">
              <div className="p-2 rounded-full bg-primary-foreground/15">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-primary-foreground">
                  Smart Trip Optimizer
                </span>
                <span className="text-xs text-primary-foreground/70 ml-2 hidden sm:inline">
                  Cost breakdowns, timing advice & risk alerts
                </span>
              </div>
              {/* Feature pills - desktop only */}
              <div className="hidden md:flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary-foreground/10 text-primary-foreground/80 rounded-full">
                  <TrendingDown className="h-3 w-3" /> Save
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary-foreground/10 text-primary-foreground/80 rounded-full">
                  <Clock className="h-3 w-3" /> Timing
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary-foreground/10 text-primary-foreground/80 rounded-full">
                  <Shield className="h-3 w-3" /> Alerts
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-primary-foreground/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
