# BookingsFinder — Brand Values Reference

## Colour Palette

Verified from project CSS variables in `src/index.css` (2026-07-28).

| Token | Hex | HSL | Source Variable | Usage |
|-------|-----|-----|-----------------|-------|
| Teal (primary) | `#0D4F5C` | `hsl(187, 75%, 21%)` | `--primary` | Headings, selected states, links, secondary CTAs |
| Coral (accent) | `#CC4D28` | `hsl(15, 67%, 48%)` | `--accent` | Primary CTA buttons ("Search flights", "View Deal") |
| Background | `#FAF8F5` | `hsl(36, 33%, 97%)` | `--background` | Page background |
| Card | `#FFFFFF` | `hsl(0, 0%, 100%)` | `--card` | Result cards, search form card |
| Border | `#C4BFB6` | `hsl(39, 11%, 82%)` | `--border` | Card borders, dividers |
| Muted text | `#6B6560` | `hsl(27, 5%, 40%)` | `--muted-foreground` | Secondary text, labels, descriptions |
| Foreground | `#2A2827` | `hsl(24, 6%, 17%)` | `--foreground` | Body text |

## Contrast Ratios

| Pair | Contrast | WCAG Level |
|------|----------|------------|
| Teal `#0D4F5C` on `#FFFFFF` | 8.59:1 | AAA |
| Coral `#CC4D28` on `#FFFFFF` | 4.51:1 | AA |
| Coral `#CC4D28` on `#FAF8F5` | 4.40:1 | AA |
| Muted `#6B6560` on `#FFFFFF` | 4.87:1 | AA |
| Muted `#6B6560` on `#FAF8F5` | 4.67:1 | AA |

## Typography

- **Font**: Inter, system sans-serif fallback
- **Heading weight**: 600 (semibold)
- **Body size**: 14–16px
- **Line height**: 1.5

## Border Radius

- **Cards**: 12px (`--radius: 0.75rem`)
- **Buttons**: 10px

## Shadows

- **Card**: `0 1px 3px 0 rgba(45,42,40,0.08), 0 1px 2px -1px rgba(45,42,40,0.06)`
- **Elevated**: `0 4px 6px -1px rgba(45,42,40,0.08), 0 2px 4px -2px rgba(45,42,40,0.06)`

## Trust Language

- "Compare live partner fares"
- "Secure partner handoff"
- "No fee from BookingsFinder"
- "Multiple booking providers"

## Affiliate Disclosure

> BookingsFinder compares offers from third-party travel providers and does not
> sell flight tickets. Bookings are completed with the selected airline or
> booking partner. BookingsFinder may earn an affiliate commission at no extra
> cost to you.
