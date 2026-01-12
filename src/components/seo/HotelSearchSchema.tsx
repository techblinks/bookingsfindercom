import { useEffect } from "react";

interface HotelSearchSchemaProps {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  lowestPrice?: number;
  currency?: string;
  totalResults?: number;
}

const HotelSearchSchema = ({
  destination,
  checkIn,
  checkOut,
  guests,
  rooms,
  lowestPrice,
  currency = "USD",
  totalResults,
}: HotelSearchSchemaProps) => {
  useEffect(() => {
    // Remove any existing hotel search schema
    const existingScript = document.getElementById("hotel-search-schema");
    if (existingScript) {
      existingScript.remove();
    }

    // Calculate number of nights
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create the structured data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      name: `Hotels in ${destination}`,
      description: `Find and compare ${totalResults || "available"} hotels in ${destination}. Check-in ${checkIn}, check-out ${checkOut}. ${rooms} ${rooms === 1 ? "room" : "rooms"} for ${guests} ${guests === 1 ? "guest" : "guests"}.`,
      mainEntity: {
        "@type": "ItemList",
        name: "Hotel Search Results",
        description: `Available hotels in ${destination}`,
        numberOfItems: totalResults || 0,
        itemListElement: lowestPrice
          ? [
              {
                "@type": "ListItem",
                position: 1,
                item: {
                  "@type": "LodgingBusiness",
                  name: `Hotels in ${destination}`,
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: destination,
                  },
                  priceRange: `From ${currency}${lowestPrice}/night`,
                },
              },
            ]
          : [],
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `https://bookingsfinder.com/hotels?destination={destination}&checkIn={checkIn}&checkOut={checkOut}&guests={guests}&rooms={rooms}`,
        },
        "query-input": [
          "required name=destination",
          "required name=checkIn",
          "required name=checkOut",
          "name=guests",
          "name=rooms",
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
          name: "Hotels",
          item: "https://bookingsfinder.com/hotels",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `Hotels in ${destination}`,
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
          name: `What is the cheapest hotel in ${destination}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: lowestPrice
              ? `The cheapest hotel in ${destination} starts at ${currency}${lowestPrice} per night. Prices vary based on dates and availability.`
              : `Prices for hotels in ${destination} vary based on dates and availability. Search now to find the best deals.`,
          },
        },
        {
          "@type": "Question",
          name: `How many hotels are available in ${destination}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: totalResults
              ? `We found ${totalResults} hotels in ${destination} for your selected dates (${nights} ${nights === 1 ? "night" : "nights"}).`
              : `Multiple hotels are available in ${destination}. Search to see all options.`,
          },
        },
      ],
    };

    // Create and append the script element
    const script = document.createElement("script");
    script.id = "hotel-search-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify([schemaData, breadcrumbData, faqData]);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.getElementById("hotel-search-schema");
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [destination, checkIn, checkOut, guests, rooms, lowestPrice, currency, totalResults]);

  // Update page title and meta description
  useEffect(() => {
    const originalTitle = document.title;

    document.title = `Hotels in ${destination} | BookingsFinder`;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    const descriptionContent = `Compare ${totalResults || ""} hotels in ${destination}${lowestPrice ? ` from $${lowestPrice}/night` : ""}. Find the best deals for ${guests} ${guests === 1 ? "guest" : "guests"}.`;

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
  }, [destination, guests, lowestPrice, totalResults]);

  return null;
};

export default HotelSearchSchema;
