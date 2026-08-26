import { Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCY_OPTIONS } from "@/lib/currency";

interface CurrencySelectorProps {
  value: string;
  onChange: (code: string) => void;
}

/**
 * BF-FLIGHTS-LIVE-2 Phase F — lightweight currency override. Mirrors
 * SortDropdown.tsx's pattern. Selecting a currency only calls onChange
 * (routed to useCurrencyPreference.setCurrency by the caller) — it never
 * touches route, date, passenger or cabin state.
 */
const CurrencySelector = ({ value, onChange }: CurrencySelectorProps) => {
  const current = CURRENCY_OPTIONS.find((c) => c.code === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Coins className="h-4 w-4" />
          <span className="font-medium">{current?.code ?? value}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        {CURRENCY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => onChange(option.code)}
            className="flex items-center gap-3 py-2 cursor-pointer"
          >
            <div className="w-4 h-4 shrink-0">
              {value === option.code && <Check className="h-4 w-4 text-primary" />}
            </div>
            <span className="text-sm font-medium w-14 shrink-0">{option.code}</span>
            <span className="text-sm text-muted-foreground">{option.name}</span>
          </DropdownMenuItem>
        ))}
        {/*
          * BF-FLIGHTS-LIVE-2 Round 2 Phase E: subtle, non-blocking —
          * only visible with the menu already open, not a main-interface
          * banner. The dialog shown at handoff time (UnsupportedCurrencyDialog)
          * is the actual warning; this is just a heads-up while choosing.
          */}
        <p className="px-2 pt-2 pb-1 text-[11px] text-muted-foreground border-t border-border mt-1">
          Live partner currency availability may vary.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CurrencySelector;
