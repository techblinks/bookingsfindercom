/**
 * Result-set price comparison badge.
 *
 * HONESTY RULE: we have no fare history, no market baseline and no forecast.
 * The only price fact we hold is how one result compares with the other results
 * currently on screen, so that is the only claim this file may make — and it
 * must say so in words.
 *
 * Removed for that reason, and not to be reintroduced without real time-series
 * or provider data behind them:
 *   - simulated seats-left (was Math.sin(price)) — fake scarcity
 *   - "Price rising" — batch deviation presented as movement over time
 *   - "Hot Deal" — batch-relative score presented as a market verdict
 *   - "Departs in Nd" — a countdown on a page the user reached by choosing
 *     that exact date, so it carried pressure and no information
 */

interface UrgencyBadgesProps {
  price: number;
  /** Mean price of the results currently on screen. Nothing else. */
  averagePrice?: number;
}

/** Only call out a result once it is meaningfully below the on-screen average. */
const BELOW_AVERAGE_THRESHOLD = 0.85;

const UrgencyBadges = ({ price, averagePrice }: UrgencyBadgesProps) => {
  if (!averagePrice || averagePrice <= 0) return null;
  if (price >= averagePrice * BELOW_AVERAGE_THRESHOLD) return null;

  const percentBelow = Math.round(((averagePrice - price) / averagePrice) * 100);
  if (percentBelow <= 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
        {percentBelow}% below the average of these results
      </span>
    </div>
  );
};

export default UrgencyBadges;
