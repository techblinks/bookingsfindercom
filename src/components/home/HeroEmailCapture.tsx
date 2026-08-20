import { useState } from "react";
import { Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HeroEmailCapture = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      // BF-0R-5 round 3: subscribers has no raw client INSERT/SELECT grant
      // any more — subscribe_email() is the only client-reachable write
      // path (it upserts and never raises a unique-violation, closing the
      // email-existence oracle the old error-code check relied on).
      const { error } = await supabase.rpc("subscribe_email", {
        p_email: email.trim(),
        p_source: "hero_banner",
      });

      if (error) throw error;
      toast.success("You're in! We'll alert you when prices drop.");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-5 md:mt-8">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-primary-foreground/80" />
        <span className="text-xs md:text-sm font-medium text-primary-foreground/80">
          Get free price drop alerts — no spam, just savings
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto px-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 px-4 py-2.5 rounded-full bg-primary-foreground/15 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/30 backdrop-blur-sm"
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          size="sm"
          className="rounded-full px-5 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isSubmitting ? "..." : "Get Alerts"}
        </Button>
      </form>
    </div>
  );
};

export default HeroEmailCapture;
