/**
 * PassengerPickerSheet — V1 Flights travellers/cabin selector.
 * Approved: native bottom sheet with steppers + cabin grid + Done.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Minus, Plus } from "lucide-react";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

type CabinClass = "economy" | "premium" | "business" | "first";

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  passengers: PassengerCount;
  cabinClass: CabinClass;
  onPassengersChange: (p: PassengerCount) => void;
  onCabinChange: (c: CabinClass) => void;
}

export function PassengerPickerSheet({
  isOpen,
  onClose,
  passengers,
  cabinClass,
  onPassengersChange,
  onCabinChange,
}: Props) {
  const [, setLocal] = useState(passengers);
  const [localCabin, setLocalCabin] = useState(cabinClass);
  const { containerRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  const total = passengers.adults + passengers.children + passengers.infants;

  const stepper = (
    type: keyof PassengerCount,
    label: string,
    sub: string,
    min: number,
  ) => (
    <div className="flex items-center justify-between min-h-[56px]">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (passengers[type] <= min) return;
            const next = { ...passengers, [type]: passengers[type] - 1 };
            if (type === "adults" && next.adults < next.infants) return;
            onPassengersChange(next);
          }}
          disabled={passengers[type] <= min}
          className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 hover:bg-muted transition-colors"
          aria-label={"Decrease " + label.toLowerCase()}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center font-semibold text-sm">{passengers[type]}</span>
        <button
          onClick={() => {
            if (total >= 9) return;
            if (type === "infants" && passengers.infants >= passengers.adults) return;
            const next = { ...passengers, [type]: passengers[type] + 1 };
            onPassengersChange(next);
          }}
          disabled={total >= 9 || (type === "infants" && passengers.infants >= passengers.adults)}
          className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 hover:bg-muted transition-colors"
          aria-label={"Increase " + label.toLowerCase()}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] lg:hidden outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Travellers and cabin"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold text-foreground">Travellers and Cabin</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-6 space-y-6">
          <div className="space-y-2">
            {stepper("adults", "Adults", "Age 12+", 1)}
            {stepper("children", "Children", "Age 2-11", 0)}
            {stepper("infants", "Infants", "Under 2", 0)}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Cabin class</div>
            <div className="grid grid-cols-2 gap-2">
              {CABIN_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setLocalCabin(c.value); onCabinChange(c.value); }}
                  className={cn(
                    "py-4 px-4 rounded-xl text-sm font-semibold transition-colors min-h-[52px]",
                    cabinClass === c.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={onClose} size="lg" className="w-full h-13 text-base font-semibold rounded-xl">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
