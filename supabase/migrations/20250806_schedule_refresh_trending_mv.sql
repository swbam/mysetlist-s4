-- Schedule cron to refresh trending_artists_mv every 30 minutes (after trending score calculation)

-- Requires pg_cron extension (enabled by Supabase)

select cron.schedule(
  'refresh_trending_artists_mv',
  '*/30 * * * *',
  $$call public.refresh_trending_artists_mv();$$
);

-- Ensure job runs with service_role permissions
grant usage on schema cron to service_role;

