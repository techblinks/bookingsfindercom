import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        generateHtmlPage("Error", "Invalid unsubscribe link. No token provided."),
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find subscriber by token
    const { data: subscriber, error: fetchError } = await supabase
      .from("subscribers")
      .select("id, email, is_subscribed")
      .eq("unsubscribe_token", token)
      .single();

    if (fetchError || !subscriber) {
      return new Response(
        generateHtmlPage("Error", "Invalid or expired unsubscribe link."),
        { status: 404, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    if (!subscriber.is_subscribed) {
      return new Response(
        generateHtmlPage("Already Unsubscribed", `${subscriber.email} is already unsubscribed from our mailing list.`),
        { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    // Unsubscribe the user
    const { error: updateError } = await supabase
      .from("subscribers")
      .update({
        is_subscribed: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", subscriber.id);

    if (updateError) {
      console.error("Failed to unsubscribe:", updateError);
      return new Response(
        generateHtmlPage("Error", "Failed to process your unsubscribe request. Please try again later."),
        { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    console.log(`Successfully unsubscribed: ${subscriber.email}`);

    return new Response(
      generateHtmlPage("Unsubscribed Successfully", `${subscriber.email} has been successfully unsubscribed from our mailing list. You will no longer receive promotional emails from us.`),
      { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in unsubscribe function:", error);
    return new Response(
      generateHtmlPage("Error", "An unexpected error occurred. Please try again later."),
      { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
    );
  }
};

function generateHtmlPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - BookingsFinder</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 500px;
          text-align: center;
        }
        h1 {
          color: #1a1a2e;
          margin-bottom: 16px;
          font-size: 24px;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 24px;
        }
        a {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        a:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">✈️ BookingsFinder</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="https://bookingsfinder.com">Return to Homepage</a>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
