#!/usr/bin/env node
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSetlistsWithSongs() {
  console.log('🎵 Starting setlist and song creation process...');
  
  try {
    // Get first 10 shows to create setlists for
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        slug,
        date,
        headliner_artist_id
      `)
      .order('date', { ascending: false })
      .limit(10);

    if (showsError) {
      console.error('Error fetching shows:', showsError);
      return;
    }

    console.log(`Found ${shows.length} shows to process`);

    // Get available songs
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, title, artist')
      .order('popularity', { ascending: false })
      .limit(50);

    if (songsError) {
      console.error('Error fetching songs:', songsError);
      return;
    }

    console.log(`Found ${songs.length} songs available`);

    let setlistsCreated = 0;
    let songsAdded = 0;

    for (const show of shows) {
      console.log(`\n🎪 Processing show: ${show.name}`);
      
      // Get artist info
      const { data: artist } = await supabase
        .from('artists')
        .select('id, name, slug')
        .eq('id', show.headliner_artist_id)
        .single();

      if (!artist) {
        console.log(`  ⏭️ No artist found for show, skipping`);
        continue;
      }
      
      // Check if show already has setlists
      const { data: existingSetlists } = await supabase
        .from('setlists')
        .select('id')
        .eq('show_id', show.id);

      if (existingSetlists && existingSetlists.length > 0) {
        console.log(`  ⏭️ Show already has ${existingSetlists.length} setlists, skipping`);
        continue;
      }

      // Create predicted setlist for this show
      const { data: newSetlist, error: setlistError } = await supabase
        .from('setlists')
        .insert({
          show_id: show.id,
          artist_id: artist.id,
          type: 'predicted',
          name: `${artist.name} - Predicted Setlist`,
          order_index: 0,
          is_locked: false,
          total_votes: 0,
          accuracy_score: 0
        })
        .select()
        .single();

      if (setlistError) {
        console.error(`  ❌ Error creating setlist for ${show.name}:`, setlistError);
        continue;
      }

      console.log(`  ✅ Created setlist: ${newSetlist.name}`);
      setlistsCreated++;

      // Filter songs that might match this artist or are popular
      const artistName = artist.name.toLowerCase();
      const relevantSongs = songs.filter(song => 
        song.artist.toLowerCase().includes(artistName) || 
        ['taylor swift', 'arctic monkeys', 'ed sheeran', 'queen'].some(popular => 
          artistName.includes(popular.toLowerCase())
        )
      ).slice(0, 8); // Max 8 songs per setlist

      // If no relevant songs, use popular songs
      const songsToAdd = relevantSongs.length > 0 ? relevantSongs : songs.slice(0, 6);

      // Add songs to the setlist
      for (let i = 0; i < songsToAdd.length; i++) {
        const song = songsToAdd[i];
        
        const { error: songError } = await supabase
          .from('setlist_songs')
          .insert({
            setlist_id: newSetlist.id,
            song_id: song.id,
            position: i + 1,
            upvotes: Math.floor(Math.random() * 20), // Random vote count
            is_played: null
          });

        if (songError) {
          console.error(`    ❌ Error adding song "${song.title}":`, songError);
        } else {
          console.log(`    🎵 Added song ${i + 1}: ${song.title} by ${song.artist}`);
          songsAdded++;
        }
      }
    }

    console.log(`\n🎉 Process complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Setlists created: ${setlistsCreated}`);
    console.log(`  - Songs added: ${songsAdded}`);
    console.log(`  - Average songs per setlist: ${setlistsCreated > 0 ? (songsAdded / setlistsCreated).toFixed(1) : 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createSetlistsWithSongs();