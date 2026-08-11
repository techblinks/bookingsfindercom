// ---------------------------------------------------------------------------
// Viator mock fixtures — DEVELOPMENT / TEST ONLY
//
// These objects approximate the shape returned by the Viator Basic Access
// /products/search endpoint.  Every image URL points at a fake CDN; no real
// Viator URLs are used.  Keep this file in __fixtures__ so it is never
// accidentally bundled into production code.
// ---------------------------------------------------------------------------

// -----------------------------------------------------------------------
// 1.  Sydney Harbour Cruise — rating, price, FREE_CANCELLATION, image
// -----------------------------------------------------------------------
import type { ViatorProductRaw } from "../types/viator";

export const VIATOR_MOCK_PRODUCTS: ViatorProductRaw[] = [
  // 1 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5010CRUISE",
    title: "Sydney Harbour Cruise with Live Jazz & Lunch",
    description:
      "Sail past the Opera House and Harbour Bridge while enjoying a gourmet buffet lunch and live jazz on Australia's most famous harbour.",
    images: [
      {
        url: "https://cdn.fixtures.test/viator/harbour-cruise-01.jpg",
        width: 1920,
        height: 1280,
        credit: "Tourism Australia",
      },
    ],
    reviews: {
      totalReviews: 843,
      combinedAverageRating: 4.7,
    },
    pricing: {
      summary: { fromPrice: 89.0 },
      currency: "AUD",
    },
    productUrl: "https://fixtures.test/tours/SYD5010CRUISE",
    destinations: [
      { ref: "1", name: "Sydney", type: "CITY" },
      { ref: "2", name: "New South Wales", type: "REGION" },
    ],
    tags: [101, 102],
    flags: ["FREE_CANCELLATION"],
  },

  // 2 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5020ZOO",
    title: "Taronga Zoo General Admission",
    description:
      "Meet over 4 000 animals with spectacular views back across Sydney Harbour from the zoo's harbourside location.",
    images: [
      {
        url: "https://cdn.fixtures.test/viator/taronga-zoo-01.jpg",
        width: 1600,
        height: 1067,
        credit: "Taronga Conservation Society",
      },
    ],
    reviews: {
      totalReviews: 1205,
      combinedAverageRating: 4.5,
    },
    pricing: {
      summary: { fromPrice: 45.0 },
      currency: "AUD",
    },
    productUrl: "https://fixtures.test/tours/SYD5020ZOO",
    destinations: [
      { ref: "1", name: "Sydney", type: "CITY" },
    ],
    tags: [103],
    flags: [],
  },

  // 3 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5030BLUEMTN",
    title: "Blue Mountains Day Trip — Scenic World & Featherdale Wildlife Park",
    description:
      "Escape Sydney for a day in the UNESCO-listed Blue Mountains. Ride the steepest railway, stroll through ancient rainforest, and get close to koalas at Featherdale.",
    images: [
      {
        url: "https://cdn.fixtures.test/viator/blue-mountains-01.jpg",
        width: 1920,
        height: 1080,
        credit: "Destination NSW",
      },
    ],
    reviews: {
      totalReviews: 2103,
      combinedAverageRating: 4.8,
    },
    pricing: {
      summary: { fromPrice: 149.0 },
      currency: "AUD",
    },
    productUrl: "https://fixtures.test/tours/SYD5030BLUEMTN",
    destinations: [
      { ref: "1", name: "Sydney", type: "CITY" },
      { ref: "3", name: "Blue Mountains", type: "REGION" },
    ],
    tags: [101, 104],
    flags: ["LIKELY_TO_SELL_OUT", "FREE_CANCELLATION"],
  },

  // 4 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5040OPERA",
    title: "Opera House Backstage Tour",
    description:
      "Go behind the curtain at the Sydney Opera House. See dressing rooms, the orchestra pit, and spaces normally closed to the public.",
    images: [
      {
        url: "https://cdn.fixtures.test/viator/opera-house-01.jpg",
        width: 1440,
        height: 960,
        credit: "Sydney Opera House Trust",
      },
    ],
    // No reviews yet — brand-new product
    pricing: {
      summary: { fromPrice: 175.0 },
      currency: "AUD",
    },
    productUrl: "https://fixtures.test/tours/SYD5040OPERA",
    destinations: [
      { ref: "1", name: "Sydney", type: "CITY" },
    ],
    tags: [105],
    flags: [],
  },

  // 5 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5050MUSEUM",
    title: "Sydney Museum Explorer Pass — 5 Attractions, 30 % Off",
    description:
      "Visit the Australian Museum, Powerhouse Museum, Maritime Museum, Hyde Park Barracks, and the Museum of Sydney with one discounted pass.",
    images: [
      {
        url: "https://cdn.fixtures.test/viator/museum-pass-01.jpg",
        width: 1600,
        height: 900,
        credit: "Museums of History NSW",
      },
    ],
    reviews: {
      totalReviews: 321,
      combinedAverageRating: 4.3,
    },
    pricing: {
      // Discounted "fromPrice" (showcasing the discounted field)
      summary: { fromPrice: 39.0 },
      currency: "AUD",
    },
    productUrl: "https://fixtures.test/tours/SYD5050MUSEUM",
    destinations: [
      { ref: "1", name: "Sydney", type: "CITY" },
    ],
    tags: [106],
    flags: ["FREE_CANCELLATION"],
  },

  // 6 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5060SURF",
    title: "Bondi Beach Surf Lesson — Learn to Ride the Waves",
    description:
      "Two-hour beginner surf lesson on world-famous Bondi Beach. Wetsuit, board, and expert coaching included.",
    // Deliberately missing images — empty array
    images: [],
    // No reviews
    pricing: {
      summary: { fromPrice: 69.0 },
      currency: "AUD",
    },
    productUrl: "https://fixtures.test/tours/SYD5060SURF",
    destinations: [
      { ref: "1", name: "Sydney", type: "CITY" },
      { ref: "4", name: "Bondi Beach", type: "POI" },
    ],
    tags: [107],
    flags: [],
  },

  // 7 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5070NULLSAFE",
    title: "Null-Safe Test Product",
    description: null,
    images: null,
    reviews: null,
    pricing: null,
    productUrl: null,
    destinations: null,
    tags: null,
    flags: null,
  },

  // 8 ──────────────────────────────────────────────────────────────────────
  {
    productCode: "SYD5080MINIMAL",
    title: "Minimal Product",
    productUrl: "https://fixtures.test/tours/SYD5080MINIMAL",
  },
];

// -----------------------------------------------------------------------
// Helper — builds a complete /products/search response envelope
// -----------------------------------------------------------------------

export function mockViatorSearchResponse(
  products: ViatorProductRaw[] = VIATOR_MOCK_PRODUCTS,
): { products: ViatorProductRaw[]; totalCount: number; page: number } {
  return { products, totalCount: products.length, page: 1 };
}
