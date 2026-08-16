/**
 * Infrastructure-unavailable state for the activity detail page (T2D-B1).
 *
 * Deliberately distinct from NotFound: a resolver/network failure is NOT
 * "no such activity". The copy is honest, never asks the user to change
 * their destination, and retry genuinely re-runs the resolver.
 */
interface ActivityDetailUnavailableProps {
  /** Re-runs the resolver with the same slug pair. */
  onRetry: () => void;
}

const ActivityDetailUnavailable = ({ onRetry }: ActivityDetailUnavailableProps) => (
  <main
    className="flex min-h-[60vh] items-center justify-center px-4 py-12"
    data-testid="activity-detail-unavailable"
  >
    <div className="max-w-md text-center" role="status">
      <h1 className="text-xl font-bold text-[#0F172A]">
        We couldn&apos;t load this experience right now.
      </h1>
      <p className="mt-2 text-sm text-[#41536A]">
        Please try again in a moment. Your destination and search are unchanged.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#D64A2A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B83D22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D64A2A] focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  </main>
);

export default ActivityDetailUnavailable;
