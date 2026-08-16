/**
 * BookingsFinder Things no-image state (T3B).
 *
 * Premium intentional fallback for missing genuine imagery - never a broken
 * card, never unrelated stock. Two variants:
 *
 *   - `compact`: fills the image slot it replaces (same box, same height).
 *     Used on experience cards; a short identity label is optional and the
 *     panel is decorative (`aria-hidden`) because the adjacent title already
 *     supplies identity.
 *   - `detail`: full honest copy ("No image is available for this experience
 *     yet.") in `text-secondary` with a thin brand rule so the state reads
 *     as deliberate (design system §14.4, Rome spec §10.1).
 *
 * Data honesty: this component never decides whether an image is genuine -
 * the caller renders it only when no genuine image exists or loading failed.
 */
import { ImageOff, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThingsNoImageStateProps {
  /** Short identity label for compact surfaces (e.g. the card title). */
  label?: string | null;
  variant?: "compact" | "detail";
  icon?: "image-off" | "map-pin";
  className?: string;
}

const DEFAULT_DETAIL_MESSAGE =
  "No image is available for this experience yet.";

const ThingsNoImageState = ({
  label,
  variant = "compact",
  icon = "image-off",
  className,
}: ThingsNoImageStateProps) => {
  const Icon = icon === "map-pin" ? MapPin : ImageOff;

  if (variant === "detail") {
    return (
      <div
        data-testid="things-no-image-state"
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-3 bg-things-surface-subtle px-6 text-center",
          className,
        )}
      >
        <Icon
          className="h-8 w-8 text-things-text-muted"
          aria-hidden="true"
        />
        <span
          className="h-0.5 w-8 rounded-full bg-primary"
          aria-hidden="true"
        />
        <p className="max-w-sm text-sm text-things-text-secondary">
          {label || DEFAULT_DETAIL_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="things-no-image-state"
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1 bg-things-surface-subtle",
        className,
      )}
      aria-hidden="true"
    >
      <Icon className="h-6 w-6 text-things-text-muted" aria-hidden="true" />
      {label ? (
        <p className="line-clamp-1 px-2 text-[11px] font-medium text-things-text-secondary">
          {label}
        </p>
      ) : null}
    </div>
  );
};

export default ThingsNoImageState;
