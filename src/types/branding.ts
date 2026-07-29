/**
 * Central Branding type definitions — Phase 7D (HARDENED).
 *
 * Mirrors the site_branding table schema exactly.
 * Used by useBranding() hook and AdminBranding page.
 */

export interface BrandingSettings {
  id: string;
  site_name: string;
  tagline: string | null;
  logo_url: string | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  icon_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  updated_at: string;
  updated_by: string | null;
}

/** Safe defaults used when branding hasn't loaded yet or the DB row is missing. */
export const DEFAULT_BRANDING: Omit<BrandingSettings, 'id' | 'updated_at' | 'updated_by'> = {
  site_name: 'BookingsFinder',
  tagline: 'Plan, Prepare, and Travel Ready',
  logo_url: null,
  logo_light_url: null,
  logo_dark_url: null,
  icon_url: null,
  favicon_url: null,
  primary_color: '#0D4F5C',
  secondary_color: '#CC4D28',
  accent_color: '#2E6B4A',
};

/** Singleton row key for upserts. */
export const BRANDING_SINGLETON_ID = 'default';

/** Valid MIME types for branding assets upload. PNG and WebP only. */
export const ALLOWED_BRANDING_MIME_TYPES = [
  'image/png',
  'image/webp',
] as const;

export type AllowedBrandingMime = (typeof ALLOWED_BRANDING_MIME_TYPES)[number];

/** Maximum file size for branding uploads: 2 MB. */
export const MAX_BRANDING_FILE_SIZE = 2 * 1024 * 1024;

/** Exact 6-digit hex colour regex (matches DB CHECK constraint). */
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Validate a hex colour string. */
export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_RE.test(color);
}

/** Logo variant identifiers for <BrandLogo />. */
export type LogoVariant = 'default' | 'light' | 'dark' | 'icon';

/** Branding asset slot names corresponding to DB columns. */
export type BrandingAssetSlot =
  | 'logo_url'
  | 'logo_light_url'
  | 'logo_dark_url'
  | 'icon_url'
  | 'favicon_url';

/** Mapping from asset slot to storage path (fixed, non-user-controlled). */
export const BRANDING_STORAGE_PATHS: Record<BrandingAssetSlot, string> = {
  logo_url: 'branding/logo-main.png',
  logo_light_url: 'branding/logo-light.png',
  logo_dark_url: 'branding/logo-dark.png',
  icon_url: 'branding/icon.png',
  favicon_url: 'branding/favicon.png',
};

/** Mapping from asset slot to display label. */
export const BRANDING_ASSET_LABELS: Record<BrandingAssetSlot, string> = {
  logo_url: 'Main Logo',
  logo_light_url: 'Light Background Logo',
  logo_dark_url: 'Dark Background Logo',
  icon_url: 'Icon Mark',
  favicon_url: 'Favicon',
};

/** Storage bucket name. */
export const BRANDING_BUCKET_NAME = 'branding';
