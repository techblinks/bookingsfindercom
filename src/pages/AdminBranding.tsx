/**
 * AdminBranding — Phase 7D Central Brand Manager (HARDENED).
 *
 * /admin/branding — upload logos, set colours, manage site branding.
 * Admin-only; uses useAdminAuth for route protection.
 *
 * Storage security: uploads go through Supabase Storage with admin-only
 * RLS policies on the 'branding' bucket. Client-side validation is a
 * convenience layer — actual enforcement is server-side.
 */

import { useState, useCallback, useEffect, useRef, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Save, RotateCcw, Loader2,
  Image, Palette, Eye, AlertTriangle,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useBranding } from '@/hooks/useBranding';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { BrandAssetUploader } from '@/components/brand/BrandAssetUploader';
import { BrandColourEditor } from '@/components/brand/BrandColourEditor';
import { BrandPreviewPanel } from '@/components/brand/BrandPreviewPanel';
import { BrandPublicUrls } from '@/components/brand/BrandPublicUrls';
import { supabase } from '@/integrations/supabase/client';
import {
  BRANDING_STORAGE_PATHS,
  BRANDING_BUCKET_NAME,
  BRANDING_SINGLETON_ID,
  DEFAULT_BRANDING,
  isValidHexColor,
  type BrandingAssetSlot,
} from '@/types/branding';
import { toast } from 'sonner';

