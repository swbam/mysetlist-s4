const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCronStatus() {
  try {
    console.log('Checking cron job status...');
    
    // Check if cron extension is enabled
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'pg_cron');
    
    console.log('pg_cron extension:', extensions?.length > 0 ? 'enabled' : 'not found');

    // Check scheduled cron jobs
    const { data: cronJobs, error: jobError } = await supabase
      .from('cron.job')
      .select('*')
      .order('jobid', { ascending: false });
    
    if (!jobError && cronJobs) {
      console.log('\nScheduled cron jobs:', cronJobs);
    } else {
      console.log('Cron jobs query error:', jobError);
    }

    // Check recent cron job execution logs
    const { data: cronLogs, error: logError } = await supabase
      .from('cron.job_run_details')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(10);
    
    if (!logError && cronLogs) {
      console.log('\nRecent cron job executions:', cronLogs);
    } else {
      console.log('Cron logs query error:', logError);
    }

    // Try to manually trigger trending update
    console.log('\n\nTrying to call Edge Function update-trending...');
    const { data: edgeResult, error: edgeError } = await supabase.functions
      .invoke('update-trending', {
        body: { manual: true }
      });
    
    if (edgeError) {
      console.error('Edge function error:', edgeError);
    } else {
      console.log('Edge function result:', edgeResult);
    }

  } catch (error) {
    console.error('Cron status check failed:', error);
  }
}

checkCronStatus();
