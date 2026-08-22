import { AdPlacement } from '@/hooks/useAds';

interface AdEmbedProps {
  ad: AdPlacement;
  onImpression?: () => void;
}

/**
 * HTML Embed ads — DISABLED, fails closed (BF-0R-7 Phase H, P0 security).
 *
 * The previous implementation set `innerHTML` from `ad.html_content` and
 * then explicitly re-created any `<script>` tags as live DOM elements
 * purely so they would execute — actively defeating the browser's normal
 * protection against `innerHTML`-inserted scripts, with no sanitizer or
 * allowlist anywhere in the path. "Only for trusted admin-uploaded
 * content" is not an XSS boundary: it does not protect against a
 * compromised/phished admin session, an admin pasting a third-party ad
 * snippet verbatim (the Admin form's own placeholder was
 * `<script>...</script>`), or any other future writer of
 * `ad_placements.html_content`.
 *
 * `html_embed` has been removed from Admin's selectable ad types
 * (AdminAds.tsx) so no NEW row of this type can be created. This
 * component additionally fails closed for any EXISTING html_embed row —
 * it renders nothing and never touches `ad.html_content` — so a legacy
 * row cannot execute or render either, regardless of how it reaches this
 * component. This is the smallest safe fix for this PR; a real
 * sanitizer/allowlist implementation (if HTML Embed is reintroduced) is
 * explicitly out of scope here.
 */
export function AdEmbed(_props: AdEmbedProps) {
  return null;
}
