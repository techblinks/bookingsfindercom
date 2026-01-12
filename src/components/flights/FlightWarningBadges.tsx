import { AlertTriangle, Clock, Moon, Briefcase, MapPin } from "lucide-react";
import { FlightWarning, WARNING_LABELS } from "@/types/flight";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FlightWarningBadgesProps {
  warnings: FlightWarning[];
  compact?: boolean;
}

const WARNING_ICONS: Record<FlightWarning, React.ReactNode> = {
  long_layover: <Clock className="h-3 w-3" />,
  overnight_stop: <Moon className="h-3 w-3" />,
  self_transfer: <Briefcase className="h-3 w-3" />,
  airport_change: <MapPin className="h-3 w-3" />,
};

const WARNING_DESCRIPTIONS: Record<FlightWarning, string> = {
  long_layover: 'This flight has a layover longer than 8 hours. Consider booking accommodation or exploring the city.',
  overnight_stop: 'This flight includes an overnight layover. You may need to find accommodation.',
  self_transfer: 'You must collect your bags and re-check them at the connection point.',
  airport_change: 'You need to change airports during the connection. Allow extra time for transfer.',
};

const FlightWarningBadges = ({ warnings, compact = false }: FlightWarningBadgesProps) => {
  if (!warnings || warnings.length === 0) return null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 cursor-help">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{warnings.length}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <ul className="space-y-1">
              {warnings.map((warning) => (
                <li key={warning} className="text-xs flex items-center gap-1.5">
                  {WARNING_ICONS[warning]}
                  <span>{WARNING_LABELS[warning].label}</span>
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <TooltipProvider key={warning}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium cursor-help",
                  "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
                  "border border-amber-200 dark:border-amber-800"
                )}
              >
                {WARNING_ICONS[warning]}
                <span>{WARNING_LABELS[warning].label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{WARNING_DESCRIPTIONS[warning]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export default FlightWarningBadges;
