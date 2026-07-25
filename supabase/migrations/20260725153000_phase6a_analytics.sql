-- Phase 6A: Analytics Foundation
-- Tables: search_events, click_events, daily_metrics

-- search_events --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id    TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  origin        TEXT,
  destination   TEXT,
  departure_date DATE,
  return_date   DATE,
  adults        INTEGER,
  children      INTEGER,
  infants       INTEGER,
  cabin_class   TEXT,
  trip_type     TEXT CHECK (trip_type IN ('oneway', 'roundtrip', 'multi')) DEFAULT 'oneway',
  currency      TEXT DEFAULT 'AUD',
  country       TEXT,
  device        TEXT,
  landing_page  TEXT,
  referrer      TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT
);

CREATE INDEX idx_search_events_created_at ON public.search_events(created_at DESC);
CREATE INDEX idx_search_events_session_id ON public.search_events(session_id);
CREATE INDEX idx_search_events_origin_dest ON public.search_events(origin, destination);

ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert search events"
  ON public.search_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can select search events"
  ON public.search_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  ));

-- click_events ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.click_events (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_event_id   UUID REFERENCES public.search_events(id) ON DELETE SET NULL,
  partner           TEXT NOT NULL,
  partner_type      TEXT CHECK (partner_type IN ('flight', 'hotel')) DEFAULT 'flight',
  route             TEXT,
  airline           TEXT,
  price             NUMERIC(10,2),
  currency          TEXT DEFAULT 'AUD',
  white_label_used  BOOLEAN DEFAULT FALSE,
  fallback_used     BOOLEAN DEFAULT FALSE,
  destination_url   TEXT,
  landing_page      TEXT,
  device            TEXT,
  session_id        TEXT NOT NULL
);

CREATE INDEX idx_click_events_created_at ON public.click_events(created_at DESC);
CREATE INDEX idx_click_events_session_id ON public.click_events(session_id);
CREATE INDEX idx_click_events_partner ON public.click_events(partner);
CREATE INDEX idx_click_events_search_event ON public.click_events(search_event_id);

ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert click events"
  ON public.click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can select click events"
  ON public.click_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  ));

-- daily_metrics --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date            DATE NOT NULL UNIQUE,
  total_searches  INTEGER DEFAULT 0,
  total_clicks    INTEGER DEFAULT 0,
  flight_searches INTEGER DEFAULT 0,
  hotel_searches  INTEGER DEFAULT 0,
  flight_clicks   INTEGER DEFAULT 0,
  hotel_clicks    INTEGER DEFAULT 0,
  white_label_clicks INTEGER DEFAULT 0,
  fallback_clicks    INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  ctr             NUMERIC(5,4) GENERATED ALWAYS AS (
    CASE WHEN total_searches > 0
      THEN ROUND(total_clicks::NUMERIC / total_searches, 4)
      ELSE 0
    END
  ) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can select daily metrics"
  ON public.daily_metrics FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  ));
