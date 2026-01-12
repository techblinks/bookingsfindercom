import { cn } from "@/lib/utils";
import { Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface DealScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const getScoreConfig = (score: number) => {
  if (score >= 80) {
    return {
      label: "Excellent Deal",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
      textColor: "text-emerald-700 dark:text-emerald-400",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      Icon: Sparkles,
    };
  }
  if (score >= 60) {
    return {
      label: "Good Deal",
      bgColor: "bg-blue-100 dark:bg-blue-900/40",
      textColor: "text-blue-700 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800",
      Icon: TrendingDown,
    };
  }
  if (score >= 40) {
    return {
      label: "Fair Price",
      bgColor: "bg-amber-100 dark:bg-amber-900/40",
      textColor: "text-amber-700 dark:text-amber-400",
      borderColor: "border-amber-200 dark:border-amber-800",
      Icon: Minus,
    };
  }
  return {
    label: "Above Average",
    bgColor: "bg-red-100 dark:bg-red-900/40",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
    Icon: TrendingUp,
  };
};

const DealScoreBadge = ({ score, size = "md", showLabel = true }: DealScoreBadgeProps) => {
  const config = getScoreConfig(score);
  const { Icon } = config;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-2.5 py-1 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-semibold border",
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      <span className="tabular-nums">{score}</span>
      {showLabel && <span className="font-medium">· {config.label}</span>}
    </div>
  );
};

export default DealScoreBadge;
