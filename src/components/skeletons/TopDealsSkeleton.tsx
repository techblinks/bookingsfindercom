import { Skeleton } from "@/components/ui/skeleton";

const DealRowSkeleton = () => (
  <>
    {/* Desktop */}
    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 items-center">
      <div className="col-span-2 space-y-1">
        <Skeleton className="h-7 w-14" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="col-span-3 flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="col-span-2 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="col-span-2">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="col-span-2 flex justify-end">
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="col-span-1 flex justify-end">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
    {/* Mobile */}
    <div className="md:hidden p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-6 w-10" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </>
);

const TopDealsSkeleton = () => (
  <section className="py-12 md:py-16 bg-card border-y border-border">
    <div className="container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-8 w-64 mb-1" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
      </div>
      {/* Board */}
      <div className="bg-secondary/50 rounded-2xl border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
          {[2, 3, 2, 2, 2, 1].map((span, i) => (
            <div key={i} className={`col-span-${span}`}>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <DealRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default TopDealsSkeleton;
