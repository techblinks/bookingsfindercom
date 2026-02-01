import ModernSearchBox from "@/components/search/ModernSearchBox";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHeroSearch from "@/components/search/MobileHeroSearch";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, TrendingDown, Clock, Shield } from "lucide-react";

interface HeroSectionProps {
  showFlights?: boolean;
  showHotels?: boolean;
}

const HeroSection = ({ showFlights = true, showHotels = true }: HeroSectionProps) => {
  const isMobile = useIsMobile();

  return (
    <section className="relative bg-primary py-16 md:py-24 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container relative">
        {/* Hero Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 tracking-tight">
            Search cheap flight tickets
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Compare prices from hundreds of airlines and travel sites
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl p-4 md:p-6 shadow-2xl">
            {isMobile ? (
              <MobileHeroSearch showFlights={showFlights} showHotels={showHotels} />
            ) : (
              <ModernSearchBox showFlights={showFlights} showHotels={showHotels} />
            )}
          </div>
        </div>

        {/* Trip Optimizer CTA Card */}
        <div className="max-w-4xl mx-auto mt-6 md:mt-8">
          <Link 
            to="/optimizer"
            className="block group"
          >
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-rose-500/90 p-4 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <div className="relative flex flex-col md:flex-row items-center gap-4 md:gap-6">
                {/* Icon */}
                <div className="flex-shrink-0 p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      Smart Trip Optimizer
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-white/25 text-white rounded-full">
                      NEW
                    </span>
                  </div>
                  <p className="text-white/90 text-sm md:text-base mb-3 md:mb-0">
                    Get personalized travel intelligence with cost breakdowns, timing advice & risk alerts
                  </p>
                  
                  {/* Feature pills - mobile stacked, desktop inline */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2 md:hidden">
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/15 text-white rounded-full">
                      <TrendingDown className="h-3 w-3" /> Save Money
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/15 text-white rounded-full">
                      <Clock className="h-3 w-3" /> Buy/Wait Advice
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/15 text-white rounded-full">
                      <Shield className="h-3 w-3" /> Risk Alerts
                    </span>
                  </div>
                </div>

                {/* Desktop feature pills */}
                <div className="hidden md:flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/15 text-white rounded-full">
                    <TrendingDown className="h-3.5 w-3.5" /> Save Money
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/15 text-white rounded-full">
                    <Clock className="h-3.5 w-3.5" /> Buy/Wait
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/15 text-white rounded-full">
                    <Shield className="h-3.5 w-3.5" /> Risk Alerts
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 p-2 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                  <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
