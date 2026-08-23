import { useState, useCallback, useEffect } from "react";
import { useGeoLocation } from "./useGeoLocation";
import {
  resolveCurrency,
  getCurrencySymbol,
  getStoredCurrencyPreference,
  setStoredCurrencyPreference,
} from "@/lib/currency";

/**
 * BF-FLIGHTS-LIVE-2 Phase B — the single hook every currency-aware
 * component reads from (/flights, Recent Fare Calendar, Recent Fare
 * Heatmap, cached fare cards, the White Label handoff). Wraps
 * useGeoLocation rather than duplicating its country→currency logic (Phase
 * C: geo-location behaviour is preserved as-is).
 *
 * Once a visitor deliberately picks a currency, geo detection resolving
 * (async, on a later render) never overwrites it — resolveCurrency always
 * prefers userSelected when present, and userSelected only ever changes via
 * setCurrency.
 *
 * Future improvement (documented, not implemented in this PR): resolve geo
 * currency from Cloudflare's edge `cf-ipcountry` request header instead of
 * the third-party ipapi.co browser call useGeoLocation makes today — faster
 * (no client-side network round trip) and removes a third-party dependency.
 * That is an edge/infrastructure change out of scope here.
 */
export function useCurrencyPreference() {
  const { geoData } = useGeoLocation();
  const [userSelected, setUserSelected] = useState<string | null>(() => getStoredCurrencyPreference());

  // Pick up a preference set in another tab/window.
  useEffect(() => {
    const onStorage = () => setUserSelected(getStoredCurrencyPreference());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const currency = resolveCurrency({ userSelected, geoCurrency: geoData?.currency });
  const currencySymbol = getCurrencySymbol(currency);

  const setCurrency = useCallback((code: string) => {
    setStoredCurrencyPreference(code);
    setUserSelected(code);
  }, []);

  return {
    currency,
    currencySymbol,
    setCurrency,
    /** True once the visitor has made a deliberate choice, vs. still on geo/default. */
    isUserSelected: userSelected !== null,
  };
}

export default useCurrencyPreference;
