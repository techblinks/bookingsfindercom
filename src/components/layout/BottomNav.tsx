import { Home, Plane, Building2, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { label: "Home", href: "/", icon: Home, key: "home" },
  { label: "Flights", href: "/flights", icon: Plane, key: "flights" },
  { label: "Hotels", href: "/hotels", icon: Building2, key: "hotels" },
  { label: "Account", href: "/account", icon: User, key: "account" },
];

const BottomNav = () => {
  const [activeAlerts, setActiveAlerts] = useState(0);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const { count } = await supabase
          .from("saved_searches")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);
        setActiveAlerts(count ?? 0);
      } catch {
        // silently fail
      }
    };
    checkAlerts();
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/40 lg:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.href}
            end={tab.href === "/"}
            className="relative flex flex-col items-center justify-center flex-1 gap-0.5 text-muted-foreground transition-colors native-touch"
            activeClassName="text-primary"
          >
            <div className="relative">
              <tab.icon className="h-5 w-5" />
              {tab.key === "flights" && activeAlerts > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5">
                  <span className="text-[9px] font-bold text-destructive-foreground leading-none">
                    {activeAlerts > 9 ? "9+" : activeAlerts}
                  </span>
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
