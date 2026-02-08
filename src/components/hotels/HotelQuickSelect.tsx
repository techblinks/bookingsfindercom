import { useMemo } from "react";
import { Star, TrendingDown, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { HotelResult } from "@/services/travelApi";
import { motion } from "framer-motion";

interface HotelQuickSelectProps {
  hotels: HotelResult[];
  currency?: string;
  onSelect: (hotelId: string) => void;
}

interface QuickOption {
  id: string;
  label: string;
  price: number;
  detail: string;
  icon: React.ReactNode;
  hotel: HotelResult;
  accent: string;
}

const HotelQuickSelect = ({ hotels, currency = "$", onSelect }: HotelQuickSelectProps) => {
  const options = useMemo<QuickOption[]>(() => {
    if (hotels.length === 0) return [];

    const cheapest = hotels.reduce((a, b) => (a.price < b.price ? a : b));
    const bestRated = hotels.reduce((a, b) => (a.guestScore > b.guestScore ? a : b));
    // Best value = highest score-to-price ratio
    const bestValue = hotels.reduce((a, b) => {
      const ratioA = a.guestScore / (a.price || 1);
      const ratioB = b.guestScore / (b.price || 1);
      return ratioA > ratioB ? a : b;
    });

    return [
      {
        id: "best-rated",
        label: "Best Rated",
        price: bestRated.price,
        detail: `${bestRated.guestScore}/10 · ${bestRated.stars}★ · ${bestRated.reviewCount} reviews`,
        icon: <Star className="h-4 w-4" />,
        hotel: bestRated,
        accent: "text-primary border-primary/30 bg-primary/5",
      },
      {
        id: "cheapest",
        label: "Cheapest",
        price: cheapest.price,
        detail: `${cheapest.guestScore}/10 · ${cheapest.stars}★`,
        icon: <TrendingDown className="h-4 w-4" />,
        hotel: cheapest,
        accent: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
      },
      {
        id: "best-value",
        label: "Best Value",
        price: bestValue.price,
        detail: `${bestValue.guestScore}/10 · ${bestValue.stars}★`,
        icon: <Award className="h-4 w-4" />,
        hotel: bestValue,
        accent: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5",
      },
    ];
  }, [hotels]);

  if (options.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      {options.map((opt, i) => (
        <motion.button
          key={opt.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          onClick={() => onSelect(opt.hotel.id)}
          className={cn(
            "relative rounded-xl border p-3 md:p-4 text-left transition-all duration-200 cursor-pointer",
            "hover:shadow-md hover:scale-[1.01]",
            "border-border bg-card hover:border-primary/20"
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className={cn("shrink-0", opt.accent.split(" ")[0])}>
              {opt.icon}
            </span>
            <span className="text-sm font-semibold text-foreground">{opt.label}</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground tabular-nums leading-tight">
            <span className="text-xs font-normal text-muted-foreground mr-0.5">{currency}</span>
            {opt.price.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground">/night</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{opt.detail}</p>
        </motion.button>
      ))}
    </div>
  );
};

export default HotelQuickSelect;
