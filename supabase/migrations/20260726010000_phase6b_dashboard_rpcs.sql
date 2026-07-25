-- Phase 6B: Revenue Intelligence Dashboard — RPCs with admin authorisation
-- All RPCs verify auth.uid() + user_roles.admin before returning data.

-- ── Helper: admin check ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_admin_access FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_admin_access TO authenticated;

-- ── Indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_search_events_route_created
  ON public.search_events(origin, destination, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_partner_created
  ON public.click_events(partner, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_wl_fallback_created
  ON public.click_events(white_label_used, fallback_used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_airline_created
  ON public.click_events(airline, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_events_landing_created
  ON public.search_events(landing_page, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_landing_created
  ON public.click_events(landing_page, created_at DESC);

-- ── RPC 1: get_dashboard_kpis ───────────────────────────────────

DROP FUNCTION IF EXISTS public.get_dashboard_kpis;

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_searches BIGINT,
  total_clicks BIGINT,
  flight_searches BIGINT,
  hotel_searches BIGINT,
  flight_clicks BIGINT,
  hotel_clicks BIGINT,
  wl_clicks BIGINT,
  fallback_clicks BIGINT,
  avg_clicked_fare NUMERIC,
  dominant_currency TEXT,
  currencies TEXT,
  mixed_currency BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  currency_count INTEGER;
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  WITH search_counts AS (
    SELECT COUNT(*)::BIGINT AS total
    FROM search_events
    WHERE created_at >= start_date AND created_at < end_date
  ),
  click_counts AS (
    SELECT
      COUNT(*)::BIGINT AS total,
      COUNT(*) FILTER (WHERE partner_type = 'flight')::BIGINT AS flight_total,
      COUNT(*) FILTER (WHERE partner_type = 'hotel')::BIGINT AS hotel_total,
      COUNT(*) FILTER (WHERE white_label_used = true)::BIGINT AS wl_total,
      COUNT(*) FILTER (WHERE fallback_used = true)::BIGINT AS fb_total,
      COUNT(DISTINCT currency) FILTER (WHERE currency IS NOT NULL AND price IS NOT NULL AND price > 0) AS currency_cnt,
      AVG(price) FILTER (WHERE price IS NOT NULL AND price > 0) AS avg_price,
      STRING_AGG(DISTINCT currency, ',') FILTER (WHERE currency IS NOT NULL) AS all_currencies,
      MODE() WITHIN GROUP (ORDER BY currency) AS dom_currency
    FROM click_events
    WHERE created_at >= start_date AND created_at < end_date
  ),
  flight_searches AS (
    SELECT COUNT(*)::BIGINT AS total
    FROM search_events
    WHERE created_at >= start_date AND created_at < end_date
      AND landing_page = '/flights'
  ),
  hotel_searches AS (
    SELECT COUNT(*)::BIGINT AS total
    FROM search_events
    WHERE created_at >= start_date AND created_at < end_date
      AND landing_page = '/hotels'
  )
  SELECT
    s.total,
    c.total,
    fs.total,
    hs.total,
    c.flight_total,
    c.hotel_total,
    c.wl_total,
    c.fb_total,
    CASE WHEN c.currency_cnt <= 1 THEN COALESCE(c.avg_price, 0) ELSE NULL END,
    c.dom_currency,
    c.all_currencies,
    c.currency_cnt > 1
  FROM search_counts s
  CROSS JOIN click_counts c
  CROSS JOIN flight_searches fs
  CROSS JOIN hotel_searches hs;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_kpis FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis TO authenticated;

-- ── RPC 2: get_top_routes ───────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_top_routes;

CREATE OR REPLACE FUNCTION public.get_top_routes(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  limit_rows INTEGER DEFAULT 10
)
RETURNS TABLE (
  origin TEXT,
  destination TEXT,
  searches BIGINT,
  clicks BIGINT,
  ctr NUMERIC,
  avg_price NUMERIC,
  top_partner TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  SELECT
    se.origin,
    se.destination,
    se.searches,
    COALESCE(ce.clicks, 0) AS clicks,
    CASE WHEN se.searches > 0
      THEN ROUND(COALESCE(ce.clicks, 0)::NUMERIC / se.searches * 100, 1)
      ELSE 0
    END AS ctr,
    ce.avg_price,
    ce.top_partner
  FROM (
    SELECT
      origin,
      destination,
      COUNT(*) AS searches
    FROM search_events
    WHERE created_at >= start_date
      AND created_at < end_date
      AND origin IS NOT NULL
      AND destination IS NOT NULL
    GROUP BY origin, destination
    ORDER BY searches DESC
    LIMIT limit_rows
  ) se
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS clicks,
      AVG(price) FILTER (WHERE price IS NOT NULL AND price > 0) AS avg_price,
      MODE() WITHIN GROUP (ORDER BY partner) AS top_partner
    FROM click_events
    WHERE created_at >= start_date
      AND created_at < end_date
      AND route = se.origin || '-' || se.destination
  ) ce ON true
  ORDER BY se.searches DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_top_routes FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_routes TO authenticated;

-- ── RPC 3: get_top_destinations ─────────────────────────────────

DROP FUNCTION IF EXISTS public.get_top_destinations;

CREATE OR REPLACE FUNCTION public.get_top_destinations(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  limit_rows INTEGER DEFAULT 10
)
RETURNS TABLE (
  destination TEXT,
  searches BIGINT,
  clicks BIGINT,
  ctr NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  SELECT
    se.destination,
    se.searches,
    COALESCE(ce.clicks, 0) AS clicks,
    CASE WHEN se.searches > 0
      THEN ROUND(COALESCE(ce.clicks, 0)::NUMERIC / se.searches * 100, 1)
      ELSE 0
    END AS ctr
  FROM (
    SELECT destination, COUNT(*) AS searches
    FROM search_events
    WHERE created_at >= start_date
      AND created_at < end_date
      AND destination IS NOT NULL
    GROUP BY destination
    ORDER BY searches DESC
    LIMIT limit_rows
  ) se
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS clicks
    FROM click_events
    WHERE created_at >= start_date
      AND created_at < end_date
      AND route LIKE '%' || se.destination
  ) ce ON true
  ORDER BY se.searches DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_top_destinations FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_destinations TO authenticated;

-- ── RPC 4: get_partner_performance ──────────────────────────────

DROP FUNCTION IF EXISTS public.get_partner_performance;

CREATE OR REPLACE FUNCTION public.get_partner_performance(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  partner TEXT,
  partner_type TEXT,
  clicks BIGINT,
  click_share NUMERIC,
  avg_price NUMERIC,
  wl_clicks BIGINT,
  fallback_clicks BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  WITH totals AS (
    SELECT COUNT(*)::NUMERIC AS total_clicks
    FROM click_events
    WHERE created_at >= start_date AND created_at < end_date
  ),
  partner_stats AS (
    SELECT
      partner,
      partner_type,
      COUNT(*) AS clicks,
      AVG(price) FILTER (WHERE price IS NOT NULL AND price > 0) AS avg_price,
      COUNT(*) FILTER (WHERE white_label_used = true) AS wl_clicks,
      COUNT(*) FILTER (WHERE fallback_used = true) AS fallback_clicks
    FROM click_events
    WHERE created_at >= start_date AND created_at < end_date
    GROUP BY partner, partner_type
  )
  SELECT
    ps.partner,
    ps.partner_type,
    ps.clicks::BIGINT,
    CASE WHEN t.total_clicks > 0
      THEN ROUND(ps.clicks::NUMERIC / t.total_clicks * 100, 1)
      ELSE 0
    END AS click_share,
    COALESCE(ps.avg_price, 0) AS avg_price,
    COALESCE(ps.wl_clicks, 0)::BIGINT,
    COALESCE(ps.fallback_clicks, 0)::BIGINT
  FROM partner_stats ps
  CROSS JOIN totals t
  ORDER BY ps.clicks DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_performance FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_performance TO authenticated;

-- ── RPC 5: get_airline_performance ──────────────────────────────

DROP FUNCTION IF EXISTS public.get_airline_performance;

CREATE OR REPLACE FUNCTION public.get_airline_performance(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  limit_rows INTEGER DEFAULT 10
)
RETURNS TABLE (
  airline TEXT,
  clicks BIGINT,
  avg_price NUMERIC,
  top_route TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  SELECT
    airline,
    COUNT(*)::BIGINT AS clicks,
    AVG(price) FILTER (WHERE price IS NOT NULL AND price > 0) AS avg_price,
    MODE() WITHIN GROUP (ORDER BY route) AS top_route
  FROM click_events
  WHERE created_at >= start_date
    AND created_at < end_date
    AND airline IS NOT NULL
    AND partner_type = 'flight'
  GROUP BY airline
  ORDER BY clicks DESC
  LIMIT limit_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_airline_performance FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_airline_performance TO authenticated;

-- ── RPC 6: get_landing_page_performance ─────────────────────────

DROP FUNCTION IF EXISTS public.get_landing_page_performance;

CREATE OR REPLACE FUNCTION public.get_landing_page_performance(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  landing_page TEXT,
  searches BIGINT,
  clicks BIGINT,
  ctr NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(se.landing_page, ''), '(direct)') AS landing_page,
    COALESCE(se.searches, 0)::BIGINT,
    COALESCE(ce.clicks, 0)::BIGINT,
    CASE WHEN COALESCE(se.searches, 0) > 0
      THEN ROUND(COALESCE(ce.clicks, 0)::NUMERIC / se.searches * 100, 1)
      ELSE 0
    END AS ctr
  FROM (
    SELECT landing_page, COUNT(*) AS searches
    FROM search_events
    WHERE created_at >= start_date AND created_at < end_date
    GROUP BY landing_page
  ) se
  FULL OUTER JOIN (
    SELECT landing_page, COUNT(*) AS clicks
    FROM click_events
    WHERE created_at >= start_date AND created_at < end_date
    GROUP BY landing_page
  ) ce ON COALESCE(NULLIF(se.landing_page, ''), '(direct)')
      = COALESCE(NULLIF(ce.landing_page, ''), '(direct)')
  ORDER BY se.searches DESC NULLS LAST
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_landing_page_performance FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_landing_page_performance TO authenticated;

-- ── RPC 7: get_traffic_sources ──────────────────────────────────

DROP FUNCTION IF EXISTS public.get_traffic_sources;

CREATE OR REPLACE FUNCTION public.get_traffic_sources(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  searches BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(utm_source, ''), '(none)') AS utm_source,
    COALESCE(NULLIF(utm_medium, ''), '(none)') AS utm_medium,
    COALESCE(NULLIF(utm_campaign, ''), '(none)') AS utm_campaign,
    COUNT(*)::BIGINT AS searches
  FROM search_events
  WHERE created_at >= start_date AND created_at < end_date
  GROUP BY utm_source, utm_medium, utm_campaign
  ORDER BY searches DESC
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_traffic_sources FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_traffic_sources TO authenticated;

-- ── RPC 8: get_wl_vs_fallback ───────────────────────────────────

DROP FUNCTION IF EXISTS public.get_wl_vs_fallback;

CREATE OR REPLACE FUNCTION public.get_wl_vs_fallback(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  white_label_clicks BIGINT,
  fallback_clicks BIGINT,
  total_clicks BIGINT,
  wl_percentage NUMERIC,
  fb_percentage NUMERIC,
  wl_top_routes JSONB,
  fb_top_routes JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  WITH totals AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE white_label_used = true) AS wl,
      COUNT(*) FILTER (WHERE fallback_used = true) AS fb
    FROM click_events
    WHERE created_at >= start_date AND created_at < end_date
      AND partner_type = 'flight'
  ),
  wl_routes AS (
    SELECT jsonb_agg(sub) AS routes
    FROM (
      SELECT route, COUNT(*) AS clicks
      FROM click_events
      WHERE created_at >= start_date AND created_at < end_date
        AND white_label_used = true
        AND route IS NOT NULL
      GROUP BY route
      ORDER BY clicks DESC
      LIMIT 5
    ) sub
  ),
  fb_routes AS (
    SELECT jsonb_agg(sub) AS routes
    FROM (
      SELECT route, COUNT(*) AS clicks
      FROM click_events
      WHERE created_at >= start_date AND created_at < end_date
        AND fallback_used = true
        AND route IS NOT NULL
      GROUP BY route
      ORDER BY clicks DESC
      LIMIT 5
    ) sub
  )
  SELECT
    t.wl::BIGINT,
    t.fb::BIGINT,
    t.total::BIGINT,
    CASE WHEN t.total > 0 THEN ROUND(t.wl::NUMERIC / t.total * 100, 1) ELSE 0 END,
    CASE WHEN t.total > 0 THEN ROUND(t.fb::NUMERIC / t.total * 100, 1) ELSE 0 END,
    COALESCE(wr.routes, '[]'::JSONB),
    COALESCE(fr.routes, '[]'::JSONB)
  FROM totals t
  CROSS JOIN wl_routes wr
  CROSS JOIN fb_routes fr;
END;
$$;

REVOKE ALL ON FUNCTION public.get_wl_vs_fallback FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wl_vs_fallback TO authenticated;

-- ── RPC 9: get_daily_trends ─────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_daily_trends;

CREATE OR REPLACE FUNCTION public.get_daily_trends(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  day DATE,
  searches BIGINT,
  clicks BIGINT,
  ctr NUMERIC,
  wl_clicks BIGINT,
  fb_clicks BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_admin_access();

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      start_date::DATE,
      (end_date::DATE - INTERVAL '1 day')::DATE,
      INTERVAL '1 day'
    )::DATE AS day
  ),
  search_daily AS (
    SELECT created_at::DATE AS day, COUNT(*) AS searches
    FROM search_events
    WHERE created_at >= start_date AND created_at < end_date
    GROUP BY created_at::DATE
  ),
  click_daily AS (
    SELECT
      created_at::DATE AS day,
      COUNT(*) AS clicks,
      COUNT(*) FILTER (WHERE white_label_used = true) AS wl,
      COUNT(*) FILTER (WHERE fallback_used = true) AS fb
    FROM click_events
    WHERE created_at >= start_date AND created_at < end_date
    GROUP BY created_at::DATE
  )
  SELECT
    d.day,
    COALESCE(sd.searches, 0)::BIGINT AS searches,
    COALESCE(cd.clicks, 0)::BIGINT AS clicks,
    CASE WHEN COALESCE(sd.searches, 0) > 0
      THEN ROUND(COALESCE(cd.clicks, 0)::NUMERIC / sd.searches * 100, 1)
      ELSE 0
    END AS ctr,
    COALESCE(cd.wl, 0)::BIGINT AS wl_clicks,
    COALESCE(cd.fb, 0)::BIGINT AS fb_clicks
  FROM days d
  LEFT JOIN search_daily sd ON sd.day = d.day
  LEFT JOIN click_daily cd ON cd.day = d.day
  ORDER BY d.day;
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_trends FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_trends TO authenticated;
