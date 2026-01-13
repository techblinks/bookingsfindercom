import ModernSearchBox from "@/components/search/ModernSearchBox";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHeroSearch from "@/components/search/MobileHeroSearch";

interface HeroSectionProps {
  showFlights?: boolean;
  showHotels?: boolean;
}

const HeroSection = ({ showFlights = true, showHotels = true }: HeroSectionProps) => {
  const isMobile = useIsMobile();

  return (
    <section className="relative bg-primary py-16 md:py-24 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container relative">
        {/* Hero Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 tracking-tight">
            Search cheap flight tickets
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Compare prices from hundreds of airlines and travel sites
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl p-4 md:p-6 shadow-2xl">
            {isMobile ? (
              <MobileHeroSearch showFlights={showFlights} showHotels={showHotels} />
            ) : (
              <ModernSearchBox showFlights={showFlights} showHotels={showHotels} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
