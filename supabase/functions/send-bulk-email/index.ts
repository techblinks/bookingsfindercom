import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BulkEmailRequest {
  subject: string;
  htmlContent: string;
  textContent?: string;
  testEmail?: string;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BookingsFinder <noreply@bookingsfinder.com>",
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, error: errorData.message || "Send failed" };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: hasAdminRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, htmlContent, textContent, testEmail }: BulkEmailRequest = await req.json();

    if (!subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Subject and htmlContent are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let emails: string[] = [];

    if (testEmail) {
      emails = [testEmail];
    } else {
      const { data: subscribers, error: fetchError } = await supabase
        .from("subscribers")
        .select("email, unsubscribe_token")
        .eq("is_subscribed", true);

      if (fetchError) {
        throw new Error(`Failed to fetch subscribers: ${fetchError.message}`);
      }

      emails = subscribers?.map((s) => s.email) || [];
    }

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers to send to" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const batchSize = 50;
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const { data: subscriberData } = await supabase
        .from("subscribers")
        .select("email, unsubscribe_token")
        .in("email", batch);

      const tokenMap = new Map(subscriberData?.map((s) => [s.email, s.unsubscribe_token]) || []);

      for (const email of batch) {
        const unsubscribeToken = tokenMap.get(email) || "";
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?token=${unsubscribeToken}`;
        
        const finalHtml = htmlContent.replace(
          "{{unsubscribe_url}}",
          unsubscribeUrl
        ) + `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
            <p>You're receiving this because you subscribed to BookingsFinder price alerts.</p>
            <p><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a></p>
          </div>
        `;

        const result = await sendEmail(email, subject, finalHtml, textContent);

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${email}: ${result.error}`);
          console.error(`Failed to send to ${email}:`, result.error);
        }
      }

      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Bulk email completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: emails.length,
        errors: errors.slice(0, 10),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-bulk-email function:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
