import { Star, MapPin, Wifi, Car, Coffee, Heart } from "lucide-react";
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

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative sm:w-64 md:w-72 flex-shrink-0">
          <img
            src={image}
            alt={name}
            className="w-full h-48 sm:h-full object-cover"
          />
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
              }`}
            />
          </button>
          {isDeal && (
            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
              Great Deal
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {name}
                </h3>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-sm font-medium text-foreground">
                      {getScoreLabel(guestScore)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {reviewCount.toLocaleString()} reviews
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {guestScore.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2 mb-4">
              {amenities.slice(0, 3).map((amenity) => {
                const IconComponent = amenityIcons[amenity];
                return (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full"
                  >
                    {IconComponent && <IconComponent className="h-3 w-3" />}
                    {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                  </span>
                );
              })}
              {amenities.length > 3 && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  +{amenities.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between pt-3 border-t border-border">
            <div>
              {originalPrice && (
                <span className="text-sm text-muted-foreground line-through mr-2">
                  {currency}{originalPrice}
                </span>
              )}
              <span className="text-2xl font-bold text-foreground">
                {currency}{price}
              </span>
              <span className="text-sm text-muted-foreground"> / night</span>
            </div>
            <Button onClick={() => onViewDeal(id)}>
              View Deal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelResultCard;
