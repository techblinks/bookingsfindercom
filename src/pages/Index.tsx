import { useIsMobile } from "@/hooks/use-mobile";
import DesktopHome from "@/pages/home/DesktopHome";
import MobileHome from "@/pages/home/MobileHome";

/**
 * Adaptive Home host — switches between DesktopHome and MobileHome
 * based on viewport width (< 768px = mobile).
 */
const Index = () => {
  const isMobile = useIsMobile();

  if (isMobile) return <MobileHome />;
  return <DesktopHome />;
};

export default Index;
