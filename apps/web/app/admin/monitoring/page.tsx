import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MonitoringDashboard } from './components/monitoring-dashboard';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/sign-in');
  }
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    redirect('/');
  }
  
  // Fetch monitoring data
  const [
    { data: dbStats },
    { data: apiStats },
    { data: errorLogs },
    { data: userActivity }
  ] = await Promise.all([
    supabase.rpc('get_database_stats'),
    supabase.rpc('get_api_stats'),
    supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.rpc('get_user_activity_stats')
  ]);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">System Monitoring</h1>
      
      <MonitoringDashboard
        dbStats={dbStats || {}}
        apiStats={apiStats || {}}
        errorLogs={errorLogs || []}
        userActivity={userActivity || {}}
      />
    </div>
  );
}