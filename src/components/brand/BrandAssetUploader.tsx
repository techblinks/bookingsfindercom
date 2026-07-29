/**
 * BrandAssetUploader — single asset upload row.
 * Handles file selection, preview, validation, progress display.
 */

import { useState, useCallback, type ChangeEvent, useRef } from 'react';
import { Upload, X, Loader2, AlertTriangle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ALLOWED_BRANDING_MIME_TYPES,
  MAX_BRANDING_FILE_SIZE,
  BRANDING_ASSET_LABELS,
  type BrandingAssetSlot,
} from '@/types/branding';
import { toast } from 'sonner';

interface BrandAssetUploaderProps {
  slot: BrandingAssetSlot;
  currentUrl: string | null;
  previewUrl: string | null;
  isUploading: boolean;
  uploadProgress: number;
  isSaving: boolean;
  onFileSelect: (slot: BrandingAssetSlot, file: File) => void;
  onRemove: (slot: BrandingAssetSlot) => void;
  onCopyUrl: (url: string, label: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMimeDisplay(mime: string): string {
  if (mime === 'image/png') return 'PNG';
  if (mime === 'image/webp') return 'WebP';
  return mime;
}

export function BrandAssetUploader({
  slot,
  currentUrl,
  previewUrl,
  isUploading,
  uploadProgress,
  isSaving,
  onFileSelect,
  onRemove,
  onCopyUrl,
}: BrandAssetUploaderProps) {
  const [warning, setWarning] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate MIME type — PNG and WebP only
      if (
        !ALLOWED_BRANDING_MIME_TYPES.includes(
          file.type as (typeof ALLOWED_BRANDING_MIME_TYPES)[number],
        )
      ) {
        toast.error(
          `Unsupported file type: ${file.type || 'unknown'}. Please use PNG or WebP.`,
        );
        return;
      }

      // Validate file size
      if (file.size > MAX_BRANDING_FILE_SIZE) {
        toast.error(
          `File too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(MAX_BRANDING_FILE_SIZE)}.`,
        );
        return;
      }

      // Aspect ratio check (non-blocking warning)
      if (file.type === 'image/png' || file.type === 'image/webp') {
        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          let w: string | null = null;
          if (slot === 'favicon_url') {
            if (img.naturalWidth !== img.naturalHeight) {
              w = 'Favicon should be square (1:1 ratio).';
            } else if (img.naturalWidth < 32 || img.naturalWidth > 512) {
              w = 'Favicon should be between 32×32 and 512×512.';
            }
          } else if (slot === 'icon_url') {
            if (img.naturalWidth !== img.naturalHeight) {
              w = 'Icon should be square (1:1 ratio).';
            }
          }
          setWarning(w);
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      }

      onFileSelect(slot, file);
      toast.success(
        `${BRANDING_ASSET_LABELS[slot]} selected: ${file.name} (${formatFileSize(file.size)})`,
      );
    },
    [slot, onFileSelect],
  );

  const slotDescriptions: Record<BrandingAssetSlot, string> = {
    logo_url: 'Main horizontal logo used in header and footer.',
    logo_light_url: 'Logo variant for light backgrounds.',
    logo_dark_url: 'Logo variant for dark backgrounds.',
    icon_url: 'Square icon mark (no wordmark) for app icons.',
    favicon_url: 'Small square icon for browser tabs (32×32 to 512×512).',
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Label className="font-semibold text-sm">
              {BRANDING_ASSET_LABELS[slot]}
            </Label>
            {slot === 'favicon_url' && (
              <Badge variant="secondary" className="text-xs">
                Browser Tab
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {slotDescriptions[slot]}
          </p>
        </div>

        {/* Current asset preview */}
        {currentUrl && !previewUrl && (
          <div className="shrink-0 flex items-center gap-2">
            <img
              src={currentUrl}
              alt="Current"
              className={
                slot === 'favicon_url'
                  ? 'h-8 w-8 rounded object-contain border'
                  : 'h-10 max-w-[120px] object-contain'
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                onCopyUrl(currentUrl, BRANDING_ASSET_LABELS[slot])
              }
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Preview of new file */}
      {previewUrl && (
        <div className="relative inline-block">
          {slot === 'favicon_url' ? (
            <img
              src={previewUrl}
              alt="New"
              className="h-12 w-12 rounded object-contain border"
            />
          ) : (
            <img
              src={previewUrl}
              alt="New"
              className="h-14 max-w-[200px] object-contain"
            />
          )}
          <button
            onClick={() => onRemove(slot)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {warning}
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload button */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isSaving}
          onClick={() =>
            document.getElementById(`file-input-${slot}`)?.click()
          }
        >
          <Upload className="h-4 w-4" />
          {previewUrl ? 'Change File' : 'Upload'}
        </Button>
        {previewUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(slot)}
            disabled={isSaving}
          >
            Remove
          </Button>
        )}
        <input
          id={`file-input-${slot}`}
          type="file"
          accept=".png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
