import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HowItWorks = () => {
  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center md:text-left">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                We don't sell tickets — we just help find the cheapest ones. <span className="font-medium text-foreground">Totally free.</span>
              </p>
            </div>
            
            <Button variant="link" className="text-primary font-medium whitespace-nowrap" asChild>
              <a href="/how-it-works" className="flex items-center gap-1">
                How it works
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
