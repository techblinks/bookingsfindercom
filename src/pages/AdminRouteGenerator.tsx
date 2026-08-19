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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

// BF-0R-3: AI generation no longer auto-publishes. 'generated_pending_review'
// means the model's content passed the provenance gate in
// supabase/functions/_shared/content-trust.ts but a human has not reviewed
// or published it yet; 'failed_validation' means the model asserted an
// unsourced fact and its content was discarded server-side. 'published' is
// set ONLY from inside the mandatory review dialog (P0-3 review follow-up —
// there is no one-click Publish on the list row any more), which flips
// is_published through the caller's own admin session (the "Admins can
// manage route pages" RLS policy) — never by the generation call itself.
// Publication truth for display purposes is always `isPublished` (the real
// column), not this status string — see statusBadge below.
type RouteStatus =
  | 'pending'
  | 'generating'
  | 'generated_pending_review'
  | 'failed_validation'
  | 'published'
  | 'completed' // legacy value from rows generated before BF-0R-3
  | 'failed'
  | 'not_started';

interface RouteWithStatus {
  origin_city: string;
  destination_city: string;
  origin_iata: string;
  destination_iata: string;
  slug: string;
  status: RouteStatus;
  id?: string;
  isPublished?: boolean;
}

/** Full generated content shown on the mandatory review surface (P0-3). */
interface RouteReviewContent {
  title: string;
  meta_description: string;
  h1_title: string;
  intro_paragraph: string;
  main_content: string;
  travel_tips: { title?: string; content?: string }[] | null;
  faqs: { question: string; answer: string }[] | null;
  /**
   * BF-0R-3 final hardening: the exact version marker captured when the
   * review dialog opened. `seo_route_pages` has an `update_seo_route_pages_
   * updated_at` trigger that bumps this on every row change, so it doubles
   * as a free optimistic-concurrency token — no migration needed. Publish
   * requires the row to still carry this exact value; see confirmPublish.
   */
  updated_at: string;
}

