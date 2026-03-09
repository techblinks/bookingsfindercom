import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Sparkles, Loader2, Check, X, Play, Pause, Globe, BarChart3, RefreshCw, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 500+ popular route combinations
const POPULAR_ROUTES = generatePopularRoutes();

function generatePopularRoutes() {
  const cities: { city: string; iata: string }[] = [
    { city: "London", iata: "LON" }, { city: "New York", iata: "NYC" }, { city: "Dubai", iata: "DXB" },
    { city: "Paris", iata: "CDG" }, { city: "Tokyo", iata: "TYO" }, { city: "Bangkok", iata: "BKK" },
    { city: "Istanbul", iata: "IST" }, { city: "Singapore", iata: "SIN" }, { city: "Barcelona", iata: "BCN" },
    { city: "Rome", iata: "FCO" }, { city: "Los Angeles", iata: "LAX" }, { city: "Miami", iata: "MIA" },
    { city: "Amsterdam", iata: "AMS" }, { city: "Frankfurt", iata: "FRA" }, { city: "Sydney", iata: "SYD" },
    { city: "Mumbai", iata: "BOM" }, { city: "Delhi", iata: "DEL" }, { city: "Toronto", iata: "YYZ" },
    { city: "Kuala Lumpur", iata: "KUL" }, { city: "Doha", iata: "DOH" }, { city: "Cairo", iata: "CAI" },
    { city: "Lisbon", iata: "LIS" }, { city: "Madrid", iata: "MAD" }, { city: "Berlin", iata: "BER" },
    { city: "Hong Kong", iata: "HKG" }, { city: "Seoul", iata: "ICN" }, { city: "Manila", iata: "MNL" },
    { city: "Jakarta", iata: "CGK" }, { city: "Nairobi", iata: "NBO" }, { city: "Sao Paulo", iata: "GRU" },
    { city: "Mexico City", iata: "MEX" }, { city: "Chicago", iata: "ORD" }, { city: "San Francisco", iata: "SFO" },
    { city: "Atlanta", iata: "ATL" }, { city: "Dublin", iata: "DUB" }, { city: "Copenhagen", iata: "CPH" },
    { city: "Vienna", iata: "VIE" }, { city: "Prague", iata: "PRG" }, { city: "Athens", iata: "ATH" },
    { city: "Budapest", iata: "BUD" }, { city: "Bali", iata: "DPS" }, { city: "Phuket", iata: "HKT" },
    { city: "Cancun", iata: "CUN" }, { city: "Marrakech", iata: "RAK" }, { city: "Cape Town", iata: "CPT" },
    { city: "Johannesburg", iata: "JNB" }, { city: "Lagos", iata: "LOS" }, { city: "Zurich", iata: "ZRH" },
    { city: "Oslo", iata: "OSL" }, { city: "Stockholm", iata: "ARN" },
  ];

  const routes: { origin_city: string; destination_city: string; origin_iata: string; destination_iata: string; slug: string }[] = [];
  for (let i = 0; i < cities.length; i++) {
    for (let j = 0; j < cities.length; j++) {
      if (i !== j) {
        routes.push({
          origin_city: cities[i].city,
          destination_city: cities[j].city,
          origin_iata: cities[i].iata,
          destination_iata: cities[j].iata,
          slug: `${cities[i].city.toLowerCase().replace(/\s+/g, '-')}-to-${cities[j].city.toLowerCase().replace(/\s+/g, '-')}`,
        });
      }
    }
  }
  return routes;
}

type RouteStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'not_started';

interface RouteWithStatus {
  origin_city: string;
  destination_city: string;
  origin_iata: string;
  destination_iata: string;
  slug: string;
  status: RouteStatus;
  id?: string;
}

