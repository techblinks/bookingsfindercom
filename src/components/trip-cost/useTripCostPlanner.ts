import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type {
  TripCostPlannerState, SupportedCurrency, Travellers, TripDetails,
  FlightCosts, AccommodationCosts, ContingencyConfig,
  DailySpending, PreparationCosts,
} from "./types";
import { DEFAULT_STATE } from "./tripCostDefaults";
import { calculateSummary, calculateNights, calculateDays, normalizeDateDerivedFields } from "./tripCostCalculations";
import { validatePlannerState } from "./tripCostValidation";
import { saveDraft, loadDraft, clearDraft } from "./tripCostStorage";

export interface TripCostPlannerAPI {
  state: TripCostPlannerState;
  summary: ReturnType<typeof calculateSummary>;
  validation: ReturnType<typeof validatePlannerState>;
  updateTripDetails: (patch: Partial<TripDetails>) => void;
  updateTravellers: (patch: Partial<Travellers>) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  updateFlightCosts: (patch: Partial<FlightCosts>) => void;
  updateAccommodation: (patch: Partial<AccommodationCosts>) => void;
  setAccommodationNights: (nights: number) => void;
  useTripDatesForNights: () => void;
  updateDailySpending: (catKey: string, dailyAmount: number) => void;
  updatePreparationCosts: (patch: Partial<PreparationCosts>) => void;
  updateContingency: (patch: Partial<ContingencyConfig>) => void;
  hasRestoredDraft: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  resetPlanner: () => void;
}

const AUTOSAVE_DEBOUNCE_MS = 500;

export function createDefaultState(): TripCostPlannerState {
  return structuredClone(DEFAULT_STATE);
}

export function useTripCostPlanner(): TripCostPlannerAPI {
  const [state, setState] = useState<TripCostPlannerState>(createDefaultState);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didRestore = useRef(false);
  const hasMounted = useRef(false);

  // Restore draft on mount — normalise hidden overrides
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;

    const draft = loadDraft();
    if (draft) {
      // Normalise date-derived fields to fix any hidden category-override state
      const tripDays = calculateDays(draft.tripDetails.departureDate, draft.tripDetails.returnDate);
      const tripNights = calculateNights(draft.tripDetails.departureDate, draft.tripDetails.returnDate);
      const normalized = normalizeDateDerivedFields(draft, tripDays, tripNights);

      setState(normalized);
      setHasRestoredDraft(true);
      toast.success("Your saved trip plan has been restored.", { id: "draft-restored" });
    }

    hasMounted.current = true;
  }, []);

  // Autosave with debounce
  useEffect(() => {
    if (!hasMounted.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSaving(true);
    saveTimer.current = setTimeout(() => {
      const ok = saveDraft(state);
      setIsSaving(false);
      if (ok) setLastSavedAt(new Date().toISOString());
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state]);

  const summary = useMemo(() => calculateSummary(state), [state]);
  const validation = useMemo(() => validatePlannerState(state), [state]);

  const updateTripDetails = useCallback((patch: Partial<TripDetails>) => {
    setState(prev => {
      const nextDates = { ...prev.tripDetails, ...patch };
      if ("departureDate" in patch || "returnDate" in patch) {
        const tripDays = calculateDays(nextDates.departureDate, nextDates.returnDate);
        const tripNights = calculateNights(nextDates.departureDate, nextDates.returnDate);
        return normalizeDateDerivedFields(prev, tripDays, tripNights);
      }
      return { ...prev, tripDetails: nextDates };
    });
  }, []);

  const updateTravellers = useCallback((patch: Partial<Travellers>) => {
    setState(prev => ({ ...prev, travellers: { ...prev.travellers, ...patch } }));
  }, []);

  const setCurrency = useCallback((currency: SupportedCurrency) => {
    setState(prev => ({ ...prev, tripDetails: { ...prev.tripDetails, currency } }));
  }, []);

  const updateFlightCosts = useCallback((patch: Partial<FlightCosts>) => {
    setState(prev => ({ ...prev, flightCosts: { ...prev.flightCosts, ...patch } }));
  }, []);

  const updateAccommodation = useCallback((patch: Partial<AccommodationCosts>) => {
    setState(prev => ({ ...prev, accommodationCosts: { ...prev.accommodationCosts, ...patch } }));
  }, []);

  const setAccommodationNights = useCallback((nights: number) => {
    setState(prev => ({
      ...prev,
      accommodationCosts: { ...prev.accommodationCosts, nights, nightsManuallyOverridden: true },
    }));
  }, []);

  const useTripDatesForNights = useCallback(() => {
    setState(prev => {
      const derived = calculateNights(prev.tripDetails.departureDate, prev.tripDetails.returnDate);
      const newNights = derived !== undefined ? derived : prev.accommodationCosts.nights;
      return {
        ...prev,
        accommodationCosts: { ...prev.accommodationCosts, nights: newNights, nightsManuallyOverridden: false },
      };
    });
  }, []);

  const updateDailySpending = useCallback((catKey: string, dailyAmount: number) => {
    setState(prev => {
      const ds = { ...prev.dailySpending };
      const key = catKey as keyof DailySpending;
      ds[key] = { ...ds[key], dailyAmount: dailyAmount };
      return { ...prev, dailySpending: ds };
    });
  }, []);

  const updatePreparationCosts = useCallback((patch: Partial<PreparationCosts>) => {
    setState(prev => ({ ...prev, preparationCosts: { ...prev.preparationCosts, ...patch } }));
  }, []);

  const updateContingency = useCallback((patch: Partial<ContingencyConfig>) => {
    setState(prev => ({ ...prev, contingency: { ...prev.contingency, ...patch } }));
  }, []);

  const resetPlanner = useCallback(() => {
    setState(createDefaultState());
    setHasRestoredDraft(false);
    setLastSavedAt(null);
    clearDraft();
    toast.success("Trip plan reset.");
  }, []);

  return {
    state, summary, validation,
    updateTripDetails, updateTravellers, setCurrency,
    updateFlightCosts, updateAccommodation,
    setAccommodationNights, useTripDatesForNights,
    updateDailySpending, updatePreparationCosts,
    updateContingency,
    hasRestoredDraft, isSaving, lastSavedAt, resetPlanner,
  };
}
