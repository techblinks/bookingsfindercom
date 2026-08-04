/**
 * Hotel destination data for autocomplete.
 *
 * Each entry maps a canonical destination label to the value expected
 * by the search-hotels Edge Function (which passes it through to Hotellook).
 *
 * The `value` field is what gets passed to searchHotels as `destination`.
 * The `label` is what the user sees and selects.
 */

export interface HotelDestination {
  /** Canonical city/region name shown to the user (e.g. "Sydney, New South Wales, Australia") */
  label: string;
  /** Value passed to the search-hotels edge function */
  value: string;
  /** Country for grouping/filtering */
  country: string;
  /** Optional region/state */
  region?: string;
}

/**
 * Curated list of popular hotel destinations.
 * Covers major cities worldwide. Expand as needed.
 */
const POPULAR_DESTINATIONS: HotelDestination[] = [
  // ── Australia ──
  { label: "Sydney, New South Wales, Australia", value: "Sydney", country: "Australia", region: "New South Wales" },
  { label: "Melbourne, Victoria, Australia", value: "Melbourne", country: "Australia", region: "Victoria" },
  { label: "Brisbane, Queensland, Australia", value: "Brisbane", country: "Australia", region: "Queensland" },
  { label: "Gold Coast, Queensland, Australia", value: "Gold Coast", country: "Australia", region: "Queensland" },
  { label: "Perth, Western Australia, Australia", value: "Perth", country: "Australia", region: "Western Australia" },
  { label: "Adelaide, South Australia, Australia", value: "Adelaide", country: "Australia", region: "South Australia" },
  { label: "Cairns, Queensland, Australia", value: "Cairns", country: "Australia", region: "Queensland" },
  { label: "Hobart, Tasmania, Australia", value: "Hobart", country: "Australia", region: "Tasmania" },
  { label: "Darwin, Northern Territory, Australia", value: "Darwin", country: "Australia", region: "Northern Territory" },
  { label: "Canberra, Australian Capital Territory, Australia", value: "Canberra", country: "Australia", region: "Australian Capital Territory" },

  // ── New Zealand ──
  { label: "Auckland, New Zealand", value: "Auckland", country: "New Zealand" },
  { label: "Queenstown, New Zealand", value: "Queenstown", country: "New Zealand" },
  { label: "Wellington, New Zealand", value: "Wellington", country: "New Zealand" },
  { label: "Christchurch, New Zealand", value: "Christchurch", country: "New Zealand" },

  // ── Asia Pacific ──
  { label: "Bali, Indonesia", value: "Bali", country: "Indonesia" },
  { label: "Jakarta, Indonesia", value: "Jakarta", country: "Indonesia" },
  { label: "Singapore", value: "Singapore", country: "Singapore" },
  { label: "Bangkok, Thailand", value: "Bangkok", country: "Thailand" },
  { label: "Phuket, Thailand", value: "Phuket", country: "Thailand" },
  { label: "Kuala Lumpur, Malaysia", value: "Kuala Lumpur", country: "Malaysia" },
  { label: "Tokyo, Japan", value: "Tokyo", country: "Japan" },
  { label: "Osaka, Japan", value: "Osaka", country: "Japan" },
  { label: "Seoul, South Korea", value: "Seoul", country: "South Korea" },
  { label: "Hong Kong", value: "Hong Kong", country: "Hong Kong" },
  { label: "Taipei, Taiwan", value: "Taipei", country: "Taiwan" },
  { label: "Manila, Philippines", value: "Manila", country: "Philippines" },
  { label: "Ho Chi Minh City, Vietnam", value: "Ho Chi Minh City", country: "Vietnam" },
  { label: "Hanoi, Vietnam", value: "Hanoi", country: "Vietnam" },

  // ── Europe ──
  { label: "London, United Kingdom", value: "London", country: "United Kingdom" },
  { label: "Manchester, United Kingdom", value: "Manchester", country: "United Kingdom" },
  { label: "Edinburgh, United Kingdom", value: "Edinburgh", country: "United Kingdom" },
  { label: "Paris, France", value: "Paris", country: "France" },
  { label: "Nice, France", value: "Nice", country: "France" },
  { label: "Rome, Italy", value: "Rome", country: "Italy" },
  { label: "Milan, Italy", value: "Milan", country: "Italy" },
  { label: "Venice, Italy", value: "Venice", country: "Italy" },
  { label: "Barcelona, Spain", value: "Barcelona", country: "Spain" },
  { label: "Madrid, Spain", value: "Madrid", country: "Spain" },
  { label: "Berlin, Germany", value: "Berlin", country: "Germany" },
  { label: "Munich, Germany", value: "Munich", country: "Germany" },
  { label: "Amsterdam, Netherlands", value: "Amsterdam", country: "Netherlands" },
  { label: "Prague, Czech Republic", value: "Prague", country: "Czech Republic" },
  { label: "Vienna, Austria", value: "Vienna", country: "Austria" },
  { label: "Budapest, Hungary", value: "Budapest", country: "Hungary" },
  { label: "Lisbon, Portugal", value: "Lisbon", country: "Portugal" },
  { label: "Dublin, Ireland", value: "Dublin", country: "Ireland" },
  { label: "Athens, Greece", value: "Athens", country: "Greece" },
  { label: "Istanbul, Turkey", value: "Istanbul", country: "Turkey" },

  // ── North America ──
  { label: "New York, United States", value: "New York", country: "United States" },
  { label: "Los Angeles, United States", value: "Los Angeles", country: "United States" },
  { label: "Las Vegas, United States", value: "Las Vegas", country: "United States" },
  { label: "Miami, United States", value: "Miami", country: "United States" },
  { label: "San Francisco, United States", value: "San Francisco", country: "United States" },
  { label: "Chicago, United States", value: "Chicago", country: "United States" },
  { label: "Orlando, United States", value: "Orlando", country: "United States" },
  { label: "Boston, United States", value: "Boston", country: "United States" },
  { label: "Toronto, Canada", value: "Toronto", country: "Canada" },
  { label: "Vancouver, Canada", value: "Vancouver", country: "Canada" },
  { label: "Montreal, Canada", value: "Montreal", country: "Canada" },
  { label: "Mexico City, Mexico", value: "Mexico City", country: "Mexico" },
  { label: "Cancun, Mexico", value: "Cancun", country: "Mexico" },

  // ── Middle East ──
  { label: "Dubai, United Arab Emirates", value: "Dubai", country: "United Arab Emirates" },
  { label: "Abu Dhabi, United Arab Emirates", value: "Abu Dhabi", country: "United Arab Emirates" },
  { label: "Doha, Qatar", value: "Doha", country: "Qatar" },

  // ── South America ──
  { label: "Buenos Aires, Argentina", value: "Buenos Aires", country: "Argentina" },
  { label: "Rio de Janeiro, Brazil", value: "Rio de Janeiro", country: "Brazil" },
  { label: "Santiago, Chile", value: "Santiago", country: "Chile" },
  { label: "Lima, Peru", value: "Lima", country: "Peru" },

  // ── Africa ──
  { label: "Cape Town, South Africa", value: "Cape Town", country: "South Africa" },
  { label: "Marrakesh, Morocco", value: "Marrakesh", country: "Morocco" },
  { label: "Nairobi, Kenya", value: "Nairobi", country: "Kenya" },
];

/**
 * Search hotel destinations by query string.
 * Matches against city name, region, and country.
 * Minimum 2 characters required.
 */
export function searchHotelDestinations(query: string): HotelDestination[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();

  return POPULAR_DESTINATIONS.filter((d) => {
    if (d.label.toLowerCase().includes(q)) return true;
    if (d.country.toLowerCase().includes(q)) return true;
    return false;
  }).slice(0, 8);
}

/**
 * Get the full list of destinations (for initial/popular display).
 */
export function getPopularHotelDestinations(): HotelDestination[] {
  return POPULAR_DESTINATIONS.slice(0, 10);
}
