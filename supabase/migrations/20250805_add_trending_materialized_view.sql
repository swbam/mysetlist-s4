-- Materialized view for trending artists to speed up homepage & API

-- 1. Drop if exists to allow re-deploy safely
DROP MATERIALIZED VIEW IF EXISTS public.trending_artists_mv;

-- 2. Create fresh materialized view based on most important fields
CREATE MATERIALIZED VIEW public.trending_artists_mv AS
SELECT
  id,
  name,
  slug,
  image_url,
  small_image_url,
  genres,
  popularity,
  followers,
  trending_score,
  verified,
  total_shows,
  upcoming_shows,
  updated_at
FROM public.artists
WHERE (trending_score IS NOT NULL AND trending_score > 0)
   OR (popularity IS NOT NULL AND popularity > 0)
ORDER BY trending_score DESC NULLS LAST, popularity DESC NULLS LAST
LIMIT 1000;

-- 3. Index for quick pagination / ordering
CREATE UNIQUE INDEX CONCURRENTLY trending_artists_mv_id_idx ON public.trending_artists_mv(id);

-- 4. Make sure anon & authenticated can read (RLS view will inherit)
GRANT SELECT ON public.trending_artists_mv TO anon, authenticated, service_role;

-- 5. Helper function to refresh; can be called from cron or HTTP edge function
CREATE OR REPLACE FUNCTION public.refresh_trending_artists_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_artists_mv;
END;$$;

GRANT EXECUTE ON FUNCTION public.refresh_trending_artists_mv() TO service_role;

