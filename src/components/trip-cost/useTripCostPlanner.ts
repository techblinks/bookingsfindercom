import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type { TripCostPlannerState, SupportedCurrency, Travellers, TripDetails } from "./types";
import { DEFAULT_STATE } from "./tripCostDefaults";
import { calculateSummary, calculateNights } from "./tripCostCalculations";
import { validatePlannerState } from "./tripCostValidation";
import { saveDraft, loadDraft, clearDraft } from "./tripCostStorage";

export interface TripCostPlannerAPI {
  state: TripCostPlannerState;
  summary: ReturnType<typeof calculateSummary>;
  validation: ReturnType<typeof validatePlannerState>;
  updateTripDetails: (patch: Partial<TripDetails>) => void;
  updateTravellers: (patch: Partial<Travellers>) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  hasRestoredDraft: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  resetPlanner: () => void;
}

const AUTOSAVE_DEBOUNCE_MS = 500;

/** Return a fresh clone of DEFAULT_STATE to avoid shared-reference mutation. */
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

  // Restore draft on mount (once — ref prevents Strict Mode double-run)
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;

    const draft = loadDraft();
    if (draft) {
      setState(draft);
      setHasRestoredDraft(true);
      toast.success("Your saved trip plan has been restored.", { id: "draft-restored" });
    }

    // Mark that initial mount + restore has resolved
    hasMounted.current = true;
  }, []);

  // Autosave with debounce — only after initial mount/restore has resolved
  useEffect(() => {
    if (!hasMounted.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    setIsSaving(true);
    saveTimer.current = setTimeout(() => {
      const ok = saveDraft(state);
      setIsSaving(false);
      if (ok) {
        setLastSavedAt(new Date().toISOString());
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  // Derived values
  const summary = useMemo(() => calculateSummary(state), [state]);
  const validation = useMemo(() => validatePlannerState(state), [state]);

  // Update helpers
  const updateTripDetails = useCallback((patch: Partial<TripDetails>) => {
    setState(prev => {
      const next = { ...prev, tripDetails: { ...prev.tripDetails, ...patch } };

      // If dates changed and nights not manually overridden, derive nights
      if (("departureDate" in patch || "returnDate" in patch) && !prev.accommodationCosts.nightsManuallyOverridden) {
        const derivedNights = calculateNights(next.tripDetails.departureDate, next.tripDetails.returnDate);
        if (derivedNights !== undefined) {
          next.accommodationCosts = { ...next.accommodationCosts, nights: derivedNights };
        }
      }

      return next;
    });
  }, []);

  const updateTravellers = useCallback((patch: Partial<Travellers>) => {
    setState(prev => ({
      ...prev,
      travellers: { ...prev.travellers, ...patch },
    }));
  }, []);

  const setCurrency = useCallback((currency: SupportedCurrency) => {
    setState(prev => ({
      ...prev,
      tripDetails: { ...prev.tripDetails, currency },
    }));
  }, []);

  const resetPlanner = useCallback(() => {
    setState(createDefaultState());
    setHasRestoredDraft(false);
    setLastSavedAt(null);
    clearDraft();
    toast.success("Trip plan reset.");
  }, []);

  return {
    state,
    summary,
    validation,
    updateTripDetails,
    updateTravellers,
    setCurrency,
    hasRestoredDraft,
    isSaving,
    lastSavedAt,
    resetPlanner,
  };
}
