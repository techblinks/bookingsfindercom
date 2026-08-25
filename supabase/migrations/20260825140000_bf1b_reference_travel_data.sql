-- BF1-B: Reference Travel Data Layer (countries / cities / airports / airlines / metro_airports)
-- Forward-only. Purely additive. No existing product tables are modified.
-- Sources & licences: see scripts/reference-data/SOURCES.md (OurAirports PD; GeoNames CC BY 4.0;
-- OpenFlights ODbL; mledoze/countries ODbL). Snapshot 2026-08-25.
-- Access model: world-readable SELECT; client writes forbidden; service/admin import path only.

create table public.countries (
  iso2            char(2) primary key check (iso2 ~ '^[A-Z]{2}$'),
  iso3            char(3) not null unique check (iso3 ~ '^[A-Z]{3}$'),
  name            text    not null,
  currency_code   char(3) check (currency_code ~ '^[A-Z]{3}$'),
  source          text    not null,
  source_record_id text,
  imported_at     timestamptz not null default now()
);

create table public.cities (
  id              bigint   primary key,           -- GeoNames geonameid; negative ids = curated synthetic metro hosts
  name            text     not null,
  country_iso2    char(2)  not null references public.countries(iso2),
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  iata_code       varchar(3) check (iata_code ~ '^[A-Z]{3}$'), -- metro/city code when applicable
  is_metro        boolean  not null default false,
  population      integer,
  timezone        text,
  source          text     not null,
  source_record_id text,
  imported_at     timestamptz not null default now()
);
create index cities_country_idx on public.cities(country_iso2);
create unique index cities_iata_idx on public.cities(iata_code) where iata_code is not null;

create table public.airports (
  iata            varchar(3) primary key check (iata ~ '^[A-Z]{3}$'),
  icao            char(4)  check (icao ~ '^[A-Z]{4}$'),
  name            text     not null,
  city_id         bigint   references public.cities(id),
  municipality    text,
  country_iso2    char(2)  not null references public.countries(iso2),
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  airport_type    text     not null,
  is_active       boolean  not null default true,
  source          text     not null,
  source_record_id text,
  imported_at     timestamptz not null default now()
);
create unique index airports_icao_idx on public.airports(icao) where icao is not null;
create index airports_city_idx on public.airports(city_id);
create index airports_country_idx on public.airports(country_iso2);

create table public.airlines (
  id              bigint   primary key,           -- OpenFlights airline id
  iata            varchar(2) check (iata ~ '^[A-Z0-9]{2}$'),
  icao            char(3)  check (icao ~ '^[A-Z]{3}$'),
  name            text     not null,
  country_iso2    char(2)  references public.countries(iso2),
  is_active       boolean,
  source          text     not null,
  source_record_id text,
  imported_at     timestamptz not null default now()
);
create unique index airlines_iata_idx on public.airlines(iata) where iata is not null;
create unique index airlines_icao_idx on public.airlines(icao) where icao is not null;
create index airlines_country_idx on public.airlines(country_iso2);

create table public.metro_airports (
  metro_code      varchar(3) not null check (metro_code ~ '^[A-Z]{3}$'),
  airport_iata    varchar(3) not null references public.airports(iata),
  rank            int        not null check (rank >= 1),
  source          text       not null default 'curated',
  source_record_id text,
  imported_at     timestamptz not null default now(),
  primary key (metro_code, airport_iata)
);
create index metro_airports_airport_idx on public.metro_airports(airport_iata);

-- RLS: explicit least privilege (BF-0R discipline).
alter table public.countries      enable row level security;
alter table public.cities         enable row level security;
alter table public.airports       enable row level security;
alter table public.airlines       enable row level security;
alter table public.metro_airports enable row level security;

create policy "reference_world_read_countries"      on public.countries      for select to anon, authenticated using (true);
create policy "reference_world_read_cities"         on public.cities         for select to anon, authenticated using (true);
create policy "reference_world_read_airports"       on public.airports       for select to anon, authenticated using (true);
create policy "reference_world_read_airlines"       on public.airlines       for select to anon, authenticated using (true);
create policy "reference_world_read_metro_airports" on public.metro_airports for select to anon, authenticated using (true);

-- Supabase default privileges grant ALL on new tables to anon/authenticated; strip writes.
revoke insert, update, delete, truncate on public.countries      from anon, authenticated;
revoke insert, update, delete, truncate on public.cities         from anon, authenticated;
revoke insert, update, delete, truncate on public.airports       from anon, authenticated;
revoke insert, update, delete, truncate on public.airlines       from anon, authenticated;
revoke insert, update, delete, truncate on public.metro_airports from anon, authenticated;
grant  select on public.countries      to anon, authenticated;
grant  select on public.cities         to anon, authenticated;
grant  select on public.airports       to anon, authenticated;
grant  select on public.airlines       to anon, authenticated;
grant  select on public.metro_airports to anon, authenticated;
