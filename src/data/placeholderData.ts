// Placeholder data for the travel website
// Ready for API injection - replace these with API calls

export interface Destination {
  id: string;
  city: string;
  country: string;
  image: string;
  price: number;
  currency: string;
}

export interface Flight {
  id: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  isDeal: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  image: string;
  location: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency: string;
  amenities: string[];
  isDeal: boolean;
}

// Popular Destinations
export const destinations: Destination[] = [
  {
    id: "dest-1",
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
    price: 299,
    currency: "$",
  },
  {
    id: "dest-2",
    city: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    price: 599,
    currency: "$",
  },
  {
    id: "dest-3",
    city: "New York",
    country: "United States",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80",
    price: 199,
    currency: "$",
  },
  {
    id: "dest-4",
    city: "London",
    country: "United Kingdom",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
    price: 349,
    currency: "$",
  },
  {
    id: "dest-5",
    city: "Dubai",
    country: "United Arab Emirates",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    price: 449,
    currency: "$",
  },
  {
    id: "dest-6",
    city: "Barcelona",
    country: "Spain",
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80",
    price: 279,
    currency: "$",
  },
];

// Sample Flights
export const flights: Flight[] = [
  {
    id: "flight-1",
    airline: "Delta",
    departureTime: "08:30",
    arrivalTime: "11:45",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 15m",
    stops: 0,
    price: 299,
    currency: "$",
    isDeal: true,
  },
  {
    id: "flight-2",
    airline: "United",
    departureTime: "14:20",
    arrivalTime: "18:10",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 50m",
    stops: 1,
    price: 245,
    currency: "$",
    isDeal: false,
  },
  {
    id: "flight-3",
    airline: "American",
    departureTime: "06:00",
    arrivalTime: "09:05",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 05m",
    stops: 0,
    price: 329,
    currency: "$",
    isDeal: false,
  },
];

// Sample Hotels
export const hotels: Hotel[] = [
  {
    id: "hotel-1",
    name: "The Grand Plaza Hotel",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    location: "Downtown Los Angeles, CA",
    rating: 4.8,
    reviewCount: 2341,
    price: 189,
    currency: "$",
    amenities: ["wifi", "parking", "breakfast"],
    isDeal: true,
  },
  {
    id: "hotel-2",
    name: "Oceanview Resort & Spa",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    location: "Santa Monica Beach, CA",
    rating: 4.6,
    reviewCount: 1892,
    price: 245,
    currency: "$",
    amenities: ["wifi", "parking"],
    isDeal: false,
  },
  {
    id: "hotel-3",
    name: "Urban Boutique Suites",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    location: "Hollywood, Los Angeles, CA",
    rating: 4.4,
    reviewCount: 967,
    price: 159,
    currency: "$",
    amenities: ["wifi", "breakfast"],
    isDeal: false,
  },
];

// Deal of the day placeholder
export const dealOfTheDay = {
  title: "Flash Sale: Tokyo & Kyoto",
  description: "7 nights including flights and hotels",
  originalPrice: 1899,
  salePrice: 1299,
  currency: "$",
  expiresIn: "2 days",
  image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80",
};
