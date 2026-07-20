import { SectionContainer } from "./SectionContainer";
import { SectionHeading } from "./SectionHeading";
import { toolCards, toolIconMap } from "./homeV2Config";
import type { ToolCard } from "./homeV2Config";

function ToolCardView({ tool }: { tool: ToolCard }) {
  const Icon = toolIconMap[tool.icon];

  return (
    <div className="group relative bg-card rounded-xl border border-border p-6 md:p-7 cursor-default">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
        {Icon && <Icon className="h-6 w-6 text-accent" aria-hidden="true" />}
      </div>

      {/* Label */}
      <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">
        {tool.label}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {tool.description}
      </p>

      {/* Coming soon badge — subtle */}
      <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-muted/50 text-muted-foreground border-border/50">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {toolCards.map((tool) => (
          <ToolCardView key={tool.id} tool={tool} />
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground text-center">
        More tools are being prepared.
      </p>
    </SectionContainer>
  );
}
