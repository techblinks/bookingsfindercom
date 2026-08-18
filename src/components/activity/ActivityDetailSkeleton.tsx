/**
 * Activity detail loading skeleton (T3E).
 *
 * Structural, not decorative: it stands in for the parts of the detail page
 * that are present on EVERY resolved activity — the breadcrumb band, the
 * identity block, the media frame and the booking rail's frame — laid out in
 * the same shell, at the same widths and with the same rhythm, so the real
 * page lands on top of it rather than shoving it aside.
 *
 * It deliberately does NOT skeletonise "Good to know", the description or the
 * evidence row. Those sections are gated by genuine data and a sparse activity
 * renders none of them; drawing three fact-shaped blocks would promise content
 * that will often never arrive, which is the loading-state version of
 * fabricating data. Under-promising costs a little shift on rich pages;
 * over-promising misleads on every sparse one.
 *
 * Screen readers are told the region is busy and the blocks are decorative.
 * The pulse is `motion-safe:` — a reduced-motion user gets the same structure
 * without the animation.
 */
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const SHELL = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

const ActivityDetailSkeleton = () => (
  <>
    <Header />

    <main
      id="main-content"
      className="bg-things-surface-page"
      aria-busy="true"
      aria-label="Loading experience details"
      data-testid="activity-detail-loading"
    >
      <div className="motion-safe:animate-pulse">
        {/* Breadcrumb band */}
        <div className="border-b border-things-border bg-things-surface-card">
          <div className={`${SHELL} py-3`}>
            <div className="h-4 w-56 max-w-full rounded bg-things-skeleton" />
          </div>
        </div>

        <div className={`${SHELL} pb-12 pt-6 lg:pb-20 lg:pt-9`}>
          {/* Identity: two title lines + location line */}
          <div className="max-w-4xl">
            <div className="h-8 w-full rounded bg-things-skeleton lg:h-9" />
            <div className="mt-2.5 h-8 w-2/3 rounded bg-things-skeleton lg:h-9" />
            <div className="mt-4 h-4 w-40 rounded bg-things-skeleton" />
          </div>

          <div className="mt-7 grid gap-8 min-[900px]:mt-9 min-[900px]:grid-cols-[minmax(0,1fr)_320px] min-[900px]:items-start lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_368px]">
            {/* Media frame — same aspect ratios as the real hero */}
            <div className="min-w-0">
              <div className="aspect-[16/10] w-full rounded-2xl border border-things-border bg-things-surface-subtle sm:aspect-[16/9]" />
            </div>

            {/* Booking rail — heading, one offer row, disclosure footer */}
            <div className="overflow-hidden rounded-2xl border border-things-border bg-things-surface-card shadow-card">
              <div className="border-b border-things-border px-5 py-4">
                <div className="h-5 w-40 rounded bg-things-skeleton" />
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-20 rounded bg-things-skeleton" />
                  <div className="h-4 w-16 rounded bg-things-skeleton" />
                </div>
                <div className="mt-3 h-11 w-full rounded-lg bg-things-surface-subtle" />
                <div className="mt-2 h-3 w-48 max-w-full rounded bg-things-skeleton" />
              </div>
              <div className="border-t border-things-border bg-things-surface-page px-5 py-4">
                <div className="h-3 w-full rounded bg-things-skeleton" />
                <div className="mt-1.5 h-3 w-3/4 rounded bg-things-skeleton" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </>
);

export default ActivityDetailSkeleton;
