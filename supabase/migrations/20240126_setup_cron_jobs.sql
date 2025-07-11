-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron;

-- Enable pg_net extension for HTTP requests from cron jobs
create extension if not exists pg_net;

-- Grant usage on cron schema to postgres role
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Create app_settings table if it doesn't exist
create table if not exists app_settings (
  key text primary key,
  value text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Insert or update app settings
insert into app_settings (key, value) 
values 
  ('app_url', 'https://mysetlist-sonnet.vercel.app'),
  ('cron_secret', coalesce(current_setting('app.settings.cron_secret', true), 'default_secret'))
on conflict (key) 
do update set 
  value = excluded.value,
  updated_at = now();

-- Function to get app settings
create or replace function get_app_setting(setting_key text)
returns text
language plpgsql
security definer
as $$
declare
  setting_value text;
begin
  select value into setting_value 
  from app_settings 
  where key = setting_key;
  
  return setting_value;
end;
$$;

-- Daily sync job (runs every day at 2 AM UTC)
select cron.schedule(
  'daily-sync',
  '0 2 * * *', -- Cron expression: daily at 2 AM UTC
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object(
      'type', 'all',
      'limit', 50
    )
  );
  $$
);

-- Hourly trending update job (runs every hour)
select cron.schedule(
  'hourly-trending-update',
  '0 * * * *', -- Cron expression: every hour
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object(
      'type', 'trending',
      'limit', 20
    )
  );
  $$
);

-- Weekly email digest job (runs every Sunday at 9 AM UTC)
select cron.schedule(
  'weekly-email-digest',
  '0 9 * * 0', -- Cron expression: Sunday at 9 AM UTC
  $$
  select net.http_get(
    url := (select get_app_setting('app_url')) || '/api/cron/weekly-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select get_app_setting('cron_secret'))
    )
  );
  $$
);

-- Daily reminder job (runs every day at 10 AM UTC)
select cron.schedule(
  'daily-reminders',
  '0 10 * * *', -- Cron expression: daily at 10 AM UTC
  $$
  select net.http_get(
    url := (select get_app_setting('app_url')) || '/api/cron/daily-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select get_app_setting('cron_secret'))
    )
  );
  $$
);

-- Email processing job (runs every 5 minutes)
select cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- Cron expression: every 5 minutes
  $$
  select net.http_get(
    url := (select get_app_setting('app_url')) || '/api/cron/email-processing',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select get_app_setting('cron_secret'))
    )
  );
  $$
);

-- Function to manually trigger sync (useful for testing)
create or replace function trigger_manual_sync(sync_type text default 'all')
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object(
      'type', sync_type,
      'limit', 10
    )
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permission on the manual sync function
grant execute on function trigger_manual_sync to authenticated;

-- Create a view to monitor cron job status
create or replace view cron_job_status as
select 
  jobname,
  schedule,
  active,
  jobid,
  username,
  database,
  command,
  nodename,
  nodeport,
  (select count(*) from cron.job_run_details where jobid = j.jobid and status = 'succeeded') as successful_runs,
  (select count(*) from cron.job_run_details where jobid = j.jobid and status = 'failed') as failed_runs,
  (select max(start_time) from cron.job_run_details where jobid = j.jobid) as last_run
from cron.job j
order by jobname;

-- Grant select permission on the status view
grant select on cron_job_status to authenticated;