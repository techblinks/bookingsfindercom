import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  id?: string;
  className?: string;
  min?: number;
  step?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  disabled?: boolean;
}

/**
 * Controlled monetary input with transient empty-string support.
 *
 * - Zero renders as an empty field (clean visual, no "0" clutter)
 * - Clearing the field sets parent value to 0
 * - Invalid/malformed text leaves the parent value unchanged
 * - Negative values are passed through so foundation validation can report them
 * - On blur, re-syncs display to the stored numeric value
 *
 * Edge cases handled:
 *   - Partial input like "-" or "." is kept as transient local state
 *   - NaN and Infinity never committed to parent
 *   - parseFloat(value) || 0 is never used
 */
export function MoneyInput({ value, onChange, onBlur, ...inputProps }: MoneyInputProps) {
  const displayValue = value === 0 ? "" : String(value);
  const [localValue, setLocalValue] = useState(displayValue);

  // Sync when parent value changes externally (currency change, reset, draft restore)
  useEffect(() => {
    setLocalValue(value === 0 ? "" : String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);

    // Allow transient partial input while user types
    if (raw === "" || raw === "-") {
      onChange(0);
      return;
    }

    const n = Number(raw);
    if (isNaN(n) || !isFinite(n)) {
      // Malformed — don't commit to parent; state stays at last valid value
      return;
    }

    onChange(n);
  };

  const handleBlur = () => {
    // Re-sync display to stored numeric value on blur
    setLocalValue(value === 0 ? "" : String(value));
    onBlur?.();
  };

  return (
    <Input
      type="number"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn("h-12 rounded-xl", inputProps.className)}
      min={0}
      step={inputProps.step ?? "0.01"}
      {...inputProps}
    />
  );
}
