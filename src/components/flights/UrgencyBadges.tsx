import { Flame, TrendingUp, TrendingDown, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface UrgencyBadgesProps {
  price: number;
  averagePrice?: number;
  dealScore?: number;
  departureDate?: string;
}

// REMOVED: getSeatsLeft function - was Math.sin(price) simulated scarcity

const getDaysUntilDeparture = (departureDate?: string): number | null => {
  if (!departureDate) return null;
  try {
    const dep = new Date(departureDate);
    const now = new Date();
    return Math.ceil((dep.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

const UrgencyBadges = ({ price, averagePrice, dealScore, departureDate }: UrgencyBadgesProps) => {
  const badges: JSX.Element[] = [];
  // REMOVED: seatsLeft simulation - was fake scarcity
  const daysUntil = getDaysUntilDeparture(departureDate);

  // REMOVED: seats-left badge - was simulated with Math.sin(price)

  // Price trend badge
  if (averagePrice && price < averagePrice * 0.85) {
    const savings = Math.round(((averagePrice - price) / averagePrice) * 100);
    badges.push(
      <span
        key="below-avg"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
      >
        <TrendingDown className="h-3 w-3" />
        {savings}% below avg
      </span>
    );
  } else if (averagePrice && price > averagePrice * 1.1) {
    badges.push(
      <span
        key="above-avg"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
      >
        <TrendingUp className="h-3 w-3" />
        Price rising
      </span>
    );
  }

  // Departing soon badge
  if (daysUntil !== null && daysUntil > 0 && daysUntil <= 7) {
    badges.push(
      <span
        key="soon"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive"
      >
        <Clock className="h-3 w-3" />
        Departs in {daysUntil}d
      </span>
    );
  }

  // Hot deal badge
  if (dealScore && dealScore >= 85) {
    badges.push(
      <span
        key="hot"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
      >
        <Flame className="h-3 w-3" />
        Hot Deal
      </span>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges}
    </div>
  );
};

export default UrgencyBadges;
