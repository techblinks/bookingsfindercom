# Supabase Owner Setup — BookingsFinder V2

This guide walks you through migrating BookingsFinder to your own Supabase project.

---

## What You'll Need

- A Supabase account (free tier works)
- Git and Node.js installed
- Access to this repository
- About 30 minutes

---

## Step 1: Create Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Choose an organization (create one if needed)
4. Name your project (e.g., "bookingsfinder")
5. **Choose a secure database password** — save it in a password manager
6. Choose a region close to your users
7. Click **Create project** — wait 2-3 minutes

---

## Step 2: Record Your Project Details

After creation, go to **Project Settings > API** and copy:

- **Project URL** — looks like `https://abc123xyz.supabase.co`
- **anon/public key** — starts with `eyJ...`

Save these somewhere secure.

---

## Step 3: Install Supabase CLI

```bash
# macOS / Linux
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop install supabase

# Or via npm
npm install -g supabase
```

---

## Step 4: Authenticate the CLI

```bash
supabase login
```

This opens a browser — complete the authentication.

---

## Step 5: Link the Repository

```bash
cd bookingsfindercom
supabase link --project-ref [your-project-ref]
```

Your project ref is in the URL: `https://[ref].supabase.co`

---

## Step 6: Apply Database Migrations

```bash
supabase db push
```

This creates all tables, policies, functions, triggers, and enums.

**If you see errors**, check:
- Your database password is correct
- The CLI is authenticated
- The project is linked correctly

---

## Step 7: Configure Authentication

### Redirect URLs

In your Supabase dashboard, go to **Authentication > URL Configuration**:

Add these redirect URLs:
```
http://localhost:8080/**
https://bookingsfinder.com/**
```

### Email Auth Provider

Under **Authentication > Providers**:
- Ensure **Email** is enabled
- Disable **Confirm email** for development (enable for production)

---

## Step 8: Configure Environment Variables

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=[your-anon-key]
   ```

### Production/Hosting

Add the same two variables to your hosting platform (Vercel, Netlify, etc.).

---

## Step 9: Deploy Edge Functions

The app uses 25 Supabase Edge Functions. Deploy them:

```bash
supabase functions deploy
```

### Configure Edge Function Secrets

Some functions require API keys. Set these in your Supabase dashboard under **Project Settings > Edge Functions > Secrets**:

| Secret | Required For |
|---|---|
| Travelpayouts API token | `search-flights`, `get-popular-directions`, `get-price-calendar`, `get-route-prices` |
| Stripe secret key | `create-checkout-session`, `stripe-webhook` |
| Stripe webhook secret | `stripe-webhook` |
| Email service credentials | `send-welcome-email`, `send-bulk-email`, `send-price-alert` |
| OpenRouter/AI API key | `generate-seo-content`, `run-optimizer` |

**Without these secrets, those features will fail gracefully** — the core planner and flight search will still work.

---

## Step 10: Regenerate Database Types

```bash
supabase gen types typescript --project-id [your-project-ref] > src/integrations/supabase/types.ts
```

---

## Step 11: Run Local Validation

```bash
npm install
npm run test:run
npm run build
npm run lint
```

All tests should pass. The build should complete without errors.

---

## Step 12: Start the App Locally

```bash
npm run dev
```

Open `http://localhost:8080` — you should see the homepage, use the Trip Budget Planner, and search flights.

---

## Step 13: Deploy to Production

Deploy to your hosting platform. Ensure the `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables are set in production.

---

## Step 14: Disconnect the Old Project

Only after verifying everything works on the new project:

1. **Do not delete** the old Lovable project — you may need to recover data
2. Simply stop using the old environment variables
3. Update any DNS or hosting config pointing to the old project

---

## Data Migration

**If the old Lovable project contains user data:**

Unfortunately, migrating data requires access to the old project (database credentials or a pg_dump export). If you have access:

```bash
# Export from old project
supabase db dump --linked --data-only > old_data.sql

# Import to new project (after migrations are applied)
psql [new-connection-string] < old_data.sql
```

**If you do NOT have access to the old project:**

Starting fresh may be the best approach. The Trip Budget Planner data is stored only in your browser (localStorage) and does not depend on Supabase. Blog posts, subscribers, admin settings, and other server-side data would need to be recreated.

---

## Commands Quick Reference

| Task | Command |
|---|---|
| Link project | `supabase link --project-ref [ref]` |
| Apply migrations | `supabase db push` |
| Deploy functions | `supabase functions deploy` |
| Generate types | `supabase gen types typescript --project-id [ref] > src/integrations/supabase/types.ts` |
| Local dev | `npm run dev` |
| Run tests | `npm run test:run` |
| Build | `npm run build` |
| Lint | `npm run lint` |

---

## Commands the Owner Must Run (Not Automated)

- [ ] `supabase login`
- [ ] `supabase link --project-ref [ref]`
- [ ] `supabase db push`
- [ ] `supabase functions deploy`
- [ ] Set Edge Function secrets in dashboard
- [ ] Configure auth redirect URLs in dashboard
- [ ] Populate `.env` file
- [ ] Populate hosting environment variables

## Destructive Commands (Do NOT Run Casually)

- `supabase db reset` — destroys all data
- `supabase db push` on a project with existing data — may conflict
- Deleting the old Lovable project — data may be unrecoverable
