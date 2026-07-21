import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TripCostSectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function TripCostSectionCard({ title, description, children, className }: TripCostSectionCardProps) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border p-5 md:p-6", className)}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
