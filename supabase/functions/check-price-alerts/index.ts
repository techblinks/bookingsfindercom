import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getLowestPrice, getConfig } from "../_shared/travelpayouts.ts";
import { sleep, calculatePercentageDiff } from "../_shared/helpers.ts";

interface SavedSearch {
  id: string;
  email: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  cabin_class: string;
  target_price: number | null;
  current_lowest_price: number | null;
  is_active: boolean;
}

interface PriceCheckResult {
  searchId: string;
  previousPrice: number | null;
  currentPrice: number | null;
  priceDropped: boolean;
  targetReached: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const config = getConfig();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active saved searches for future flights
    const { data: searches, error: fetchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("is_active", true)
      .gte("departure_date", new Date().toISOString().split("T")[0]);

    if (fetchError) {
      throw fetchError;
    }

    if (!searches || searches.length === 0) {
      return jsonResponse({ message: "No active alerts to check", checked: 0 });
    }

    console.log(`Checking ${searches.length} active alerts...`);

    const results: PriceCheckResult[] = [];
    const alertsToNotify: { search: SavedSearch; newPrice: number; previousPrice: number }[] = [];

    // Process each search with rate limiting
    for (const search of searches as SavedSearch[]) {
      // Add delay between API calls to avoid rate limiting
      await sleep(500);

      const currentPrice = await getLowestPrice(
        {
          origin: search.origin,
          destination: search.destination,
          departureDate: search.departure_date,
          returnDate: search.return_date,
        },
        config
      );

      if (currentPrice === null) {
        console.log(`Could not get price for ${search.origin}-${search.destination}`);
        continue;
      }

      const previousPrice = search.current_lowest_price;
      const priceDropped = previousPrice !== null && currentPrice < previousPrice;
      const targetReached = search.target_price !== null && currentPrice <= search.target_price;

      // Record price in history
      await supabase.from("price_history").insert({
        saved_search_id: search.id,
        price: currentPrice,
      });

      // Update the saved search with current price
      await supabase
        .from("saved_searches")
        .update({
          current_lowest_price: currentPrice,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", search.id);

      results.push({
        searchId: search.id,
        previousPrice,
        currentPrice,
        priceDropped,
        targetReached,
      });

      // Queue for notification if price dropped significantly or target reached
      if (previousPrice !== null && (priceDropped || targetReached)) {
        const dropPercent = calculatePercentageDiff(previousPrice, currentPrice);

        // Notify if dropped by 5%+ or target reached
        if (dropPercent >= 5 || targetReached) {
          alertsToNotify.push({
            search,
            newPrice: currentPrice,
            previousPrice,
          });
        }
      }

      console.log(
        `${search.origin}-${search.destination}: $${previousPrice || "N/A"} -> $${currentPrice}` +
          (priceDropped ? " (DROPPED!)" : "") +
          (targetReached ? " (TARGET REACHED!)" : "")
      );
    }

    // Send email notifications for price drops
    let emailsSent = 0;
    if (alertsToNotify.length > 0) {
      console.log(`Sending ${alertsToNotify.length} price alert emails...`);

      for (const { search, newPrice, previousPrice } of alertsToNotify) {
        try {
          // Build search URL
          const searchParams = new URLSearchParams({
            origin: search.origin,
            destination: search.destination,
            departureDate: search.departure_date,
            passengers: search.passengers.toString(),
            cabinClass: search.cabin_class,
          });
          if (search.return_date) {
            searchParams.set("returnDate", search.return_date);
          }

          // Call the send-price-alert function
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-price-alert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              to: search.email,
              origin: search.origin,
              destination: search.destination,
              departureDate: search.departure_date,
              returnDate: search.return_date,
              previousPrice,
              currentPrice: newPrice,
              targetPrice: search.target_price,
              currency: "AUD",
              searchUrl: `/flights?${searchParams.toString()}`,
            }),
          });

          if (emailResponse.ok) {
            emailsSent++;
            console.log(`Email sent to ${search.email} for ${search.origin}-${search.destination}`);
          } else {
            const errorText = await emailResponse.text();
            console.error(`Failed to send email to ${search.email}:`, errorText);
          }
        } catch (emailError) {
          console.error(`Error sending email to ${search.email}:`, emailError);
        }
      }
    }

    return jsonResponse({
      message: "Price check completed",
      checked: searches.length,
      priceDrops: results.filter((r) => r.priceDropped).length,
      targetReached: results.filter((r) => r.targetReached).length,
      alertsTriggered: alertsToNotify.length,
      emailsSent,
      results,
    });
  } catch (error) {
    console.error("Error in check-price-alerts:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});