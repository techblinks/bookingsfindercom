import { useState, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfWeek, endOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";

interface NativeDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onRangeSelect?: (departure: Date, returnDate?: Date) => void;
  onSelect?: (date: Date) => void;
  selected?: Date;
  returnSelected?: Date;
  minDate?: Date;
  tripType?: "roundtrip" | "oneway";
  title?: string;
}

function getWeekdayLabels(): string[] {
  const base = new Date(2024, 0, 1);
  const fmt = new Intl.DateTimeFormat("en-AU", { weekday: "short" });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return fmt.format(d);
  });
}

const WEEKDAYS = getWeekdayLabels();

const quickPicks = [
  { label: "Tomorrow", getDays: () => 1 },
  { label: "+3 Days", getDays: () => 3 },
  { label: "+1 Week", getDays: () => 7 },
  { label: "+2 Weeks", getDays: () => 14 },
];

const NativeDatePicker = ({
  isOpen,
  onClose,
  onRangeSelect,
  onSelect,
  selected,
  returnSelected,
  minDate,
  tripType = "roundtrip",
  title = "Select date",
}: NativeDatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => selected || new Date());
  const [direction, setDirection] = useState(0);
  const [rangeStart, setRangeStart] = useState<Date | undefined>(selected);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(returnSelected);

  const { containerRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);

  const effectiveMinDate = useMemo(() => {
    if (minDate) return minDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, [minDate]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const handlePrevMonth = () => { setDirection(-1); setCurrentMonth((prev) => subMonths(prev, 1)); };
  const handleNextMonth = () => { setDirection(1); setCurrentMonth((prev) => addMonths(prev, 1)); };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 50) handlePrevMonth();
    else if (info.offset.x < -50) handleNextMonth();
  };

  const handleDateClick = (date: Date) => {
    if (isBefore(date, effectiveMinDate)) return;
    if (onRangeSelect) {
      if (tripType === "oneway") { onRangeSelect(date); onClose(); return; }
      if (!rangeStart) { setRangeStart(date); setRangeEnd(undefined); }
      else if (!rangeEnd && date > rangeStart) { setRangeEnd(date); onRangeSelect(rangeStart, date); onClose(); }
      else if (!rangeEnd) { setRangeStart(date); }
      else { setRangeStart(date); setRangeEnd(undefined); }
      return;
    }
    onSelect?.(date);
    onClose();
  };

  const handleQuickPick = (daysToAdd: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (onRangeSelect) {
      if (tripType === "oneway") { const dep = new Date(today); dep.setDate(today.getDate() + daysToAdd); onRangeSelect(dep); }
      else { const dep = new Date(today); dep.setDate(today.getDate() + daysToAdd); const ret = new Date(dep); ret.setDate(dep.getDate() + 7); onRangeSelect(dep, ret); }
      onClose(); return;
    }
    const date = addDays(new Date(), daysToAdd);
    onSelect?.(date);
    onClose();
  };

  const isDateDisabled = (date: Date) => isBefore(date, effectiveMinDate);
  const isInRange = (date: Date) => rangeStart && rangeEnd ? date > rangeStart && date < rangeEnd : false;

  const subtitle = onRangeSelect
    ? rangeStart && !rangeEnd && tripType === "roundtrip" ? "Now select return date" : undefined
    : undefined;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? 300 : -300, opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background outline-none"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col h-full safe-area-inset">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-muted transition-colors" aria-label="Close date picker">
                <X className="h-5 w-5 text-foreground" />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {subtitle && <p className="text-xs text-primary">{subtitle}</p>}
              </div>
              <Button variant="ghost" onClick={onClose} className="text-primary font-semibold">Done</Button>
            </div>

            <div className="px-4 py-3 border-b border-border bg-card">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {quickPicks.map((pick) => (
                  <button key={pick.label} onClick={() => handleQuickPick(pick.getDays())}
                    className="shrink-0 px-4 py-2.5 text-sm font-medium bg-secondary rounded-full native-press transition-colors">
                    {pick.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4">
                <button onClick={handlePrevMonth} className="w-12 h-12 flex items-center justify-center rounded-full native-press bg-secondary" aria-label="Previous month">
                  <ChevronLeft className="h-6 w-6 text-foreground" />
                </button>
                <h3 className="text-xl font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
                <button onClick={handleNextMonth} className="w-12 h-12 flex items-center justify-center rounded-full native-press bg-secondary" aria-label="Next month">
                  <ChevronRight className="h-6 w-6 text-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 px-2">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground">{day}</div>
                ))}
              </div>

              <motion.div className="flex-1 overflow-hidden px-2" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd}>
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.div key={currentMonth.toISOString()} custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.25, ease: "easeInOut" }} className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isStart = rangeStart ? isSameDay(day, rangeStart) : selected ? isSameDay(day, selected) : false;
                      const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
                      const inRange = isInRange(day);
                      const isCurrentDay = isToday(day);
                      const disabled = isDateDisabled(day);
                      return (
                        <motion.button key={index} onClick={() => handleDateClick(day)} disabled={disabled} whileTap={{ scale: 0.9 }}
                          className={cn(
                            "aspect-square w-full min-h-[48px] flex items-center justify-center rounded-full text-base font-medium transition-colors relative",
                            !isCurrentMonth && "opacity-30", disabled && "opacity-30 cursor-not-allowed",
                            inRange && "bg-primary/10 rounded-none",
                            isStart && "bg-primary text-primary-foreground", isEnd && "bg-primary text-primary-foreground",
                            !isStart && !isEnd && isCurrentDay && "bg-accent text-accent-foreground",
                            !isStart && !isEnd && !isCurrentDay && isCurrentMonth && !disabled && !inRange && "native-press",
                          )}>
                          {format(day, "d")}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {(selected || rangeStart) && (
                <div className="px-4 py-4 border-t border-border bg-card safe-area-bottom">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      {rangeStart && rangeEnd ? "Selected" : rangeStart ? "Departure" : "Selected"}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      {rangeEnd ? `${format(rangeStart!, "d MMM")} - ${format(rangeEnd, "d MMM yyyy")}`
                        : rangeStart ? format(rangeStart, "EEEE, d MMM yyyy")
                        : selected ? format(selected, "EEEE, d MMM yyyy") : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NativeDatePicker;
