import { Skeleton } from "@/components/ui/skeleton";

const HotelCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Image Skeleton */}
        <div className="sm:w-64 md:w-72 flex-shrink-0">
          <Skeleton className="w-full h-48 sm:h-full rounded-none" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="w-10 h-10 rounded-lg" />
              </div>
            </div>

            {/* Location */}
            <Skeleton className="h-4 w-40 mb-3" />

            {/* Amenities */}
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between pt-3 border-t border-border">
            <div className="space-y-1">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelCardSkeleton;