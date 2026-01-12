import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

interface FlightFiltersProps {
  priceRange: [number, number];
  onPriceChange: (value: [number, number]) => void;
  selectedAirlines: string[];
  onAirlinesChange: (airlines: string[]) => void;
  selectedStops: number[];
  onStopsChange: (stops: number[]) => void;
  selectedDepartureTimes: string[];
  onDepartureTimesChange: (times: string[]) => void;
}

// Placeholder airline data - ready for API injection
const airlines = [
  { id: "delta", name: "Delta", count: 24 },
  { id: "united", name: "United", count: 18 },
  { id: "american", name: "American", count: 15 },
  { id: "southwest", name: "Southwest", count: 12 },
  { id: "jetblue", name: "JetBlue", count: 8 },
];

const stopOptions = [
  { value: 0, label: "Nonstop", count: 15 },
  { value: 1, label: "1 Stop", count: 28 },
  { value: 2, label: "2+ Stops", count: 10 },
];

const departureTimes = [
  { id: "early-morning", label: "Early Morning", time: "12am - 6am", count: 8 },
  { id: "morning", label: "Morning", time: "6am - 12pm", count: 22 },
  { id: "afternoon", label: "Afternoon", time: "12pm - 6pm", count: 18 },
  { id: "evening", label: "Evening", time: "6pm - 12am", count: 12 },
];

const FlightFilters = ({
  priceRange,
  onPriceChange,
  selectedAirlines,
  onAirlinesChange,
  selectedStops,
  onStopsChange,
  selectedDepartureTimes,
  onDepartureTimesChange,
}: FlightFiltersProps) => {
  const toggleAirline = (airlineId: string) => {
    if (selectedAirlines.includes(airlineId)) {
      onAirlinesChange(selectedAirlines.filter((a) => a !== airlineId));
    } else {
      onAirlinesChange([...selectedAirlines, airlineId]);
    }
  };

  const toggleStop = (stopValue: number) => {
    if (selectedStops.includes(stopValue)) {
      onStopsChange(selectedStops.filter((s) => s !== stopValue));
    } else {
      onStopsChange([...selectedStops, stopValue]);
    }
  };

  const toggleDepartureTime = (timeId: string) => {
    if (selectedDepartureTimes.includes(timeId)) {
      onDepartureTimesChange(selectedDepartureTimes.filter((t) => t !== timeId));
    } else {
      onDepartureTimesChange([...selectedDepartureTimes, timeId]);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">Filters</h2>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="px-1">
          <Slider
            value={priceRange}
            min={0}
            max={2000}
            step={50}
            onValueChange={(value) => onPriceChange(value as [number, number])}
            className="mb-3"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
      </FilterSection>

      {/* Airlines */}
      <FilterSection title="Airlines">
        <div className="space-y-3">
          {airlines.map((airline) => (
            <div key={airline.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={airline.id}
                  checked={selectedAirlines.includes(airline.id)}
                  onCheckedChange={() => toggleAirline(airline.id)}
                />
                <Label
                  htmlFor={airline.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {airline.name}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {airline.count}
              </span>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Stops */}
      <FilterSection title="Stops">
        <div className="space-y-3">
          {stopOptions.map((option) => (
            <div key={option.value} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`stop-${option.value}`}
                  checked={selectedStops.includes(option.value)}
                  onCheckedChange={() => toggleStop(option.value)}
                />
                <Label
                  htmlFor={`stop-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {option.count}
              </span>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Departure Time */}
      <FilterSection title="Departure Time">
        <div className="space-y-3">
          {departureTimes.map((time) => (
            <div key={time.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={time.id}
                  checked={selectedDepartureTimes.includes(time.id)}
                  onCheckedChange={() => toggleDepartureTime(time.id)}
                />
                <div>
                  <Label
                    htmlFor={time.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {time.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{time.time}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {time.count}
              </span>
            </div>
          ))}
        </div>
      </FilterSection>
    </div>
  );
};

export default FlightFilters;
