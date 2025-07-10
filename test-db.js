import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzwkimtdaabyjbpykquu.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    // Check artists table
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, slug, verified, spotify_id, ticketmaster_id')
      .limit(10);

    if (artistsError) {
    } else if (artists && artists.length > 0) {
    }

    // Check shows table
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, name, date, venue_id, headliner_artist_id')
      .limit(5);

    if (showsError) {
    } else if (shows && shows.length > 0) {
    }

    // Check venues table
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, city, state, country')
      .limit(5);

    if (venuesError) {
    } else if (venues && venues.length > 0) {
    }

    // Check songs table
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, title, artist, album')
      .limit(5);

    if (songsError) {
    } else if (songs && songs.length > 0) {
    }

    // Check setlists table
    const { data: setlists, error: setlistsError } = await supabase
      .from('setlists')
      .select('id, show_id, artist_id, name, type')
      .limit(5);

    if (setlistsError) {
    } else if (setlists && setlists.length > 0) {
    }
  } catch (_error) {}
}

testDatabase();
