import { useState, useEffect } from 'react';
import { TrendingDown, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceDropNotificationProps {
  previousPrice: number;
  currentPrice: number;
  route: string;
  currency?: string;
  onDismiss?: () => void;
  onViewDeal?: () => void;
}

export function PriceDropNotification({
  previousPrice,
  currentPrice,
  route,
  currency = 'AUD',
  onDismiss,
  onViewDeal,
}: PriceDropNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const priceDrop = previousPrice - currentPrice;
  const percentDrop = Math.round((priceDrop / previousPrice) * 100);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (priceDrop <= 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl p-4 pr-10">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                <TrendingDown className="h-6 w-6" />
              </div>
              
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-semibold text-lg">Price Drop Alert!</h4>
                  <p className="text-white/90 text-sm">{route}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    -{currency} {priceDrop.toLocaleString()}
                  </span>
                  <span className="text-white/80 text-sm">
                    ({percentDrop}% off)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="line-through text-white/60">
                    {currency} {previousPrice.toLocaleString()}
                  </span>
                  <span className="font-semibold">
                    {currency} {currentPrice.toLocaleString()}
                  </span>
                </div>

                {onViewDeal && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 gap-1"
                    onClick={onViewDeal}
                  >
                    View Deal
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
