-- SQL script to check for edge functions and related data in Supabase
-- Run this in Supabase SQL Editor to see function-related information

-- Check cron jobs that might be calling edge functions
SELECT 
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    username
FROM cron.job
ORDER BY jobname;

-- Check cron job details
SELECT 
    jobid,
    jobname,
    schedule,
    command
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 20;

-- Check recent cron job logs
SELECT 
    job_name,
    status,
    message,
    details,
    created_at
FROM public.cron_job_logs
WHERE job_name LIKE '%edge%' 
   OR job_name LIKE '%function%'
   OR message LIKE '%edge%'
   OR message LIKE '%function%'
ORDER BY created_at DESC
LIMIT 50;

-- Check if there are any references to edge functions in your database
SELECT 
    'cron_job_logs' as table_name,
    COUNT(*) as edge_function_references
FROM public.cron_job_logs
WHERE message LIKE '%edge function%'
   OR details::text LIKE '%edge function%'
UNION ALL
SELECT 
    'cron.job' as table_name,
    COUNT(*) as edge_function_references
FROM cron.job
WHERE command LIKE '%edge.%'
   OR command LIKE '%function%';

-- List all custom functions in the public schema (not edge functions, but DB functions)
SELECT 
    proname AS function_name,
    pronargs AS num_arguments,
    pg_get_function_identity_arguments(oid) AS arguments,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
    AND prokind = 'f'
ORDER BY proname;

-- Check app settings that might reference edge functions
SELECT 
    name,
    value
FROM app.settings
WHERE value LIKE '%edge%'
   OR value LIKE '%function%'
   OR name LIKE '%url%';