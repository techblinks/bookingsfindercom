/**
 * Strict shared types for the Site Hero Media system.
 *
 * Used by the migration, hook, collage component, and admin UI.
 * Do not use unchecked string casts for database values.
 */

export const HERO_PAGE_KEYS = ["home", "flights", "stays"] as const;
export type HeroPageKey = (typeof HERO_PAGE_KEYS)[number];

export const HERO_SLOT_KEYS = ["main", "support_1", "support_2", "mobile"] as const;
export type HeroSlotKey = (typeof HERO_SLOT_KEYS)[number];

export const HERO_SET_STATUSES = ["draft", "published", "archived"] as const;
export type HeroSetStatus = (typeof HERO_SET_STATUSES)[number];

export const HERO_EVENT_TYPES = [
  "HERO_SET_DRAFT_CREATED",
  "HERO_IMAGE_UPLOADED",
  "HERO_IMAGE_REPLACED",
  "HERO_METADATA_UPDATED",
  "HERO_SET_PUBLISHED",
  "HERO_SET_REVERTED",
  "HERO_CUSTOM_MEDIA_DISABLED",
  "HERO_DRAFT_DELETED",
] as const;
export type HeroEventType = (typeof HERO_EVENT_TYPES)[number];

export const HERO_STORAGE_BUCKETS = ["site-media", "site-media-drafts"] as const;
export type HeroStorageBucket = (typeof HERO_STORAGE_BUCKETS)[number];

export function isValidStorageBucket(v: unknown): v is HeroStorageBucket {
  return typeof v === "string" && (HERO_STORAGE_BUCKETS as readonly string[]).includes(v);
}

export interface HeroAsset {
  id: string;
  hero_set_id: string;
  slot_key: HeroSlotKey;
  storage_path: string;
  storage_bucket: HeroStorageBucket;
  alt_text: string | null;
  is_decorative: boolean;
  focal_x: number;
  focal_y: number;
  original_width: number | null;
  original_height: number | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeroSet {
  id: string;
  page_key: HeroPageKey;
  version_number: number;
  status: HeroSetStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_by: string | null;
  published_at: string | null;
  archived_at: string | null;
  based_on_set_id: string | null;
  notes: string | null;
  assets?: HeroAsset[];
}

export interface HeroMediaSlot {
  storagePath: string;
  bucket: HeroStorageBucket;
  publicUrl: string;
  altText: string | null;
  isDecorative: boolean;
  focalX: number;
  focalY: number;
}

export interface HeroMediaSet {
  main: HeroMediaSlot;
  support1: HeroMediaSlot;
  support2: HeroMediaSlot;
  mobile: HeroMediaSlot;
  version: number;
}

export interface HeroMediaEvent {
  id: string;
  event_type: HeroEventType;
  actor_id: string | null;
  page_key: HeroPageKey | null;
  version_number: number | null;
  hero_set_id: string | null;
  slot_key: HeroSlotKey | null;
  summary: string | null;
  created_at: string;
}

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function isValidPageKey(v: unknown): v is HeroPageKey {
  return typeof v === "string" && HERO_PAGE_KEYS.includes(v as HeroPageKey);
}

export function isValidSlotKey(v: unknown): v is HeroSlotKey {
  return typeof v === "string" && HERO_SLOT_KEYS.includes(v as HeroSlotKey);
}

export function isValidHeroSetStatus(v: unknown): v is HeroSetStatus {
  return typeof v === "string" && HERO_SET_STATUSES.includes(v as HeroSetStatus);
}

export function isValidMimeType(v: unknown): boolean {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}
