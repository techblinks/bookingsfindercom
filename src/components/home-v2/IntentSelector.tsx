import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { intentCards, iconMap, launchBadge } from "./homeV2Config";
import type { IntentCard } from "./homeV2Config";

function IntentCard({ card }: { card: IntentCard }) {
  const Icon = iconMap[card.icon];
  const badge = launchBadge[card.launchStatus];
  const isClickable = card.launchStatus === "mvp";

  const content = (
    <div
      className={cn(
        "group relative bg-card rounded-xl border border-border p-5 md:p-6",
        "transition-all duration-200",
        isClickable && "hover:shadow-md hover:border-primary/20 cursor-pointer",
        !isClickable && "opacity-70 cursor-default"
      )}
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
        {Icon && <Icon className="h-5 w-5 text-accent" />}
      </div>

      {/* Label */}
      <h3 className="text-base md:text-lg font-semibold text-foreground mb-1.5">
        {card.label}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {card.description}
      </p>

      {/* Arrow indicator (available cards only) */}
      {isClickable && (
        <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-accent group-hover:gap-2 transition-all">
          Get started
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Launch badge */}
      {badge && (
        <span
          className={cn(
            "absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            badge.className
          )}
        >
          {badge.label}
        </span>
      )}
    </div>
  );

  if (!isClickable) {
    return content;
  }

  return (
    <Link to={card.route} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
      {content}
    </Link>
  );
}

export function IntentSelector() {
  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            What do you need help with?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {intentCards.map((card) => (
            <IntentCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
