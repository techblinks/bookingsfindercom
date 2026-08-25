-- BF1-D: Supplier Registry — the identity spine for travel provider integrations.
--
-- Forward-only. Purely additive. No existing table, view, function or policy is modified.
--
-- SECRET-SAFETY CONTRACT (binding):
--   This table stores provider IDENTITY and NON-SENSITIVE METADATA ONLY.
--   config_refs holds environment variable NAMES (e.g. "TRAVELPAYOUTS_API_KEY"),
--   NEVER their values. No tokens, keys, secrets, passwords or credentials may
--   ever be inserted into this table. Writes go through service_role/admin only.
--
-- Capability model:
--   capabilities          = capabilities that are BUILT and CONFIGURED today.
--                           Operational use still requires status = 'active'.
--   planned_capabilities  = roadmap potential ONLY. Never operational. Never counted
--                           by supplierSupports()/feature gates.
--
-- Status model (fail closed for anything that is not explicitly 'active'):
--   active | sandbox | disabled | deprecated
--
-- Mode model:
--   affiliate | transactional
--   Plain-text CHECK constraint (not a PG ENUM type) so supporting both modes for
--   one supplier later is a trivial additive constraint swap, and per-capability
--   commercial detail can live in commission/metadata without schema churn.
--
-- Vertical model:
--   flight | hotel | activity | multi
--
-- Health fields are placeholders for BF1-M monitoring. They stay NULL in BF1-D;
-- nothing in this package populates them.
--
-- Production safety preflight (docs/PRODUCTION_MIGRATION_SAFETY.md):
--   - collision scan: no table/policy/index named "suppliers*" existed (verified 2026-08-25)
--   - additive-only: new table + its own objects; zero consumers at deploy time
--   - corrective plan: if applied in error, drop table public.suppliers (additive inverse);
--     forward-only discipline otherwise applies

