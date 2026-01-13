import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  origin?: string;
  destination?: string;
}

const getWelcomeEmailHtml = (email: string, origin?: string, destination?: string) => {
  const baseUrl = "https://bookingsfinder.com";
  
  const routeInfo = origin && destination 
    ? `<p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        We're already tracking prices for <strong>${origin} → ${destination}</strong>. You'll get notified the moment prices drop!
      </p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 50px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Welcome to BookingsFinder! 🎉</h1>
      <p style="color: #e0e7ff; margin: 15px 0 0; font-size: 18px;">You're officially a deal hunter</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Hi there! 👋
      </p>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Thank you for signing up for price alerts with BookingsFinder. We're thrilled to have you on board!
      </p>
      
      ${routeInfo}
      
      <!-- What to Expect -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #0c4a6e; margin: 0 0 15px; font-size: 18px;">🚀 Here's what you can expect:</h3>
        <ul style="color: #0e7490; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Instant Price Alerts</strong> – Get notified the moment prices drop for your saved routes</li>
          <li><strong>Exclusive Deals</strong> – Be the first to know about flash sales and limited-time offers</li>
          <li><strong>Weekly Digests</strong> – Curated deals handpicked just for you</li>
          <li><strong>No Spam Promise</strong> – Only valuable updates, we respect your inbox</li>
        </ul>
      </div>
      
      <!-- How It Works -->
      <h3 style="color: #18181b; margin: 25px 0 15px; font-size: 18px;">💡 How BookingsFinder Works</h3>
      
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; padding: 0 12px 15px 0; width: 40px;">
              <div style="background-color: #6366f1; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">1</div>
            </td>
            <td style="vertical-align: top; padding-bottom: 15px;">
              <p style="margin: 0; color: #18181b; font-weight: 600;">Search & Compare</p>
              <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">We scan 900+ airlines to find the cheapest flights</p>
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 0 12px 15px 0; width: 40px;">
              <div style="background-color: #6366f1; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">2</div>
            </td>
            <td style="vertical-align: top; padding-bottom: 15px;">
              <p style="margin: 0; color: #18181b; font-weight: 600;">Set Price Alerts</p>
              <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">We track prices 24/7 and notify you when they drop</p>
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 0 12px 0 0; width: 40px;">
              <div style="background-color: #6366f1; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">3</div>
            </td>
            <td style="vertical-align: top;">
              <p style="margin: 0; color: #18181b; font-weight: 600;">Book Direct</p>
              <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Click through to book directly with the airline – no hidden fees!</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${baseUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Start Searching for Deals →
        </a>
      </div>
      
      <!-- Pro Tips -->
      <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-top: 25px;">
        <h4 style="color: #92400e; margin: 0 0 10px; font-size: 16px;">💡 Pro Tips for Finding Cheap Flights</h4>
        <ul style="color: #a16207; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.7;">
          <li>Book flights on Tuesdays and Wednesdays for the best prices</li>
          <li>Be flexible with your dates – even a day can make a big difference</li>
          <li>Set alerts for multiple routes to compare options</li>
          <li>Book 2-3 months in advance for domestic, 3-6 months for international</li>
        </ul>
      </div>
      
      <p style="color: #71717a; font-size: 14px; text-align: center; margin: 30px 0 0;">
        Questions? Just reply to this email – we're here to help!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 30px; text-align: center;">
      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px;">
        BookingsFinder | 13 Wildflower Street, Yarrabilba, 4207 Brisbane, Australia
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        You're receiving this because you signed up for price alerts.
      </p>
    </div>
  </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, origin, destination }: WelcomeEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending welcome email to: ${email}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BookingsFinder <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to BookingsFinder – Let's Find Your Next Adventure! 🎉",
        html: getWelcomeEmailHtml(email, origin, destination),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: errorData.message || "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await res.json();
    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending welcome email:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
