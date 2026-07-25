# BookingsFinder

Compare flights and hotels across 500+ airlines and millions of properties. BookingsFinder searches hundreds of travel sites to find you the best deals.

**Live**: [bookingsfinder.com](https://bookingsfinder.com)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| Backend | Supabase (PostgreSQL, Edge Functions) |
| APIs | Travelpayouts (Aviasales, Hotellook) |
| Email | Resend |
| Payments | Stripe |

## Getting Started

```sh
# Clone
git clone https://github.com/techblinks/bookingsfindercom.git
cd bookingsfindercom

# Install
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Run
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `VITE_TRAVEL_WHITE_LABEL_MODE` | No | White Label rollout: `disabled` (default), `test`, `enabled` |
| `VITE_TRAVEL_WHITE_LABEL_HOST` | No | White Label custom domain |

## Project Structure

```
src/
├── components/    # UI components (flights, hotels, search, layout)
├── hooks/         # React hooks (useFlightSearch, usePriceAlerts, etc.)
├── lib/           # Shared utilities and configuration
├── pages/         # Route-level page components
├── services/      # API service layer (Supabase Edge Functions)
└── types/         # TypeScript type definitions

supabase/
├── functions/     # 26 Edge Functions (Deno runtime)
└── migrations/    # Database schema migrations
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm test` | Run tests (Vitest) |
| `npm run lint` | Lint with ESLint |

## Testing

```sh
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

---

## Deployment

Build outputs to `dist/`. Deploy to any static host (Vercel, Netlify, Cloudflare Pages).

Supabase Edge Functions are deployed separately via the Supabase CLI:

```sh
supabase functions deploy <function-name>
```

---

## License

All rights reserved.
