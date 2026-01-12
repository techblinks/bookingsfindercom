import { Skeleton } from "@/components/ui/skeleton";

const FlightCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Airline Info Skeleton */}
        <div className="flex items-center gap-3 lg:w-36">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {/* Flight Times Skeleton */}
        <div className="flex-1 flex items-center gap-4">
          <div className="text-center min-w-[70px] space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-10 mx-auto" />
          </div>

          <div className="flex-1 flex flex-col items-center px-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-0.5 w-full" />
            <Skeleton className="h-3 w-12 mt-2" />
          </div>

          <div className="text-center min-w-[70px] space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-10 mx-auto" />
          </div>
        </div>

        {/* Price and Action Skeleton */}
        <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-6 lg:min-w-[140px]">
          <div className="space-y-2 text-right">
            <Skeleton className="h-8 w-20 ml-auto" />
            <Skeleton className="h-3 w-14 ml-auto" />
          </div>
          <Skeleton className="h-9 w-24 lg:w-full" />
        </div>
      </div>
    </div>
  );
};

export default FlightCardSkeleton;
