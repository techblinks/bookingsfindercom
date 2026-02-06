import { Home, Plane, Building2, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Flights", href: "/flights", icon: Plane },
  { label: "Hotels", href: "/hotels", icon: Building2 },
  { label: "Account", href: "/account", icon: User },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/40 lg:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.href}
            end={tab.href === "/"}
            className="flex flex-col items-center justify-center flex-1 gap-0.5 text-muted-foreground transition-colors native-touch"
            activeClassName="text-primary"
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