export default function AdminRouteGenerator() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const [routes, setRoutes] = useState<RouteWithStatus[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<Map<string, { status: string; id: string }>>(new Map());
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ generated: 0, failed: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_started' | 'completed' | 'failed'>('all');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Load existing route page statuses
  useEffect(() => {
    loadExistingPages();
  }, []);

  const loadExistingPages = async () => {
    setIsLoadingStatus(true);
    const { data, error } = await supabase
      .from('seo_route_pages' as any)
      .select('id, slug, generation_status')
      .limit(2000);

    if (!error && data) {
      const slugMap = new Map<string, { status: string; id: string }>();
      (data as any[]).forEach((r: any) => {
        slugMap.set(r.slug, { status: r.generation_status, id: r.id });
      });
      setExistingSlugs(slugMap);
    }
    setIsLoadingStatus(false);
  };

  // Merge popular routes with DB status
  useEffect(() => {
    const merged = POPULAR_ROUTES.map(r => {
      const existing = existingSlugs.get(r.slug);
      return {
        ...r,
        status: (existing?.status || 'not_started') as RouteStatus,
        id: existing?.id,
      };
    });
    setRoutes(merged);
  }, [existingSlugs]);

  // Realtime subscription for live progress
  useEffect(() => {
    const channel = supabase
      .channel('route-generation-progress')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'seo_route_pages',
      }, (payload: any) => {
        const updated = payload.new;
        setExistingSlugs(prev => {
          const next = new Map(prev);
          next.set(updated.slug, { status: updated.generation_status, id: updated.id });
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredRoutes = routes.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const stats = {
    total: routes.length,
    completed: routes.filter(r => r.status === 'completed').length,
    failed: routes.filter(r => r.status === 'failed').length,
    pending: routes.filter(r => r.status === 'pending' || r.status === 'generating').length,
    notStarted: routes.filter(r => r.status === 'not_started').length,
  };

  const toggleSelectAll = () => {
    if (selectedSlugs.size === filteredRoutes.length) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(filteredRoutes.map(r => r.slug)));
    }
  };

  const handleBulkGenerate = async () => {
    const toGenerate = routes.filter(r => selectedSlugs.has(r.slug));
    if (toGenerate.length === 0) {
      toast.error('Select routes to generate');
      return;
    }

    setIsGenerating(true);
    setProgress({ generated: 0, failed: 0, total: toGenerate.length });

    // Process in batches of 5 to avoid timeout
    const batchSize = 5;
    let totalGenerated = 0;
    let totalFailed = 0;

    for (let i = 0; i < toGenerate.length; i += batchSize) {
      const batch = toGenerate.slice(i, i + batchSize);

      try {
        const { data, error } = await supabase.functions.invoke('generate-route-page', {
          body: { routes: batch.map(r => ({
            origin_city: r.origin_city,
            destination_city: r.destination_city,
            origin_iata: r.origin_iata,
            destination_iata: r.destination_iata,
          })) },
        });

        if (error) throw error;

        totalGenerated += data?.generated || 0;
        totalFailed += data?.failed || 0;
      } catch (err) {
        console.error('Batch failed:', err);
        totalFailed += batch.length;
      }

      setProgress({ generated: totalGenerated, failed: totalFailed, total: toGenerate.length });
    }

    toast.success(`Generated ${totalGenerated} route pages (${totalFailed} failed)`);
    setIsGenerating(false);
    setSelectedSlugs(new Set());
    await loadExistingPages();
  };

  const handleQuickGenerate = async (count: number) => {
    const notStarted = routes.filter(r => r.status === 'not_started').slice(0, count);
    setSelectedSlugs(new Set(notStarted.map(r => r.slug)));
    // User will then click "Generate Selected"
    toast.info(`Selected ${notStarted.length} routes. Click "Generate Selected" to start.`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLoginForm />;
  }

  const statusBadge = (status: RouteStatus) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-emerald-600 text-xs">Published</Badge>;
      case 'generating': return <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 animate-spin mr-1" />Generating</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs">Pending</Badge>;
      default: return <Badge variant="outline" className="text-xs text-muted-foreground">Not Started</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>Bulk Route Generator | Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-6xl py-6 md:py-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bulk Route Page Generator</h1>
              <p className="text-sm text-muted-foreground">Generate 500+ SEO-optimized flight route pages with AI</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Routes</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</p>
                <p className="text-xs text-muted-foreground">Not Started</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress bar during generation */}
          {isGenerating && (
            <Card className="mb-6 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Generating route pages...</span>
                  <span className="text-sm text-muted-foreground">
                    {progress.generated + progress.failed} / {progress.total}
                  </span>
                </div>
                <Progress value={((progress.generated + progress.failed) / Math.max(progress.total, 1)) * 100} className="h-2" />
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="text-emerald-600">✓ {progress.generated} generated</span>
                  {progress.failed > 0 && <span className="text-destructive">✗ {progress.failed} failed</span>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleBulkGenerate}
                  disabled={isGenerating || selectedSlugs.size === 0}
                  className="gap-2"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Selected ({selectedSlugs.size})
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickGenerate(10)} disabled={isGenerating}>
                    Quick 10
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickGenerate(50)} disabled={isGenerating}>
                    Quick 50
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickGenerate(100)} disabled={isGenerating}>
                    Quick 100
                  </Button>
                </div>

                <div className="ml-auto flex gap-2">
                  <Button variant="ghost" size="sm" onClick={loadExistingPages} disabled={isLoadingStatus}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {(['all', 'not_started', 'completed', 'failed'] as const).map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="shrink-0"
              >
                {status === 'all' ? 'All' : status === 'not_started' ? 'Not Started' : status.charAt(0).toUpperCase() + status.slice(1)}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                  {status === 'all' ? routes.length : routes.filter(r => r.status === status).length}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Routes List */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedSlugs.size === filteredRoutes.length && filteredRoutes.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {filteredRoutes.length} routes
                </span>
              </div>
            </CardHeader>
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border">
                {isLoadingStatus ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading route statuses...
                  </div>
                ) : filteredRoutes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No routes match this filter.
                  </div>
                ) : (
                  filteredRoutes.map(route => (
                    <div
                      key={route.slug}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedSlugs.has(route.slug)}
                        onCheckedChange={(checked) => {
                          setSelectedSlugs(prev => {
                            const next = new Set(prev);
                            if (checked) next.add(route.slug);
                            else next.delete(route.slug);
                            return next;
                          });
                        }}
                      />
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {route.origin_city} → {route.destination_city}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          /flights/{route.slug}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {route.origin_iata}–{route.destination_iata}
                      </span>
                      {statusBadge(route.status)}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
}
