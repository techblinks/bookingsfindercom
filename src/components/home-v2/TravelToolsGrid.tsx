import { cn } from "@/lib/utils";
import { SectionContainer } from "./SectionContainer";
import { SectionHeading } from "./SectionHeading";
import { toolCards, toolIconMap } from "./homeV2Config";
import type { ToolCard } from "./homeV2Config";

function ToolCardView({ tool }: { tool: ToolCard }) {
  const Icon = toolIconMap[tool.icon];

  return (
    <div className="group relative bg-card rounded-xl border border-border p-5 md:p-6 opacity-70 cursor-default">
      {/* Icon */}
      <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
        {Icon && <Icon className="h-5 w-5 text-accent" aria-hidden="true" />}
      </div>

      {/* Label */}
      <h3 className="text-base md:text-lg font-semibold text-foreground mb-1.5">
        {tool.label}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {tool.description}
      </p>

      {/* Coming soon badge */}
      <span className={cn(
        "absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        "bg-muted text-muted-foreground border-border"
      )}>
        Coming soon
      </span>
    </div>
  );
}

export function TravelToolsGrid() {
  return (
    <SectionContainer className="bg-muted/50">
      <SectionHeading
        headline="Useful tools for every stage of your trip."
        supporting="Check important details, prepare your budget and keep your journey organised from one place."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {toolCards.map((tool) => (
          <ToolCardView key={tool.id} tool={tool} />
        ))}
      </div>
    </SectionContainer>
  );
}
