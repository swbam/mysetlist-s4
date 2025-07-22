import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTrendingScores() {
  console.log('Adding trending scores to artists, shows, and venues...');

  try {
    // Update artists with trending scores based on popularity
    const { data: artists } = await supabase
      .from('artists')
      .select('id, popularity, followers')
      .limit(100);

    if (artists) {
      for (const artist of artists) {
        const trendingScore = 
          (artist.popularity || 0) * 0.5 + 
          Math.min(artist.followers || 0, 1000000) / 10000 +
          Math.random() * 50;

        await supabase
          .from('artists')
          .update({ trending_score: Math.round(trendingScore) })
          .eq('id', artist.id);
      }
      console.log(`Updated ${artists.length} artists with trending scores`);
    }

    // Update shows with trending scores
    const { data: shows } = await supabase
      .from('shows')
      .select('id, view_count, vote_count, attendee_count')
      .limit(100);

    if (shows) {
      for (const show of shows) {
        const trendingScore = 
          (show.view_count || 0) * 0.3 + 
          (show.vote_count || 0) * 2 + 
          (show.attendee_count || 0) * 1.5 +
          Math.random() * 30;

        await supabase
          .from('shows')
          .update({ trending_score: Math.round(trendingScore) })
          .eq('id', show.id);
      }
      console.log(`Updated ${shows.length} shows with trending scores`);
    }

    // Add some view counts and attendee counts to make data more realistic
    const { data: upcomingShows } = await supabase
      .from('shows')
      .select('id')
      .gte('date', new Date().toISOString().split('T')[0])
      .limit(50);

    if (upcomingShows) {
      for (const show of upcomingShows) {
        await supabase
          .from('shows')
          .update({
            view_count: Math.floor(Math.random() * 500),
            attendee_count: Math.floor(Math.random() * 100),
            vote_count: Math.floor(Math.random() * 50),
          })
          .eq('id', show.id);
      }
      console.log(`Added activity data to ${upcomingShows.length} upcoming shows`);
    }

    console.log('Successfully added trending scores!');
  } catch (error) {
    console.error('Error adding trending scores:', error);
  }
}

addTrendingScores();