export default function AdminBranding() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const { branding, isLoading: brandingLoading, error: brandingError, refresh } = useBranding();

  // ── Form State ────────────────────────────────────────────────
  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Upload state per slot
  const [uploadingSlot, setUploadingSlot] = useState<BrandingAssetSlot | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<Partial<Record<BrandingAssetSlot, string>>>({});
  const fileRefs = useRef<Partial<Record<BrandingAssetSlot, File>>>({});

  // ── Init form from branding (effect, never during render) ─────
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && !brandingLoading && branding.id) {
      initialized.current = true;
      setSiteName(branding.site_name);
      setTagline(branding.tagline || '');
      setPrimaryColor(branding.primary_color);
      setSecondaryColor(branding.secondary_color);
      setAccentColor(branding.accent_color);
    }
  }, [brandingLoading, branding]);

  const checkChanges = useCallback(() => {
    if (siteName !== branding.site_name) return true;
    if (tagline !== (branding.tagline || '')) return true;
    if (primaryColor !== branding.primary_color) return true;
    if (secondaryColor !== branding.secondary_color) return true;
    if (accentColor !== branding.accent_color) return true;
    if (Object.keys(fileRefs.current).length > 0) return true;
    return false;
  }, [siteName, tagline, primaryColor, secondaryColor, accentColor, branding]);

  // ── Copy URL helper ──────────────────────────────────────────

  const copyUrl = useCallback((url: string | null, label: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success(`${label} URL copied to clipboard.`);
  }, []);

  // ── File handlers ────────────────────────────────────────────

  const handleFileSelect = useCallback(
    (slot: BrandingAssetSlot, file: File) => {
      fileRefs.current[slot] = file;
      setHasUnsavedChanges(true);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [slot]: objectUrl }));
    },
    [],
  );

  const handleRemoveFile = useCallback(
    (slot: BrandingAssetSlot) => {
      delete fileRefs.current[slot];
      const url = previewUrls[slot];
      if (url) URL.revokeObjectURL(url);
      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      setHasUnsavedChanges(true);
    },
    [previewUrls],
  );

  // ── Save ─────────────────────────────────────────────────────

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    for (const [label, color] of [
      ['Primary', primaryColor],
      ['Secondary', secondaryColor],
      ['Accent', accentColor],
    ] as const) {
      if (!isValidHexColor(color)) {
        toast.error(`${label} colour must be a 6-digit hex code (e.g. #FF6B35).`);
        return;
      }
    }

    if (!siteName.trim()) {
      toast.error('Site name is required.');
      return;
    }

    setIsSaving(true);

    try {
      const uploadedUrls: Partial<Record<BrandingAssetSlot, string>> = {};

      for (const [slot, file] of Object.entries(fileRefs.current) as [BrandingAssetSlot, File][]) {
        setUploadingSlot(slot);
        setUploadProgress(0);

        const path = BRANDING_STORAGE_PATHS[slot];
        const ext = file.type === 'image/webp' ? 'webp' : 'png';

        const { error: uploadError } = await supabase.storage
          .from(BRANDING_BUCKET_NAME)
          .upload(path, file, {
            cacheControl: 'no-cache',
            contentType: `image/${ext}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(BRANDING_BUCKET_NAME)
          .getPublicUrl(path);

        if (urlData?.publicUrl) {
          const versioned = `${urlData.publicUrl}?v=${Date.now()}`;
          uploadedUrls[slot] = versioned;
        }

        setUploadProgress(100);
      }

      const updatePayload: Record<string, unknown> = {
        id: BRANDING_SINGLETON_ID,
        site_name: siteName.trim(),
        tagline: tagline.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      };
      for (const [slot, url] of Object.entries(uploadedUrls)) {
        updatePayload[slot] = url;
      }

      const { error: dbError } = await supabase
        .from('site_branding')
        .upsert(updatePayload, { onConflict: 'id' });

      if (dbError) throw dbError;

      fileRefs.current = {};
      for (const url of Object.values(previewUrls)) {
        URL.revokeObjectURL(url);
      }
      setPreviewUrls({});
      setUploadingSlot(null);
      setUploadProgress(0);
      setHasUnsavedChanges(false);

      await refresh();

      toast.success('Branding saved! All changes are now live on the website.');
    } catch (err) {
      console.error('[AdminBranding] Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save branding.');
    } finally {
      setIsSaving(false);
      setUploadingSlot(null);
      setUploadProgress(0);
    }
  };

  // ── Reset / Cancel ───────────────────────────────────────────

  const handleReset = () => {
    setSiteName(DEFAULT_BRANDING.site_name);
    setTagline(DEFAULT_BRANDING.tagline || '');
    setPrimaryColor(DEFAULT_BRANDING.primary_color);
    setSecondaryColor(DEFAULT_BRANDING.secondary_color);
    setAccentColor(DEFAULT_BRANDING.accent_color);
    fileRefs.current = {};
    for (const url of Object.values(previewUrls)) {
      URL.revokeObjectURL(url);
    }
    setPreviewUrls({});
    setHasUnsavedChanges(true);
    toast.info('Reset to defaults. Save to apply.');
  };

  const handleCancel = () => {
    setSiteName(branding.site_name);
    setTagline(branding.tagline || '');
    setPrimaryColor(branding.primary_color);
    setSecondaryColor(branding.secondary_color);
    setAccentColor(branding.accent_color);
    fileRefs.current = {};
    for (const url of Object.values(previewUrls)) {
      URL.revokeObjectURL(url);
    }
    setPreviewUrls({});
    setHasUnsavedChanges(false);
    toast.info('Unsaved changes discarded.');
  };

  // ── Loading / Auth Guard / Error ──────────────────────────────

  if (authLoading || brandingLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {authLoading ? 'Checking admin access…' : 'Loading branding settings…'}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // Auth error: not authenticated or not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AdminLoginForm />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Branding fetch error — show warning but let admin continue
  if (brandingError) {
    // Warn but allow the page to work with defaults
    toast.error('Could not load branding. Using defaults.', { id: 'branding-load-error' });
  }

  // ── Render ────────────────────────────────────────────────────

  const assetSlots: BrandingAssetSlot[] = [
    'logo_url',
    'logo_light_url',
    'logo_dark_url',
    'icon_url',
    'favicon_url',
  ];
  const currentUnsaved = checkChanges();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Branding Settings | Admin | BookingsFinder</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Palette className="h-6 w-6 text-primary" />
                Branding Settings
              </h1>
              <p className="text-muted-foreground">
                Manage logos, colours, and site identity
              </p>
            </div>
            {currentUnsaved && (
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          <Tabs defaultValue="logos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="logos" className="gap-2">
                <Image className="h-4 w-4" />
                Logos & Assets
              </TabsTrigger>
              <TabsTrigger value="colours" className="gap-2">
                <Palette className="h-4 w-4" />
                Colours
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* ── Logos Tab ───────────────────────────────── */}
            <TabsContent value="logos" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Site Identity</CardTitle>
                  <CardDescription>
                    These appear across the site and in browser tabs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="site-name">Site Name</Label>
                    <Input
                      id="site-name"
                      value={siteName}
                      onChange={(e) => {
                        setSiteName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="BookingsFinder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline (optional)</Label>
                    <Input
                      id="tagline"
                      value={tagline}
                      onChange={(e) => {
                        setTagline(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Plan, Prepare, and Travel Ready"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brand Assets</CardTitle>
                  <CardDescription>
                    Upload logos and favicon. Accepted: PNG, WebP. Max 2 MB per file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {assetSlots.map((slot) => (
                    <BrandAssetUploader
                      key={slot}
                      slot={slot}
                      currentUrl={branding[slot] ?? null}
                      previewUrl={previewUrls[slot] ?? null}
                      isUploading={uploadingSlot === slot}
                      uploadProgress={uploadProgress}
                      isSaving={isSaving}
                      onFileSelect={handleFileSelect}
                      onRemove={handleRemoveFile}
                      onCopyUrl={copyUrl}
                    />
                  ))}
                </CardContent>
              </Card>

              <BrandPublicUrls
                logoUrl={branding.logo_url}
                iconUrl={branding.icon_url}
                faviconUrl={branding.favicon_url}
                onCopyUrl={copyUrl}
              />
            </TabsContent>

            {/* ── Colours Tab ──────────────────────────────── */}
            <TabsContent value="colours" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Colours</CardTitle>
                  <CardDescription>
                    Use 6-digit hex codes with accessible contrast ratios.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <BrandColourEditor
                    id="primary"
                    label="Primary Colour"
                    description="Main brand colour — header backgrounds, primary buttons."
                    value={primaryColor}
                    onChange={(v) => { setPrimaryColor(v); setHasUnsavedChanges(true); }}
                  />
                  <BrandColourEditor
                    id="secondary"
                    label="Secondary Colour"
                    description="Accent colour for CTAs and highlights."
                    value={secondaryColor}
                    onChange={(v) => { setSecondaryColor(v); setHasUnsavedChanges(true); }}
                  />
                  <BrandColourEditor
                    id="accent"
                    label="Accent Colour"
                    description="Tertiary colour for badges, links, and subtle accents."
                    value={accentColor}
                    onChange={(v) => { setAccentColor(v); setHasUnsavedChanges(true); }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Reset to Defaults
                  </CardTitle>
                  <CardDescription>
                    Restore all branding settings to the BookingsFinder defaults.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Preview Tab ──────────────────────────────── */}
            <TabsContent value="preview">
              <BrandPreviewPanel
                siteName={siteName}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                accentColor={accentColor}
                faviconUrl={previewUrls.favicon_url ?? branding.favicon_url}
              />
            </TabsContent>
          </Tabs>

          {currentUnsaved && (
            <div className="sticky bottom-4 bg-card border border-border rounded-xl p-4 shadow-lg flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                You have unsaved changes to your branding settings.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Discard
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save All Changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
