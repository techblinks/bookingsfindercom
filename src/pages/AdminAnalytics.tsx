import { useState, useEffect, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3, Search, MousePointerClick, Percent, Route, MapPin, Clock,
  ArrowRight, RefreshCw, Calendar, TrendingUp, TrendingDown,
  Plane, Building2, Zap, AlertTriangle, Globe, Smartphone,
  Filter, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import {
  fetchKPIs, fetchTopRoutes, fetchTopDestinations, fetchPartnerPerformance,
  fetchAirlinePerformance, fetchLandingPagePerformance, fetchTrafficSources,
  resetAdminCheck, nextGeneration,
  fetchWLvsFallback, fetchDailyTrends,
  type KPIData, type RouteRow, type DestinationRow, type PartnerRow,
  type AirlineRow, type LandingPageRow, type TrafficSourceRow,
  type WLVsFallbackData, type DailyTrendRow,
} from "@/lib/analytics";
import { toast } from "sonner";

// ── Date helpers ──────────────────────────────────────────────────

type DateRange = "today" | "yesterday" | "7d" | "30d" | "custom";

function getRangeDates(range: DateRange, customFrom?: string, customTo?: string): { from: string; to: string; prevFrom: string; prevTo: string } {
  const now = new Date();

  const toISO = (d: Date) => d.toISOString().split("T")[0];
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  let from: Date, to: Date;

  switch (range) {
    case "today": {
      to = new Date(); to.setHours(23, 59, 59, 999);
      from = new Date(); from.setHours(0, 0, 0, 0);
      break;
    }
    case "yesterday": {
      from = addDays(now, -1); from.setHours(0, 0, 0, 0);
      to = addDays(now, -1); to.setHours(23, 59, 59, 999);
      break;
    }
    case "7d": {
      from = addDays(now, -7);
      to = now;
      break;
    }
    case "30d": {
      from = addDays(now, -30);
      to = now;
      break;
    }
    case "custom": {
      from = customFrom ? new Date(customFrom) : addDays(now, -7);
      to = customTo ? new Date(customTo) : now;
      break;
    }
    default:
      from = addDays(now, -7);
      to = now;
  }

  const duration = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - duration);
  const prevTo = new Date(from);

  return {
    from: from.toISOString().split("T")[0],
    to: toISO(to),
    prevFrom: toISO(prevFrom),
    prevTo: toISO(prevTo),
  };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const delta = Math.round(((current - previous) / previous) * 100);
  return delta >= 0 ? `+${delta}%` : `${delta}%`;
}

// ── Component ─────────────────────────────────────────────────────

