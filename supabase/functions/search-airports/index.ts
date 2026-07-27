import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateQuery, validateRequest, ValidationError } from "../_shared/validation.ts";

// Comprehensive airport database with major international airports
const airports = [
  // Asia
  { code: "KTM", city: "Kathmandu", country: "Nepal", name: "Tribhuvan International Airport" },
  { code: "DEL", city: "New Delhi", country: "India", name: "Indira Gandhi International Airport" },
  { code: "BOM", city: "Mumbai", country: "India", name: "Chhatrapati Shivaji Maharaj International Airport" },
  { code: "BLR", city: "Bangalore", country: "India", name: "Kempegowda International Airport" },
  { code: "MAA", city: "Chennai", country: "India", name: "Chennai International Airport" },
  { code: "CCU", city: "Kolkata", country: "India", name: "Netaji Subhas Chandra Bose International Airport" },
  { code: "HYD", city: "Hyderabad", country: "India", name: "Rajiv Gandhi International Airport" },
  { code: "DAC", city: "Dhaka", country: "Bangladesh", name: "Hazrat Shahjalal International Airport" },
  { code: "CMB", city: "Colombo", country: "Sri Lanka", name: "Bandaranaike International Airport" },
  { code: "ISB", city: "Islamabad", country: "Pakistan", name: "Islamabad International Airport" },
  { code: "KHI", city: "Karachi", country: "Pakistan", name: "Jinnah International Airport" },
  { code: "LHE", city: "Lahore", country: "Pakistan", name: "Allama Iqbal International Airport" },
  { code: "BKK", city: "Bangkok", country: "Thailand", name: "Suvarnabhumi Airport" },
  { code: "DMK", city: "Bangkok", country: "Thailand", name: "Don Mueang International Airport" },
  { code: "SIN", city: "Singapore", country: "Singapore", name: "Changi Airport" },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", name: "Kuala Lumpur International Airport" },
  { code: "CGK", city: "Jakarta", country: "Indonesia", name: "Soekarno-Hatta International Airport" },
  { code: "DPS", city: "Bali", country: "Indonesia", name: "Ngurah Rai International Airport" },
  { code: "MNL", city: "Manila", country: "Philippines", name: "Ninoy Aquino International Airport" },
  { code: "SGN", city: "Ho Chi Minh City", country: "Vietnam", name: "Tan Son Nhat International Airport" },
  { code: "HAN", city: "Hanoi", country: "Vietnam", name: "Noi Bai International Airport" },
  { code: "HKG", city: "Hong Kong", country: "Hong Kong", name: "Hong Kong International Airport" },
  { code: "TPE", city: "Taipei", country: "Taiwan", name: "Taiwan Taoyuan International Airport" },
  { code: "ICN", city: "Seoul", country: "South Korea", name: "Incheon International Airport" },
  { code: "GMP", city: "Seoul", country: "South Korea", name: "Gimpo International Airport" },
  { code: "NRT", city: "Tokyo", country: "Japan", name: "Narita International Airport" },
  { code: "HND", city: "Tokyo", country: "Japan", name: "Haneda Airport" },
  { code: "KIX", city: "Osaka", country: "Japan", name: "Kansai International Airport" },
  { code: "PEK", city: "Beijing", country: "China", name: "Beijing Capital International Airport" },
  { code: "PKX", city: "Beijing", country: "China", name: "Beijing Daxing International Airport" },
  { code: "PVG", city: "Shanghai", country: "China", name: "Shanghai Pudong International Airport" },
  { code: "SHA", city: "Shanghai", country: "China", name: "Shanghai Hongqiao International Airport" },
  { code: "CAN", city: "Guangzhou", country: "China", name: "Guangzhou Baiyun International Airport" },
  { code: "SZX", city: "Shenzhen", country: "China", name: "Shenzhen Bao'an International Airport" },
  { code: "MLE", city: "Male", country: "Maldives", name: "Velana International Airport" },

  // Middle East
  { code: "DXB", city: "Dubai", country: "UAE", name: "Dubai International Airport" },
  { code: "AUH", city: "Abu Dhabi", country: "UAE", name: "Abu Dhabi International Airport" },
  { code: "DOH", city: "Doha", country: "Qatar", name: "Hamad International Airport" },
  { code: "BAH", city: "Bahrain", country: "Bahrain", name: "Bahrain International Airport" },
  { code: "MCT", city: "Muscat", country: "Oman", name: "Muscat International Airport" },
  { code: "KWI", city: "Kuwait City", country: "Kuwait", name: "Kuwait International Airport" },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia", name: "King Khalid International Airport" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", name: "King Abdulaziz International Airport" },
  { code: "TLV", city: "Tel Aviv", country: "Israel", name: "Ben Gurion Airport" },
  { code: "AMM", city: "Amman", country: "Jordan", name: "Queen Alia International Airport" },
  { code: "BEY", city: "Beirut", country: "Lebanon", name: "Beirut–Rafic Hariri International Airport" },
  { code: "IST", city: "Istanbul", country: "Turkey", name: "Istanbul Airport" },
  { code: "SAW", city: "Istanbul", country: "Turkey", name: "Sabiha Gökçen International Airport" },

  // Oceania
  { code: "SYD", city: "Sydney", country: "Australia", name: "Sydney Kingsford Smith Airport" },
  { code: "MEL", city: "Melbourne", country: "Australia", name: "Melbourne Airport" },
  { code: "BNE", city: "Brisbane", country: "Australia", name: "Brisbane Airport" },
  { code: "PER", city: "Perth", country: "Australia", name: "Perth Airport" },
  { code: "ADL", city: "Adelaide", country: "Australia", name: "Adelaide Airport" },
  { code: "AKL", city: "Auckland", country: "New Zealand", name: "Auckland Airport" },
  { code: "CHC", city: "Christchurch", country: "New Zealand", name: "Christchurch International Airport" },
  { code: "WLG", city: "Wellington", country: "New Zealand", name: "Wellington International Airport" },
  { code: "NAN", city: "Nadi", country: "Fiji", name: "Nadi International Airport" },

  // Europe
  { code: "LHR", city: "London", country: "UK", name: "Heathrow Airport" },
  { code: "LGW", city: "London", country: "UK", name: "Gatwick Airport" },
  { code: "STN", city: "London", country: "UK", name: "Stansted Airport" },
  { code: "LTN", city: "London", country: "UK", name: "Luton Airport" },
  { code: "MAN", city: "Manchester", country: "UK", name: "Manchester Airport" },
  { code: "EDI", city: "Edinburgh", country: "UK", name: "Edinburgh Airport" },
  { code: "CDG", city: "Paris", country: "France", name: "Charles de Gaulle Airport" },
  { code: "ORY", city: "Paris", country: "France", name: "Orly Airport" },
  { code: "NCE", city: "Nice", country: "France", name: "Nice Côte d'Azur Airport" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands", name: "Amsterdam Schiphol Airport" },
  { code: "FRA", city: "Frankfurt", country: "Germany", name: "Frankfurt Airport" },
  { code: "MUC", city: "Munich", country: "Germany", name: "Munich Airport" },
  { code: "BER", city: "Berlin", country: "Germany", name: "Berlin Brandenburg Airport" },
  { code: "ZRH", city: "Zurich", country: "Switzerland", name: "Zurich Airport" },
  { code: "GVA", city: "Geneva", country: "Switzerland", name: "Geneva Airport" },
  { code: "VIE", city: "Vienna", country: "Austria", name: "Vienna International Airport" },
  { code: "PRG", city: "Prague", country: "Czech Republic", name: "Václav Havel Airport Prague" },
  { code: "WAW", city: "Warsaw", country: "Poland", name: "Warsaw Chopin Airport" },
  { code: "BUD", city: "Budapest", country: "Hungary", name: "Budapest Ferenc Liszt International Airport" },
  { code: "FCO", city: "Rome", country: "Italy", name: "Leonardo da Vinci–Fiumicino Airport" },
  { code: "MXP", city: "Milan", country: "Italy", name: "Milan Malpensa Airport" },
  { code: "VCE", city: "Venice", country: "Italy", name: "Venice Marco Polo Airport" },
  { code: "MAD", city: "Madrid", country: "Spain", name: "Adolfo Suárez Madrid–Barajas Airport" },
  { code: "BCN", city: "Barcelona", country: "Spain", name: "Barcelona–El Prat Airport" },
  { code: "LIS", city: "Lisbon", country: "Portugal", name: "Lisbon Humberto Delgado Airport" },
  { code: "OPO", city: "Porto", country: "Portugal", name: "Francisco Sá Carneiro Airport" },
  { code: "ATH", city: "Athens", country: "Greece", name: "Athens International Airport" },
  { code: "CPH", city: "Copenhagen", country: "Denmark", name: "Copenhagen Airport" },
  { code: "OSL", city: "Oslo", country: "Norway", name: "Oslo Gardermoen Airport" },
  { code: "ARN", city: "Stockholm", country: "Sweden", name: "Stockholm Arlanda Airport" },
  { code: "HEL", city: "Helsinki", country: "Finland", name: "Helsinki-Vantaa Airport" },
  { code: "DUB", city: "Dublin", country: "Ireland", name: "Dublin Airport" },
  { code: "BRU", city: "Brussels", country: "Belgium", name: "Brussels Airport" },
  { code: "SVO", city: "Moscow", country: "Russia", name: "Sheremetyevo International Airport" },
  { code: "DME", city: "Moscow", country: "Russia", name: "Domodedovo International Airport" },
  { code: "LED", city: "Saint Petersburg", country: "Russia", name: "Pulkovo Airport" },

  // North America
  { code: "JFK", city: "New York", country: "USA", name: "John F. Kennedy International Airport" },
  { code: "LGA", city: "New York", country: "USA", name: "LaGuardia Airport" },
  { code: "EWR", city: "Newark", country: "USA", name: "Newark Liberty International Airport" },
  { code: "LAX", city: "Los Angeles", country: "USA", name: "Los Angeles International Airport" },
  { code: "SFO", city: "San Francisco", country: "USA", name: "San Francisco International Airport" },
  { code: "ORD", city: "Chicago", country: "USA", name: "O'Hare International Airport" },
  { code: "MDW", city: "Chicago", country: "USA", name: "Midway International Airport" },
  { code: "ATL", city: "Atlanta", country: "USA", name: "Hartsfield-Jackson Atlanta International Airport" },
  { code: "DFW", city: "Dallas", country: "USA", name: "Dallas/Fort Worth International Airport" },
  { code: "DEN", city: "Denver", country: "USA", name: "Denver International Airport" },
  { code: "SEA", city: "Seattle", country: "USA", name: "Seattle-Tacoma International Airport" },
  { code: "MIA", city: "Miami", country: "USA", name: "Miami International Airport" },
  { code: "BOS", city: "Boston", country: "USA", name: "Boston Logan International Airport" },
  { code: "IAD", city: "Washington", country: "USA", name: "Washington Dulles International Airport" },
  { code: "DCA", city: "Washington", country: "USA", name: "Ronald Reagan Washington National Airport" },
  { code: "PHX", city: "Phoenix", country: "USA", name: "Phoenix Sky Harbor International Airport" },
  { code: "LAS", city: "Las Vegas", country: "USA", name: "Harry Reid International Airport" },
  { code: "MCO", city: "Orlando", country: "USA", name: "Orlando International Airport" },
  { code: "HNL", city: "Honolulu", country: "USA", name: "Daniel K. Inouye International Airport" },
  { code: "YYZ", city: "Toronto", country: "Canada", name: "Toronto Pearson International Airport" },
  { code: "YVR", city: "Vancouver", country: "Canada", name: "Vancouver International Airport" },
  { code: "YUL", city: "Montreal", country: "Canada", name: "Montréal–Pierre Elliott Trudeau International Airport" },
  { code: "YYC", city: "Calgary", country: "Canada", name: "Calgary International Airport" },
  { code: "MEX", city: "Mexico City", country: "Mexico", name: "Benito Juárez International Airport" },
  { code: "CUN", city: "Cancun", country: "Mexico", name: "Cancún International Airport" },

  // South America
  { code: "GRU", city: "São Paulo", country: "Brazil", name: "São Paulo–Guarulhos International Airport" },
  { code: "GIG", city: "Rio de Janeiro", country: "Brazil", name: "Rio de Janeiro–Galeão International Airport" },
  { code: "EZE", city: "Buenos Aires", country: "Argentina", name: "Ministro Pistarini International Airport" },
  { code: "SCL", city: "Santiago", country: "Chile", name: "Arturo Merino Benítez International Airport" },
  { code: "LIM", city: "Lima", country: "Peru", name: "Jorge Chávez International Airport" },
  { code: "BOG", city: "Bogota", country: "Colombia", name: "El Dorado International Airport" },
  { code: "UIO", city: "Quito", country: "Ecuador", name: "Mariscal Sucre International Airport" },
  { code: "CCS", city: "Caracas", country: "Venezuela", name: "Simón Bolívar International Airport" },

  // Africa
  { code: "JNB", city: "Johannesburg", country: "South Africa", name: "O. R. Tambo International Airport" },
  { code: "CPT", city: "Cape Town", country: "South Africa", name: "Cape Town International Airport" },
  { code: "CAI", city: "Cairo", country: "Egypt", name: "Cairo International Airport" },
  { code: "NBO", city: "Nairobi", country: "Kenya", name: "Jomo Kenyatta International Airport" },
  { code: "ADD", city: "Addis Ababa", country: "Ethiopia", name: "Bole International Airport" },
  { code: "LOS", city: "Lagos", country: "Nigeria", name: "Murtala Muhammed International Airport" },
  { code: "CMN", city: "Casablanca", country: "Morocco", name: "Mohammed V International Airport" },
  { code: "TUN", city: "Tunis", country: "Tunisia", name: "Tunis–Carthage International Airport" },
  { code: "ALG", city: "Algiers", country: "Algeria", name: "Houari Boumediene Airport" },
  { code: "MRU", city: "Mauritius", country: "Mauritius", name: "Sir Seewoosagur Ramgoolam International Airport" },
];

