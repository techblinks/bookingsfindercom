import { Star, MapPin, Wifi, Car, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HotelCardProps {
  name: string;
  image: string;
  location: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency?: string;
  amenities?: string[];
  isDeal?: boolean;
}

const HotelCard = ({
  name,
  image,
  location,
  rating,
  reviewCount,
  price,
  currency = "$",
  amenities = [],
  isDeal = false,
}: HotelCardProps) => {
  const amenityIcons: Record<string, React.ReactNode> = {
    wifi: <Wifi className="h-4 w-4" />,
    parking: <Car className="h-4 w-4" />,
    breakfast: <Coffee className="h-4 w-4" />,
  };

  return (
    <div className="travel-card overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {isDeal && (
          <div className="absolute top-3 left-3">
            <span className="deal-badge">Best Value</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="text-sm font-medium text-foreground">{rating}</span>
            <span className="text-sm text-muted-foreground">({reviewCount})</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            {amenities.slice(0, 3).map((amenity) => (
              <div
                key={amenity}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {amenityIcons[amenity.toLowerCase()]}
                <span className="capitalize">{amenity}</span>
              </div>
            ))}
          </div>
        )}

        {/* Price and Action */}
        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div>
            <p className="price-tag">
              <span className="price-currency">{currency}</span>
              {price}
            </p>
            <p className="text-xs text-muted-foreground">per night</p>
          </div>
          <Button size="sm">View Deal</Button>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
