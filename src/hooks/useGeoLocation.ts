import { useState, useEffect } from "react";

interface GeoData {
  country: string;
  countryCode: string;
  city: string;
  defaultOrigin: string;
  defaultOriginName: string;
}

interface RegionConfig {
  defaultOrigin: string;
  defaultOriginName: string;
  popularRoutes: {
    origin: string;
    originName: string;
    destination: string;
    destinationName: string;
  }[];
}

const regionConfigs: Record<string, RegionConfig> = {
  AU: {
    defaultOrigin: "SYD",
    defaultOriginName: "Sydney",
    popularRoutes: [
      { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne" },
      { origin: "SYD", originName: "Sydney", destination: "BKK", destinationName: "Bangkok" },
      { origin: "SYD", originName: "Sydney", destination: "KTM", destinationName: "Kathmandu" },
      { origin: "MEL", originName: "Melbourne", destination: "SIN", destinationName: "Singapore" },
      { origin: "SYD", originName: "Sydney", destination: "NRT", destinationName: "Tokyo" },
      { origin: "BNE", originName: "Brisbane", destination: "DPS", destinationName: "Bali" },
    ],
  },
  IN: {
    defaultOrigin: "DEL",
    defaultOriginName: "New Delhi",
    popularRoutes: [
      { origin: "DEL", originName: "Delhi", destination: "BOM", destinationName: "Mumbai" },
      { origin: "BLR", originName: "Bangalore", destination: "DEL", destinationName: "Delhi" },
      { origin: "DEL", originName: "Delhi", destination: "GOI", destinationName: "Goa" },
      { origin: "BOM", originName: "Mumbai", destination: "DXB", destinationName: "Dubai" },
      { origin: "DEL", originName: "Delhi", destination: "SIN", destinationName: "Singapore" },
      { origin: "BLR", originName: "Bangalore", destination: "BKK", destinationName: "Bangkok" },
    ],
  },
  US: {
    defaultOrigin: "JFK",
    defaultOriginName: "New York",
    popularRoutes: [
      { origin: "JFK", originName: "New York", destination: "LAX", destinationName: "Los Angeles" },
      { origin: "JFK", originName: "New York", destination: "MIA", destinationName: "Miami" },
      { origin: "LAX", originName: "Los Angeles", destination: "HNL", destinationName: "Honolulu" },
      { origin: "SFO", originName: "San Francisco", destination: "LHR", destinationName: "London" },
      { origin: "ORD", originName: "Chicago", destination: "CDG", destinationName: "Paris" },
      { origin: "JFK", originName: "New York", destination: "CUN", destinationName: "Cancun" },
    ],
  },
  GB: {
    defaultOrigin: "LHR",
    defaultOriginName: "London",
    popularRoutes: [
      { origin: "LHR", originName: "London", destination: "CDG", destinationName: "Paris" },
      { origin: "LHR", originName: "London", destination: "BCN", destinationName: "Barcelona" },
      { origin: "LHR", originName: "London", destination: "AMS", destinationName: "Amsterdam" },
      { origin: "LHR", originName: "London", destination: "JFK", destinationName: "New York" },
      { origin: "MAN", originName: "Manchester", destination: "DXB", destinationName: "Dubai" },
      { origin: "LHR", originName: "London", destination: "AGP", destinationName: "Malaga" },
    ],
  },
  SG: {
    defaultOrigin: "SIN",
    defaultOriginName: "Singapore",
    popularRoutes: [
      { origin: "SIN", originName: "Singapore", destination: "KUL", destinationName: "Kuala Lumpur" },
      { origin: "SIN", originName: "Singapore", destination: "BKK", destinationName: "Bangkok" },
      { origin: "SIN", originName: "Singapore", destination: "DPS", destinationName: "Bali" },
      { origin: "SIN", originName: "Singapore", destination: "NRT", destinationName: "Tokyo" },
      { origin: "SIN", originName: "Singapore", destination: "MEL", destinationName: "Melbourne" },
      { origin: "SIN", originName: "Singapore", destination: "HKG", destinationName: "Hong Kong" },
    ],
  },
  AE: {
    defaultOrigin: "DXB",
    defaultOriginName: "Dubai",
    popularRoutes: [
      { origin: "DXB", originName: "Dubai", destination: "LHR", destinationName: "London" },
      { origin: "DXB", originName: "Dubai", destination: "BOM", destinationName: "Mumbai" },
      { origin: "DXB", originName: "Dubai", destination: "BKK", destinationName: "Bangkok" },
      { origin: "DXB", originName: "Dubai", destination: "MLE", destinationName: "Maldives" },
      { origin: "AUH", originName: "Abu Dhabi", destination: "JFK", destinationName: "New York" },
      { origin: "DXB", originName: "Dubai", destination: "CDG", destinationName: "Paris" },
    ],
  },
};

const defaultConfig: RegionConfig = {
  defaultOrigin: "LHR",
  defaultOriginName: "London",
  popularRoutes: [
    { origin: "LHR", originName: "London", destination: "JFK", destinationName: "New York" },
    { origin: "CDG", originName: "Paris", destination: "BCN", destinationName: "Barcelona" },
    { origin: "DXB", originName: "Dubai", destination: "SIN", destinationName: "Singapore" },
    { origin: "NRT", originName: "Tokyo", destination: "ICN", destinationName: "Seoul" },
    { origin: "SYD", originName: "Sydney", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "SIN", originName: "Singapore", destination: "BKK", destinationName: "Bangkok" },
  ],
};

export const useGeoLocation = () => {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regionConfig, setRegionConfig] = useState<RegionConfig>(defaultConfig);

  useEffect(() => {
    const fetchGeoLocation = async () => {
      try {
        // Try to get from localStorage first for instant loading
        const cached = localStorage.getItem("geo_location");
        if (cached) {
          const parsed = JSON.parse(cached);
          const cacheAge = Date.now() - (parsed.timestamp || 0);
          // Use cache if less than 24 hours old
          if (cacheAge < 24 * 60 * 60 * 1000) {
            setGeoData(parsed.data);
            setRegionConfig(regionConfigs[parsed.data.countryCode] || defaultConfig);
            setLoading(false);
            return;
          }
        }

        // Use a free IP geolocation API
        const response = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(3000),
        });
        
        if (!response.ok) throw new Error("Geo lookup failed");
        
        const data = await response.json();
        const config = regionConfigs[data.country_code] || defaultConfig;
        
        const geoInfo: GeoData = {
          country: data.country_name || "Unknown",
          countryCode: data.country_code || "US",
          city: data.city || "Unknown",
          defaultOrigin: config.defaultOrigin,
          defaultOriginName: config.defaultOriginName,
        };
        
        setGeoData(geoInfo);
        setRegionConfig(config);
        
        // Cache the result
        localStorage.setItem("geo_location", JSON.stringify({
          data: geoInfo,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.log("Geo lookup failed, using defaults");
        setRegionConfig(defaultConfig);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoLocation();
  }, []);

  return { geoData, loading, regionConfig };
};

export default useGeoLocation;
