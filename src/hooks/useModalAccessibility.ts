import { useEffect, useRef, useCallback } from "react";

/**
 * Reusable modal/sheet accessibility hook.
 * Provides: focus-on-open, Escape-to-close, Tab/Shift+Tab focus trap,
 * focus-restore-on-close. Based on TripSummarySheet M1.1 pattern.
 */
export function useModalAccessibility(
  isOpen: boolean,
  onClose: () => void,
  focusSelector?: () => HTMLElement | null,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement;
    // Focus the target element or fall back to the container
    const target = focusSelector?.() ?? containerRef.current;
    target?.focus();
  }, [isOpen, focusSelector]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !containerRef.current) return;

      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return { containerRef, handleKeyDown };
}
