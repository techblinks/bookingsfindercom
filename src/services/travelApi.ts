import { supabase } from "@/integrations/supabase/client";

// Use environment variable for the Supabase URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nrxupicbzblbxolyxksg.supabase.co";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
  currency?: string;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
  currency?: string;
}

export interface FlightResult {
  id: string;
  airline: string;
  airlineCode: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  isDeal: boolean;
  redirectId: string;
  flightNumber?: string;
  link?: string;
}

export interface HotelResult {
  id: string;
  hotelId?: number;
  name: string;
  image: string;
  location: string;
  stars: number;
  guestScore: number;
  reviewCount: number;
  price: number;
  originalPrice?: number;
  currency: string;
  amenities: string[];
  isDeal: boolean;
  redirectId: string;
  link?: string;
}

export interface RedirectData {
  success: boolean;
  id: string;
  redirectUrl: string;
  partner: string;
  type: string;
}

// Search flights API
export async function searchFlights(params: FlightSearchParams): Promise<{
  success: boolean;
  results: FlightResult[];
  totalResults: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search-flights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to search flights');
    }

    return {
      success: true,
      results: data.results,
      totalResults: data.totalResults,
    };
  } catch (error) {
    console.error('Flight search error:', error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Search hotels API
export async function searchHotels(params: HotelSearchParams): Promise<{
  success: boolean;
  results: HotelResult[];
  totalResults: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search-hotels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to search hotels');
    }

    return {
      success: true,
      results: data.results,
      totalResults: data.totalResults,
    };
  } catch (error) {
    console.error('Hotel search error:', error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get redirect URL for booking
export async function getRedirect(id: string): Promise<RedirectData | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-redirect?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get redirect');
    }

    return data;
  } catch (error) {
    console.error('Redirect error:', error);
    return null;
  }
}

// Helper to redirect to booking page
export async function redirectToBooking(redirectId: string): Promise<void> {
  const data = await getRedirect(redirectId);
  
  if (data?.redirectUrl) {
    // Navigate to our redirect page with the URL
    window.location.href = `/redirect?url=${encodeURIComponent(data.redirectUrl)}&partner=${encodeURIComponent(data.partner)}`;
  } else {
    console.error('No redirect URL found for:', redirectId);
  }
}
