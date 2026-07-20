import { useState, useCallback, useMemo } from "react";
import { useTripCostPlanner } from "./useTripCostPlanner";
import { TripDetailsSection } from "./TripDetailsSection";
import { TravellersSection } from "./TravellersSection";
import { TripCostSummaryPanel } from "./TripCostSummary";
import type { SupportedCurrency, TripDetails, Travellers } from "./types";

export function TripCostPlanner() {
  const planner = useTripCostPlanner();
  const { state, summary, validation, updateTripDetails, updateTravellers, setCurrency, isSaving } = planner;

  // Track touched fields for inline validation
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const onTouch = useCallback((field: string) => {
    setTouched(prev => { const next = new Set(prev); next.add(field); return next; });
  }, []);

  const handleUpdateTripDetails = useCallback((patch: Partial<TripDetails>) => {
    updateTripDetails(patch);
  }, [updateTripDetails]);

  const handleUpdateTravellers = useCallback((patch: Partial<Travellers>) => {
    updateTravellers(patch);
  }, [updateTravellers]);

  const handleSetCurrency = useCallback((currency: SupportedCurrency) => {
    setCurrency(currency);
  }, [setCurrency]);

  // Filter errors to only show for touched fields
  const visibleErrors = useMemo(
    () => validation.errors.filter(e => touched.has(e.field) || e.field === "travellers"),
    [validation.errors, touched]
  );

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Two-column layout */}
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10 items-start">
        {/* Form column */}
        <div className="space-y-6">
          <TripDetailsSection
            tripDetails={state.tripDetails}
            onUpdate={handleUpdateTripDetails}
            onSetCurrency={handleSetCurrency}
            errors={visibleErrors}
            touched={touched}
            onTouch={onTouch}
          />

          <TravellersSection
            travellers={state.travellers}
            onUpdate={handleUpdateTravellers}
            errors={visibleErrors}
            touched={touched}
            onTouch={onTouch}
          />

          {/* More cost sections will appear here in later phases */}

          {/* Save status */}
          <div className="text-xs text-muted-foreground text-center">
            {isSaving ? "Saving to this device…" : "Saved on this device"}{" · "}
            {state.tripDetails.currency}{" · "}
            {summary.tripDays !== undefined ? `${summary.tripNights}n/${summary.tripDays}d` : "no dates set"}
          </div>
        </div>

        {/* Summary column */}
        <div className="mt-6 lg:mt-0">
          <TripCostSummaryPanel state={state} summary={summary} />
        </div>
      </div>
    </div>
  );
}
