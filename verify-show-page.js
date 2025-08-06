import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyShowPage() {
  console.log('===========================================');
  console.log('VERIFYING ARCTIC MONKEYS SHOW PAGE DATA');
  console.log('===========================================\n');

  // 1. Get the show
  const { data: show, error: showError } = await supabase
    .from('shows')
    .select(`
      *,
      headliner_artist:artists(*),
      venue:venues(*),
      setlists(
        *,
        setlist_songs(
          *,
          songs(*)
        )
      )
    `)
    .eq('slug', 'arctic-monkeys-inglewood-2025-08-10')
    .single();

  if (showError) {
    console.error('Error fetching show:', showError);
    return;
  }

  console.log('✅ SHOW FOUND:');
  console.log(`   Name: ${show.name}`);
  console.log(`   Date: ${show.date}`);
  console.log(`   Status: ${show.status}`);
  console.log(`   Slug: ${show.slug}`);
  console.log('');

  console.log('✅ ARTIST INFO:');
  console.log(`   Name: ${show.headliner_artist.name}`);
  console.log(`   Image: ${show.headliner_artist.image_url ? '✓ Has image' : '✗ No image'}`);
  console.log(`   Verified: ${show.headliner_artist.verified ? 'Yes' : 'No'}`);
  console.log('');

  console.log('✅ VENUE INFO:');
  if (show.venue) {
    console.log(`   Name: ${show.venue.name}`);
    console.log(`   Location: ${show.venue.city}, ${show.venue.state}`);
  } else {
    console.log('   No venue information');
  }
  console.log('');

  console.log('✅ SETLISTS:');
  if (show.setlists && show.setlists.length > 0) {
    show.setlists.forEach(setlist => {
      console.log(`\n   📋 ${setlist.name} (${setlist.type})`);
      console.log(`      Total votes: ${setlist.total_votes}`);
      console.log(`      Accuracy: ${setlist.accuracy_score}%`);
      console.log(`      Songs: ${setlist.setlist_songs?.length || 0}`);
      
      if (setlist.setlist_songs && setlist.setlist_songs.length > 0) {
        console.log('      Tracklist:');
        setlist.setlist_songs
          .sort((a, b) => a.position - b.position)
          .slice(0, 5)
          .forEach(item => {
            const song = item.songs;
            if (song) {
              console.log(`        ${item.position}. ${song.title} by ${song.artist}`);
            }
          });
        if (setlist.setlist_songs.length > 5) {
          console.log(`        ... and ${setlist.setlist_songs.length - 5} more songs`);
        }
      }
    });
  } else {
    console.log('   ❌ No setlists found');
  }

  console.log('\n===========================================');
  console.log('SUMMARY:');
  console.log('===========================================');
  console.log(`Show: ✅ Loaded`);
  console.log(`Artist: ✅ ${show.headliner_artist.name} (${show.headliner_artist.image_url ? 'with image' : 'NO IMAGE'})`);
  console.log(`Venue: ${show.venue ? '✅ ' + show.venue.name : '❌ Missing'}`);
  console.log(`Setlists: ${show.setlists?.length > 0 ? '✅ ' + show.setlists.length + ' setlist(s)' : '❌ None'}`);
  
  if (show.setlists?.length > 0) {
    const totalSongs = show.setlists.reduce((sum, s) => sum + (s.setlist_songs?.length || 0), 0);
    console.log(`Total Songs: ${totalSongs > 0 ? '✅ ' + totalSongs + ' songs' : '❌ No songs'}`);
  }

  console.log('\n🌐 VIEW THE PAGE:');
  console.log(`   http://localhost:3001/shows/${show.slug}`);
  console.log('===========================================\n');
}

verifyShowPage();