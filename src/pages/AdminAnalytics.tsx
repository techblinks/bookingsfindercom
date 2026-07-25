import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { BarChart3, Search, MousePointerClick, Percent, Route, MapPin, Clock, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { getDashboardSummary, type DashboardSummary } from "@/lib/analytics";
import { toast } from "sonner";

const AdminAnalytics = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const data = await getDashboardSummary();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) {
          toast.error("Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 max-w-md">
          <div className="text-center mb-8">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Admin Analytics</h1>
            <p className="text-muted-foreground text-sm">Sign in to view analytics data.</p>
          </div>
          <AdminLoginForm />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Analytics Dashboard | BookingsFinder Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of search and click activity.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {loading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Today's Searches</CardTitle>
                  <Search className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary?.searchesToday ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total search events today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Today's Clicks</CardTitle>
                  <MousePointerClick className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary?.clicksToday ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">View Deal clicks today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">CTR</CardTitle>
                  <Percent className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary?.ctr ?? 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Click-through rate</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Top Routes & Top Destinations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {loading ? (
            <>
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Route className="h-4 w-4 text-primary" />
                    Top Routes Today
                  </CardTitle>
                  <CardDescription>Most searched origin-destination pairs</CardDescription>
                </CardHeader>
                <CardContent>
                  {summary?.topRoutes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No routes yet today.</p>
                  ) : (
                    <div className="space-y-2">
                      {summary?.topRoutes.map((r, i) => (
                        <div key={r.route} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-muted-foreground w-4">#{i + 1}</span>
                            {r.route}
                          </span>
                          <span className="text-muted-foreground text-xs">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Top Destinations Today
                  </CardTitle>
                  <CardDescription>Most searched destinations</CardDescription>
                </CardHeader>
                <CardContent>
                  {summary?.topDestinations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No destinations yet today.</p>
                  ) : (
                    <div className="space-y-2">
                      {summary?.topDestinations.map((d, i) => (
                        <div key={d.destination} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-muted-foreground w-4">#{i + 1}</span>
                            {d.destination}
                          </span>
                          <span className="text-muted-foreground text-xs">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Searches */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Searches
            </CardTitle>
            <CardDescription>Last 10 search events</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 rounded-lg" />
            ) : summary?.recentSearches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent searches.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4">Time</th>
                      <th className="text-left py-2 pr-4">Route</th>
                      <th className="text-left py-2 pr-4">Dates</th>
                      <th className="text-left py-2 pr-4">Cabin</th>
                      <th className="text-left py-2">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.recentSearches.map((s) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {new Date(s.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2 pr-4 font-mono whitespace-nowrap">
                          {s.origin || "-"} <ArrowRight className="inline h-3 w-3" /> {s.destination || "-"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {s.departure_date || "-"}{s.return_date ? " / " + s.return_date : ""}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">{s.cabin_class || "-"}</td>
                        <td className="py-2 whitespace-nowrap">{s.device || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clicks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-primary" />
              Recent Clicks
            </CardTitle>
            <CardDescription>Last 10 View Deal clicks</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 rounded-lg" />
            ) : summary?.recentClicks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent clicks.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4">Time</th>
                      <th className="text-left py-2 pr-4">Partner</th>
                      <th className="text-left py-2 pr-4">Route</th>
                      <th className="text-left py-2 pr-4">Price</th>
                      <th className="text-left py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.recentClicks.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {new Date(c.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">{c.partner}</td>
                        <td className="py-2 pr-4 font-mono whitespace-nowrap">{c.route || "-"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {c.price != null ? "$" + Number(c.price).toFixed(0) : "-"}
                        </td>
                        <td className="py-2 whitespace-nowrap">
                          {c.white_label_used ? (
                            <span className="text-emerald-600 font-medium">White Label</span>
                          ) : c.fallback_used ? (
                            <span className="text-amber-600">Fallback</span>
                          ) : (
                            <span className="text-muted-foreground">Standard</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
