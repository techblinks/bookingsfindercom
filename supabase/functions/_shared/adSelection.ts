/**
 * Ad selection for get-ads (BF-0R-7 Round 1.1 item 3).
 *
 * get-ads picks the single highest-priority ad row per placement to hand
 * back to the frontend. That selection must only ever consider ad types the
 * requesting surface can actually render. Otherwise a high-priority row of
 * an unsupported/disabled type (e.g. `html_embed`, which the flights and
 * hotels frontends were hardened to never render — see AdEmbed.tsx) silently
 * wins the priority ordering and starves out a lower-priority row of a type
 * that WOULD have rendered (e.g. `sponsored_card`), leaving that placement
 * blank even though a perfectly good ad was available.
 *
 * The fix is to filter to supported types BEFORE picking the top-priority
 * row per placement, not after. This function is pure (no I/O, no Supabase
 * client) so it can be unit tested directly.
 */

export interface SelectableAd {
  placement: string;
  type: string;
  priority: number;
}

/**
 * For each placement in `validPlacements`, return the highest-priority ad
 * (from `ads`, which is assumed already filtered for active/date/geo/device)
 * whose `type` is in `supportedTypes` for this page. Ads of an unsupported
 * type are excluded before ranking, so they can never suppress a supported
 * ad at a lower priority. `ads` does not need to be pre-sorted.
 */
export function selectTopAdPerPlacement<T extends SelectableAd>(
  ads: T[],
  validPlacements: readonly string[],
  supportedTypes: readonly string[],
): Record<string, T | null> {
  const supported = new Set(supportedTypes);

  const result: Record<string, T | null> = {};
  validPlacements.forEach((placement) => {
    result[placement] = null;
  });

  ads.forEach((ad) => {
    if (!supported.has(ad.type)) return;
    if (!(ad.placement in result)) return;

    const current = result[ad.placement];
    if (!current || ad.priority > current.priority) {
      result[ad.placement] = ad;
    }
  });

  return result;
}
