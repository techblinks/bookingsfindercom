import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Wifi,
  Package,
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Star,
  Accessibility,
  SkipForward,
  MapPin,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { fetchTiqetsHealth, fetchTiqetsProducts } from "@/services/tiqets";
import type {
  TiqetsHealthResponse,
  TiqetsProductsResponse,
  TiqetsDiagnostics,
  BookingsFinderTiqetsProduct,
  SupportedTiqetsLanguage,
  TiqetsCallError,
} from "@/types/tiqets";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const SUPPORTED_LANGUAGES: { value: SupportedTiqetsLanguage; label: string }[] = [
  { value: "en", label: "English (en)" },
  { value: "nl", label: "Dutch (nl)" },
  { value: "fr", label: "French (fr)" },
  { value: "de", label: "German (de)" },
  { value: "it", label: "Italian (it)" },
  { value: "es", label: "Spanish (es)" },
  { value: "pt", label: "Portuguese (pt)" },
  { value: "ja", label: "Japanese (ja)" },
  { value: "zh", label: "Chinese (zh)" },
];

const PAGE_SIZES = [5, 10, 20] as const;

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function isTiqetsCallError(err: unknown): err is TiqetsCallError {
  return typeof err === "object" && err !== null && "type" in err && "message" in err;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function saleStatusBadge(status: string | null) {
  if (status === "on_sale") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
        On Sale
      </Badge>
    );
  }
  if (status === "sold_out") {
    return <Badge variant="destructive">Sold Out</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {status || "Unknown"}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════


/** Safe array helper — never crashes on null/undefined/non-array */
function safeArr(v: unknown, useJoin?: boolean): string[] {
  if (!Array.isArray(v)) return [];
  if (useJoin) return v.filter((x): x is string => typeof x === "string");
  return v as string[];
}

/**
 * Safely renders diagnostics without crashing on missing/malformed fields.
 * Every array join is guarded; every nested object is null-checked.
 */
function SafeDiagnostics({ diagnostics }: { diagnostics: Record<string, unknown> | null | undefined }) {
  if (!diagnostics || typeof diagnostics !== "object") return <p>No diagnostics available</p>;

  const topKeys = Array.isArray(diagnostics.upstreamTopLevelKeys) ? diagnostics.upstreamTopLevelKeys : [];
  const imgDiag = diagnostics.imageDiagnostics && typeof diagnostics.imageDiagnostics === "object"
    ? diagnostics.imageDiagnostics as Record<string, unknown>
    : null;
  const firstImgKeys = imgDiag && Array.isArray(imgDiag.firstImageFieldNames)
    ? imgDiag.firstImageFieldNames
    : [];
  const legacyImgKeys = imgDiag && Array.isArray(imgDiag.imageFieldNames)
    ? imgDiag.imageFieldNames
    : [];
  const fieldKeys = firstImgKeys.length > 0 ? firstImgKeys : legacyImgKeys;

  return (
    <>
      <p>Payload type: {typeof diagnostics.upstreamPayloadType === "string" ? diagnostics.upstreamPayloadType : "N/A"}</p>
      <p>Top-level keys: {topKeys.length > 0 ? topKeys.join(", ") : "None"}</p>
      <p>Raw items: {diagnostics.upstreamRawItemCount ?? "N/A"}</p>
      <p>Normalized: {diagnostics.normalizationOutputCount ?? "N/A"}</p>
      {imgDiag && (
        <>
          <p className="mt-2 font-medium">Image Diagnostics:</p>
          <p>Has image data: {String(imgDiag.hasImageData ?? "N/A")}</p>
          <p>Image count: {imgDiag.imageCount ?? "N/A"}</p>
          <p>Selected variant: {typeof imgDiag.selectedVariant === "string" ? imgDiag.selectedVariant : "N/A"}</p>
          <p>Protocol: {typeof imgDiag.selectedImageProtocol === "string" ? imgDiag.selectedImageProtocol : "N/A"}</p>
          <p>Hostname: {typeof imgDiag.selectedImageHostname === "string" ? imgDiag.selectedImageHostname : "N/A"}</p>
          <p>Has credit: {String(imgDiag.selectedImageHasCredit ?? "N/A")}</p>
          <p>Fields: {fieldKeys.length > 0 ? fieldKeys.join(", ") : "None"}</p>
        </>
      )}
    </>
  );
}

function ProductCard({ product }: { product: BookingsFinderTiqetsProduct }) {
  const firstImage = product.images?.[0] ?? null;
  const imgSrc = firstImage?.mediumUrl || firstImage?.largeUrl || firstImage?.smallUrl || firstImage?.extraLargeUrl || "";
  const imgSrc2x = imgSrc === firstImage?.mediumUrl ? firstImage.largeUrl : (imgSrc === firstImage?.largeUrl ? firstImage.extraLargeUrl : "");
  const imgAlt = firstImage?.altText || product.title;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Image */}
      {imgSrc && !imgFailed ? (
        <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-muted overflow-hidden">
          <img
            src={imgSrc}
            {...(imgSrc2x ? { srcSet: `${imgSrc2x} 2x` } : {})}
            alt={imgAlt}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="aspect-[4/3] sm:aspect-[16/10] bg-muted flex items-center justify-center">
          <Package className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}

      {/* Image credit */}
      {firstImage?.credit && !imgFailed && (
        <p className="text-[10px] text-muted-foreground px-4 pt-2 truncate">
          {firstImage.credit}
        </p>
      )}

      <CardContent className="flex-1 space-y-2 pt-3 px-4 pb-4">
        {/* Title */}
        <h3 className="font-bold text-sm leading-snug">{product.title}</h3>

        {/* Tagline */}
        {product.tagline && (
          <p className="text-xs text-muted-foreground">{product.tagline}</p>
        )}

        {/* Location */}
        {(product.city || product.country || product.venue) && (
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              {[product.city, product.country, product.venue]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}

        {/* Sale status */}
        <div>{saleStatusBadge(product.saleStatus)}</div>

        {/* Rating */}
        {product.rating.average != null && product.rating.count != null && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{product.rating.average}</span>
            <span className="text-muted-foreground">
              ({product.rating.count} reviews)
            </span>
          </div>
        )}

        {/* Min Price */}
        {product.minPrice.amount != null && product.minPrice.currency && (
          <p className="text-sm font-semibold">
            {product.minPrice.amount} {product.minPrice.currency}
          </p>
        )}

        {/* Feature badges */}
        <div className="flex flex-wrap gap-1.5">
          {product.skipTheLine && (
            <Badge variant="secondary" className="text-xs gap-1">
              <SkipForward className="h-3 w-3" />
              Skip The Line
            </Badge>
          )}
          {product.wheelchairAccessible && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Accessibility className="h-3 w-3" />
              Wheelchair Accessible
            </Badge>
          )}
        </div>

        {/* Product URL */}
        {product.productUrl && (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            View on Tiqets
          </a>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export default function AdminTiqets() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();

  // ── Health state
  const [healthResult, setHealthResult] = useState<TiqetsHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<TiqetsCallError | null>(null);

  // ── Product query params
  const [language, setLanguage] = useState<SupportedTiqetsLanguage>("en");
  const [destinationId, setDestinationId] = useState<string>("");
  const [saleStatus, setSaleStatus] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(10);

  // ── Products state
  const [productsResult, setProductsResult] = useState<TiqetsProductsResponse | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<TiqetsCallError | null>(null);

  // ── Handlers ────────────────────────────────────────────────────

  const handleTestConnection = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    setHealthResult(null);
    try {
      const result = await fetchTiqetsHealth();
      setHealthResult(result);
    } catch (err: unknown) {
      if (isTiqetsCallError(err)) {
        setHealthError(err);
      } else {
        setHealthError({ type: "unknown", message: String(err) });
      }
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const handleLoadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    setProductsResult(null);
    try {
      const destId = destinationId.trim() ? Number(destinationId) : undefined;
      const result = await fetchTiqetsProducts({
        language,
        page_size: pageSize,
        ...(destId !== undefined && !isNaN(destId)
          ? { destination_id: destId }
          : {}),
        ...(saleStatus !== "all"
          ? { sale_status: saleStatus as "on_sale" | "sold_out" }
          : {}),
      });
      setProductsResult(result);
    } catch (err: unknown) {
      if (isTiqetsCallError(err)) {
        setProductsError(err);
      } else {
        setProductsError({ type: "unknown", message: String(err) });
      }
    } finally {
      setProductsLoading(false);
    }
  }, [language, destinationId, saleStatus, pageSize]);

  // ── Auth gating ─────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Administrator access required.
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Helmet>
        <title>Tiqets Admin | BookingsFinder</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Tiqets — Things to Do
        </h1>
        <p className="text-muted-foreground">Admin proof-of-concept</p>
      </div>

      {/* ═══ 1. Connection Status ═══ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Connection Status</CardTitle>
          </div>
          <CardDescription>
            Test connectivity to the Tiqets Content API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTestConnection} disabled={healthLoading}>
            {healthLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          {/* Health loading */}
          {healthLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking connection...</span>
            </div>
          )}

          {/* Health rate-limit error */}
          {healthError && healthError.type === "rate_limit" && (
            <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-700">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Rate Limited</AlertTitle>
              <AlertDescription>
                <p>{healthError.message}</p>
                {healthError.retryAfterSec !== undefined && (
                  <p className="mt-1">
                    Retry after {healthError.retryAfterSec} seconds.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Health general error */}
          {healthError && healthError.type !== "rate_limit" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>
                <p>{healthError.message}</p>
                {healthError.status && (
                  <p className="mt-1">Status: {healthError.status}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Health result */}
          {healthResult && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Configured</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {healthResult.configured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {healthResult.configured ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Connected</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {healthResult.connected ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {healthResult.connected ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Upstream Status</p>
                <p className="text-sm font-medium mt-0.5">
                  {healthResult.upstreamStatus !== null
                    ? healthResult.upstreamStatus
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Response Time</p>
                <p className="text-sm font-medium mt-0.5">
                  {healthResult.responseTimeMs}ms
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Checked At</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatDateTime(healthResult.checkedAt)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ 2. Product Catalogue Test ═══ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Product Catalogue Test</CardTitle>
          </div>
          <CardDescription>
            Query the Tiqets product catalogue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Language selector */}
            <div className="space-y-1.5">
              <Label htmlFor="tiqets-lang">Language</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as SupportedTiqetsLanguage)}
              >
                <SelectTrigger id="tiqets-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination ID */}
            <div className="space-y-1.5">
              <Label htmlFor="tiqets-dest">Destination ID</Label>
              <Input
                id="tiqets-dest"
                type="number"
                placeholder="Optional"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
              />
            </div>

            {/* Sale status */}
            <div className="space-y-1.5">
              <Label htmlFor="tiqets-sale">Sale Status</Label>
              <Select value={saleStatus} onValueChange={setSaleStatus}>
                <SelectTrigger id="tiqets-sale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="on_sale">On Sale</SelectItem>
                  <SelectItem value="sold_out">Sold Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page size */}
            <div className="space-y-1.5">
              <Label htmlFor="tiqets-size">Page Size</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger id="tiqets-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleLoadProducts} disabled={productsLoading}>
            {productsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load Products"
            )}
          </Button>

          {productsLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Fetching products...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ 3. Product Results ═══ */}

      {/* Products rate-limit error */}
      {productsError && productsError.type === "rate_limit" && (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-700">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rate Limited</AlertTitle>
          <AlertDescription>
            <p>{productsError.message}</p>
            {productsError.retryAfterSec !== undefined && (
              <p className="mt-1">
                Retry after {productsError.retryAfterSec} seconds.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Products general error */}
      {productsError && productsError.type !== "rate_limit" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Failed to Load Products</AlertTitle>
          <AlertDescription>
            <p>{productsError.message}</p>
            {productsError.status && (
              <p className="mt-1">Status: {productsError.status}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Products result */}
      {productsResult && (
        <div className="space-y-4">
          {/* Results header */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/30 border">
            <div>
              <h2 className="text-lg font-semibold">
                {productsResult.products.length} product
                {productsResult.products.length !== 1 ? "s" : ""} found
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Fetched: {formatDateTime(productsResult.fetchedAt)}
                </span>
                <span className="flex items-center gap-1">
                  Cache:{" "}
                  <Badge
                    variant={
                      productsResult.cacheStatus === "hit" ? "secondary" : "outline"
                    }
                    className="text-[10px]"
                  >
                    {productsResult.cacheStatus}
                  </Badge>
                </span>
                {productsResult.upstreamRequestId && (
                  <span className="font-mono text-[10px]">
                    Req: {productsResult.upstreamRequestId}
                  </span>
                )}
              </div>
              {/* Diagnostics (admin-only — safe, never crashes the page) */}
              {productsResult.diagnostics && (
                <details className="mt-3 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
                  <summary className="cursor-pointer font-medium">Diagnostics</summary>
                  <div className="mt-2 space-y-1">
                    <SafeDiagnostics diagnostics={productsResult.diagnostics as Record<string, unknown>} />
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* Empty state */}
          {productsResult.products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No products found</p>
            </div>
          ) : (
            /* Product grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productsResult.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
