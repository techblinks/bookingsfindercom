import { useEffect } from "react";

interface FlightSearchSchemaProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  lowestPrice?: number;
  currency?: string;
  totalResults?: number;
}

const FlightSearchSchema = ({
  origin,
  destination,
  departureDate,
  returnDate,
  passengers,
  cabinClass,
  lowestPrice,
  currency = "USD",
  totalResults,
}: FlightSearchSchemaProps) => {
  useEffect(() => {
    // Remove any existing flight search schema
    const existingScript = document.getElementById("flight-search-schema");
    if (existingScript) {
      existingScript.remove();
    }

    // Create the structured data
    //
    // BF-0R-7 Phase E: this page's price data comes from Travelpayouts'
    // cached search-history endpoint (recently-found fares, not a live,
    // per-traveller quote — see FlightCard.tsx / getFlightPrices()). An
    // `Offer` node with `availability: InStock` asserts to search engines
    // and any consumer of this structured data that `lowestPrice` is a
    // currently bookable price — a claim this data source cannot support.
    // No `offers`/price node is emitted here for that reason; the
    // `Flight` item itself (route, dates) is still accurate and is kept.
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      name: `Flights from ${origin} to ${destination}`,
      description: `Compare recent fare observations and search live flights from ${origin} to ${destination} departing ${departureDate}${returnDate ? ` with return on ${returnDate}` : ""}. ${cabinClass} class for ${passengers} ${passengers === 1 ? "passenger" : "passengers"}.`,
      mainEntity: {
        "@type": "ItemList",
        name: "Flight Search Results",
        description: `Available flights from ${origin} to ${destination}`,
        numberOfItems: totalResults || 0,
        itemListElement: lowestPrice
          ? [
              {
                "@type": "ListItem",
                position: 1,
                item: {
                  "@type": "Flight",
                  name: `Recently found flight from ${origin} to ${destination}`,
                  departureAirport: {
                    "@type": "Airport",
                    iataCode: origin,
                  },
                  arrivalAirport: {
                    "@type": "Airport",
                    iataCode: destination,
                  },
                  departureTime: departureDate,
                },
              },
            ]
          : [],
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `https://bookingsfinder.com/flights?origin={origin}&destination={destination}&departureDate={departureDate}&returnDate={returnDate}&passengers={passengers}&cabinClass={cabinClass}`,
        },
        "query-input": [
          "required name=origin",
          "required name=destination",
          "required name=departureDate",
          "name=returnDate",
          "name=passengers",
          "name=cabinClass",
        ],
      },
    };

    // Add BreadcrumbList for better SEO
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://bookingsfinder.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Flights",
          item: "https://bookingsfinder.com/flights",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `${origin} to ${destination}`,
        },
      ],
    };

    // Add FAQ Schema for common questions
    const faqData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What is the cheapest flight from ${origin} to ${destination}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: lowestPrice
              ? `A recent fare from ${origin} to ${destination} was found from ${currency} ${lowestPrice}. Current price and availability are confirmed on the partner search.`
              : `Prices for flights from ${origin} to ${destination} vary based on dates and availability. Search now to find recent fares.`,
          },
        },
        {
          "@type": "Question",
          name: `How many flights are available from ${origin} to ${destination}?`,
          acceptedAnswer: {
            "@type": "Answer",
            // BF-FLIGHTS-LIVE-1 Phase B: totalResults counts cached recent
            // fare observations for the exact requested dates, not live
            // flight inventory — a zero count does not mean no flights
            // exist, so this must not assert flight availability either way.
            text: totalResults
              ? `We found ${totalResults} recent fare observation${totalResults === 1 ? "" : "s"} from ${origin} to ${destination} for your selected dates. Search live flights on our partner site to confirm current availability.`
              : `We don't have a recent fare observation from ${origin} to ${destination} for your selected dates. Live flights may still be available — search live flights on our partner site.`,
          },
        },
      ],
    };

    // Create and append the script element
    const script = document.createElement("script");
    script.id = "flight-search-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify([schemaData, breadcrumbData, faqData]);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.getElementById("flight-search-schema");
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [origin, destination, departureDate, returnDate, passengers, cabinClass, lowestPrice, currency, totalResults]);

  // Update page title and meta description
  useEffect(() => {
    const originalTitle = document.title;

    document.title = `Flights from ${origin} to ${destination} | BookingsFinder`;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    const descriptionContent = `Compare recent fare observations and search live flights from ${origin} to ${destination}${lowestPrice ? ` from $${lowestPrice}` : ""}. Find ${cabinClass} class tickets.`;

    if (metaDescription) {
      metaDescription.setAttribute("content", descriptionContent);
    } else {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      metaDescription.setAttribute("content", descriptionContent);
      document.head.appendChild(metaDescription);
    }

    return () => {
      document.title = originalTitle;
    };
  }, [origin, destination, cabinClass, lowestPrice, totalResults]);

  return null;
};

export default FlightSearchSchema;
