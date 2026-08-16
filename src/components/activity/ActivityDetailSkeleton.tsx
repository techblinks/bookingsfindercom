/**
 * Activity detail page loading skeleton (T2D-B1).
 *
 * Honest loading state: no partial content, no fabricated values. Screen
 * readers are told the region is busy; the blocks are purely decorative.
 */
const ActivityDetailSkeleton = () => (
  <main
    className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
    aria-busy="true"
    aria-label="Loading experience details"
    data-testid="activity-detail-loading"
  >
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-56 rounded bg-things-skeleton" />

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {/* Title + location */}
          <div className="h-8 w-3/4 rounded bg-things-skeleton" />
          <div className="mt-3 h-4 w-40 rounded bg-things-skeleton" />

          {/* Image region */}
          <div className="mt-5 h-56 rounded-xl bg-things-surface-subtle sm:h-72 lg:h-80" />

          {/* Facts */}
          <div className="mt-8 h-5 w-32 rounded bg-things-skeleton" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="h-10 rounded-lg bg-things-surface-subtle" />
            <div className="h-10 rounded-lg bg-things-surface-subtle" />
            <div className="h-10 rounded-lg bg-things-surface-subtle" />
          </div>
        </div>

        {/* Booking panel */}
        <div className="lg:mt-0">
          <div className="rounded-xl border border-things-border bg-things-surface-card p-5 shadow-sm">
            <div className="h-5 w-40 rounded bg-things-skeleton" />
            <div className="mt-4 h-24 rounded-lg bg-things-surface-subtle" />
            <div className="mt-3 h-24 rounded-lg bg-things-surface-subtle" />
          </div>
        </div>
      </div>
    </div>
  </main>
);

export default ActivityDetailSkeleton;
