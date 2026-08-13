import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const THUMB_CLASS =
  "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

/**
 * One thumb per slider value.
 *
 * Radix drives thumbs by position, so a range slider given two values but only
 * one thumb exposes its lower bound and silently strands the upper one: the
 * flight Price and Duration filters could never have their maximum moved. The
 * count is therefore derived from the values the caller actually supplied —
 * controlled `value` first, then uncontrolled `defaultValue` — falling back to a
 * single thumb, which matches Radix's own `defaultValue = [min]`.
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const thumbValues = Array.isArray(props.value)
    ? props.value
    : Array.isArray(props.defaultValue)
      ? props.defaultValue
      : [0];

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {thumbValues.map((_, index) => (
        <SliderPrimitive.Thumb key={index} className={THUMB_CLASS} />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
