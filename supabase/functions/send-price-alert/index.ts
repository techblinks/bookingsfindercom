import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceAlertEmailRequest {
  to: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  previousPrice: number;
  currentPrice: number;
  targetPrice?: number;
  currency?: string;
  searchUrl?: string;
}

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    const {
      to,
      origin,
      destination,
      departureDate,
      returnDate,
      previousPrice,
      currentPrice,
      targetPrice,
      currency = "AUD",
      searchUrl,
    }: PriceAlertEmailRequest = await req.json();

    const savings = previousPrice - currentPrice;
    const savingsPercent = Math.round((savings / previousPrice) * 100);
    const targetReached = targetPrice && currentPrice <= targetPrice;

    const subject = targetReached
      ? `🎯 Target Price Reached! ${origin} → ${destination} now ${currency}$${currentPrice}`
      : `✈️ Price Drop Alert! ${origin} → ${destination} dropped ${savingsPercent}%`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Drop Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                ${targetReached ? '🎯 Target Price Reached!' : '✈️ Price Drop Alert!'}
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Great news about your flight alert
              </p>
            </td>
          </tr>
          
          <!-- Route Info -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 24px;">
                    <p style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
                      ${origin} → ${destination}
                    </p>
                    <p style="margin: 8px 0 0; color: #71717a; font-size: 14px;">
                      ${formatDate(departureDate)}${returnDate ? ` - ${formatDate(returnDate)}` : ' (One way)'}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Price Comparison -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 12px; padding: 24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding: 0 24px;">
                          <p style="margin: 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Previous Price</p>
                          <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 20px; text-decoration: line-through;">
                            ${currency}$${previousPrice.toLocaleString()}
                          </p>
                        </td>
                        <td style="width: 40px; text-align: center;">
                          <span style="font-size: 24px;">→</span>
                        </td>
                        <td style="text-align: center; padding: 0 24px;">
                          <p style="margin: 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">New Price</p>
                          <p style="margin: 4px 0 0; color: #16a34a; font-size: 28px; font-weight: 700;">
                            ${currency}$${currentPrice.toLocaleString()}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="margin-top: 16px; display: inline-block; background-color: #16a34a; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-weight: 600;">
                      You Save ${currency}$${savings.toLocaleString()} (${savingsPercent}% off)
                    </div>
                    
                    ${targetPrice ? `
                    <p style="margin: 16px 0 0; color: #71717a; font-size: 14px;">
                      Your target: ${currency}$${targetPrice.toLocaleString()} ${targetReached ? '✓ Reached!' : ''}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${searchUrl || '#'}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Book This Flight Now →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; text-align: center; color: #71717a; font-size: 14px;">
                ⚡ Prices can change quickly. Book now to lock in this rate!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                You're receiving this because you set up a price alert for this route.
              </p>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px;">
                To stop receiving alerts, visit your alerts dashboard and disable or delete this alert.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "TravelHub <alerts@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Price alert email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error sending price alert email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
