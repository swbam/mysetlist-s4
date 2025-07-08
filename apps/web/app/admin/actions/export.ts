'use server';

import { createClient } from '@/lib/supabase/server';

export async function exportUserData() {
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Fetch all user data
  const { data: users, error } = await supabase.from('users').select(`
      *,
      user_profiles (*),
      votes (*),
      setlists (*),
      venue_reviews (*),
      venue_photos (*),
      venue_insider_tips (*)
    `);

  if (error) {
    return { error: error.message };
  }

  // Convert to CSV or JSON
  const json = JSON.stringify(users, null, 2);

  return {
    data: json,
    filename: `users-export-${new Date().toISOString().split('T')[0]}.json`,
  };
}

export async function exportContentData() {
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Fetch all content data
  const [shows, artists, venues, setlists] = await Promise.all([
    supabase.from('shows').select('*'),
    supabase.from('artists').select('*'),
    supabase.from('venues').select('*'),
    supabase.from('setlists').select('*, setlist_songs(*)'),
  ]);

  const data = {
    shows: shows.data,
    artists: artists.data,
    venues: venues.data,
    setlists: setlists.data,
  };

  const json = JSON.stringify(data, null, 2);

  return {
    data: json,
    filename: `content-export-${new Date().toISOString().split('T')[0]}.json`,
  };
}

export async function exportAnalyticsData() {
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Fetch analytics data
  const { data: stats, error } = await supabase
    .from('platform_stats')
    .select('*')
    .order('stat_date', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  // Convert to CSV format
  const headers = Object.keys(stats[0] || {}).join(',');
  const rows = stats.map((row) => Object.values(row).join(','));
  const csv = [headers, ...rows].join('\n');

  return {
    data: csv,
    filename: `analytics-export-${new Date().toISOString().split('T')[0]}.csv`,
  };
}
