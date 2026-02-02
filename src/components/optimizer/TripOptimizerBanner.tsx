import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, TrendingDown, Clock, Shield } from "lucide-react";

interface TripOptimizerBannerProps {
  origin?: string;
  destination?: string;
  departureDate?: string;
  variant?: "compact" | "full";
}

const TripOptimizerBanner = ({ 
  origin, 
  destination, 
  departureDate,
  variant = "full" 
}: TripOptimizerBannerProps) => {
  // Build optimizer URL with prefilled params if available
  const optimizerUrl = origin && destination && departureDate
    ? `/optimizer?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(departureDate)}`
    : "/optimizer";

  if (variant === "compact") {
    return (
      <Link to={optimizerUrl} className="block group">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-rose-500/90 p-3 shadow hover:shadow-md transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                Want smarter travel advice?
              </p>
              <p className="text-xs text-white/80 truncate">
                Get cost breakdowns & timing tips
              </p>
            </div>
            <div className="p-1.5 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
              <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={optimizerUrl} className="block group">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-rose-500/90 p-4 shadow-md hover:shadow-lg transition-all duration-300">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="relative flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          {/* Icon */}
          <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
              <h3 className="text-base font-bold text-white">
                Try Smart Trip Optimizer
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/25 text-white rounded-full">
                NEW
              </span>
            </div>
            <p className="text-white/90 text-sm">
              Get total cost estimates, buy/wait advice & risk alerts for this route
            </p>
          </div>

          {/* Feature pills - desktop only */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/15 text-white rounded-full">
              <TrendingDown className="h-3 w-3" /> Save $
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/15 text-white rounded-full">
              <Clock className="h-3 w-3" /> Timing
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/15 text-white rounded-full">
              <Shield className="h-3 w-3" /> Alerts
            </span>
          </div>

          {/* Arrow */}
          <div className="p-2 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors shrink-0">
            <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TripOptimizerBanner;
