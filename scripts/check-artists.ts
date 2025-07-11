#!/usr/bin/env tsx
/**
 * Check if artists are already in the database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Checking existing artists in database...\n');

  try {
    // Get all artists
    const { data: allArtists, error: allError } = await supabase
      .from('artists')
      .select('id, name, spotify_id, followers, verified, trending_score')
      .order('followers', { ascending: false })
      .limit(20);

    if (allError) {
      console.error('Error fetching artists:', allError);
      return;
    }

    if (allArtists && allArtists.length > 0) {
      console.log(`✅ Found ${allArtists.length} artists in database:\n`);
      allArtists.forEach((artist, index) => {
        console.log(
          `${index + 1}. ${artist.name}${artist.verified ? ' ✓' : ''} - ${
            artist.followers?.toLocaleString() || '0'
          } followers (Trending: ${artist.trending_score || 0})`
        );
      });

      // Check for top artists
      const topArtistNames = ['Taylor Swift', 'Drake', 'Bad Bunny', 'The Weeknd', 'Post Malone'];
      const { data: topArtists } = await supabase
        .from('artists')
        .select('name')
        .in('name', topArtistNames);

      if (topArtists) {
        console.log('\n📊 Top 5 US Artists Status:');
        topArtistNames.forEach(name => {
          const found = topArtists.some(a => a.name === name);
          console.log(`  ${found ? '✅' : '❌'} ${name}`);
        });
      }
    } else {
      console.log('❌ No artists found in database');
      console.log('💡 Run artist sync to populate the database');
    }

    // Check shows
    const { count: showCount } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📅 Total shows in database: ${showCount || 0}`);

    // Check songs
    const { count: songCount } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true });

    console.log(`🎵 Total songs in database: ${songCount || 0}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();