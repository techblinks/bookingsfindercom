import { useState } from "react";
import { Plane, Building2, Calendar, Users, Search, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LocationCombobox from "@/components/search/LocationCombobox";

interface EmbeddedSearchFormProps {
  type: "flights" | "hotels";
  defaultOrigin?: string;
  defaultDestination?: string;
}

const EmbeddedSearchForm = ({
  type,
  defaultOrigin = "",
  defaultDestination = "",
}: EmbeddedSearchFormProps) => {
  const [origin, setOrigin] = useState(defaultOrigin);
  const [originDisplay, setOriginDisplay] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [destinationDisplay, setDestinationDisplay] = useState(defaultDestination);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search submitted:", { type, origin, destination, checkIn, checkOut, guests });
    // TODO: Navigate to search results
  };

  const swapLocations = () => {
    const tempCode = origin;
    const tempDisplay = originDisplay;
    setOrigin(destination);
    setOriginDisplay(destinationDisplay);
    setDestination(tempCode);
    setDestinationDisplay(tempDisplay);
  };

  return (
    <section className="mb-12" aria-labelledby="search-heading">
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          {type === "flights" ? (
            <Plane className="h-6 w-6 text-primary" />
          ) : (
            <Building2 className="h-6 w-6 text-primary" />
          )}
          <h2 id="search-heading" className="text-xl font-bold text-foreground">
            {type === "flights" ? "Search Flights" : "Search Hotels"}
          </h2>
        </div>

        <form onSubmit={handleSearch} role="search" aria-label={`${type} search form`}>
          {type === "flights" ? (
            // Flight Search Form
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative md:col-span-2 lg:col-span-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="origin" className="block text-sm font-medium text-foreground mb-1.5">
                        From
                      </label>
                      <LocationCombobox
                        id="origin"
                        value={originDisplay}
                        onChange={(code, airport) => {
                          setOrigin(code);
                          setOriginDisplay(airport ? `${airport.city} (${airport.code})` : code);
                        }}
                        placeholder="City or airport"
                        className="bg-background h-10"
                      />
                    </div>
                    <div className="relative">
                      <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-1.5">
                        To
                      </label>
                      <LocationCombobox
                        id="destination"
                        value={destinationDisplay}
                        onChange={(code, airport) => {
                          setDestination(code);
                          setDestinationDisplay(airport ? `${airport.city} (${airport.code})` : code);
                        }}
                        placeholder="City or airport"
                        className="bg-background h-10"
                      />
                      <button
                        type="button"
                        onClick={swapLocations}
                        className="absolute left-0 top-1/2 -translate-x-1/2 translate-y-1 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-secondary transition-colors z-10"
                        aria-label="Swap origin and destination"
                      >
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="depart" className="block text-sm font-medium text-foreground mb-1.5">
                    Depart
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="depart"
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="bg-background pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="return" className="block text-sm font-medium text-foreground mb-1.5">
                    Return
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="return"
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-background pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full sm:w-48">
                  <label htmlFor="passengers" className="block text-sm font-medium text-foreground mb-1.5">
                    Passengers
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      id="passengers"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground text-sm"
                    >
                      <option value="1">1 Passenger</option>
                      <option value="2">2 Passengers</option>
                      <option value="3">3 Passengers</option>
                      <option value="4">4 Passengers</option>
                      <option value="5">5+ Passengers</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto gap-2">
                  <Search className="h-4 w-4" />
                  Search Flights
                </Button>
              </div>
            </div>
          ) : (
            // Hotel Search Form
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="md:col-span-2 lg:col-span-1">
                  <label htmlFor="hotel-destination" className="block text-sm font-medium text-foreground mb-1.5">
                    Destination
                  </label>
                  <Input
                    id="hotel-destination"
                    type="text"
                    placeholder="City or hotel name"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label htmlFor="check-in" className="block text-sm font-medium text-foreground mb-1.5">
                    Check-in
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="check-in"
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="bg-background pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="check-out" className="block text-sm font-medium text-foreground mb-1.5">
                    Check-out
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="check-out"
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-background pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="hotel-guests" className="block text-sm font-medium text-foreground mb-1.5">
                    Guests
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      id="hotel-guests"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground text-sm"
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests</option>
                      <option value="5">5+ Guests</option>
                    </select>
                  </div>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full sm:w-auto gap-2">
                <Search className="h-4 w-4" />
                Search Hotels
              </Button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
};

export default EmbeddedSearchForm;
