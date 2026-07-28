# Phase 7C — White Label Branding & Experience

**Date**: 2026-07-28
**Status**: Repository package reviewed — manual Travelpayouts dashboard configuration required
**Target**: `https://flights.bookingsfinder.com/` (Travelpayouts Page-type White Label)

---

## 1. Asset Status

| Asset | URL | Status |
|-------|-----|--------|
| Logo (webp) | `https://bookingsfinder.com/logo.webp` | **Expected production URL after deployment.** Copied to `public/logo.webp` in this commit. Verify returns 200 with `image/webp` in an incognito browser after deploy. |
| Favicon (webp) | `https://bookingsfinder.com/favicon.webp` | ✅ Verified — returns 200 `image/webp` |
| Favicon (ico) | `https://bookingsfinder.com/favicon.ico` | ✅ Verified — returns 200 |

### Asset Deployment Order

1. Merge/deploy this commit (includes `public/logo.webp`)
2. Verify `https://bookingsfinder.com/logo.webp` returns 200 in incognito
3. Record HTTP status and MIME type
4. In Travelpayouts dashboard → Logo field, either:
   - Paste the verified URL, OR
   - Upload the file directly if dashboard supports it
5. Test on desktop and mobile
6. Rollback if broken (re-upload previous logo or reset to default)

---

## 2. Dashboard Field Names

*Requires confirmation in the Travelpayouts dashboard.* Exact field labels depend on the Page-type White Label configuration. Typical sections include:

| Purpose | Likely Section / Field | Status |
|---------|----------------------|--------|
| Logo image | "Branding" or "Logo" | Requires dashboard confirmation |
| Favicon | "Branding" or "Favicon" | Requires dashboard confirmation |
| Site/brand name | "Settings" or "Brand name" | Requires dashboard confirmation |
| Page title / meta | "SEO" or "Page title" | Requires dashboard confirmation |
| Homepage headline/hero | "Homepage Design" or "Hero" | Requires dashboard confirmation |
| Custom header HTML | "Custom HTML" → Header field | Requires dashboard confirmation |
| Custom footer HTML | "Custom HTML" → Footer field | Requires dashboard confirmation |
| Custom CSS | "Custom CSS" or "Design" → CSS | Requires dashboard confirmation |
| Search-results colours | "Design" tab → "Search Results" | Requires dashboard confirmation |

**Before pasting any snippet, confirm the exact field name in the dashboard.**

---

## 3. Configuration Status

| Stage | Status |
|-------|--------|
| Repository package reviewed | ✅ Complete |
| Favicon URLs verified | ✅ favicon.webp + favicon.ico confirmed live |
| Logo URL verified | ❌ Pending deployment |
| Dashboard fields confirmed | ❌ Pending dashboard access |
| Manual configuration applied | ❌ Pending |
| Browser validation completed | ❌ Pending |

---

## 4. Safe Rollout Order

Apply changes one at a time. Save → verify → next.

1. **Title / brand name** — Low risk, immediately visible
2. **Logo / favicon** — Only after `public/logo.webp` is live; upload or paste verified URL
3. **Colour settings in Design tab** — Set primary/accent colours if available
4. **Minimal header** — Logo + "Back to BookingsFinder" link only (from `header.html`)
5. **Minimal footer / disclosure** — Legal links + affiliate disclosure (from `footer.html`)
6. **Custom CSS** — `custom.css` (only `bf-wl-*` scoped rules + overflow prevention)
7. **Results Design settings** — Card/button colours in Design tab
8. **Full desktop/mobile validation** — Test all breakpoints and flows

Do NOT paste all snippets simultaneously. Rollback immediately if layout breaks.

---

## 5. Application Checklist

- [x] **Repository package reviewed** — HTML/CSS verified against project
- [ ] **Logo deployed and verified** — `public/logo.webp` live at `https://bookingsfinder.com/logo.webp`
- [ ] **Dashboard fields confirmed** — Exact field names noted from Travelpayouts dashboard
- [ ] **Settings applied** — One change at a time per the rollout order
- [ ] **Homepage verified** — Logo, title, search form, hero text
- [ ] **Search results verified** — Run a search, check cards, filters, buttons
- [ ] **Mobile verified** — 375px, tablet, no overflow
- [ ] **Handoff verified** — Click through a result, confirm redirect works

---

## 6. Rollback

1. Clear the Custom HTML and Custom CSS fields in the dashboard
2. Restore previous logo/favicon or reset to Travelpayouts defaults
3. Restore page title to previous value
4. Hard refresh — White Label returns to default Travelpayouts appearance
