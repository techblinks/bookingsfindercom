/**
 * Central Supabase configuration accessor.
 *
 * Reads VITE_SUPABASE_URL from the build-time environment.
 * Returns null when Supabase is not configured, allowing
 * callers to gracefully disable dependent features.
 *
 * Never returns a fallback URL or hardcoded project reference.
 */

/** The configured Supabase URL, or null if not set. */
export function getSupabaseUrl(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || url === "") return null;
  return url;
}

/** Build a Supabase Edge Function URL, or null if Supabase is not configured. */
export function getFunctionUrl(functionName: string): string | null {
  const url = getSupabaseUrl();
  if (!url) return null;
  return `${url}/functions/v1/${functionName}`;
}

/** True if Supabase is configured and ready for use. */
export function isSupabaseConfigured(): boolean {
  return getSupabaseUrl() !== null;
}
