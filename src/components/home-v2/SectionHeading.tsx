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
        "mb-10 md:mb-14",
        align === "center" && "text-center",
        className
      )}
    >
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight text-balance">
        {headline}
      </h2>
      {supporting && (
        <p className="mt-4 text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          {supporting}
        </p>
      )}
    </div>
  );
}
