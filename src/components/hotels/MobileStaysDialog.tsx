import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw, X } from "lucide-react";
import TripComHotelWidget from "@/components/hotels/TripComHotelWidget";

export default function MobileStaysDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const triggerRef = useRef<HTMLElement | null>(null);

  // Lock body scroll + store trigger for focus return
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    // Hide bottom nav
    const bn = document.querySelector("nav[aria-label='Mobile bottom navigation']") as HTMLElement | null;
    if (bn) bn.style.display = "none";
    return () => {
      document.body.style.overflow = "";
      if (bn) bn.style.display = "";
      triggerRef.current?.focus();
      triggerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background" style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Search stays on Trip.com"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-border bg-background/95 backdrop-blur-sm">
        <h2 className="text-sm font-bold text-foreground">Search stays on Trip.com</h2>
        <button
          onClick={onClose}
          aria-label="Close stay search"
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center pt-3 px-2 pb-4">
        <TripComHotelWidget variant="mobile" />
      </div>
    </div>
  );
}
