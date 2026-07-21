import { Home, Compass, Briefcase, Wrench, User } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { label: "Home", href: "/", icon: Home, key: "home" },
  { label: "Discover", href: "/discover", icon: Compass, key: "discover" },
  { label: "Trips", href: "/trips", icon: Briefcase, key: "trips" },
  { label: "Tools", href: "/tools", icon: Wrench, key: "tools" },
  { label: "Account", href: "/account", icon: User, key: "account" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const isActive = (key: string) => {
    if (key === "home") return location.pathname === "/";
    if (key === "discover") return location.pathname.startsWith("/discover") || location.pathname.startsWith("/top-flight-destinations") || location.pathname.startsWith("/top-hotel-destinations");
    if (key === "trips") return location.pathname.startsWith("/trips") || location.pathname.startsWith("/plan");
    if (key === "tools") return location.pathname.startsWith("/tools");
    if (key === "account") return location.pathname.startsWith("/account");
    return false;
  };

  const handleTabClick = (tab: typeof tabs[0], e: React.MouseEvent) => {
    e.preventDefault();
    navigate(tab.href);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                {active && (
                  prefersReducedMotion ? (
                    <div className="absolute -top-1.5 w-5 h-[3px] rounded-full bg-primary" />
                  ) : (
                    <motion.div
                      layoutId="bottomnav-pill"
                      className="absolute -top-1.5 w-5 h-[3px] rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )
                )}
                <div className={`relative p-1 rounded-xl transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <tab.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
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
