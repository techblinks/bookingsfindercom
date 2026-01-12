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
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      name: `Flights from ${origin} to ${destination}`,
      description: `Find and compare ${totalResults || "available"} flights from ${origin} to ${destination} departing ${departureDate}${returnDate ? ` with return on ${returnDate}` : ""}. ${cabinClass} class for ${passengers} ${passengers === 1 ? "passenger" : "passengers"}.`,
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
                  name: `Cheapest flight from ${origin} to ${destination}`,
                  departureAirport: {
                    "@type": "Airport",
                    iataCode: origin,
                  },
                  arrivalAirport: {
                    "@type": "Airport",
                    iataCode: destination,
                  },
                  departureTime: departureDate,
                  offers: {
                    "@type": "Offer",
                    price: lowestPrice,
                    priceCurrency: currency,
                    availability: "https://schema.org/InStock",
                  },
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
              ? `The cheapest flight from ${origin} to ${destination} starts at ${currency} ${lowestPrice}. Prices vary based on dates and availability.`
              : `Prices for flights from ${origin} to ${destination} vary based on dates and availability. Search now to find the best deals.`,
          },
        },
        {
          "@type": "Question",
          name: `How many flights are available from ${origin} to ${destination}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: totalResults
              ? `We found ${totalResults} flights from ${origin} to ${destination} for your selected dates.`
              : `Multiple flights are available from ${origin} to ${destination}. Search to see all options.`,
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
    const descriptionContent = `Compare ${totalResults || ""} cheap flights from ${origin} to ${destination}${lowestPrice ? ` from $${lowestPrice}` : ""}. Find the best deals on ${cabinClass} class tickets.`;

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
