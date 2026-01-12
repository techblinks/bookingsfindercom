import { useState } from "react";
import { Users, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

interface PassengerPickerProps {
  value: PassengerCount;
  onChange: (value: PassengerCount) => void;
}

const PassengerPicker = ({ value, onChange }: PassengerPickerProps) => {
  const [open, setOpen] = useState(false);

  const totalPassengers = value.adults + value.children + value.infants;

  const updateCount = (type: keyof PassengerCount, delta: number) => {
    const newValue = { ...value };
    newValue[type] = Math.max(
      type === "adults" ? 1 : 0,
      Math.min(9, newValue[type] + delta)
    );

    // Ensure total doesn't exceed 9
    const newTotal = newValue.adults + newValue.children + newValue.infants;
    if (newTotal > 9) return;

    // Ensure infants don't exceed adults
    if (type === "infants" && newValue.infants > newValue.adults) return;
    if (type === "adults" && newValue.infants > newValue.adults) {
      newValue.infants = newValue.adults;
    }

    onChange(newValue);
  };

  const formatLabel = () => {
    const parts: string[] = [];
    if (value.adults > 0) {
      parts.push(`${value.adults} Adult${value.adults > 1 ? "s" : ""}`);
    }
    if (value.children > 0) {
      parts.push(`${value.children} Child${value.children > 1 ? "ren" : ""}`);
    }
    if (value.infants > 0) {
      parts.push(`${value.infants} Infant${value.infants > 1 ? "s" : ""}`);
    }
    return parts.join(", ");
  };

  const PassengerRow = ({
    label,
    description,
    type,
    count,
    minDisabled,
  }: {
    label: string;
    description: string;
    type: keyof PassengerCount;
    count: number;
    minDisabled: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => updateCount(type, -1)}
          disabled={minDisabled}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-6 text-center text-sm font-medium">{count}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => updateCount(type, 1)}
          disabled={totalPassengers >= 9 || (type === "infants" && count >= value.adults)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-12 justify-start text-left font-normal w-full"
        >
          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="truncate">{formatLabel()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-1">
          <h4 className="font-medium text-sm mb-3">Passengers</h4>
          
          <PassengerRow
            label="Adults"
            description="Age 12+"
            type="adults"
            count={value.adults}
            minDisabled={value.adults <= 1}
          />
          
          <div className="border-t border-border" />
          
          <PassengerRow
            label="Children"
            description="Age 2-11"
            type="children"
            count={value.children}
            minDisabled={value.children <= 0}
          />
          
          <div className="border-t border-border" />
          
          <PassengerRow
            label="Infants"
            description="Under 2, on lap"
            type="infants"
            count={value.infants}
            minDisabled={value.infants <= 0}
          />
        </div>
        
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Max 9 passengers. Infants must not exceed adults.
          </p>
        </div>
        
        <Button
          className="w-full mt-3"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default PassengerPicker;
