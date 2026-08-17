/**
 * BookingsFinder Things destination motif (T3C).
 *
 * PROVENANCE — this is the whole point of the component.
 *
 * No genuine licensed or owned Rome photograph exists in this repository, and
 * T3C is forbidden from inventing one: no stock hotlink, no Unsplash, no
 * borrowing a provider's product image and passing it off as a BookingsFinder
 * destination asset. So the destination identity is carried by a drawing we
 * own — authored here, in brand colour, as vector geometry. It claims nothing
 * about the place beyond its silhouette.
 *
 * It is decorative in the strict accessibility sense (`aria-hidden`): the
 * destination name, the country and the breadcrumb carry the identity for
 * assistive technology, and removing this SVG loses no information.
 *
 * Rendering contract:
 *   - inherits `currentColor`, so the caller sets the ink (brand primary)
 *   - all opacity is baked into the shapes, so the caller controls overall
 *     presence with one wrapper opacity
 *   - `preserveAspectRatio="xMaxYMax meet"` — the motif is anchored to the
 *     bottom-right of its box so it sits on the hero's baseline at any width
 *
 * A slug with no drawing falls back to a neutral horizon. That is deliberate:
 * a destination we have not drawn must not borrow another city's skyline.
 */
import { cn } from "@/lib/utils";

interface ThingsDestinationMotifProps {
  /** Canonical destination slug. Unknown/absent → neutral horizon. */
  slug?: string | null;
  className?: string;
}

const BASELINE = 232;

/** A real arch: flat sides, semicircular head. A rounded rectangle is a form field. */
function arch(x: number, top: number, width: number, bottom = BASELINE) {
  const r = width / 2;
  return `M${x} ${bottom} L${x} ${top + r} A${r} ${r} 0 0 1 ${x + width} ${top + r} L${x + width} ${bottom}`;
}

const TIER_ONE = [64, 98, 132, 166, 200];
const TIER_TWO = [64, 98, 132, 166];

/** Rome's signature tree: bare trunk, flat spreading canopy. */
const pine = (x: number, groundOffset: number, scale: number) => (
  <g>
    <path d={`M${x} ${BASELINE} L${x} ${BASELINE - 54 * scale - groundOffset}`} stroke="currentColor" strokeWidth="2" />
    <path
      d={`M${x - 42 * scale} ${BASELINE - 56 * scale - groundOffset}
          Q${x} ${BASELINE - 88 * scale - groundOffset} ${x + 42 * scale} ${BASELINE - 56 * scale - groundOffset}
          Q${x} ${BASELINE - 62 * scale - groundOffset} ${x - 42 * scale} ${BASELINE - 56 * scale - groundOffset} Z`}
      fill="currentColor"
      opacity="0.5"
    />
  </g>
);

const RomeMotif = () => (
  <>
    {/* Horizon */}
    <line x1="8" y1={BASELINE} x2="632" y2={BASELINE} stroke="currentColor" strokeWidth="1.5" opacity="0.4" />

    {/* Amphitheatre — two arcaded tiers, and the upper tier stops partway
        because the building itself is a ruin, not a stadium. */}
    <g opacity="0.6" stroke="currentColor" fill="none">
      {/* Outer wall: flat top, arched ends, standing on the horizon */}
      <path d="M52 232 L52 132 Q52 118 66 118 L222 118 Q236 118 236 132 L236 232" strokeWidth="2" />
      <line x1="52" y1="176" x2="236" y2="176" strokeWidth="1.5" opacity="0.7" />
      {TIER_ONE.map((x) => (
        <path key={`t1-${x}`} d={arch(x, 186, 22, 232)} strokeWidth="1.5" />
      ))}
      {TIER_TWO.map((x) => (
        <path key={`t2-${x}`} d={arch(x, 132, 22, 176)} strokeWidth="1.5" />
      ))}
      {/* Where the outer ring has fallen away */}
      <path d="M200 176 L200 132 L222 132" strokeWidth="1.5" opacity="0.45" />
    </g>

    {/* Umbrella pines */}
    <g opacity="0.4" stroke="currentColor">
      {pine(306, 0, 1)}
      {pine(598, 10, 0.75)}
    </g>

    {/* Basilica: drum, ribbed dome, lantern, and a low flanking colonnade */}
    <g opacity="0.6" stroke="currentColor" fill="none">
      <path d="M428 232 L428 186 M504 232 L504 186" strokeWidth="2" />
      <path d="M428 186 A38 46 0 0 1 504 186" strokeWidth="2" />
      <path d="M466 140 L466 186 M447 143 L447 186 M485 143 L485 186" strokeWidth="1" opacity="0.5" />
      <path d="M458 142 L458 126 L474 126 L474 142" strokeWidth="1.5" />
      <circle cx="466" cy="120" r="6" strokeWidth="1.5" />
      <path d="M382 232 L382 202 M394 232 L394 202 M406 232 L406 202" strokeWidth="1.5" opacity="0.6" />
      <path d="M376 202 L412 202" strokeWidth="1.5" opacity="0.6" />
      <path d="M526 232 L526 202 M538 232 L538 202 M550 232 L550 202" strokeWidth="1.5" opacity="0.6" />
      <path d="M520 202 L556 202" strokeWidth="1.5" opacity="0.6" />
    </g>

    {/* Air — two long, slow arcs so the composition is not only architecture */}
    <path d="M0 74 Q 180 44 360 68 T 640 52" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.16" />
    <path d="M0 98 Q 220 78 420 94 T 640 86" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.11" />
  </>
);

const NeutralMotif = () => (
  <>
    <line x1="16" y1="232" x2="624" y2="232" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <path d="M0 96 Q 180 62 360 90 T 640 70" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.2" />
    <path d="M0 124 Q 220 102 420 120 T 640 110" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.14" />
    <g opacity="0.3">
      <circle cx="182" cy="90" r="4" fill="currentColor" />
      <circle cx="418" cy="112" r="3" fill="currentColor" />
      <circle cx="556" cy="80" r="4" fill="currentColor" />
    </g>
  </>
);

const ThingsDestinationMotif = ({ slug, className }: ThingsDestinationMotifProps) => (
  <svg
    viewBox="0 0 640 260"
    preserveAspectRatio="xMaxYMax meet"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={cn("pointer-events-none select-none", className)}
  >
    {slug === "rome" ? <RomeMotif /> : <NeutralMotif />}
  </svg>
);

export default ThingsDestinationMotif;
