/**
 * AdminViator — Viator Sandbox connection proof-of-concept.
 * Admin-only. Matches /admin/tiqets visual style.
 */
import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { fetchViatorHealth } from "@/services/viator";
import type { ViatorHealthResponse, ViatorCallError } from "@/types/viator";

export default function AdminViator() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ViatorHealthResponse | null>(null);
  const [error, setError] = useState<ViatorCallError | null>(null);

  const testConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchViatorHealth();
      setResult(data);
    } catch (e: unknown) {
      setError(e as ViatorCallError);
    } finally {
      setLoading(false);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Administrator access required</h1>
          <p className="text-muted-foreground">This page is restricted to BookingsFinder administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Viator | BookingsFinder Admin</title>
      </Helmet>

      <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Viator</h1>
          <p className="text-muted-foreground">Sandbox connection proof-of-concept.</p>
        </div>

        {/* Connection test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" /> Connection Test
            </CardTitle>
            <CardDescription>Verify the Viator Sandbox API connection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testConnection} disabled={loading} className="bg-[#D64A2A] hover:bg-[#B83D22] text-white">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                <p className="font-semibold text-destructive">{error.type}: {error.message}</p>
                {error.status && <p className="text-muted-foreground mt-1">Status: {error.status}</p>}
              </div>
            )}

            {/* Success */}
            {result && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <Stat label="Configured" value={result.configured ? "Yes" : "No"} ok={result.configured} />
                <Stat label="Connected" value={result.connected ? "Yes" : "No"} ok={result.connected} />
                <Stat label="Upstream Status" value={String(result.upstreamStatus ?? "N/A")} />
                <Stat label="Response Time" value={result.responseTimeMs + "ms"} />
                <Stat label="Result Count" value={String(result.resultCount ?? "N/A")} />
                <Stat label="Sample Product" value={result.sampleProductCode || "N/A"} />
                <Stat label="Tracking ID" value={result.trackingId || "N/A"} />
                <Stat label="Rate Limit Remaining" value={String(result.rateLimitRemaining ?? "N/A")} />
                <Stat label="Checked At" value={new Date(result.checkedAt).toLocaleTimeString()} span />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rate limit info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Viator Sandbox Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Endpoint: api.sandbox.viator.com/partner</p>
            <p>• API version: 2.0</p>
            <p>• Admin-only — no public data exposed</p>
            <p>• No booking, payment, or traveller data accessed</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, ok, span }: { label: string; value: string; ok?: boolean; span?: boolean }) {
  return (
    <div className={`p-3 rounded-lg bg-muted/50 border ${span ? "col-span-2 sm:col-span-4" : ""}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
        {ok !== undefined && (ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />)}
        {value}
      </p>
    </div>
  );
}
