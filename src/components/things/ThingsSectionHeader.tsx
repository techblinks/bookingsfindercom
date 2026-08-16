/**
 * BookingsFinder Things section header (T3B).
 *
 * Lightweight region label: optional eyebrow, semantic heading, optional
 * one-line supporting copy. No data logic, no marketing content. Adopted on
 * Things surfaces where it genuinely removes duplicated heading markup.
 *
 * Visual (design system §29.6): heading in `text-primary`, optional
 * `brand-primary` eyebrow, 8-12px rhythm.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThingsSectionHeaderProps {
  /** Optional id for `aria-labelledby` wiring on the section. */
  id?: string;
  heading: string;
  level?: 1 | 2 | 3;
  eyebrow?: string;
  supporting?: ReactNode;
  className?: string;
}

const ThingsSectionHeader = ({
  id,
  heading,
  level = 2,
  eyebrow,
  supporting,
  className,
}: ThingsSectionHeaderProps) => {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  return (
    <div className={cn("space-y-1", className)}>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
      ) : null}
      <Tag id={id} className="text-lg font-semibold text-things-text-primary">
        {heading}
      </Tag>
      {supporting ? (
        <p className="text-sm text-things-text-secondary">{supporting}</p>
      ) : null}
    </div>
  );
};

export default ThingsSectionHeader;
