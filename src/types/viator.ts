/**
 * BookingsFinder Viator types — strict frontend models.
 * Browser calls only viator-catalog Edge Function, never api.sandbox.viator.com.
 */
export const FUNCTION_NAME = "viator-catalog";

export interface ViatorHealthRequest {
  action: "health";
}

export interface ViatorHealthResponse {
  configured: boolean;
  connected: boolean;
  upstreamStatus: number | null;
  responseTimeMs: number;
  resultCount: number | null;
  sampleProductCode: string | null;
  trackingId: string | null;
  rateLimitRemaining: number | null;
  checkedAt: string;
}

export type ViatorCallErrorType =
  | "auth"
  | "forbidden"
  | "rate_limit"
  | "unavailable"
  | "timeout"
  | "upstream"
  | "unknown";

export interface ViatorCallError {
  type: ViatorCallErrorType;
  message: string;
  status?: number;
}

// ---------------------------------------------------------------------------
// Raw product shape matching Viator /products/search response
// ---------------------------------------------------------------------------
export interface ViatorProductRaw {
  productCode: string;
  title: string;
  description?: string | null;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    credit?: string;
  }> | null;
  reviews?: {
    totalReviews: number;
    combinedAverageRating: number;
  } | null;
  pricing?: {
    summary?: { fromPrice?: number };
    currency?: string;
  } | null;
  productUrl?: string | null;
  destinations?: Array<{ ref: string; name: string; type: string }> | null;
  tags?: number[] | null;
  flags?: string[] | null;
}
