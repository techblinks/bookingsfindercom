import { useState, useCallback, useMemo } from "react";
import { useTripCostPlanner } from "./useTripCostPlanner";
import { TripDetailsSection } from "./TripDetailsSection";
import { TravellersSection } from "./TravellersSection";
import { FlightCostsSection } from "./FlightCostsSection";
import { AccommodationSection } from "./AccommodationSection";
import { DailySpendingSection } from "./DailySpendingSection";
import { PreparationCostsSection } from "./PreparationCostsSection";
import { ContingencySection } from "./ContingencySection";
import { TripCostSummaryPanel } from "./TripCostSummary";
import type { SupportedCurrency, TripDetails, Travellers, FlightCosts, AccommodationCosts, ContingencyConfig, PreparationCosts } from "./types";

export function TripCostPlanner() {
  const planner = useTripCostPlanner();
  const {
    state, summary, validation,
    updateTripDetails, updateTravellers, setCurrency,
    updateFlightCosts, updateAccommodation,
    setAccommodationNights, useTripDatesForNights,
    updateDailySpending, updatePreparationCosts,
    updateContingency,
    isSaving,
  } = planner;

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const onTouch = useCallback((field: string) => {
    setTouched(prev => { const next = new Set(prev); next.add(field); return next; });
  }, []);

  const visibleErrors = useMemo(
    () => validation.errors.filter(e => touched.has(e.field) || e.field === "travellers"),
    [validation.errors, touched]
  );

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10 items-start">
        <div className="space-y-6">
          <TripDetailsSection {...{ tripDetails: state.tripDetails, onUpdate: updateTripDetails, onSetCurrency: setCurrency, errors: visibleErrors, touched, onTouch }} />
          <TravellersSection {...{ travellers: state.travellers, onUpdate: updateTravellers, errors: visibleErrors, touched, onTouch }} />
          <FlightCostsSection {...{ flightCosts: state.flightCosts, travellers: state.travellers, currency: state.tripDetails.currency, flightsSubtotal: summary.flightsSubtotal, onUpdate: updateFlightCosts, errors: visibleErrors, touched, onTouch }} />
          <AccommodationSection {...{ accommodationCosts: state.accommodationCosts, departureDate: state.tripDetails.departureDate, returnDate: state.tripDetails.returnDate, currency: state.tripDetails.currency, accommodationSubtotal: summary.accommodationSubtotal, onUpdate: updateAccommodation, onSetNights: setAccommodationNights, onUseTripDates: useTripDatesForNights, errors: visibleErrors, touched, onTouch }} />
          <DailySpendingSection {...{ dailySpending: state.dailySpending, departureDate: state.tripDetails.departureDate, returnDate: state.tripDetails.returnDate, currency: state.tripDetails.currency, dailySubtotal: summary.dailySpendingSubtotal, onUpdate: updateDailySpending, errors: visibleErrors, touched, onTouch }} />
          <PreparationCostsSection {...{ preparationCosts: state.preparationCosts, currency: state.tripDetails.currency, preparationSubtotal: summary.preparationSubtotal, onUpdate: updatePreparationCosts, errors: visibleErrors, touched, onTouch }} />
          <ContingencySection {...{ contingency: state.contingency, currency: state.tripDetails.currency, contingencyAmount: summary.contingencyAmount, subtotal: summary.subtotalBeforeContingency, onUpdate: updateContingency, errors: visibleErrors, touched, onTouch }} />

          <div className="text-xs text-muted-foreground text-center">
            {isSaving ? "Saving to this device…" : "Saved on this device"}{" · "}
            {state.tripDetails.currency}{" · "}
            {summary.tripDays !== undefined ? `${summary.tripNights}n/${summary.tripDays}d` : "no dates set"}
          </div>
        </div>
        <div className="mt-6 lg:mt-0">
          <TripCostSummaryPanel state={state} summary={summary} />
        </div>
      </div>
    </div>
  );
}
