-- Ensure required extensions are enabled for cron HTTP calls and scheduling
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Helper function to refresh trending materialized views safely if they exist
do $$
begin
  if exists (
    select 1 from information_schema.tables where table_name = 'trending_artists_summary'
  ) then
    perform 1; -- no-op placeholder
  end if;
end $$;


