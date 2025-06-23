import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserAnalyticsDashboard } from './components/user-analytics-dashboard';

export default async function UserAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/sign-in');
  }
  
  // Fetch user stats from database
  const [
    { data: profile },
    { data: attendedShows },
    { data: followedArtists },
    { data: votes },
    { data: recentActivity }
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    
    supabase
      .from('user_shows')
      .select('*, shows(*, artists(*), venues(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    
    supabase
      .from('user_artists')
      .select('*, artists(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    
    supabase
      .from('song_votes')
      .select('*, songs(*), shows(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    
    supabase
      .rpc('get_user_activity', { p_user_id: user.id })
  ]);
  
  const stats = {
    showsAttended: attendedShows?.length || 0,
    artistsFollowed: followedArtists?.length || 0,
    votesCast: votes?.length || 0,
    memberSince: profile?.created_at || user.created_at,
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Your Music Analytics</h1>
      
      <UserAnalyticsDashboard
        stats={stats}
        attendedShows={attendedShows || []}
        followedArtists={followedArtists || []}
        votes={votes || []}
        recentActivity={recentActivity || []}
      />
    </div>
  );
}