export default function AdminRouteGenerator() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const [routes, setRoutes] = useState<RouteWithStatus[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<Map<string, { status: string; id: string; isPublished: boolean }>>(new Map());
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ generated: 0, failed: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_started' | 'generated_pending_review' | 'failed_validation' | 'published' | 'failed'>('all');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);

  // ── Mandatory review surface (P0-3) ────────────────────────────────────
  // Publish is reachable ONLY through this dialog. There is deliberately no
  // one-click Publish action on the route list row any more.
  const [reviewRoute, setReviewRoute] = useState<RouteWithStatus | null>(null);
  const [reviewContent, setReviewContent] = useState<RouteReviewContent | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  // Load existing route page statuses
  useEffect(() => {
    loadExistingPages();
  }, []);

  const loadExistingPages = async () => {
    setIsLoadingStatus(true);
    const { data, error } = await supabase
      .from('seo_route_pages' as any)
      .select('id, slug, generation_status, is_published')
      .limit(2000);

    if (!error && data) {
      const slugMap = new Map<string, { status: string; id: string; isPublished: boolean }>();
      (data as any[]).forEach((r: any) => {
        slugMap.set(r.slug, { status: r.generation_status, id: r.id, isPublished: !!r.is_published });
      });
      setExistingSlugs(slugMap);
    }
    setIsLoadingStatus(false);
  };

  // Opens the mandatory review surface (P0-3). Loads the FULL generated
  // content on demand — the list view only ever holds id/slug/status/
  // is_published, never the actual page text, so there is nothing to
  // publish without first fetching what will actually be shown. Also
  // captures `updated_at` as the reviewed-version marker (BF-0R-3 final
  // hardening) — Publish will require the row to still carry this exact
  // value, so a regeneration that lands after this fetch cannot be
  // published under the guise of the version actually reviewed here.
  const openReview = async (route: RouteWithStatus) => {
    if (!route.id) return;
    setReviewRoute(route);
    setReviewContent(null);
    setReviewConfirmed(false);
    setIsLoadingReview(true);

    const { data, error } = await supabase
      .from('seo_route_pages')
      .select('title, meta_description, h1_title, intro_paragraph, main_content, travel_tips, faqs, updated_at')
      .eq('id', route.id)
      .single();

    if (error || !data) {
      toast.error('Failed to load content for review');
      setReviewRoute(null);
    } else {
      setReviewContent(data as unknown as RouteReviewContent);
    }
    setIsLoadingReview(false);
  };

  const closeReview = () => {
    setReviewRoute(null);
    setReviewContent(null);
    setReviewConfirmed(false);
  };

  // Human publish gate — the ONLY place is_published is ever set to true.
  // Reachable ONLY from inside the review dialog, behind the explicit
  // confirmation checkbox, and runs under the admin's own session, so it is
  // enforced independently by the "Admins can manage route pages" RLS
  // policy on top of everything below.
  //
  // BF-0R-3 final hardening — optimistic-concurrency guard: the review
  // dialog can be open for a while, and the reviewed row is NOT locked
  // against regeneration while it's open. Without a version check, this
  // race is possible: review version A → a regeneration overwrites the row
  // with version B → the admin, still looking at the version-A dialog,
  // clicks Publish → version B goes live even though only A was reviewed.
  // The WHERE clause below requires the row to still be exactly the
  // reviewed version — unpublished, still awaiting review, AND still
  // carrying the `updated_at` captured when the dialog opened — and
  // `.select('id')` reports whether that actually matched. Zero rows means
  // the content changed after review (or was published by someone else, or
  // no longer exists): fail closed, publish nothing, and send the admin
  // back to review the current version.
  const confirmPublish = async () => {
    if (!reviewRoute?.id || !reviewContent || !reviewConfirmed) return;
    setPublishingSlug(reviewRoute.slug);

    const { data, error } = await supabase
      .from('seo_route_pages' as any)
      .update({ is_published: true, generation_status: 'published' })
      .eq('id', reviewRoute.id)
      .eq('is_published', false)
      .eq('generation_status', 'generated_pending_review')
      .eq('updated_at', reviewContent.updated_at)
      .select('id');

    if (error) {
      toast.error(`Failed to publish: ${error.message}`);
    } else if (!data || data.length === 0) {
      toast.error(
        'This content changed after you opened it for review. Please review the latest version before publishing.',
      );
      closeReview();
      await loadExistingPages();
    } else {
      toast.success(`Published ${reviewRoute.origin_city} → ${reviewRoute.destination_city}`);
      closeReview();
      await loadExistingPages();
    }
    setPublishingSlug(null);
  };

  // Merge popular routes with DB status
  useEffect(() => {
    const merged = POPULAR_ROUTES.map(r => {
      const existing = existingSlugs.get(r.slug);
      return {
        ...r,
        status: (existing?.status || 'not_started') as RouteStatus,
        id: existing?.id,
        isPublished: existing?.isPublished ?? false,
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
          next.set(updated.slug, { status: updated.generation_status, id: updated.id, isPublished: !!updated.is_published });
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Publication truth is `isPublished` (the actual DB column), never
  // `generation_status` — a status string can go stale or be inconsistent
  // with the real flag, and a published row must always read as published
  // regardless of what its status text says.
  const filteredRoutes = routes.filter(r => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'published') return !!r.isPublished;
    return r.status === filterStatus && !r.isPublished;
  });

  const stats = {
    total: routes.length,
    published: routes.filter(r => r.isPublished).length,
    reviewReady: routes.filter(r => r.status === 'generated_pending_review' && !r.isPublished).length,
    failedValidation: routes.filter(r => r.status === 'failed_validation' && !r.isPublished).length,
    failed: routes.filter(r => r.status === 'failed' && !r.isPublished).length,
    pending: routes.filter(r => (r.status === 'pending' || r.status === 'generating') && !r.isPublished).length,
    notStarted: routes.filter(r => r.status === 'not_started' && !r.isPublished).length,
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
    let totalFailedValidation = 0;
    let totalSkippedPublished = 0;

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
        totalFailedValidation += data?.failedValidation || 0;
        // A currently published row is never regenerated — see P0-1 in
        // supabase/functions/generate-route-page/index.ts.
        totalSkippedPublished += data?.skippedPublished || 0;
      } catch (err) {
        console.error('Batch failed:', err);
        totalFailed += batch.length;
      }

      setProgress({ generated: totalGenerated, failed: totalFailed, total: toGenerate.length });
    }

    // "Generated" here means "passed the provenance gate and is awaiting
    // human review" — it is never publication. See confirmPublish above.
    toast.success(
      `${totalGenerated} route page(s) ready for review (${totalFailed} failed, ${totalFailedValidation} rejected for unsourced facts${totalSkippedPublished > 0 ? `, ${totalSkippedPublished} already-published route(s) left untouched` : ''})`,
    );
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

  // isPublished is checked FIRST and is authoritative: a row is "Published"
  // whenever the actual column says so, regardless of what generation_status
  // happens to read. This also covers rows whose status is inconsistent with
  // reality (e.g. left over from a bug, or edited directly) — such a row is
  // never silently reported as anything other than what it actually is.
  const statusBadge = (route: RouteWithStatus) => {
    if (route.isPublished) {
      return <Badge variant="default" className="bg-emerald-600 text-xs">Published</Badge>;
    }
    switch (route.status) {
      case 'generated_pending_review':
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Awaiting review</Badge>;
      case 'failed_validation':
        return <Badge variant="destructive" className="text-xs">Unsourced facts rejected</Badge>;
      case 'generating': return <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 animate-spin mr-1" />Generating</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs">Pending</Badge>;
      case 'published':
      case 'completed':
        // Status claims published but is_published is false — a stale/
        // inconsistent status, not a reason to render "Published".
        return <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Status out of date</Badge>;
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Routes</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.reviewReady}</p>
                <p className="text-xs text-muted-foreground">Awaiting Review</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{stats.failed + stats.failedValidation}</p>
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
            {([
              ['all', 'All'],
              ['not_started', 'Not Started'],
              ['generated_pending_review', 'Awaiting Review'],
              ['published', 'Published'],
              ['failed_validation', 'Unsourced Facts Rejected'],
              ['failed', 'Failed'],
            ] as const).map(([status, label]) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="shrink-0"
              >
                {label}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                  {status === 'all' ? routes.length
                    : status === 'published' ? stats.published
                    : status === 'generated_pending_review' ? stats.reviewReady
                    : status === 'failed_validation' ? stats.failedValidation
                    : status === 'failed' ? stats.failed
                    : status === 'not_started' ? stats.notStarted
                    : routes.filter(r => r.status === status && !r.isPublished).length}
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
                      data-testid={`route-row-${route.slug}`}
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
                      {statusBadge(route)}
                      {/* P0-3: no one-click Publish here. Review opens the
                          mandatory review surface (the Dialog below); Publish
                          is only reachable from inside it. */}
                      {route.status === 'generated_pending_review' && !route.isPublished && route.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-7 text-xs"
                          onClick={() => openReview(route)}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </main>
        <Footer />
      </div>

      {/* Mandatory review surface (P0-3). Publish exists ONLY inside this
          dialog, behind the explicit confirmation checkbox. */}
      <Dialog open={!!reviewRoute} onOpenChange={(open) => { if (!open) closeReview(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="route-review-dialog">
          <DialogHeader>
            <DialogTitle>Review before publishing</DialogTitle>
            <DialogDescription>
              {reviewRoute && `${reviewRoute.origin_city} → ${reviewRoute.destination_city}`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
            This is AI-generated editorial content. It contains no provider or official
            factual source data — no fares, airlines, schedules, or booking-window
            claims. Read it before publishing.
          </div>

          {isLoadingReview ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewContent ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-foreground">Title</p>
                <p className="text-muted-foreground">{reviewContent.title}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Meta description</p>
                <p className="text-muted-foreground">{reviewContent.meta_description}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">H1</p>
                <p className="text-muted-foreground">{reviewContent.h1_title}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Intro</p>
                <p className="text-muted-foreground">{reviewContent.intro_paragraph}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Main content</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{reviewContent.main_content}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Travel tips</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {(reviewContent.travel_tips || []).map((tip, i) => (
                    <li key={i}>{tip.title ? `${tip.title}: ` : ''}{tip.content}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">FAQs</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {(reviewContent.faqs || []).map((faq, i) => (
                    <li key={i}>{faq.question}: {faq.answer}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-2 pt-3 border-t border-border">
            <Checkbox
              id="review-confirm"
              checked={reviewConfirmed}
              onCheckedChange={(checked) => setReviewConfirmed(!!checked)}
            />
            <label htmlFor="review-confirm" className="text-sm text-muted-foreground">
              I have reviewed this AI-generated content and confirm it is accurate and safe to publish.
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeReview}>Cancel</Button>
            <Button
              disabled={!reviewConfirmed || !reviewContent || publishingSlug === reviewRoute?.slug}
              onClick={confirmPublish}
            >
              {publishingSlug === reviewRoute?.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
