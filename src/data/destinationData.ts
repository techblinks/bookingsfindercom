// Placeholder data for destination pages
// Ready for API injection - replace with CMS or API calls

export interface FAQ {
  question: string;
  answer: string;
}

export interface DestinationPageData {
  type: "flights" | "hotels";
  slug: string;
  origin?: string;
  destination: string;
  title: string;
  metaDescription: string;
  introText: string;
  cheapestMonths: MonthPrice[];
  popularProviders: Provider[];
  travelTips: TravelTip[];
  faqs: FAQ[];
}

export interface MonthPrice {
  month: string;
  avgPrice: number;
  currency: string;
  trend: "low" | "medium" | "high";
}

export interface Provider {
  id: string;
  name: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  currency: string;
}

export interface TravelTip {
  title: string;
  content: string;
  icon: string;
}

// Flight route: Sydney to Kathmandu
export const flightDestinationData: DestinationPageData = {
  type: "flights",
  slug: "flights-sydney-to-kathmandu",
  origin: "Sydney",
  destination: "Kathmandu",
  title: "Cheap Flights from Sydney to Kathmandu",
  metaDescription: "Find the best deals on flights from Sydney (SYD) to Kathmandu (KTM). Compare prices from top airlines and book your trip to Nepal today.",
  introText: `Looking for affordable flights from Sydney to Kathmandu? You've come to the right place. 
  
The journey from Sydney, Australia to Kathmandu, Nepal typically covers approximately 8,500 kilometers and takes around 12-15 hours depending on your chosen route and layovers. 

Kathmandu, the capital of Nepal, is a gateway to the Himalayas and offers travelers an unforgettable blend of ancient temples, vibrant markets, and stunning mountain views. Whether you're planning a trekking adventure to Everest Base Camp or exploring the UNESCO World Heritage sites in the Kathmandu Valley, finding the right flight is your first step.

Most flights from Sydney to Kathmandu include one stopover, commonly in cities like Singapore, Bangkok, Kuala Lumpur, or Delhi. Direct flights are not currently available, but many travelers find that a brief layover provides a welcome break on this long-haul journey.`,
  cheapestMonths: [
    { month: "January", avgPrice: 899, currency: "$", trend: "low" },
    { month: "February", avgPrice: 945, currency: "$", trend: "low" },
    { month: "March", avgPrice: 1050, currency: "$", trend: "medium" },
    { month: "April", avgPrice: 1120, currency: "$", trend: "medium" },
    { month: "May", avgPrice: 875, currency: "$", trend: "low" },
    { month: "June", avgPrice: 820, currency: "$", trend: "low" },
    { month: "July", avgPrice: 950, currency: "$", trend: "medium" },
    { month: "August", avgPrice: 1025, currency: "$", trend: "medium" },
    { month: "September", avgPrice: 1180, currency: "$", trend: "high" },
    { month: "October", avgPrice: 1250, currency: "$", trend: "high" },
    { month: "November", avgPrice: 1100, currency: "$", trend: "medium" },
    { month: "December", avgPrice: 1350, currency: "$", trend: "high" },
  ],
  popularProviders: [
    { id: "singapore-airlines", name: "Singapore Airlines", rating: 4.8, reviewCount: 15420, priceFrom: 849, currency: "$" },
    { id: "thai-airways", name: "Thai Airways", rating: 4.5, reviewCount: 8932, priceFrom: 799, currency: "$" },
    { id: "malaysia-airlines", name: "Malaysia Airlines", rating: 4.3, reviewCount: 6541, priceFrom: 825, currency: "$" },
    { id: "cathay-pacific", name: "Cathay Pacific", rating: 4.6, reviewCount: 12305, priceFrom: 895, currency: "$" },
    { id: "qantas", name: "Qantas", rating: 4.4, reviewCount: 18762, priceFrom: 920, currency: "$" },
  ],
  travelTips: [
    {
      title: "Best Time to Visit",
      content: "The best time to visit Nepal is during the autumn (September-November) and spring (March-May) seasons when the weather is clear and perfect for trekking. However, these are also peak seasons with higher flight prices.",
      icon: "calendar",
    },
    {
      title: "Visa Requirements",
      content: "Australian citizens need a visa to enter Nepal. You can obtain a visa on arrival at Tribhuvan International Airport in Kathmandu. Ensure your passport is valid for at least 6 months.",
      icon: "passport",
    },
    {
      title: "Luggage Tips",
      content: "If you're planning to trek, pack light but include layers for varying altitudes. Most airlines allow 23-30kg checked baggage for international flights to Nepal.",
      icon: "luggage",
    },
    {
      title: "Airport Transfer",
      content: "Tribhuvan International Airport is about 6km from central Kathmandu. Pre-book airport transfers through your hotel or use the official taxi counter to avoid overcharging.",
      icon: "car",
    },
  ],
  faqs: [
    {
      question: "How long is the flight from Sydney to Kathmandu?",
      answer: "The total flight time from Sydney to Kathmandu is approximately 12-15 hours, including one stopover. Direct flights are not currently available, with most routes connecting through Singapore, Bangkok, Kuala Lumpur, or Delhi."
    },
    {
      question: "What is the cheapest month to fly from Sydney to Kathmandu?",
      answer: "June is typically the cheapest month to fly from Sydney to Kathmandu, with average prices around $820. May and January also offer good value. Avoid September-October and December for the lowest fares as these are peak trekking and holiday seasons."
    },
    {
      question: "Which airlines fly from Sydney to Kathmandu?",
      answer: "Popular airlines for the Sydney to Kathmandu route include Singapore Airlines (via Singapore), Thai Airways (via Bangkok), Malaysia Airlines (via Kuala Lumpur), Cathay Pacific (via Hong Kong), and Qantas with partner connections."
    },
    {
      question: "Do I need a visa to fly from Australia to Nepal?",
      answer: "Yes, Australian citizens require a visa to enter Nepal. You can obtain a tourist visa on arrival at Tribhuvan International Airport in Kathmandu. Ensure your passport is valid for at least 6 months beyond your travel date and bring passport-sized photos."
    },
    {
      question: "What is the baggage allowance for flights to Kathmandu?",
      answer: "Most international airlines on the Sydney to Kathmandu route allow 23-30kg checked baggage and 7kg carry-on luggage. If you're planning to trek, consider packing light as domestic flights within Nepal have stricter weight limits of 15-20kg."
    }
  ],
};

