/**
 * AdminSiteMedia — Hero Media Manager.
 *
 * Allows admins to upload, preview, publish and revert hero images
 * for the Homepage, Flights and Stays pages.
 *
 * Publishing uses the trusted publish-site-hero Edge Function so
 * service-role credentials never reach the browser.
 * Draft previews use short-lived signed URLs.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Upload, Eye, RotateCcw, Archive,
  Trash2, ExternalLink, Monitor, Smartphone, ChevronDown, ChevronUp,
} from "lucide-react";
import type { HeroPageKey, HeroSlotKey, HeroSet, HeroAsset, HeroMediaSet, HeroMediaSlot } from "@/types/hero";
import { HERO_PAGE_KEYS, HERO_SLOT_KEYS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/types/hero";
import HeroMediaCollage from "@/components/hero/HeroMediaCollage";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateHeroMediaCache } from "@/hooks/useHeroMedia";

const PAGE_LABELS: Record<HeroPageKey, string> = { home: "Homepage", flights: "Flights", stays: "Stays" };
const SLOT_LABELS: Record<HeroPageKey, Record<HeroSlotKey, string>> = {
  home: { main: "Hero main image", support_1: "Supporting image 1", support_2: "Supporting image 2", mobile: "Hero mobile image" },
  flights: { main: "Hero main image", support_1: "Supporting image 1", support_2: "Supporting image 2", mobile: "Hero mobile image" },
  stays: { main: "Hero main image", support_1: "Supporting image 1", support_2: "Supporting image 2", mobile: "Hero mobile image" },
};

const DRAFT_BUCKET = "site-media-drafts";
const PUBLIC_BUCKET = "site-media";
const SIGNED_URL_EXPIRY = 300; // 5 minutes

/**
 * Request a short-lived signed URL for a private draft file.
 * Never stored in database rows, never logged.
 */
