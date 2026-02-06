import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type NativeCalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Mobile-optimized calendar with 48px touch targets and larger nav buttons.
 */
function NativeCalendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: NativeCalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 w-full", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-lg font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button:
          "h-10 w-10 inline-flex items-center justify-center rounded-full bg-transparent border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors native-touch",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex justify-around",
        head_cell:
          "w-12 h-10 text-muted-foreground rounded-md font-medium text-sm flex items-center justify-center",
        row: "flex w-full mt-1 justify-around",
        cell: "relative p-0 text-center focus-within:relative focus-within:z-20",
        day: cn(
          "h-12 w-12 p-0 font-medium text-base rounded-full inline-flex items-center justify-center transition-colors native-touch",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground font-bold",
        day_outside:
          "text-muted-foreground/40",
        day_disabled: "text-muted-foreground/30",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-5 w-5" />,
        IconRight: () => <ChevronRight className="h-5 w-5" />,
      }}
      {...props}
    />
  );
}
NativeCalendar.displayName = "NativeCalendar";

export { NativeCalendar };
