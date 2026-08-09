/**
 * TripContext — shared trip-planning domain for the Bookings Finder app shell.
 *
 * M1 scope: origin, destination, dates, travellers, lastSurface.
 * Does NOT store bookings, prices, saved products, or provider state.
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react";
import type { TripContextState, TripDestination, TripDates, TripTravellers, TripSurface } from "@/lib/tripPersistence";
import {
  loadTripFromStorage,
  saveTripToStorage,
  clearTripFromStorage,
  CURRENT_VERSION,
} from "@/lib/tripPersistence";

// ── Actions ──

type TripAction =
  | { type: "SET_ORIGIN"; origin: TripDestination }
  | { type: "SET_DESTINATION"; destination: TripDestination }
  | { type: "SET_DATES"; dates: TripDates }
  | { type: "SET_TRAVELLERS"; travellers: TripTravellers }
  | { type: "SET_LAST_SURFACE"; surface: TripSurface }
  | { type: "PATCH_TRIP"; patch: Partial<Pick<TripContextState, "origin" | "destination" | "dates" | "travellers" | "lastSurface">> }
  | { type: "CLEAR_TRIP" };

// ── Reducer ──

function tripReducer(state: TripContextState, action: TripAction): TripContextState {
  switch (action.type) {
    case "SET_ORIGIN":
      return { ...state, origin: action.origin, updatedAt: new Date().toISOString() };
    case "SET_DESTINATION":
      return { ...state, destination: action.destination, updatedAt: new Date().toISOString() };
    case "SET_DATES":
      return { ...state, dates: action.dates, updatedAt: new Date().toISOString() };
    case "SET_TRAVELLERS":
      return { ...state, travellers: action.travellers, updatedAt: new Date().toISOString() };
    case "SET_LAST_SURFACE":
      return { ...state, lastSurface: action.surface, updatedAt: new Date().toISOString() };
    case "PATCH_TRIP": {
      const next = { ...state, updatedAt: new Date().toISOString() };
      const p = action.patch;
      if (p.origin !== undefined) next.origin = p.origin;
      if (p.destination !== undefined) next.destination = p.destination;
      if (p.dates !== undefined) next.dates = p.dates;
      if (p.travellers !== undefined) next.travellers = p.travellers;
      if (p.lastSurface !== undefined) next.lastSurface = p.lastSurface;
      return next;
    }
    case "CLEAR_TRIP":
      return { version: CURRENT_VERSION, updatedAt: new Date().toISOString() };
    default:
      return state;
  }
}

// ── Context ──

interface TripContextValue {
  trip: TripContextState;
  setOrigin: (origin: TripDestination) => void;
  setDestination: (destination: TripDestination) => void;
  setDates: (dates: TripDates) => void;
  setTravellers: (travellers: TripTravellers) => void;
  setLastSurface: (surface: TripSurface) => void;
  patchTrip: (patch: Partial<Pick<TripContextState, "origin" | "destination" | "dates" | "travellers" | "lastSurface">>) => void;
  clearTrip: () => void;
  /** Whether the trip has any meaningful data */
  hasTrip: boolean;
}

const TripCtx = createContext<TripContextValue | null>(null);

// ── Provider ──

function createInitialState(): TripContextState {
  const stored = loadTripFromStorage();
  return stored ?? { version: CURRENT_VERSION, updatedAt: new Date().toISOString() };
}

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, dispatch] = useReducer(tripReducer, null, createInitialState);

  // Persist on every change
  React.useEffect(() => {
    saveTripToStorage(trip);
  }, [trip]);

  const hasTrip = useMemo(() => {
    return !!(trip.origin?.name || trip.destination?.name);
  }, [trip.origin, trip.destination]);

  const setOrigin = useCallback((origin: TripDestination) => dispatch({ type: "SET_ORIGIN", origin }), []);
  const setDestination = useCallback((destination: TripDestination) => dispatch({ type: "SET_DESTINATION", destination }), []);
  const setDates = useCallback((dates: TripDates) => dispatch({ type: "SET_DATES", dates }), []);
  const setTravellers = useCallback((travellers: TripTravellers) => dispatch({ type: "SET_TRAVELLERS", travellers }), []);
  const setLastSurface = useCallback((surface: TripSurface) => dispatch({ type: "SET_LAST_SURFACE", surface }), []);
  const patchTrip = useCallback((patch: Partial<Pick<TripContextState, "origin" | "destination" | "dates" | "travellers" | "lastSurface">>) => dispatch({ type: "PATCH_TRIP", patch }), []);
  const clearTrip = useCallback(() => {
    dispatch({ type: "CLEAR_TRIP" });
    clearTripFromStorage();
  }, []);

  const value = useMemo<TripContextValue>(() => ({
    trip, setOrigin, setDestination, setDates, setTravellers, setLastSurface, patchTrip, clearTrip, hasTrip,
  }), [trip, setOrigin, setDestination, setDates, setTravellers, setLastSurface, patchTrip, clearTrip, hasTrip]);

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}

// ── Hook ──

export function useTrip(): TripContextValue {
  const ctx = useContext(TripCtx);
  if (!ctx) throw new Error("useTrip must be used within a TripProvider");
  return ctx;
}
