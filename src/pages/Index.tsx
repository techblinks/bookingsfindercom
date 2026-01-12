import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SearchBox from "@/components/search/SearchBox";
import FlightCard from "@/components/cards/FlightCard";
import HotelCard from "@/components/cards/HotelCard";

const Index = () => {
  // Sample flight data
  const flights = [
    {
      airline: "Delta",
      departureTime: "08:30",
      arrivalTime: "11:45",
      departureAirport: "JFK",
      arrivalAirport: "LAX",
      duration: "5h 15m",
      stops: 0,
      price: 299,
      isDeal: true,
    },
    {
      airline: "United",
      departureTime: "14:20",
      arrivalTime: "18:10",
      departureAirport: "JFK",
      arrivalAirport: "LAX",
      duration: "5h 50m",
      stops: 1,
      price: 245,
    },
    {
      airline: "American",
      departureTime: "06:00",
      arrivalTime: "09:05",
      departureAirport: "JFK",
      arrivalAirport: "LAX",
      duration: "5h 05m",
      stops: 0,
      price: 329,
    },
  ];

  // Sample hotel data
  const hotels = [
    {
      name: "The Grand Plaza Hotel",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      location: "Downtown Los Angeles, CA",
      rating: 4.8,
      reviewCount: 2341,
      price: 189,
      amenities: ["wifi", "parking", "breakfast"],
      isDeal: true,
    },
    {
      name: "Oceanview Resort & Spa",
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
      location: "Santa Monica Beach, CA",
      rating: 4.6,
      reviewCount: 1892,
      price: 245,
      amenities: ["wifi", "parking"],
    },
    {
      name: "Urban Boutique Suites",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
      location: "Hollywood, Los Angeles, CA",
      rating: 4.4,
      reviewCount: 967,
      price: 159,
      amenities: ["wifi", "breakfast"],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container">
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Find your next adventure
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Search hundreds of airlines, hotels, and car rentals to find the best deals for your trip.
              </p>
            </div>

            <SearchBox />
          </div>
        </section>

        {/* Popular Flights Section */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Popular Flights</h2>
              <a href="#" className="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            </div>

            <div className="space-y-4">
              {flights.map((flight, index) => (
                <FlightCard key={index} {...flight} />
              ))}
            </div>
          </div>
        </section>

        {/* Featured Hotels Section */}
        <section className="py-12 md:py-16 bg-secondary/50">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Featured Hotels</h2>
              <a href="#" className="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map((hotel, index) => (
                <HotelCard key={index} {...hotel} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-6">
                <p className="text-3xl font-bold text-primary mb-2">500+</p>
                <p className="text-sm text-muted-foreground">Airlines</p>
              </div>
              <div className="p-6">
                <p className="text-3xl font-bold text-primary mb-2">1M+</p>
                <p className="text-sm text-muted-foreground">Hotels</p>
              </div>
              <div className="p-6">
                <p className="text-3xl font-bold text-primary mb-2">50M+</p>
                <p className="text-sm text-muted-foreground">Happy Travelers</p>
              </div>
              <div className="p-6">
                <p className="text-3xl font-bold text-primary mb-2">24/7</p>
                <p className="text-sm text-muted-foreground">Customer Support</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
