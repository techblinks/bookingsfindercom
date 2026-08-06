/**
 * BookingsFinder Tiqets types — strict frontend models.
 *
 * These types mirror only fields genuinely returned by the Tiqets Content API.
 * No booking fields, no payment fields. No 'any' in public models.
 */

// ═══════════════════════════════════════════════════════════════
// API communication types
// ═══════════════════════════════════════════════════════════════

export type TiqetsAction = "health" | "products";

export interface TiqetsHealthRequest {
  action: "health";
}

export interface TiqetsHealthResponse {
  configured: boolean;
  connected: boolean;
  upstreamStatus: number | null;
  responseTimeMs: number;
  upstreamRequestId: string | null;
  checkedAt: string;
}

export type SupportedTiqetsLanguage =
  | "en" | "nl" | "fr" | "de" | "it" | "es" | "pt" | "ja" | "zh";

export type TiqetsSaleStatus = "on_sale" | "sold_out" | "cancelled";

export interface TiqetsProductsRequest {
  action: "products";
  language?: SupportedTiqetsLanguage;
  page?: number;
  page_size?: number;
  destination_id?: number;
  sale_status?: TiqetsSaleStatus;
}

export interface TiqetsPagination {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface TiqetsProductsResponse {
  products: BookingsFinderTiqetsProduct[];
  pagination: TiqetsPagination;
  fetchedAt: string;
  cacheStatus: "hit" | "miss";
  upstreamRequestId: string | null;
  diagnostics?: TiqetsDiagnostics;
}

export interface TiqetsErrorResponse {
  error: string;
  upstreamRequestId: string | null;
  retryAfterSec: number | null;
}

export interface TiqetsDiagnostics {
  upstreamPayloadType: string;
  upstreamTopLevelKeys: string[] | null;
  upstreamRawItemCount: number;
  normalizationInputCount: number;
  normalizationOutputCount: number;
  imageDiagnostics?: {
    hasImageData: boolean;
    imageCount: number;
    firstImageFieldNames: string[];
    selectedVariant: string | null;
    selectedImageProtocol: string | null;
    selectedImageHostname: string | null;
    selectedImageHasCredit: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// Normalized product model
// ═══════════════════════════════════════════════════════════════

export interface TiqetsImage {
  smallUrl: string;
  mediumUrl: string;
  largeUrl: string;
  extraLargeUrl: string;
  altText: string | null;
  credit: string | null;
}

export interface BookingsFinderTiqetsProduct {
  id: string;
  title: string;
  tagline: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  saleStatus: string | null;
  rating: {
    average: number | null;
    count: number | null;
  };
  wheelchairAccessible: boolean | null;
  skipTheLine: boolean | null;
  minPrice: {
    amount: number | null;
    currency: string | null;
  };
  productUrl: string | null;
  images: TiqetsImage[];
}

// ═══════════════════════════════════════════════════════════════
// Error discrimination
// ═══════════════════════════════════════════════════════════════

export type TiqetsCallErrorType =
  | "auth"
  | "authorization"
  | "config"
  | "upstream"
  | "rate_limit"
  | "network"
  | "unknown";

export interface TiqetsCallError {
  type: TiqetsCallErrorType;
  message: string;
  status?: number;
  retryAfterSec?: number;
}
