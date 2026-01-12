import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateRequest, ValidationError } from "../_shared/validation.ts";
import { formatDate, formatCurrency, calculatePercentageDiff } from "../_shared/helpers.ts";

// Zod schema for price alert email request
const PriceAlertEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  origin: z.string().min(3).max(3),
  destination: z.string().min(3).max(3),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  previousPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  targetPrice: z.number().positive().optional(),
  currency: z.string().length(3).default("AUD"),
  searchUrl: z.string().optional(),
});

type PriceAlertEmailRequest = z.infer<typeof PriceAlertEmailSchema>;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    // Validate request body with Zod
    const body = await validateRequest(req, PriceAlertEmailSchema);

    const savings = body.previousPrice - body.currentPrice;
    const savingsPercent = calculatePercentageDiff(body.previousPrice, body.currentPrice);
    const targetReached = body.targetPrice && body.currentPrice <= body.targetPrice;

    const subject = targetReached
      ? `🎯 Target Price Reached! ${body.origin} → ${body.destination} now ${formatCurrency(body.currentPrice, body.currency)}`
      : `✈️ Price Drop Alert! ${body.origin} → ${body.destination} dropped ${savingsPercent}%`;

    const html = generateEmailHtml({
      ...body,
      savings,
      savingsPercent,
      targetReached: !!targetReached,
    });

    const emailResponse = await resend.emails.send({
      from: "TravelHub <alerts@resend.dev>",
      to: [body.to],
      subject,
      html,
    });

    console.log("Price alert email sent successfully:", emailResponse);

    return jsonResponse({ success: true, data: emailResponse });
  } catch (error) {
    console.error("Error sending price alert email:", error);

    if (error instanceof ValidationError) {
      return errorResponse("Validation failed", 400, error.errors);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});

function generateEmailHtml(params: PriceAlertEmailRequest & {
  savings: number;
  savingsPercent: number;
  targetReached: boolean;
}): string {
  return `
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
                ${params.targetReached ? '🎯 Target Price Reached!' : '✈️ Price Drop Alert!'}
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
                      ${params.origin} → ${params.destination}
                    </p>
                    <p style="margin: 8px 0 0; color: #71717a; font-size: 14px;">
                      ${formatDate(params.departureDate)}${params.returnDate ? ` - ${formatDate(params.returnDate)}` : ' (One way)'}
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
                            ${formatCurrency(params.previousPrice, params.currency)}
                          </p>
                        </td>
                        <td style="width: 40px; text-align: center;">
                          <span style="font-size: 24px;">→</span>
                        </td>
                        <td style="text-align: center; padding: 0 24px;">
                          <p style="margin: 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">New Price</p>
                          <p style="margin: 4px 0 0; color: #16a34a; font-size: 28px; font-weight: 700;">
                            ${formatCurrency(params.currentPrice, params.currency)}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="margin-top: 16px; display: inline-block; background-color: #16a34a; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-weight: 600;">
                      You Save ${formatCurrency(params.savings, params.currency)} (${params.savingsPercent}% off)
                    </div>
                    
                    ${params.targetPrice ? `
                    <p style="margin: 16px 0 0; color: #71717a; font-size: 14px;">
                      Your target: ${formatCurrency(params.targetPrice, params.currency)} ${params.targetReached ? '✓ Reached!' : ''}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${params.searchUrl || '#'}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
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
}