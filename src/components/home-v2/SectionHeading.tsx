import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  headline: string;
  supporting?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  headline,
  supporting,
  className,
  align = "center",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-8 md:mb-12",
        align === "center" && "text-center",
        className
      )}
    >
      <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
        {headline}
      </h2>
      {supporting && (
        <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          {supporting}
        </p>
      )}
    </div>
  );
}