create table public.suppliers (
  id                    text        primary key
                        constraint suppliers_id_format_check
                        check (id ~ '^[a-z][a-z0-9_]{1,39}$'),
  display_name          text        not null
                        constraint suppliers_display_name_len_check
                        check (char_length(display_name) between 1 and 120),
  vertical              text        not null
                        constraint suppliers_vertical_check
                        check (vertical in ('flight', 'hotel', 'activity', 'multi')),
  status                text        not null
                        constraint suppliers_status_check
                        check (status in ('active', 'sandbox', 'disabled', 'deprecated')),
  mode                  text        not null
                        constraint suppliers_mode_check
                        check (mode in ('affiliate', 'transactional')),
  -- BUILT + CONFIGURED capabilities today (operational only when status = 'active')
  capabilities          jsonb       not null default '[]'::jsonb
                        constraint suppliers_capabilities_array_check
                        check (jsonb_typeof(capabilities) = 'array'),
  -- Future potential ONLY; never operational, never gated on
  planned_capabilities  jsonb       not null default '[]'::jsonb
                        constraint suppliers_planned_array_check
                        check (jsonb_typeof(planned_capabilities) = 'array'),
  -- Non-secret commercial metadata: model/attribution/notes. Rates only if ever
  -- explicitly configured. NULL = genuinely unknown; unknown must stay unknown.
  commission            jsonb       null
                        constraint suppliers_commission_object_check
                        check (commission is null or jsonb_typeof(commission) = 'object'),
  -- Environment variable NAMES only. NEVER values.
  config_refs           jsonb       not null default '{}'::jsonb
                        constraint suppliers_config_refs_object_check
                        check (jsonb_typeof(config_refs) = 'object'),
  -- BF1-M will populate these; NULL until real monitoring exists.
  health_last_ok_at     timestamptz null,
  health_last_error_at  timestamptz null,
  health_latency_ms     integer     null
                        constraint suppliers_health_latency_check
                        check (health_latency_ms is null or health_latency_ms >= 0),
  health_note           text        null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.suppliers is
  'Supplier/provider registry (BF1-D). Identity spine for travel integrations. '
  'Stores identity + non-sensitive metadata only; config_refs holds env var NAMES, never values. '
  'planned_capabilities is roadmap-only and never operational.';
comment on column public.suppliers.config_refs is
  'Names of required environment variables (e.g. {"tokenEnv":"TRAVELPAYOUTS_API_KEY"}). Values are NEVER stored here.';
comment on column public.suppliers.capabilities is
  'Capabilities built and configured today. Operational only while status = ''active''.';
comment on column public.suppliers.planned_capabilities is
  'Future potential capabilities. Roadmap documentation only; MUST NOT gate features.';
comment on column public.suppliers.commission is
  'Non-secret commercial metadata (model/attribution/notes). NULL means unknown; do not invent rates.';
comment on column public.suppliers.health_last_ok_at is
  'Reserved for BF1-M health monitoring. Null in BF1-D.';
comment on column public.suppliers.health_last_error_at is
  'Reserved for BF1-M health monitoring. Null in BF1-D.';

-- Keep updated_at truthful on metadata re-seeds.
-- Body kept single-line/single-quoted deliberately: the Management API apply
-- path splits statements outside quoted strings, so no dollar-quoting is used.
create function public.suppliers_touch_updated_at()
returns trigger
language plpgsql
as 'begin new.updated_at := now(); return new; end;';

create trigger suppliers_touch_updated_at_trigger
  before update on public.suppliers
  for each row execute function public.suppliers_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Initial verified seed rows (re-runnable: ON CONFLICT refreshes metadata only,
-- preserving health_* observations and created_at).
--
-- Viator is DISABLED: viator-public defaults to disabled unless the server-side
-- VIATOR_PUBLIC_ENABLED secret === "true", and _shared/viator-client.ts only ever
-- allows api.sandbox.viator.com. Fail-closed default is mirrored here.
--
-- Trip.com hotel fallback is deliberately NOT registered: in this repository it is
-- an outbound iframe widget partner (public/tripcom-hotel-widget-*.html hosted in
-- src/components/hotels/TripComHotelWidget.tsx), not a server-side provider
-- integration. Revisit if a real API integration ever replaces the widget.
-- ---------------------------------------------------------------------------

insert into public.suppliers
  (id, display_name, vertical, status, mode, capabilities, planned_capabilities, commission, config_refs)
values
  (
    'travelpayouts',
    'Travelpayouts',
    'flight',
    'active',
    'affiliate',
    '["flightSearch", "priceCalendar", "routeSuggestions", "specialOffers", "affiliateRedirect"]'::jsonb,
    '[]'::jsonb,
    '{"model": "affiliate", "attributionMechanism": "MARKER_ID marker parameter carried on white-label search and redirect URLs"}'::jsonb,
    '{"tokenEnv": "TRAVELPAYOUTS_API_KEY", "tokenAltEnv": "TRAVELPAYOUTS_API_TOKEN", "markerEnv": "MARKER_ID"}'::jsonb
  ),
  (
    'tiqets',
    'Tiqets',
    'activity',
    'active',
    'affiliate',
    '["activitySearch", "activityDetail", "affiliateRedirect"]'::jsonb,
    '[]'::jsonb,
    '{"model": "affiliate", "attributionMechanism": "partner deep links to tiqets.com product pages"}'::jsonb,
    '{"tokenEnv": "TIQETS_API_TOKEN", "baseUrlEnv": "TIQETS_API_BASE_URL"}'::jsonb
  ),
  (
    'viator',
    'Viator',
    'activity',
    'disabled',
    'affiliate',
    '["activitySearch", "activityDetail", "affiliateRedirect"]'::jsonb,
    '[]'::jsonb,
    '{"model": "affiliate", "notes": "integration built but kill-switched off server-side via enabledFlagEnv; sandbox-grade client only"}'::jsonb,
    '{"apiKeyEnv": "VIATOR_API_KEY", "baseUrlEnv": "VIATOR_API_BASE_URL", "enabledFlagEnv": "VIATOR_PUBLIC_ENABLED"}'::jsonb
  ),
  (
    'duffel',
    'Duffel',
    'flight',
    'disabled',
    'transactional',
    '[]'::jsonb,
    '["flightSearch", "offerReprice", "booking", "cancellation", "refund"]'::jsonb,
    null,
    '{}'::jsonb
  )
on conflict (id) do update set
  display_name         = excluded.display_name,
  vertical             = excluded.vertical,
  status               = excluded.status,
  mode                 = excluded.mode,
  capabilities         = excluded.capabilities,
  planned_capabilities = excluded.planned_capabilities,
  commission           = excluded.commission,
  config_refs          = excluded.config_refs,
  updated_at           = now();
  -- health_* and created_at intentionally untouched by re-seeds.

-- ---------------------------------------------------------------------------
-- RLS / access model: world-readable SELECT; clients can never write.
-- Mirrors the BF-0R/BF1-B least-privilege pattern.
-- ---------------------------------------------------------------------------

alter table public.suppliers enable row level security;

create policy "suppliers_world_read"
  on public.suppliers
  for select
  to anon, authenticated
  using (true);

-- Supabase default privileges grant ALL on new tables to anon/authenticated; strip writes.
revoke insert, update, delete, truncate on public.suppliers from anon, authenticated;
revoke references, trigger on public.suppliers from anon, authenticated;
grant  select on public.suppliers to anon, authenticated;
-- service_role retains its default ALL (bypasses RLS): admin/import path only.
