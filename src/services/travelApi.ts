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

// Track affiliate clicks and searches
export async function trackAffiliateEvent(data: {
  type: 'flight' | 'hotel';
  action: 'search' | 'click';
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  airlineCode?: string;
  flightNumber?: string;
  hotelId?: string;
  price?: number;
  currency?: string;
  redirectUrl?: string;
}): Promise<void> {
  try {
    await supabase.from('affiliate_clicks').insert({
      type: data.type,
      action: data.action,
      origin: data.origin,
      destination: data.destination,
      departure_date: data.departureDate,
      return_date: data.returnDate,
      airline_code: data.airlineCode,
      flight_number: data.flightNumber,
      hotel_id: data.hotelId,
      price: data.price,
      currency: data.currency || 'USD',
      redirect_url: data.redirectUrl,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to track affiliate event:', error);
  }
}

// New API response format
export interface FlightSearchResponse {
  flights: FlightResult[];
  meta: {
    total_found: number;
    is_complete: boolean;
  };
}

// Search flights API - updated to handle new response format
export async function searchFlights(params: FlightSearchParams): Promise<{
  success: boolean;
  results: FlightResult[];
  totalResults: number;
  isComplete: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search-flights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify({
        origin: params.origin,
        destination: params.destination,
        depart_date: params.departureDate,
        return_date: params.returnDate,
        adults: params.passengers || 1,
        currency: params.currency || 'AUD',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to search flights');
    }

    // Track the search
    trackAffiliateEvent({
      type: 'flight',
      action: 'search',
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
    });

    // Handle new API format: { flights: [], meta: { total_found, is_complete } }
    const flights = data.flights || data.results || [];
    const meta = data.meta || { total_found: flights.length, is_complete: true };

    return {
      success: true,
      results: flights,
      totalResults: meta.total_found,
      isComplete: meta.is_complete,
    };
  } catch (error) {
    console.error('Flight search error:', error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      isComplete: true,
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

    // Track the search
    trackAffiliateEvent({
      type: 'hotel',
      action: 'search',
      destination: params.destination,
      departureDate: params.checkIn,
      returnDate: params.checkOut,
    });

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

export interface RedirectParams {
  id: string;
  type?: 'flight' | 'hotel';
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  airline?: string;
  hotelId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  link?: string;
}

// Get redirect URL for booking
export async function getRedirectUrl(params: RedirectParams): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('id', params.id);
    if (params.type) searchParams.append('type', params.type);
    if (params.origin) searchParams.append('origin', params.origin);
    if (params.destination) searchParams.append('destination', params.destination);
    if (params.departureDate) searchParams.append('departureDate', params.departureDate);
    if (params.returnDate) searchParams.append('returnDate', params.returnDate);
    if (params.airline) searchParams.append('airline', params.airline);
    if (params.hotelId) searchParams.append('hotelId', params.hotelId);
    if (params.checkIn) searchParams.append('checkIn', params.checkIn);
    if (params.checkOut) searchParams.append('checkOut', params.checkOut);
    if (params.guests) searchParams.append('guests', params.guests.toString());
    if (params.link) searchParams.append('link', encodeURIComponent(params.link));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-redirect?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get redirect');
    }

    return {
      success: true,
      redirectUrl: data.redirectUrl,
    };
  } catch (error) {
    console.error('Redirect error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper to redirect to booking page (always via interstitial)
export async function redirectToBooking(redirectId: string): Promise<void> {
  const result = await getRedirectUrl({ id: redirectId });

  if (result.success && result.redirectUrl) {
    window.location.href = `/redirect?url=${encodeURIComponent(result.redirectUrl)}`;
  } else {
    console.error('No redirect URL found for:', redirectId);
  }
}
