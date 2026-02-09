import { Skeleton } from "@/components/ui/skeleton";

const RouteCardSkeleton = ({ delay = 0 }: { delay?: number }) => (
  <div
    className="flex-shrink-0 w-[280px] md:w-[300px] bg-card rounded-2xl border border-border p-5"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Route header */}
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-10" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-5 w-10" />
      </div>
    </div>
    {/* Route names */}
    <Skeleton className="h-4 w-3/4 mb-4" />
    {/* Divider */}
    <div className="border-t border-border mb-4" />
    {/* Price */}
    <div className="flex items-end justify-between">
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  </div>
);

const PopularRoutesSkeleton = () => (
  <section className="py-10 md:py-14 overflow-hidden">
    <div className="container mb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
    <div className="flex gap-4 overflow-hidden px-4 md:px-[max(1rem,calc((100vw-1280px)/2+1rem))]">
      {Array.from({ length: 5 }).map((_, i) => (
        <RouteCardSkeleton key={i} delay={i * 50} />
      ))}
    </div>
  </section>
);

export default PopularRoutesSkeleton;
