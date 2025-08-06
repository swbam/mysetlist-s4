import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSetlistSongs() {
  try {
    // Get Arctic Monkeys shows
    const { data: show } = await supabase
      .from('shows')
      .select('id, name, slug, headliner_artist_id')
      .eq('slug', 'arctic-monkeys-inglewood-2025-08-10')
      .single();

    console.log('Show:', show);

    // Get setlist for this show
    const { data: setlist } = await supabase
      .from('setlists')
      .select('*')
      .eq('show_id', show.id)
      .single();

    console.log('Setlist:', setlist);

    // Real Arctic Monkeys songs
    const arcticMonkeysSongs = [
      "R U Mine?",
      "Do I Wanna Know?",
      "Brianstorm",
      "505",
      "Fluorescent Adolescent",
      "Why'd You Only Call Me When You're High?",
      "I Bet You Look Good on the Dancefloor",
      "When the Sun Goes Down",
      "Arabella",
      "Snap Out of It",
      "Teddy Picker",
      "Crying Lightning",
      "Cornerstone",
      "Mardy Bum",
      "Four Out of Five",
      "One Point Perspective",
      "American Sports",
      "The View from the Afternoon",
      "Pretty Visitors",
      "Body Paint"
    ];

    // Create songs and setlist_songs entries
    const songIds = [];
    
    for (const songTitle of arcticMonkeysSongs) {
      // Try to find existing song
      const { data: existingSong } = await supabase
        .from('songs')
        .select('id')
        .eq('title', songTitle)
        .eq('artist', 'Arctic Monkeys')
        .maybeSingle();

      let songId;
      
      if (existingSong) {
        console.log(`Song exists: ${songTitle}`);
        songId = existingSong.id;
      } else {
        // Create new song
        const { data: newSong, error } = await supabase
          .from('songs')
          .insert({
            title: songTitle,
            artist: 'Arctic Monkeys',
            duration_ms: Math.floor(150000 + Math.random() * 150000), // 2.5-5 minutes in ms
            spotify_id: null,
            preview_url: null,
            is_explicit: false,
            popularity: Math.floor(70 + Math.random() * 30) // 70-100 popularity
          })
          .select('id')
          .single();

        if (error) {
          console.error(`Error creating song ${songTitle}:`, error);
          continue;
        }
        
        console.log(`Created song: ${songTitle}`);
        songId = newSong.id;
      }
      
      songIds.push(songId);
    }

    console.log(`Collected ${songIds.length} song IDs`);

    // Clear any existing setlist songs
    await supabase
      .from('setlist_songs')
      .delete()
      .eq('setlist_id', setlist.id);

    // Add songs to setlist
    const setlistSongs = songIds.map((songId, index) => ({
      setlist_id: setlist.id,
      song_id: songId,
      position: index + 1,
      notes: index === 0 ? "Opener" : index === songIds.length - 1 ? "Closer" : null,
      is_played: false,
      upvotes: Math.floor(Math.random() * 50),
      downvotes: Math.floor(Math.random() * 10),
      net_votes: Math.floor(Math.random() * 40)
    }));

    const { data: insertedSongs, error: insertError } = await supabase
      .from('setlist_songs')
      .insert(setlistSongs)
      .select('*');

    if (insertError) {
      console.error('Error adding songs to setlist:', insertError);
    } else {
      console.log(`Successfully added ${insertedSongs.length} songs to setlist`);
    }

    // Update setlist metadata
    await supabase
      .from('setlists')
      .update({
        total_votes: 25,
        accuracy_score: 85,
        type: 'predicted'
      })
      .eq('id', setlist.id);

    console.log('Setlist updated successfully!');

    // Verify the songs are there
    const { data: finalCheck } = await supabase
      .from('setlist_songs')
      .select('*, songs(title, artist)')
      .eq('setlist_id', setlist.id)
      .order('position');

    console.log('\nFinal setlist:');
    finalCheck?.forEach(s => {
      console.log(`${s.position}. ${s.songs?.title} by ${s.songs?.artist}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

fixSetlistSongs();