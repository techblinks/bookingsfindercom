import { ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortOption } from "@/types/flight";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

/*
 * BF-FLIGHTS-CACHE-1 Phase 3: no "Best" option — Travelpayouts' cached
 * observations carry no provider-defined ranking, and presenting a
 * BookingsFinder-invented weighted score as "Best" would misrepresent it
 * as an objective recommendation. Only sorts directly justified by
 * returned data (price, duration, stop count) are offered.
 */
const sortOptions: { value: SortOption; label: string; description: string }[] = [
  { value: "cheapest", label: "Cheapest", description: "Lowest price first" },
  { value: "fastest", label: "Fastest", description: "Shortest duration first" },
  { value: "stops", label: "Fewest stops", description: "Direct flights first" },
];

const SortDropdown = ({ value, onChange }: SortDropdownProps) => {
  const currentOption = sortOptions.find(o => o.value === value) || sortOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">Sort:</span>
          <span className="font-medium">{currentOption.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <div className="w-4 h-4 shrink-0 mt-0.5">
              {value === option.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortDropdown;