const AdminAnalytics = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Date range
  const range = (searchParams.get("range") as DateRange) || "7d";
  const customFrom = searchParams.get("from") || undefined;
  const customTo = searchParams.get("to") || undefined;

  const setRange = useCallback((r: DateRange, from?: string, to?: string) => {
    const params: Record<string, string> = { range: r };
    if (r === "custom" && from) { params.from = from; params.to = to || ""; }
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const dates = useMemo(() => getRangeDates(range, customFrom, customTo), [range, customFrom, customTo]);

  // State
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [prevKpis, setPrevKpis] = useState<KPIData | null>(null);
  const [topRoutes, setTopRoutes] = useState<RouteRow[]>([]);
  const [topDestinations, setTopDestinations] = useState<DestinationRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [airlines, setAirlines] = useState<AirlineRow[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageRow[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSourceRow[]>([]);
  const [wlData, setWlData] = useState<WLVsFallbackData | null>(null);
  const [trends, setTrends] = useState<DailyTrendRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({ kpis: true, routes: true, partners: true, trends: true });
  const [sectionErrors, setSectionErrors] = useState<Record<string, string | null>>({ kpis: null, routes: null, partners: null, trends: null });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["kpis", "funnel"]));

  // Sync legacy loading state — false when all sections loaded
  const allLoaded = !loadingStates.kpis && !loadingStates.routes && !loadingStates.partners && !loadingStates.trends;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

    const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setError(null);
    resetAdminCheck();
    const gen = nextGeneration();

    const load = <T,>(section: string, fetcher: () => Promise<T>, onData: (d: T) => void) => {
      setLoadingStates(prev => ({ ...prev, [section]: true }));
      setSectionErrors(prev => ({ ...prev, [section]: null }));
      fetcher()
        .then(d => { if (gen !== undefined) onData(d); })
        .catch(e => { if (e?.message !== "Stale request") setSectionErrors(prev => ({ ...prev, [section]: e?.message || "Failed" })); })
        .finally(() => { setLoadingStates(prev => ({ ...prev, [section]: false })); });
    };

    load("kpis", () => fetchKPIs(dates.from, dates.to, gen), r => setKpis(r));
    fetchKPIs(dates.prevFrom, dates.prevTo, gen).then(r => setPrevKpis(r)).catch(() => {});

    load("routes", () => fetchTopRoutes(dates.from, dates.to, 10, gen), r => setTopRoutes(r));
    fetchTopDestinations(dates.from, dates.to, 10, gen).then(r => setTopDestinations(r)).catch(() => {});
    fetchLandingPagePerformance(dates.from, dates.to, gen).then(r => setLandingPages(r)).catch(() => {});

    load("partners", () => fetchPartnerPerformance(dates.from, dates.to, gen), r => setPartners(r));
    fetchAirlinePerformance(dates.from, dates.to, 10, gen).then(r => setAirlines(r)).catch(() => {});
    fetchWLvsFallback(dates.from, dates.to, gen).then(r => setWlData(r)).catch(() => {});
    fetchTrafficSources(dates.from, dates.to, gen).then(r => setTrafficSources(r)).catch(() => {});

    load("trends", () => fetchDailyTrends(dates.from, dates.to, gen), r => setTrends(r));

    setLastUpdated(new Date());
  }, [isAdmin, dates]);
  useEffect(() => { refresh(); }, [refresh]);

  // ── Auth gating ──────────────────────────────────────────────

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Skeleton className="h-12 w-12 rounded-full" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 max-w-md">
          <div className="text-center mb-8">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Admin Analytics</h1>
            <p className="text-muted-foreground text-sm">Sign in to view analytics data.</p>
          </div>
          <AdminLoginForm />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────

  const currencyNote = kpis?.currencies && kpis.currencies.split(",").length > 1
    ? "Mixed currencies — fare averages may be misleading"
    : (kpis?.dominantCurrency && kpis.dominantCurrency !== "AUD" ? `Fares in ${kpis.dominantCurrency}` : null);

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Analytics Dashboard | BookingsFinder</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link to="/admin" className="hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Admin Dashboard</Link>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-3"><BarChart3 className="h-7 w-7 text-primary" /> Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && <span className="text-xs text-muted-foreground">Updated {lastUpdated.toLocaleTimeString()}</span>}
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap gap-1 mb-6">
          {(["today", "yesterday", "7d", "30d"] as DateRange[]).map(r => (
            <Button key={r} variant={range === r ? "default" : "outline"} size="sm" onClick={() => setRange(r)}>
              {r === "today" ? "Today" : r === "yesterday" ? "Yesterday" : r === "7d" ? "Last 7 days" : "Last 30 days"}
            </Button>
          ))}
          <Button variant={range === "custom" ? "default" : "outline"} size="sm" onClick={() => setRange("custom", dates.from, dates.to)}>
            <Calendar className="h-3 w-3 mr-1" /> Custom
          </Button>
          {range === "custom" && (
            <div className="flex gap-2 ml-2">
              <input type="date" value={customFrom || dates.from} onChange={e => setRange("custom", e.target.value, customTo || dates.to)} className="text-xs border rounded px-2 py-1 bg-background" />
              <span className="text-xs text-muted-foreground self-center">to</span>
              <input type="date" value={customTo || dates.to} onChange={e => setRange("custom", customFrom || dates.from, e.target.value)} className="text-xs border rounded px-2 py-1 bg-background" />
            </div>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-destructive/50">
            <CardContent className="py-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-destructive" /><span className="text-sm">{error}</span><Button variant="outline" size="sm" onClick={refresh}>Retry</Button></CardContent>
          </Card>
        )}

        {currencyNote && (
          <div className="mb-4 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />{currencyNote}
          </div>
        )}

        {/* Section: KPIs */}
        <SectionHeader id="kpis" title="Key Metrics" icon={BarChart3} expanded={expandedSections.has("kpis")} onToggle={() => toggleSection("kpis")} />
        {expandedSections.has("kpis") && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {loadingStates.kpis ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : kpis ? (
              <>
                <KPICard label="Total Searches" value={formatNumber(kpis.totalSearches)} prev={prevKpis ? pctChange(kpis.totalSearches, prevKpis.totalSearches) : undefined} icon={Search} />
                <KPICard label="Outbound Clicks" value={formatNumber(kpis.totalClicks)} prev={prevKpis ? pctChange(kpis.totalClicks, prevKpis.totalClicks) : undefined} icon={MousePointerClick} />
                <KPICard label="CTR" value={kpis.ctr + "%"} prev={prevKpis ? (kpis.ctr - prevKpis.ctr).toFixed(1) + "pp" : undefined} icon={Percent} />
                <KPICard label="Flight Searches" value={formatNumber(kpis.flightSearches)} icon={Plane} />
                <KPICard label="Hotel Searches" value={formatNumber(kpis.hotelSearches)} icon={Building2} />
                <KPICard label="Flight Clicks" value={formatNumber(kpis.flightClicks)} icon={Plane} />
                <KPICard label="Hotel Clicks" value={formatNumber(kpis.hotelClicks)} icon={Building2} />
                <KPICard label="White Label Clicks" value={formatNumber(kpis.wlClicks)} icon={Zap} />
                <KPICard label="Fallback Clicks" value={formatNumber(kpis.fallbackClicks)} icon={AlertTriangle} />
                <KPICard label="Avg Clicked Fare" value={kpis.mixedCurrency ? "Mixed" : "$" + Math.round(kpis.avgClickedFare || 0)} subtitle={kpis.mixedCurrency ? "currencies" : kpis.dominantCurrency} icon={Globe} />
              </>
            ) : <p className="col-span-full text-xs text-muted-foreground py-4">No data for this period.</p>}
          </div>
        )}

        {/* Section: Funnel */}
        <SectionHeader id="funnel" title="Search → Click Funnel" icon={Filter} expanded={expandedSections.has("funnel")} onToggle={() => toggleSection("funnel")} />
        {expandedSections.has("funnel") && kpis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold">{formatNumber(kpis.totalSearches)}</div><p className="text-xs text-muted-foreground">Searches</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold">{formatNumber(kpis.totalSearches - kpis.totalClicks)}</div><p className="text-xs text-muted-foreground">Dropped ({kpis.totalSearches > 0 ? Math.round(((kpis.totalSearches - kpis.totalClicks) / kpis.totalSearches) * 100) : 0}%)</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold">{formatNumber(kpis.totalClicks)}</div><p className="text-xs text-muted-foreground">Outbound Clicks</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold">{kpis.ctr}%</div><p className="text-xs text-muted-foreground">Click-Through Rate</p></CardContent></Card>
          </div>
        )}

        {/* Section: White Label Intelligence */}
        <SectionHeader id="wl" title="White Label Intelligence" icon={Zap} expanded={expandedSections.has("wl")} onToggle={() => toggleSection("wl")} />
        {expandedSections.has("wl") && wlData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">White Label Usage</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div><div className="text-xl font-bold text-emerald-600">{wlData.whiteLabelClicks}</div><div className="text-xs text-muted-foreground">White Label</div></div>
                  <div><div className="text-xl font-bold text-amber-600">{wlData.fallbackClicks}</div><div className="text-xs text-muted-foreground">Fallback</div></div>
                  <div><div className="text-xl font-bold">{wlData.wlPercentage}%</div><div className="text-xs text-muted-foreground">WL Share</div></div>
                </div>
                <SimpleBar wl={wlData.whiteLabelClicks} fb={wlData.fallbackClicks} />
              </CardContent>
            </Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Top White Label Routes</CardTitle></CardHeader>
              <CardContent>
                {wlData.wlTopRoutes.length === 0 ? <p className="text-xs text-muted-foreground">No White Label clicks yet.</p> : (
                  <div className="space-y-1">{wlData.wlTopRoutes.map(r => <div key={r.route} className="flex justify-between text-xs"><span className="font-mono">{r.route}</span><span>{r.clicks}</span></div>)}</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section: Daily Trends */}
        <SectionHeader id="trends" title="Daily Trends" icon={TrendingUp} expanded={expandedSections.has("trends")} onToggle={() => toggleSection("trends")} />
        {expandedSections.has("trends") && trends.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 pr-3">Day</th><th className="text-right py-1 pr-3">Searches</th><th className="text-right py-1 pr-3">Clicks</th><th className="text-right py-1 pr-3">CTR</th><th className="text-right py-1 pr-3">WL</th><th className="text-right py-1">Fallback</th>
                  </tr></thead>
                  <tbody>
                    {trends.map((t, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1 pr-3 whitespace-nowrap">{new Date(t.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                        <td className="text-right py-1 pr-3">{t.searches}</td>
                        <td className="text-right py-1 pr-3">{t.clicks}</td>
                        <td className="text-right py-1 pr-3">{t.ctr}%</td>
                        <td className="text-right py-1 pr-3">{t.wlClicks}</td>
                        <td className="text-right py-1">{t.fbClicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section: Performance Tables */}
        <SectionHeader id="tables" title="Performance Tables" icon={Route} expanded={expandedSections.has("tables")} onToggle={() => toggleSection("tables")} />
        {expandedSections.has("tables") && (
          <div className="space-y-4 mb-6">
            {/* Top Routes */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Route className="h-4 w-4" />Top Routes</CardTitle></CardHeader>
              <CardContent>
                {topRoutes.length === 0 ? <EmptyData /> : (
                  <DataTable columns={["Origin", "Destination", "Searches", "Clicks", "CTR", "Avg Fare", "Top Partner"]}
                    rows={topRoutes.map(r => [r.origin, r.destination, String(r.searches), String(r.clicks), r.ctr + "%", "$" + Math.round(r.avgPrice), r.topPartner || "-"])} />
                )}
              </CardContent>
            </Card>

            {/* Top Destinations */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" />Top Destinations</CardTitle></CardHeader>
              <CardContent>
                {topDestinations.length === 0 ? <EmptyData /> : (
                  <DataTable columns={["Destination", "Searches", "Clicks", "CTR"]}
                    rows={topDestinations.map(d => [d.destination, String(d.searches), String(d.clicks), d.ctr + "%"])} />
                )}
              </CardContent>
            </Card>

            {/* Partners */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />Partner Performance</CardTitle></CardHeader>
              <CardContent>
                {partners.length === 0 ? <EmptyData /> : (
                  <DataTable columns={["Partner", "Type", "Clicks", "Share", "Avg Fare", "WL", "Fallback"]}
                    rows={partners.map(p => [p.partner, p.partnerType, String(p.clicks), p.clickShare + "%", "$" + Math.round(p.avgPrice), String(p.wlClicks), String(p.fallbackClicks)])} />
                )}
              </CardContent>
            </Card>

            {/* Airlines */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Plane className="h-4 w-4" />Airline Performance</CardTitle></CardHeader>
              <CardContent>
                {airlines.length === 0 ? <EmptyData /> : (
                  <DataTable columns={["Airline", "Clicks", "Avg Fare", "Top Route"]}
                    rows={airlines.map(a => [a.airline, String(a.clicks), "$" + Math.round(a.avgPrice), a.topRoute || "-"])} />
                )}
              </CardContent>
            </Card>

            {/* Landing Pages */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" />Landing Pages</CardTitle></CardHeader>
              <CardContent>
                {landingPages.length === 0 ? <EmptyData /> : (
                  <DataTable columns={["Page", "Searches", "Clicks", "CTR"]}
                    rows={landingPages.map(lp => [lp.landingPage, String(lp.searches), String(lp.clicks), lp.ctr + "%"])} />
                )}
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />Traffic Sources</CardTitle></CardHeader>
              <CardContent>
                {trafficSources.length === 0 ? <EmptyData /> : (
                  <DataTable columns={["Source", "Medium", "Campaign", "Searches"]}
                    rows={trafficSources.map(t => [t.utmSource, t.utmMedium, t.utmCampaign, String(t.searches)])} />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────

const KPICard = ({ label, value, prev, icon: Icon, subtitle }: { label: string; value: string; prev?: string; icon?: React.ComponentType<{ className?: string }>; subtitle?: string }) => (
  <Card>
    <CardContent className="py-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="flex items-center gap-1 mt-1">
        {prev !== undefined && (
          prev.startsWith("+") ? <TrendingUp className="h-3 w-3 text-emerald-600" /> :
          prev.startsWith("-") ? <TrendingDown className="h-3 w-3 text-red-600" /> :
          <span className="text-xs text-muted-foreground">{prev}</span>
        )}
        {prev !== undefined && <span className={`text-xs ${prev.startsWith("+") ? "text-emerald-600" : prev.startsWith("-") ? "text-red-600" : "text-muted-foreground"}`}>{prev}</span>}
        {subtitle && <span className="text-xs text-muted-foreground ml-auto">{subtitle}</span>}
      </div>
    </CardContent>
  </Card>
);

const SimpleBar = ({ wl, fb }: { wl: number; fb: number }) => {
  const total = wl + fb || 1;
  const wlPct = Math.round((wl / total) * 100);
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-muted">
        <div className="bg-emerald-500 transition-all" style={{ width: `${wlPct}%` }} title={`White Label: ${wl}`} />
        <div className="bg-amber-500 transition-all" style={{ width: `${100 - wlPct}%` }} title={`Fallback: ${fb}`} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>WL: {wl}</span><span>Fallback: {fb}</span>
      </div>
    </div>
  );
};

const SectionHeader = ({ id, title, icon: Icon, expanded, onToggle }: { id: string; title: string; icon: React.ComponentType<{ className?: string }>; expanded: boolean; onToggle: () => void }) => (
  <button onClick={onToggle} className="w-full flex items-center gap-2 py-3 text-left hover:text-foreground text-muted-foreground transition-colors">
    <Icon className="h-4 w-4" />
    <h2 className="text-base font-semibold flex-1">{title}</h2>
    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
  </button>
);

const DataTable = ({ columns, rows }: { columns: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead><tr className="border-b text-muted-foreground">{columns.map((c, i) => <th key={i} className={`py-1 ${i === 0 ? "text-left pr-3" : "text-right pr-3"}`}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className="border-b border-border/30">
            {row.map((cell, ci) => <td key={ci} className={`py-1 ${ci === 0 ? "text-left pr-3 font-mono" : "text-right pr-3"}`}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EmptyData = () => <p className="text-xs text-muted-foreground py-4">No data for this period.</p>;

export default AdminAnalytics;
