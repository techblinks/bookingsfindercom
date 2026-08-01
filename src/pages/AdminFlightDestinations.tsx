/**
 * AdminFlightDestinations — Phase 7G Flight Destination Manager.
 *
 * /admin/flights/destinations — list, add, edit, upload/replace master image,
 * set focal point, alt text, active toggle, display order, and delete.
 * Admin-only; enforced server-side by RLS (has_role admin) and gated in the UI
 * via useAdminAuth. Image processing produces a real 800×600 WebP master
 * (client canvas) — the AVIF/JPG/480 variant matrix is a documented later phase.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, Upload, Trash2, Pencil, ImageOff } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processMasterImage } from "@/lib/flightDestinationImage";
import {
  FLIGHT_DESTINATIONS_TABLE, FLIGHT_DESTINATIONS_BUCKET,
  masterImagePath, validateDestinationInput, clampFocal, focalToObjectPosition, slugifyCity,
  type FlightDestinationRow, type FlightDestinationInput,
} from "@/lib/flightDestinations";

const EMPTY_FORM: FlightDestinationInput = {
  city: "", country: "", iata_code: "", slug: "", description: "", alt_text: "",
  focal_x: 0.5, focal_y: 0.5, display_order: 0, is_active: false,
};

export default function AdminFlightDestinations() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();

  const [rows, setRows] = useState<FlightDestinationRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FlightDestinationInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlightDestinationRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editingRow = useMemo(
    () => (editingId && editingId !== "new" ? rows.find((r) => r.id === editingId) ?? null : null),
    [editingId, rows],
  );

  // ── Data ──────────────────────────────────────────────────────

  const fetchRows = useCallback(async () => {
    setListLoading(true);
    const { data, error } = await supabase
      .from(FLIGHT_DESTINATIONS_TABLE)
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast.error("Could not load destinations");
    } else {
      setRows((data ?? []) as FlightDestinationRow[]);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void fetchRows();
  }, [isAdmin, fetchRows]);

  const publicUrl = useCallback((path: string | null): string | null => {
    if (!path) return null;
    return supabase.storage.from(FLIGHT_DESTINATIONS_BUCKET).getPublicUrl(path).data.publicUrl;
  }, []);

  // ── Form open/close ───────────────────────────────────────────

  function openNew() {
    setEditingId("new");
    setForm({ ...EMPTY_FORM, display_order: rows.length + 1 });
    setErrors({});
  }
  function openEdit(row: FlightDestinationRow) {
    setEditingId(row.id);
    setForm({
      city: row.city, country: row.country, iata_code: row.iata_code, slug: row.slug,
      description: row.description ?? "", alt_text: row.alt_text ?? "",
      focal_x: Number(row.focal_x), focal_y: Number(row.focal_y),
      display_order: row.display_order, is_active: row.is_active,
    });
    setErrors({});
  }
  function closeForm() {
    setEditingId(null);
    setErrors({});
  }

  function patch(p: Partial<FlightDestinationInput>) {
    setForm((f) => ({ ...f, ...p }));
  }

  // ── Save (insert / update) ────────────────────────────────────

  async function handleSave() {
    const errs = validateDestinationInput(form);
    if (errs.length) {
      setErrors(Object.fromEntries(errs.map((e) => [e.field, e.message])));
      toast.error(errs[0].message);
      return;
    }
    setErrors({});
    setSaving(true);
    const payload = {
      city: form.city.trim(), country: form.country.trim(),
      iata_code: form.iata_code.toUpperCase().trim(), slug: form.slug.trim(),
      description: form.description.trim() || null, alt_text: form.alt_text.trim() || null,
      focal_x: clampFocal(form.focal_x), focal_y: clampFocal(form.focal_y),
      display_order: form.display_order, is_active: form.is_active,
    };
    const query =
      editingId === "new"
        ? supabase.from(FLIGHT_DESTINATIONS_TABLE).insert(payload)
        : supabase.from(FLIGHT_DESTINATIONS_TABLE).update(payload).eq("id", editingId as string);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That slug is already used" : "Save failed");
      return;
    }
    toast.success(editingId === "new" ? "Destination added" : "Destination updated");
    closeForm();
    await fetchRows();
  }

  // ── Image upload / replace ────────────────────────────────────

  async function handleUpload(file: File) {
    if (!editingRow) {
      toast.error("Save the destination first, then add its image");
      return;
    }
    setUploading(true);
    try {
      const processed = await processMasterImage(file, form.focal_x, form.focal_y);
      const path = masterImagePath(editingRow.slug);
      const { error: upErr } = await supabase.storage
        .from(FLIGHT_DESTINATIONS_BUCKET)
        .upload(path, processed.blob, { contentType: processed.type, upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from(FLIGHT_DESTINATIONS_TABLE)
        .update({ image_path: path })
        .eq("id", editingRow.id);
      if (dbErr) throw dbErr;
      toast.success("Master image uploaded (800×600 WebP)");
      await fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Delete ────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setDeleteTarget(null);
    if (row.image_path) {
      await supabase.storage.from(FLIGHT_DESTINATIONS_BUCKET).remove([row.image_path]);
    }
    const { error } = await supabase.from(FLIGHT_DESTINATIONS_TABLE).delete().eq("id", row.id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Destination deleted");
    if (editingId === row.id) closeForm();
    await fetchRows();
  }

  async function toggleActive(row: FlightDestinationRow, next: boolean) {
    const { error } = await supabase
      .from(FLIGHT_DESTINATIONS_TABLE)
      .update({ is_active: next })
      .eq("id", row.id);
    if (error) {
      toast.error("Could not update status");
      return;
    }
    await fetchRows();
  }

  // ── Focal-point selector (click on preview) ───────────────────

  function onFocalClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    patch({
      focal_x: clampFocal((e.clientX - rect.left) / rect.width),
      focal_y: clampFocal((e.clientY - rect.top) / rect.height),
    });
  }

  // ── Gates ─────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span className="ml-3 text-sm text-muted-foreground">Checking admin access…</span>
      </div>
    );
  }
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" className="mx-auto max-w-md px-4 py-16">
          <h1 className="mb-4 text-xl font-bold text-foreground">Admin sign in</h1>
          <AdminLoginForm />
        </main>
        <Footer />
      </div>
    );
  }

  const previewUrl = editingRow ? publicUrl(editingRow.image_path) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Helmet>
        <title>Flight Destinations · Admin · BookingsFinder</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Flight destinations</h1>
            <p className="text-sm text-muted-foreground">Manage the destination cards shown on the flight landing page.</p>
          </div>
          <Button onClick={openNew} data-testid="add-destination">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Add destination
          </Button>
        </div>

        {/* ── List ── */}
        {listLoading ? (
          <div className="flex items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading destinations…
          </div>
        ) : (
          <ul data-testid="destination-list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows.map((row) => {
              const url = publicUrl(row.image_path);
              return (
                <li key={row.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {url ? (
                      <img
                        src={url} alt={row.alt_text ?? `${row.city}, ${row.country}`}
                        className="h-full w-full object-cover" loading="lazy"
                        style={{ objectPosition: focalToObjectPosition(Number(row.focal_x), Number(row.focal_y)) }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold text-foreground">{row.city}</h2>
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{row.country} · {row.iata_code} · #{row.display_order}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)} aria-label={`Edit ${row.city}`}>
                        <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(row)} aria-label={`Delete ${row.city}`}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Delete
                      </Button>
                      <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                        Active
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={(v) => toggleActive(row, v)}
                          aria-label={`Toggle ${row.city} active`}
                        />
                      </label>
                    </div>
                  </div>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                No destinations yet. Add one to get started.
              </li>
            )}
          </ul>
        )}

        {/* ── Editor ── */}
        {editingId && (
          <section aria-label="Destination editor" data-testid="destination-form"
            className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {editingId === "new" ? "Add destination" : `Edit ${editingRow?.city ?? ""}`}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="City" id="fd-city" error={errors.city}>
                <Input id="fd-city" value={form.city}
                  onChange={(e) => patch({ city: e.target.value, slug: form.slug || slugifyCity(e.target.value) })} />
              </Field>
              <Field label="Country" id="fd-country" error={errors.country}>
                <Input id="fd-country" value={form.country} onChange={(e) => patch({ country: e.target.value })} />
              </Field>
              <Field label="IATA code" id="fd-iata" error={errors.iata_code}>
                <Input id="fd-iata" value={form.iata_code} maxLength={3}
                  onChange={(e) => patch({ iata_code: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Slug" id="fd-slug" error={errors.slug}>
                <Input id="fd-slug" value={form.slug} onChange={(e) => patch({ slug: e.target.value })} />
              </Field>
              <Field label="Short description" id="fd-desc" className="md:col-span-2">
                <Input id="fd-desc" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
              </Field>
              <Field label="Alt text" id="fd-alt" className="md:col-span-2">
                <Textarea id="fd-alt" rows={2} value={form.alt_text} onChange={(e) => patch({ alt_text: e.target.value })} />
              </Field>
              <Field label="Display order" id="fd-order" error={errors.display_order}>
                <Input id="fd-order" type="number" min={0} value={form.display_order}
                  onChange={(e) => patch({ display_order: Number(e.target.value) })} />
              </Field>
              <div className="flex items-center gap-3">
                <Switch id="fd-active" checked={form.is_active} onCheckedChange={(v) => patch({ is_active: v })} />
                <Label htmlFor="fd-active">Active (visible publicly)</Label>
              </div>
            </div>

            {/* Focal point + image */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block">Focal point</Label>
                <button type="button" data-testid="focal-selector" onClick={onFocalClick}
                  aria-label="Set focal point by clicking the image"
                  className="relative block h-40 w-full overflow-hidden rounded-lg border border-border bg-muted">
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="h-full w-full object-cover"
                      style={{ objectPosition: focalToObjectPosition(form.focal_x, form.focal_y) }} />
                  ) : (
                    <span className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Upload an image to preview
                    </span>
                  )}
                  <span aria-hidden="true"
                    className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
                    style={{ left: `${clampFocal(form.focal_x) * 100}%`, top: `${clampFocal(form.focal_y) * 100}%` }} />
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label="Focal X" id="fd-fx" error={errors.focal_x}>
                    <Input id="fd-fx" type="number" step="0.01" min={0} max={1} value={form.focal_x}
                      onChange={(e) => patch({ focal_x: Number(e.target.value) })} />
                  </Field>
                  <Field label="Focal Y" id="fd-fy" error={errors.focal_y}>
                    <Input id="fd-fy" type="number" step="0.01" min={0} max={1} value={form.focal_y}
                      onChange={(e) => patch({ focal_y: Number(e.target.value) })} />
                  </Field>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Master image</Label>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif"
                  data-testid="image-input" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }} />
                <Button type="button" variant="outline" disabled={uploading || editingId === "new"}
                  onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {editingRow?.image_path ? "Replace image" : "Upload image"}
                </Button>
                {editingId === "new" && (
                  <p className="mt-2 text-xs text-muted-foreground">Save the destination first, then upload its image.</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Stored as an 800×600 WebP master. AVIF/JPG/480 variants are generated in a later phase.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving} data-testid="save-destination">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
              <Button variant="ghost" onClick={closeForm}>Cancel</Button>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.city}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the destination and its master image. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="confirm-delete">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Small field wrapper ──────────────────────────────────────────

function Field({
  label, id, error, className, children,
}: { label: string; id: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
