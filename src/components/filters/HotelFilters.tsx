import { useState } from "react";
import { ChevronDown, ChevronUp, Star, Wifi, Car, Coffee, Dumbbell, Waves, Utensils } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection = ({ title, children, defaultOpen = true }: FilterSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-2"
      >
        <span className="font-semibold text-foreground">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
};

interface HotelFiltersProps {
  priceRange: [number, number];
  onPriceChange: (value: [number, number]) => void;
  selectedStars: number[];
  onStarsChange: (stars: number[]) => void;
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  guestRating: number;
  onGuestRatingChange: (rating: number) => void;
}

const starOptions = [
  { value: 5, label: "5 Stars", count: 12 },
  { value: 4, label: "4 Stars", count: 28 },
  { value: 3, label: "3 Stars", count: 35 },
  { value: 2, label: "2 Stars", count: 18 },
];

const amenityOptions = [
  { id: "wifi", label: "Free WiFi", icon: Wifi, count: 89 },
  { id: "parking", label: "Free Parking", icon: Car, count: 56 },
  { id: "breakfast", label: "Breakfast Included", icon: Coffee, count: 42 },
  { id: "gym", label: "Fitness Center", icon: Dumbbell, count: 38 },
  { id: "pool", label: "Swimming Pool", icon: Waves, count: 24 },
  { id: "restaurant", label: "Restaurant", icon: Utensils, count: 67 },
];

const guestRatingOptions = [
  { value: 9, label: "Exceptional", sublabel: "9+" },
  { value: 8, label: "Excellent", sublabel: "8+" },
  { value: 7, label: "Very Good", sublabel: "7+" },
  { value: 6, label: "Good", sublabel: "6+" },
];

const HotelFilters = ({
  priceRange,
  onPriceChange,
  selectedStars,
  onStarsChange,
  selectedAmenities,
  onAmenitiesChange,
  guestRating,
  onGuestRatingChange,
}: HotelFiltersProps) => {
  const toggleStar = (starValue: number) => {
    if (selectedStars.includes(starValue)) {
      onStarsChange(selectedStars.filter((s) => s !== starValue));
    } else {
      onStarsChange([...selectedStars, starValue]);
    }
  };

  const toggleAmenity = (amenityId: string) => {
    if (selectedAmenities.includes(amenityId)) {
      onAmenitiesChange(selectedAmenities.filter((a) => a !== amenityId));
    } else {
      onAmenitiesChange([...selectedAmenities, amenityId]);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">Filters</h2>

      {/* Price Range */}
      <FilterSection title="Price per night">
        <div className="px-1">
          <Slider
            value={priceRange}
            min={0}
            max={1000}
            step={25}
            onValueChange={(value) => onPriceChange(value as [number, number])}
            className="mb-3"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}+</span>
          </div>
        </div>
      </FilterSection>

      {/* Star Rating */}
      <FilterSection title="Star Rating">
        <div className="space-y-3">
          {starOptions.map((option) => (
            <div key={option.value} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`star-${option.value}`}
                  checked={selectedStars.includes(option.value)}
                  onCheckedChange={() => toggleStar(option.value)}
                />
                <Label
                  htmlFor={`star-${option.value}`}
                  className="text-sm font-normal cursor-pointer flex items-center gap-1"
                >
                  {Array.from({ length: option.value }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {option.count}
              </span>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Amenities */}
      <FilterSection title="Amenities">
        <div className="space-y-3">
          {amenityOptions.map((amenity) => (
            <div key={amenity.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={amenity.id}
                  checked={selectedAmenities.includes(amenity.id)}
                  onCheckedChange={() => toggleAmenity(amenity.id)}
                />
                <Label
                  htmlFor={amenity.id}
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  <amenity.icon className="h-4 w-4 text-muted-foreground" />
                  {amenity.label}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {amenity.count}
              </span>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Guest Rating */}
      <FilterSection title="Guest Rating">
        <div className="space-y-2">
          {guestRatingOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onGuestRatingChange(option.value === guestRating ? 0 : option.value)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                guestRating === option.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.sublabel}</span>
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );
};

export default HotelFilters;
