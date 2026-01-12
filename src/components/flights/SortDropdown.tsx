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

const sortOptions: { value: SortOption; label: string; description: string }[] = [
  { value: "best", label: "Best", description: "Recommended balance of price, speed & stops" },
  { value: "cheapest", label: "Cheapest", description: "Lowest price first" },
  { value: "fastest", label: "Fastest", description: "Shortest duration first" },
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
