 import { useState, useMemo } from "react";
 import { motion, AnimatePresence, PanInfo } from "framer-motion";
 import { X, ChevronLeft, ChevronRight } from "lucide-react";
 import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfWeek, endOfWeek, addDays } from "date-fns";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 
 interface NativeDatePickerProps {
   isOpen: boolean;
   onClose: () => void;
   onSelect: (date: Date) => void;
   selected?: Date;
   minDate?: Date;
   title?: string;
 }
 
 const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
 
 const quickPicks = [
   { label: "Today", getDays: () => 0 },
   { label: "Tomorrow", getDays: () => 1 },
   { label: "+3 Days", getDays: () => 3 },
   { label: "+1 Week", getDays: () => 7 },
   { label: "+2 Weeks", getDays: () => 14 },
 ];
 
 const NativeDatePicker = ({
   isOpen,
   onClose,
   onSelect,
   selected,
   minDate,
   title = "Select Date",
 }: NativeDatePickerProps) => {
   const [currentMonth, setCurrentMonth] = useState(() => selected || new Date());
   const [direction, setDirection] = useState(0);
 
   const effectiveMinDate = useMemo(() => {
     if (minDate) return minDate;
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     return today;
   }, [minDate]);
 
   const calendarDays = useMemo(() => {
     const monthStart = startOfMonth(currentMonth);
     const monthEnd = endOfMonth(currentMonth);
     const calendarStart = startOfWeek(monthStart);
     const calendarEnd = endOfWeek(monthEnd);
     return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
   }, [currentMonth]);
 
   const handlePrevMonth = () => {
     setDirection(-1);
     setCurrentMonth((prev) => subMonths(prev, 1));
   };
 
   const handleNextMonth = () => {
     setDirection(1);
     setCurrentMonth((prev) => addMonths(prev, 1));
   };
 
   const handleDragEnd = (_: any, info: PanInfo) => {
     const threshold = 50;
     if (info.offset.x > threshold) {
       handlePrevMonth();
     } else if (info.offset.x < -threshold) {
       handleNextMonth();
     }
   };
 
   const handleDateClick = (date: Date) => {
     if (isBefore(date, effectiveMinDate)) return;
     onSelect(date);
     onClose();
   };
 
   const handleQuickPick = (daysToAdd: number) => {
     const date = addDays(new Date(), daysToAdd);
     onSelect(date);
     onClose();
   };
 
   const isDateDisabled = (date: Date) => {
     return isBefore(date, effectiveMinDate);
   };
 
   const variants = {
     enter: (direction: number) => ({
       x: direction > 0 ? 300 : -300,
       opacity: 0,
     }),
     center: {
       x: 0,
       opacity: 1,
     },
     exit: (direction: number) => ({
       x: direction < 0 ? 300 : -300,
       opacity: 0,
     }),
   };
 
   return (
     <AnimatePresence>
       {isOpen && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.2 }}
           className="fixed inset-0 z-50 bg-background"
         >
           <div className="flex flex-col h-full safe-area-inset">
             {/* Header */}
             <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
               <button
                 onClick={onClose}
                 className="w-10 h-10 flex items-center justify-center rounded-full active:bg-muted transition-colors"
               >
                 <X className="h-5 w-5 text-foreground" />
               </button>
               <h2 className="text-lg font-semibold text-foreground">{title}</h2>
               <Button
                 variant="ghost"
                 onClick={onClose}
                 className="text-primary font-semibold"
               >
                 Done
               </Button>
             </div>
 
             {/* Quick Picks */}
             <div className="px-4 py-3 border-b border-border bg-card">
               <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                 {quickPicks.map((pick) => (
                   <button
                     key={pick.label}
                     onClick={() => handleQuickPick(pick.getDays())}
                     className="shrink-0 px-4 py-2.5 text-sm font-medium bg-secondary rounded-full native-press transition-colors"
                   >
                     {pick.label}
                   </button>
                 ))}
               </div>
             </div>
 
             {/* Calendar */}
             <div className="flex-1 flex flex-col overflow-hidden">
               {/* Month Navigation */}
               <div className="flex items-center justify-between px-4 py-4">
                 <button
                   onClick={handlePrevMonth}
                   className="w-12 h-12 flex items-center justify-center rounded-full native-press bg-secondary"
                 >
                   <ChevronLeft className="h-6 w-6 text-foreground" />
                 </button>
                 <h3 className="text-xl font-semibold text-foreground">
                   {format(currentMonth, "MMMM yyyy")}
                 </h3>
                 <button
                   onClick={handleNextMonth}
                   className="w-12 h-12 flex items-center justify-center rounded-full native-press bg-secondary"
                 >
                   <ChevronRight className="h-6 w-6 text-foreground" />
                 </button>
               </div>
 
               {/* Weekday Headers */}
               <div className="grid grid-cols-7 gap-1 px-2">
                 {WEEKDAYS.map((day) => (
                   <div
                     key={day}
                     className="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground"
                   >
                     {day}
                   </div>
                 ))}
               </div>
 
               {/* Calendar Grid with Swipe */}
               <motion.div
                 className="flex-1 overflow-hidden px-2"
                 drag="x"
                 dragConstraints={{ left: 0, right: 0 }}
                 dragElastic={0.2}
                 onDragEnd={handleDragEnd}
               >
                 <AnimatePresence initial={false} custom={direction} mode="wait">
                   <motion.div
                     key={currentMonth.toISOString()}
                     custom={direction}
                     variants={variants}
                     initial="enter"
                     animate="center"
                     exit="exit"
                     transition={{ duration: 0.25, ease: "easeInOut" }}
                     className="grid grid-cols-7 gap-1"
                   >
                     {calendarDays.map((day, index) => {
                       const isCurrentMonth = isSameMonth(day, currentMonth);
                       const isSelected = selected && isSameDay(day, selected);
                       const isCurrentDay = isToday(day);
                       const disabled = isDateDisabled(day);
 
                       return (
                         <motion.button
                           key={index}
                           onClick={() => handleDateClick(day)}
                           disabled={disabled}
                           whileTap={{ scale: 0.9 }}
                           className={cn(
                             "aspect-square w-full min-h-[48px] flex items-center justify-center rounded-full text-base font-medium transition-colors",
                             !isCurrentMonth && "opacity-30",
                             disabled && "opacity-30 cursor-not-allowed",
                             isSelected && "bg-primary text-primary-foreground",
                             !isSelected && isCurrentDay && "bg-accent text-accent-foreground",
                             !isSelected && !isCurrentDay && isCurrentMonth && !disabled && "native-press"
                           )}
                         >
                           {format(day, "d")}
                         </motion.button>
                       );
                     })}
                   </motion.div>
                 </AnimatePresence>
               </motion.div>
 
               {/* Selected Date Display */}
               {selected && (
                 <div className="px-4 py-4 border-t border-border bg-card safe-area-bottom">
                   <div className="text-center">
                     <div className="text-sm text-muted-foreground">Selected</div>
                     <div className="text-lg font-semibold text-foreground">
                       {format(selected, "EEEE, MMMM d, yyyy")}
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