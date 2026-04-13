import { Home, Plane, Building2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { label: "Home", href: "/", icon: Home, key: "home" },
  { label: "Flights", href: "/?tab=flights", icon: Plane, key: "flights" },
  { label: "Hotels", href: "/?tab=hotels", icon: Building2, key: "hotels" },
  { label: "Account", href: "/account", icon: User, key: "account" },
];

const BottomNav = () => {
  const [activeAlerts, setActiveAlerts] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

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

  const isActive = (key: string) => {
    if (key === "home") return location.pathname === "/" && !location.search.includes("tab=");
    if (key === "flights") return location.search.includes("tab=flights") || location.pathname.startsWith("/flights");
    if (key === "hotels") return location.search.includes("tab=hotels") || location.pathname.startsWith("/hotels");
    if (key === "account") return location.pathname.startsWith("/account");
    return false;
  };

  const handleTabClick = (tab: typeof tabs[0], e: React.MouseEvent) => {
    e.preventDefault();

    if (tab.key === "flights" || tab.key === "hotels") {
      // Navigate to homepage with tab param and scroll to top
      navigate(`/?tab=${tab.key}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(tab.href);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-xl border-t border-border/30 lg:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around h-[60px]">
        {tabs.map((tab) => {
          const active = isActive(tab.key);
          return (
            <button
              key={tab.key}
              onClick={(e) => handleTabClick(tab, e)}
              className="relative flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors native-touch"
            >
              <div className="relative flex flex-col items-center">
                {/* Active pill indicator */}
                {active && (
                  <motion.div
                    layoutId="bottomnav-pill"
                    className="absolute -top-1.5 w-5 h-[3px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={`relative p-1 rounded-xl transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <tab.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                  {tab.key === "flights" && activeAlerts > 0 && (
                    <span className="absolute -top-0.5 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5">
                      <span className="text-[9px] font-bold text-destructive-foreground leading-none">
                        {activeAlerts > 9 ? "9+" : activeAlerts}
                      </span>
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