// Hotel destination: Sydney
export const hotelDestinationData: DestinationPageData = {
  type: "hotels",
  slug: "hotels-in-sydney",
  destination: "Sydney",
  title: "Best Hotels in Sydney, Australia",
  metaDescription: "Discover the best hotels in Sydney. From luxury harborfront resorts to budget-friendly stays, find and book your perfect Sydney accommodation.",
  introText: `Planning a trip to Sydney? Finding the perfect hotel is essential for an unforgettable Australian adventure.

Sydney, Australia's most iconic city, offers accommodation options for every traveler and budget. From world-famous luxury hotels with stunning Opera House views to charming boutique stays in historic neighborhoods like The Rocks and Surry Hills, you'll find the perfect base for exploring this magnificent harbor city.

The city's diverse neighborhoods each offer unique experiences. Stay in the CBD for easy access to shopping and dining, choose Darling Harbour for family-friendly attractions, or opt for Bondi Beach if sun and surf are your priorities. Business travelers often prefer the North Sydney area for its proximity to corporate offices.

Most Sydney hotels offer modern amenities including free WiFi, fitness centers, and on-site dining. Many properties in the harbor area feature rooftop pools with spectacular views of the Sydney Harbour Bridge and Opera House.`,
  cheapestMonths: [
    { month: "January", avgPrice: 285, currency: "$", trend: "high" },
    { month: "February", avgPrice: 265, currency: "$", trend: "medium" },
    { month: "March", avgPrice: 245, currency: "$", trend: "medium" },
    { month: "April", avgPrice: 225, currency: "$", trend: "low" },
    { month: "May", avgPrice: 195, currency: "$", trend: "low" },
    { month: "June", avgPrice: 185, currency: "$", trend: "low" },
    { month: "July", avgPrice: 199, currency: "$", trend: "low" },
    { month: "August", avgPrice: 210, currency: "$", trend: "low" },
    { month: "September", avgPrice: 235, currency: "$", trend: "medium" },
    { month: "October", avgPrice: 255, currency: "$", trend: "medium" },
    { month: "November", avgPrice: 275, currency: "$", trend: "medium" },
    { month: "December", avgPrice: 310, currency: "$", trend: "high" },
  ],
  popularProviders: [
    { id: "park-hyatt", name: "Park Hyatt Sydney", rating: 4.9, reviewCount: 4521, priceFrom: 750, currency: "$" },
    { id: "four-seasons", name: "Four Seasons Hotel Sydney", rating: 4.8, reviewCount: 3892, priceFrom: 650, currency: "$" },
    { id: "shangri-la", name: "Shangri-La Sydney", rating: 4.7, reviewCount: 5123, priceFrom: 420, currency: "$" },
    { id: "qvb-intercontinental", name: "InterContinental Sydney", rating: 4.6, reviewCount: 6721, priceFrom: 350, currency: "$" },
    { id: "ovolo-woolloomooloo", name: "Ovolo Woolloomooloo", rating: 4.5, reviewCount: 2341, priceFrom: 280, currency: "$" },
  ],
  travelTips: [
    {
      title: "Best Areas to Stay",
      content: "The CBD and Circular Quay offer the best access to attractions. Darling Harbour is great for families, while Surry Hills and Paddington suit those seeking trendy cafes and boutiques.",
      icon: "map",
    },
    {
      title: "Booking Tips",
      content: "Book early for peak season (December-February) and major events like Vivid Sydney (May-June) or New Year's Eve. Midweek stays are often cheaper than weekends.",
      icon: "calendar",
    },
    {
      title: "Getting Around",
      content: "Sydney has excellent public transport. Get an Opal card for trains, buses, and ferries. Many central hotels are within walking distance of major attractions.",
      icon: "train",
    },
    {
      title: "Hidden Gems",
      content: "Consider staying in neighborhoods like Manly (accessible by ferry) or Newtown for a more local experience at lower prices than CBD hotels.",
      icon: "sparkles",
    },
  ],
  faqs: [
    {
      question: "What is the best area to stay in Sydney for tourists?",
      answer: "The CBD and Circular Quay are ideal for first-time visitors, offering easy access to the Opera House, Harbour Bridge, and The Rocks. Darling Harbour suits families, while Bondi Beach is perfect for beach lovers. Budget travelers should consider Surry Hills or Newtown for affordable options with great dining."
    },
    {
      question: "How much does a hotel in Sydney cost per night?",
      answer: "Sydney hotel prices vary by season and location. Budget hotels start around $120-180 per night, mid-range options are $200-350, and luxury harbourfront hotels range from $400-800+. Winter months (June-August) offer the best rates, while summer (December-February) is peak season with higher prices."
    },
    {
      question: "When is the cheapest time to book hotels in Sydney?",
      answer: "The cheapest time to stay in Sydney is during the winter months from May to August, when average hotel rates drop by 30-40%. Avoid booking during New Year's Eve, Vivid Sydney (May-June), and major events for the best deals. Book 2-3 months ahead for optimal pricing."
    },
    {
      question: "Do Sydney hotels include breakfast?",
      answer: "Many Sydney hotels offer breakfast options, but it's not always included in the room rate. Luxury hotels typically charge $30-50 for breakfast buffets. For better value, consider booking 'bed and breakfast' packages or explore the excellent café scene in surrounding neighborhoods."
    },
    {
      question: "Is it better to stay in Sydney CBD or near Bondi Beach?",
      answer: "It depends on your priorities. The CBD offers proximity to major attractions, restaurants, and public transport, ideal for sightseeing. Bondi Beach suits those seeking a relaxed beach vibe with surfing, coastal walks, and beachfront cafés. Bondi is 30 minutes from the CBD by bus or train."
    }
  ],
};

// Function to get destination data by slug (ready for API replacement)
export const getDestinationBySlug = (slug: string): DestinationPageData | null => {
  const destinations: Record<string, DestinationPageData> = {
    "flights-sydney-to-kathmandu": flightDestinationData,
    "hotels-in-sydney": hotelDestinationData,
  };
  return destinations[slug] || null;
};
