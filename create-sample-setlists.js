const { createServiceClient } = require('./apps/web/lib/supabase/server.ts');

async function createSampleSetlists() {
  console.log('🚀 Creating sample setlists for shows...');
  
  const supabase = createServiceClient();

  try {
    // Get shows that don't have setlists yet
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, name, headliner_artist_id, artists!headliner_artist_id(name)')
      .eq('status', 'upcoming')
      .limit(10);

    if (showsError) {
      console.error('Error fetching shows:', showsError);
      return;
    }

    console.log(`Found ${shows?.length || 0} upcoming shows`);

    for (const show of shows || []) {
      console.log(`\n📝 Creating setlist for: ${show.name}`);
      
      // Check if setlist already exists for this show
      const { data: existingSetlist } = await supabase
        .from('setlists')
        .select('id')
        .eq('show_id', show.id)
        .limit(1);

      if (existingSetlist && existingSetlist.length > 0) {
        console.log('   ⏭️  Setlist already exists, skipping...');
        continue;
      }

      // Create a predicted setlist for this show
      const { data: newSetlist, error: setlistError } = await supabase
        .from('setlists')
        .insert({
          show_id: show.id,
          artist_id: show.headliner_artist_id,
          name: `${show.artists?.name} - Predicted Setlist`,
          type: 'predicted',
          is_locked: false,
          total_votes: 0,
          accuracy_score: 0,
          order_index: 0
        })
        .select()
        .single();

      if (setlistError) {
        console.error(`   ❌ Error creating setlist for ${show.name}:`, setlistError);
        continue;
      }

      console.log(`   ✅ Created setlist: ${newSetlist.name} (ID: ${newSetlist.id})`);

      // Get some popular songs for this artist to add to setlist
      const { data: artistSongs, error: songsError } = await supabase
        .from('artist_songs')
        .select(`
          songs (
            id,
            title,
            artist,
            album,
            popularity
          )
        `)
        .eq('artist_id', show.headliner_artist_id)
        .limit(5);

      if (songsError || !artistSongs || artistSongs.length === 0) {
        console.log(`   ⚠️  No songs found for artist, setlist will be empty`);
        continue;
      }

      // Add songs to setlist
      const setlistSongs = artistSongs
        .filter(item => item.songs)
        .map((item, index) => ({
          setlist_id: newSetlist.id,
          song_id: item.songs.id,
          position: index + 1,
          notes: index === 0 ? 'Opening song' : null
        }));

      if (setlistSongs.length > 0) {
        const { error: songsInsertError } = await supabase
          .from('setlist_songs')
          .insert(setlistSongs);

        if (songsInsertError) {
          console.error(`   ❌ Error adding songs to setlist:`, songsInsertError);
        } else {
          console.log(`   🎵 Added ${setlistSongs.length} songs to setlist`);
        }
      }
    }

    console.log('\n✅ Sample setlists creation completed!');
    
    // Show summary
    const { data: totalSetlists } = await supabase
      .from('setlists')
      .select('id', { count: 'exact' });
      
    console.log(`\n📊 Total setlists in database: ${totalSetlists?.length || 0}`);

  } catch (error) {
    console.error('❌ Error in createSampleSetlists:', error);
  }
}

// Run if called directly
if (require.main === module) {
  createSampleSetlists()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createSampleSetlists };