// Query validation schema — used for both GET query params and POST body
const AirportSearchSchema = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().min(1).max(20).default(8),
});

// Fuzzy matching function using Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
  }
  return dp[m][n];
}

// Calculate similarity score (0-1, higher is better)
function getSimilarityScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (t === q) return 1;

  // Starts with query (high priority)
  if (t.startsWith(q)) return 0.9;

  // Contains query
  if (t.includes(q)) return 0.7;

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(q, t.substring(0, Math.min(t.length, q.length + 2)));
  const maxLen = Math.max(q.length, t.length);
  const similarity = 1 - distance / maxLen;

  return Math.max(0, similarity * 0.5); // Scale down fuzzy matches
}

function searchAirports(query: string, limit = 8): typeof airports {
  if (!query || query.length < 1) return [];

  const q = query.toLowerCase().trim();

  // Score each airport
  const scored = airports.map((airport) => {
    const codeScore = getSimilarityScore(q, airport.code);
    const cityScore = getSimilarityScore(q, airport.city);
    const countryScore = getSimilarityScore(q, airport.country) * 0.5;
    const nameScore = getSimilarityScore(q, airport.name) * 0.3;

    const bestScore = Math.max(codeScore, cityScore, countryScore, nameScore);

    return { airport, score: bestScore };
  });

  // Filter and sort by score
  return scored
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.airport);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    let q = "";
    let limit = 8;

    // Support both GET (query params) and POST (JSON body)
    if (req.method === "POST" || req.method === "PUT") {
      const params = await validateRequest(req, AirportSearchSchema);
      q = params.q;
      limit = params.limit;
    } else {
      const url = new URL(req.url);
      const params = validateQuery(url, AirportSearchSchema);
      q = params.q;
      limit = params.limit;
    }

    const results = searchAirports(q, limit);

    return jsonResponse(results);
  } catch (error) {
    console.error("Airport search error:", error);

    if (error instanceof ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }

    return errorResponse("Search failed", 500);
  }
});
