import { Star, MapPin, Wifi, Car, Coffee, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HotelResultCardProps {
  id: string;
  name: string;
  image: string;
  location: string;
  stars: number;
  guestScore: number;
  reviewCount: number;
  price: number;
  originalPrice?: number;
  currency?: string;
  amenities: string[];
  isDeal?: boolean;
  onViewDeal: (hotelId: string) => void;
}

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
};

const HotelResultCard = ({
  id,
  name,
  image,
  location,
  stars,
  guestScore,
  reviewCount,
  price,
  originalPrice,
  currency = "$",
  amenities,
  isDeal = false,
  onViewDeal,
}: HotelResultCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Exceptional";
    if (score >= 8) return "Excellent";
    if (score >= 7) return "Very Good";
    if (score >= 6) return "Good";
    return "Pleasant";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-primary";
    if (score >= 7) return "bg-blue-500";
    return "bg-muted-foreground";
  };

  return (
    <div className="bg-card rounded-xl border border-border hover:border-primary/30 transition-all duration-200 overflow-hidden group">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative sm:w-56 md:w-64 flex-shrink-0">
          <img
            src={image}
            alt={name}
            className="w-full h-44 sm:h-full object-cover"
            loading="lazy"
          />
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-card transition-colors"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
              }`}
            />
          </button>
          {isDeal && (
            <div className="absolute top-2.5 left-2.5 text-[11px] font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 px-2 py-0.5 rounded">
              Great Deal
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="min-w-0">
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {name}
              </h3>
            </div>
            {/* Score Badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-medium text-foreground">{getScoreLabel(guestScore)}</span>
                <p className="text-[11px] text-muted-foreground">{reviewCount.toLocaleString()} reviews</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${getScoreColor(guestScore)} text-primary-foreground flex items-center justify-center font-bold text-sm`}>
                {guestScore.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{location}</span>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1.5 mb-auto">
            {amenities.slice(0, 3).map((amenity) => {
              const IconComponent = amenityIcons[amenity];
              return (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded"
                >
                  {IconComponent && <IconComponent className="h-3 w-3" />}
                  {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                </span>
              );
            })}
            {amenities.length > 3 && (
              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                +{amenities.length - 3} more
              </span>
            )}
          </div>

          {/* Footer: Price + CTA */}
          <div className="flex items-end justify-between pt-3 mt-3 border-t border-border">
            <div>
              {originalPrice && originalPrice > price && (
                <span className="text-xs text-muted-foreground line-through mr-1.5">
                  {currency}{originalPrice}
                </span>
              )}
              <span className="text-xl font-bold text-foreground">
                {currency}{price}
              </span>
              <span className="text-xs text-muted-foreground ml-1">/ night</span>
            </div>
            <Button
              onClick={() => onViewDeal(id)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              View Deal
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelResultCard;