async function getSignedDraftUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DRAFT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export default function AdminSiteMedia() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [pageKey, setPageKey] = useState<HeroPageKey>("home");
  const [publishedSet, setPublishedSet] = useState<HeroSet | null>(null);
  const [draftSet, setDraftSet] = useState<HeroSet | null>(null);
  const [draftAssets, setDraftAssets] = useState<Record<HeroSlotKey, HeroAsset | null>>(
    {} as Record<HeroSlotKey, HeroAsset | null>
  );
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<HeroSet[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showDesktopPreview, setShowDesktopPreview] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Editable metadata per slot
  const [editingSlot, setEditingSlot] = useState<HeroSlotKey | null>(null);
  const [editAltText, setEditAltText] = useState("");
  const [editDecorative, setEditDecorative] = useState(false);
  const [editFocalX, setEditFocalX] = useState(50);
  const [editFocalY, setEditFocalY] = useState(50);
  const [savingMeta, setSavingMeta] = useState(false);

  // Signed preview URLs (short-lived, rotated on mount + periodically)
  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({});
  const signedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Signed URL refresh ──
  useEffect(() => {
    // Clear old + refresh
    setSignedUrls({});
    if (!draftSet) return;

    const refresh = async () => {
      const urls: Record<string, string | null> = {};
      for (const slot of HERO_SLOT_KEYS) {
        const asset = draftAssets[slot];
        if (asset?.storage_path) {
          urls[slot] = await getSignedDraftUrl(asset.storage_path);
        }
      }
      setSignedUrls(urls);
    };

    refresh();
    // Refresh before expiry (every 4 minutes)
    signedTimer.current = setInterval(refresh, 240_000);

    return () => {
      if (signedTimer.current) clearInterval(signedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSet?.id]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: pub } = await supabase
        .from("site_hero_sets")
        .select("*, site_hero_assets(*)")
        .eq("page_key", pageKey)
        .eq("status", "published")
        .limit(1)
        .maybeSingle();
      setPublishedSet(pub as HeroSet | null);

      const { data: draft } = await supabase
        .from("site_hero_sets")
        .select("*, site_hero_assets(*)")
        .eq("page_key", pageKey)
        .eq("status", "draft")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      setDraftSet(draft as HeroSet | null);

      const assets: Record<string, HeroAsset | null> = {
        main: null, support_1: null, support_2: null, mobile: null,
      };
      if (draft) {
        for (const a of draft.site_hero_assets || []) {
          assets[a.slot_key] = a as HeroAsset;
        }
      }
      setDraftAssets(assets as Record<HeroSlotKey, HeroAsset | null>);

      const { data: history } = await supabase
        .from("site_hero_sets")
        .select("*")
        .eq("page_key", pageKey)
        .order("version_number", { ascending: false })
        .limit(20);
      setVersionHistory((history || []) as HeroSet[]);
    } catch (e) {
      toast.error("Failed to load hero data");
    } finally {
      setLoading(false);
    }
  }, [pageKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createDraft = async () => {
    const { data, error } = await supabase.rpc("create_site_hero_draft", {
      p_page_key: pageKey,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Could not create draft");
      return;
    }
    toast.success("Draft created");
    fetchData();
  };

  const discardDraft = async () => {
    if (!draftSet) return;
    if (
      !confirm(
        `Permanently discard the current draft for ${PAGE_LABELS[pageKey]}? Draft files will be deleted.`
      )
    )
      return;

    // Clean up draft files from private bucket before discarding DB rows
    for (const slot of HERO_SLOT_KEYS) {
      const asset = draftAssets[slot];
      if (asset?.storage_path) {
        const { error: rmErr } = await supabase.storage
          .from(DRAFT_BUCKET)
          .remove([asset.storage_path]);
        if (rmErr) console.warn("Failed to clean up draft file:", rmErr.message);
      }
    }

    const { data, error } = await supabase.rpc("discard_site_hero_draft", {
      p_set_id: draftSet.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (typeof data === "string" && data.startsWith("error")) {
      toast.error(data);
      return;
    }
    toast.success("Draft discarded");
    fetchData();
  };

  const handleUpload = async (slot: HeroSlotKey, file: File) => {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, AVIF`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large (max 5 MB)");
      return;
    }
    if (!draftSet) {
      toast.error("Create a draft first");
      return;
    }

    setUploading((p) => ({ ...p, [slot]: true }));
    const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
    const newPath = `hero/${pageKey}/${slot}/${crypto.randomUUID()}.${ext}`;
    const existing = draftAssets[slot];

    try {
      // 1. Upload new file to private draft bucket
      const { error: upErr } = await supabase.storage
        .from(DRAFT_BUCKET)
        .upload(newPath, file, { upsert: false });
      if (upErr) throw upErr;

      // 2. Save the new database reference BEFORE deleting old file
      let dbErr;
      if (existing) {
        ({ error: dbErr } = await supabase
          .from("site_hero_assets")
          .update({
            storage_path: newPath,
            mime_type: file.type,
            file_size_bytes: file.size,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id));
      } else {
        ({ error: dbErr } = await supabase
          .from("site_hero_assets")
          .insert({
            hero_set_id: draftSet.id,
            slot_key: slot,
            storage_path: newPath,
            mime_type: file.type,
            file_size_bytes: file.size,
          }));
      }

      if (dbErr) {
        // DB save failed — delete the newly uploaded file (avoid orphan)
        const { error: rmErr } = await supabase.storage
          .from(DRAFT_BUCKET)
          .remove([newPath]);
        if (rmErr) console.warn("Failed to clean up orphaned upload:", rmErr.message);
        throw dbErr;
      }

      // 3. Only now delete the previous draft file (new reference is safely saved)
      if (existing?.storage_path) {
        const { error: rmErr } = await supabase.storage
          .from(DRAFT_BUCKET)
          .remove([existing.storage_path]);
        if (rmErr) console.warn("Failed to clean up old draft file:", rmErr.message);
      }

      toast.success(`${SLOT_LABELS[pageKey][slot]} updated`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading((p) => ({ ...p, [slot]: false }));
    }
  };

  /**
   * Publish via trusted Edge Function (service-role never reaches browser).
   */
  const handlePublish = async () => {
    if (!draftSet) {
      toast.error("No draft to publish");
      return;
    }
    const filledSlots = Object.values(draftAssets).filter(Boolean).length;
    if (filledSlots < 4) {
      toast.error(`All 4 slots required (${filledSlots}/4 filled)`);
      return;
    }
    if (
      !confirm(
        `Publish this hero set for ${PAGE_LABELS[pageKey]}? The live site will update immediately.`
      )
    )
      return;

    setPublishing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-site-hero`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ draftSetId: draftSet.id }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Publish failed");
        return;
      }

      toast.success("Hero published!");
      invalidateHeroMediaCache(queryClient);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleRevert = async (versionNumber: number) => {
    if (
      !confirm(
        `Revert ${PAGE_LABELS[pageKey]} to archived version ${versionNumber}? A new version will be created and published.`
      )
    )
      return;
    const { data, error } = await supabase.rpc("revert_site_hero_set", {
      p_page_key: pageKey,
      p_version_number: versionNumber,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (typeof data === "string" && data.startsWith("error")) {
      toast.error(data);
      return;
    }
    toast.success("Reverted and published");
    invalidateHeroMediaCache(queryClient);
    fetchData();
  };

  const handleDisable = async () => {
    if (
      !confirm(
        `Disable custom hero for ${PAGE_LABELS[pageKey]}? The site will use built-in fallback images.`
      )
    )
      return;
    const { data, error } = await supabase.rpc("disable_custom_site_hero", {
      p_page_key: pageKey,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Using built-in fallback");
    invalidateHeroMediaCache(queryClient);
    fetchData();
  };

  // Metadata editing
  const openMetadata = (slot: HeroSlotKey) => {
    const asset = draftAssets[slot];
    if (!asset) return;
    setEditingSlot(slot);
    setEditAltText(asset.alt_text || "");
    setEditDecorative(asset.is_decorative);
    setEditFocalX(asset.focal_x);
    setEditFocalY(asset.focal_y);
  };

  const saveMetadata = async () => {
    if (!editingSlot) return;
    const asset = draftAssets[editingSlot];
    if (!asset) return;
    setSavingMeta(true);
    try {
      await supabase
        .from("site_hero_assets")
        .update({
          alt_text: editAltText || null,
          is_decorative: editDecorative,
          focal_x: editFocalX,
          focal_y: editFocalY,
          updated_at: new Date().toISOString(),
        })
        .eq("id", asset.id);
      toast.success("Metadata saved");
      setEditingSlot(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingMeta(false);
    }
  };

  // Build preview data for HeroMediaCollage from signed URLs
  const buildPreviewSet = (): HeroMediaSet | null => {
    const allFilled = HERO_SLOT_KEYS.every(
      (s) => draftAssets[s] && signedUrls[s]
    );
    if (!allFilled) return null;

    const toSlot = (key: HeroSlotKey): HeroMediaSlot => {
      const a = draftAssets[key]!;
      return {
        storagePath: a.storage_path,
        publicUrl: signedUrls[key]!,
        altText: a.alt_text,
        isDecorative: a.is_decorative,
        focalX: a.focal_x,
        focalY: a.focal_y,
      };
    };

    return {
      main: toSlot("main"),
      support1: toSlot("support_1"),
      support2: toSlot("support_2"),
      mobile: toSlot("mobile"),
      version: draftSet?.version_number ?? 0,
    };
  };

  const previewData = buildPreviewSet();

  const STATUS_BADGE: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-gray-200 text-gray-600",
  };

  if (authLoading)
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  if (!isAdmin)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Administrator access required.
      </div>
    );

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Site Media</h1>
        <p className="text-muted-foreground">Manage hero images for public pages.</p>
      </div>

      <Tabs value={pageKey} onValueChange={(v) => setPageKey(v as HeroPageKey)}>
        <TabsList>
          <TabsTrigger value="home">Homepage</TabsTrigger>
          <TabsTrigger value="flights">Flights</TabsTrigger>
          <TabsTrigger value="stays">Stays</TabsTrigger>
        </TabsList>

        {HERO_PAGE_KEYS.map((pk) => (
          <TabsContent key={pk} value={pk} className="space-y-4">
            {/* Status bar */}
            <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl bg-muted/50 border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{PAGE_LABELS[pk]}</p>
                <p className="text-xs text-muted-foreground">
                  {publishedSet
                    ? `Published: v${publishedSet.version_number} · ${new Date(
                        publishedSet.published_at || publishedSet.updated_at
                      ).toLocaleDateString()}`
                    : "Using built-in fallback"}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={createDraft} disabled={loading}>
                  {draftSet ? "New Draft" : "Create Draft"}
                </Button>
                {draftSet && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={discardDraft}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Discard Draft
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="default"
                  onClick={handlePublish}
                  disabled={
                    !draftSet ||
                    publishing ||
                    Object.values(draftAssets).filter(Boolean).length < 4
                  }
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Publish Hero"
                  )}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Slots grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {HERO_SLOT_KEYS.map((slot) => {
                    const asset = draftAssets[slot];
                    const pubAsset = publishedSet?.assets?.find(
                      (a: any) => a.slot_key === slot
                    );
                    const pubUrl = pubAsset
                      ? supabase.storage
                          .from(PUBLIC_BUCKET)
                          .getPublicUrl(pubAsset.storage_path).data.publicUrl
                      : null;
                    const draftUrl = signedUrls[slot] || null;
                    const isEditingMeta = editingSlot === slot;

                    return (
                      <div key={slot} className="rounded-xl border bg-card p-3 space-y-2">
                        <p className="text-xs font-semibold text-foreground">
                          {SLOT_LABELS[pk][slot]}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">{slot}</p>

                        {(draftUrl || pubUrl) && (
                          <div className="aspect-[3/2] rounded-lg overflow-hidden bg-muted">
                            <img
                              src={draftUrl || pubUrl || ""}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {!draftUrl && !pubUrl && (
                          <div className="aspect-[3/2] rounded-lg bg-muted flex items-center justify-center">
                            <Eye className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                        )}

                        {asset && (
                          <div className="text-[10px] text-muted-foreground space-y-0.5">
                            <p>
                              {asset.mime_type} ·{" "}
                              {(asset.file_size_bytes ?? 0) / 1024 > 0
                                ? ((asset.file_size_bytes ?? 0) / 1024).toFixed(0) +
                                  " KB"
                                : ""}
                            </p>
                            <p>
                              Alt: {asset.alt_text || "—"} ·{" "}
                              {asset.is_decorative ? "Decorative" : "Descriptive"}
                            </p>
                            <p>
                              Focal: {asset.focal_x}%, {asset.focal_y}%
                            </p>
                          </div>
                        )}

                        <div className="flex gap-1 flex-wrap">
                          <Label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(slot, f);
                              }}
                              disabled={!draftSet || uploading[slot]}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              asChild
                              disabled={!draftSet || uploading[slot]}
                            >
                              <span>
                                {uploading[slot] ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Upload className="h-3 w-3 mr-1" />
                                )}
                                {asset ? "Replace" : "Upload"}
                              </span>
                            </Button>
                          </Label>
                          {asset && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => openMetadata(slot)}
                              disabled={savingMeta}
                            >
                              Edit metadata
                            </Button>
                          )}
                        </div>

                        {/* Inline metadata editor */}
                        {isEditingMeta && (
                          <div className="space-y-2 p-2 border rounded-lg bg-muted/30">
                            <div>
                              <Label className="text-[10px]">Alt text</Label>
                              <input
                                type="text"
                                value={editAltText}
                                onChange={(e) => setEditAltText(e.target.value)}
                                className="w-full text-xs border rounded px-2 py-1"
                                placeholder="Descriptive alt text"
                              />
                            </div>
                            <label className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={editDecorative}
                                onChange={(e) => setEditDecorative(e.target.checked)}
                              />
                              Decorative (alt="")
                            </label>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label className="text-[10px]">Focal X (0-100)</Label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={editFocalX}
                                  onChange={(e) => setEditFocalX(Number(e.target.value))}
                                  className="w-full h-4"
                                />
                                <span className="text-[10px]">{editFocalX}%</span>
                              </div>
                              <div className="flex-1">
                                <Label className="text-[10px]">Focal Y (0-100)</Label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={editFocalY}
                                  onChange={(e) => setEditFocalY(Number(e.target.value))}
                                  className="w-full h-4"
                                />
                                <span className="text-[10px]">{editFocalY}%</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="text-xs"
                                onClick={saveMetadata}
                                disabled={savingMeta}
                              >
                                {savingMeta ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => setEditingSlot(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Preview buttons */}
                {previewData && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDesktopPreview(!showDesktopPreview)}
                    >
                      <Monitor className="h-3.5 w-3.5 mr-1" />
                      {showDesktopPreview ? "Hide Desktop Preview" : "Preview Desktop"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMobilePreview(!showMobilePreview)}
                    >
                      <Smartphone className="h-3.5 w-3.5 mr-1" />
                      {showMobilePreview ? "Hide Mobile Preview" : "Preview Mobile"}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={pk === "home" ? "/" : `/${pk}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Live Page
                      </a>
                    </Button>
                  </div>
                )}

                {/* Desktop preview */}
                {showDesktopPreview && previewData && (
                  <div className="border rounded-xl p-6 bg-background">
                    <p className="text-xs font-semibold mb-3 text-muted-foreground">
                      Desktop Preview (~1440px container)
                    </p>
                    <div className="max-w-[1440px] mx-auto">
                      <HeroMediaCollage pageKey={pk} previewSet={previewData} />
                    </div>
                  </div>
                )}

                {/* Mobile preview */}
                {showMobilePreview && previewData && (
                  <div className="border rounded-xl p-6 bg-background">
                    <p className="text-xs font-semibold mb-3 text-muted-foreground">
                      Mobile Preview (~390px container)
                    </p>
                    <div className="max-w-[390px] mx-auto">
                      <HeroMediaCollage pageKey={pk} previewSet={previewData} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDisable}
                    disabled={!publishedSet}
                  >
                    <Archive className="h-3.5 w-3.5 mr-1" /> Use built-in fallback
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? (
                      <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    )}
                    Version History ({versionHistory.length})
                  </Button>
                </div>

                {/* Version history */}
                {showHistory && (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="p-3 bg-muted/30 border-b">
                      <p className="text-xs font-semibold">Version History</p>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {versionHistory.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between px-4 py-3 border-b last:border-0 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                STATUS_BADGE[v.status] || ""
                              }`}
                            >
                              {v.status}
                            </span>
                            <span className="text-xs font-mono">v{v.version_number}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {v.status === "archived" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => handleRevert(v.version_number)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" /> Revert to v
                                {v.version_number}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {versionHistory.length === 0 && (
                        <p className="p-4 text-xs text-muted-foreground text-center">
                          No versions yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
