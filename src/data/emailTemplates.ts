export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  htmlContent: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'flash-sale',
    name: '🔥 Flash Sale',
    subject: '🔥 FLASH SALE: Up to 50% Off Flights – 24 Hours Only!',
    description: 'Urgent flash sale announcement with countdown urgency',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚡ FLASH SALE ⚡</h1>
      <p style="color: #fef2f2; margin: 10px 0 0; font-size: 18px;">24 HOURS ONLY</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #18181b; margin: 0 0 20px; font-size: 24px; text-align: center;">
        Save Up to 50% on Flights!
      </h2>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Hi there! 👋
      </p>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        We've just unlocked exclusive flash deals on flights to your favorite destinations. But hurry – these prices won't last!
      </p>
      
      <!-- Deal Cards -->
      <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-weight: bold; color: #18181b;">Sydney → Tokyo</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Roundtrip • Economy</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; text-decoration: line-through; color: #a1a1aa; font-size: 14px;">$1,299</p>
            <p style="margin: 0; font-weight: bold; color: #dc2626; font-size: 24px;">$649</p>
          </div>
        </div>
      </div>
      
      <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-weight: bold; color: #18181b;">Melbourne → Bali</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Roundtrip • Economy</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; text-decoration: line-through; color: #a1a1aa; font-size: 14px;">$599</p>
            <p style="margin: 0; font-weight: bold; color: #dc2626; font-size: 24px;">$299</p>
          </div>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://bookingsfinder.com" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Shop Flash Deals →
        </a>
      </div>
      
      <p style="color: #71717a; font-size: 14px; text-align: center; margin: 0;">
        ⏰ Sale ends in 24 hours. Don't miss out!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 30px; text-align: center;">
      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px;">
        BookingsFinder | 13 Wildflower Street, Yarrabilba, 4207 Brisbane, Australia
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        <a href="{{unsubscribe_url}}" style="color: #a1a1aa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'weekly-deals',
    name: '📧 Weekly Deals Digest',
    subject: '✈️ This Week\'s Best Flight Deals – Handpicked for You',
    description: 'Weekly roundup of the best travel deals',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">✈️ Weekly Deals Digest</h1>
      <p style="color: #e0e7ff; margin: 10px 0 0; font-size: 16px;">Your personalized travel deals</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Hi! 👋 Here are this week's top deals we found just for you:
      </p>
      
      <!-- Deal 1 -->
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="background-color: #dcfce7; color: #16a34a; font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: 600;">HOT DEAL</span>
            <p style="margin: 10px 0 0; font-weight: bold; color: #18181b; font-size: 18px;">Brisbane → Singapore</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Mar 15 - Mar 22 • Roundtrip</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: bold; color: #6366f1; font-size: 28px;">$389</p>
          </div>
        </div>
      </div>
      
      <!-- Deal 2 -->
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-weight: bold; color: #18181b; font-size: 18px;">Sydney → Los Angeles</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Apr 1 - Apr 14 • Roundtrip</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: bold; color: #6366f1; font-size: 28px;">$899</p>
          </div>
        </div>
      </div>
      
      <!-- Deal 3 -->
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-weight: bold; color: #18181b; font-size: 18px;">Melbourne → London</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">May 10 - May 24 • Roundtrip</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: bold; color: #6366f1; font-size: 28px;">$1,199</p>
          </div>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://bookingsfinder.com" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          View All Deals →
        </a>
      </div>
      
      <!-- Tip Section -->
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-top: 25px;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          💡 <strong>Pro Tip:</strong> Book mid-week for the best prices! Tuesday and Wednesday flights are typically 15-20% cheaper.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 30px; text-align: center;">
      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px;">
        BookingsFinder | 13 Wildflower Street, Yarrabilba, 4207 Brisbane, Australia
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        <a href="{{unsubscribe_url}}" style="color: #a1a1aa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'new-route',
    name: '🛫 New Route Announcement',
    subject: '🎉 New Route Alert: Direct Flights Now Available!',
    description: 'Announce new flight routes and destinations',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🛫 New Route Alert!</h1>
      <p style="color: #e0f2fe; margin: 10px 0 0; font-size: 16px;">Direct flights now available</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 48px; margin: 0;">🎉</p>
        <h2 style="color: #18181b; margin: 15px 0 0; font-size: 24px;">
          Brisbane ✈️ Tokyo
        </h2>
        <p style="color: #71717a; margin: 10px 0 0; font-size: 16px;">
          Non-stop flights launching March 2024
        </p>
      </div>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Great news! A new direct route has been announced that we think you'll love. No more layovers – fly non-stop to your destination!
      </p>
      
      <!-- Route Details -->
      <div style="background: linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <h3 style="color: #0c4a6e; margin: 0 0 15px; font-size: 18px;">Route Details</h3>
        <table style="width: 100%; color: #0e7490; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0;">✈️ Airline:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">Qantas</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">🛫 Departure:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">Brisbane (BNE)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">🛬 Arrival:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">Tokyo (NRT)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">⏱️ Flight Time:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">~9 hours</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">💰 Starting From:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0ea5e9; font-size: 18px;">$599</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Early bird prices are available for a limited time. Set up a price alert to get notified when fares drop!
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://bookingsfinder.com" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Search This Route →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 30px; text-align: center;">
      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px;">
        BookingsFinder | 13 Wildflower Street, Yarrabilba, 4207 Brisbane, Australia
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        <a href="{{unsubscribe_url}}" style="color: #a1a1aa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'holiday-promo',
    name: '🎄 Holiday Special',
    subject: '🎄 Holiday Travel Deals – Save Big This Season!',
    description: 'Seasonal holiday promotions and special offers',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #15803d 0%, #16a34a 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎄 Holiday Travel Sale 🎄</h1>
      <p style="color: #dcfce7; margin: 10px 0 0; font-size: 16px;">Make memories this holiday season</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 60px; margin: 0;">✨🎁✨</p>
      </div>
      
      <h2 style="color: #18181b; margin: 0 0 20px; font-size: 24px; text-align: center;">
        Up to 40% Off Holiday Flights
      </h2>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px; text-align: center;">
        'Tis the season for adventure! Whether you're heading home for the holidays or escaping to somewhere warm, we've got deals that'll make your wallet happy.
      </p>
      
      <!-- Promo Code Box -->
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px dashed #dc2626; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">
        <p style="color: #dc2626; font-size: 14px; margin: 0 0 5px; text-transform: uppercase; font-weight: 600;">Use Code</p>
        <p style="color: #dc2626; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 4px;">HOLIDAY40</p>
        <p style="color: #71717a; font-size: 12px; margin: 10px 0 0;">Valid until Dec 31st</p>
      </div>
      
      <!-- Featured Destinations -->
      <h3 style="color: #18181b; margin: 0 0 15px; font-size: 18px;">🌟 Featured Holiday Destinations</h3>
      
      <div style="display: grid; gap: 10px; margin-bottom: 25px;">
        <div style="background-color: #f0fdf4; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #18181b; font-weight: 600;">🏝️ Fiji</span>
          <span style="color: #16a34a; font-weight: bold;">From $499</span>
        </div>
        <div style="background-color: #f0fdf4; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #18181b; font-weight: 600;">⛷️ Queenstown</span>
          <span style="color: #16a34a; font-weight: bold;">From $299</span>
        </div>
        <div style="background-color: #f0fdf4; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #18181b; font-weight: 600;">🗼 Paris</span>
          <span style="color: #16a34a; font-weight: bold;">From $1,099</span>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://bookingsfinder.com" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Book Your Holiday Trip →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 30px; text-align: center;">
      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px;">
        BookingsFinder | 13 Wildflower Street, Yarrabilba, 4207 Brisbane, Australia
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        <a href="{{unsubscribe_url}}" style="color: #a1a1aa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'welcome',
    name: '👋 Welcome Email',
    subject: 'Welcome to BookingsFinder – Let\'s Find Your Next Adventure!',
    description: 'Welcome new subscribers with an introduction to the service',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 50px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Welcome! 🎉</h1>
      <p style="color: #e0e7ff; margin: 15px 0 0; font-size: 18px;">You're officially a deal hunter</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Hi there! 👋
      </p>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        Welcome to BookingsFinder! You've just joined thousands of savvy travelers who save hundreds on flights every year. Here's what you can expect:
      </p>
      
      <!-- Benefits List -->
      <div style="margin-bottom: 30px;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
          <span style="font-size: 24px; margin-right: 15px;">✈️</span>
          <div>
            <p style="margin: 0; font-weight: 600; color: #18181b;">Price Drop Alerts</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Get notified instantly when flight prices drop for routes you're watching.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
          <span style="font-size: 24px; margin-right: 15px;">💰</span>
          <div>
            <p style="margin: 0; font-weight: 600; color: #18181b;">Weekly Deal Roundups</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Curated deals delivered to your inbox every week.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
          <span style="font-size: 24px; margin-right: 15px;">🔥</span>
          <div>
            <p style="margin: 0; font-weight: 600; color: #18181b;">Flash Sale Alerts</p>
            <p style="margin: 5px 0 0; color: #71717a; font-size: 14px;">Be first to know about limited-time flash sales and error fares.</p>
          </div>
        </div>
      </div>
      
      <!-- CTA -->
      <div style="background-color: #f4f4f5; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 25px;">
        <p style="color: #18181b; font-size: 16px; margin: 0 0 15px; font-weight: 600;">
          Ready to find your next adventure?
        </p>
        <a href="https://bookingsfinder.com" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Start Searching →
        </a>
      </div>
      
      <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
        Happy travels! 🌍<br>
        <strong>The BookingsFinder Team</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 30px; text-align: center;">
      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px;">
        BookingsFinder | 13 Wildflower Street, Yarrabilba, 4207 Brisbane, Australia
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        <a href="{{unsubscribe_url}}" style="color: #a1a1aa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
];
