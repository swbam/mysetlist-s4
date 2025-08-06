import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixArcticMonkeysSetlist() {
  try {
    // Get Arctic Monkeys show
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

    // First, delete ALL existing setlist_songs for this setlist
    const { error: deleteError } = await supabase
      .from('setlist_songs')
      .delete()
      .eq('setlist_id', setlist.id);

    if (deleteError) {
      console.error('Error deleting existing songs:', deleteError);
    } else {
      console.log('Cleared existing setlist songs');
    }

    // Now get the Arctic Monkeys songs we just created
    const { data: arcticSongs } = await supabase
      .from('songs')
      .select('id, title')
      .eq('artist', 'Arctic Monkeys')
      .in('title', [
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
      ]);

    console.log(`Found ${arcticSongs?.length || 0} Arctic Monkeys songs`);

    if (arcticSongs && arcticSongs.length > 0) {
      // Create proper setlist order (typical Arctic Monkeys concert order)
      const setlistOrder = [
        "The View from the Afternoon",
        "Brianstorm",
        "Snap Out of It",
        "Crying Lightning",
        "Why'd You Only Call Me When You're High?",
        "Teddy Picker",
        "Fluorescent Adolescent",
        "Cornerstone",
        "When the Sun Goes Down",
        "Pretty Visitors",
        "Four Out of Five",
        "One Point Perspective",
        "American Sports",
        "Arabella",
        "Do I Wanna Know?",
        "505",
        "Mardy Bum",
        "Body Paint",
        "I Bet You Look Good on the Dancefloor",
        "R U Mine?"
      ];

      // Create setlist_songs entries in the proper order
      const setlistSongs = [];
      for (let i = 0; i < setlistOrder.length; i++) {
        const songTitle = setlistOrder[i];
        const song = arcticSongs.find(s => s.title === songTitle);
        
        if (song) {
          setlistSongs.push({
            setlist_id: setlist.id,
            song_id: song.id,
            position: i + 1,
            notes: i === 0 ? "Opener" : i === setlistOrder.length - 1 ? "Closer" : 
                   i === 15 ? "Encore" : null,
            is_played: false,
            upvotes: Math.floor(20 + Math.random() * 80),
            downvotes: Math.floor(Math.random() * 20),
            net_votes: Math.floor(10 + Math.random() * 70)
          });
        }
      }

      // Insert all setlist songs
      const { data: insertedSongs, error: insertError } = await supabase
        .from('setlist_songs')
        .insert(setlistSongs)
        .select('*');

      if (insertError) {
        console.error('Error inserting setlist songs:', insertError);
      } else {
        console.log(`Successfully added ${insertedSongs.length} songs to setlist`);
      }

      // Update setlist to be a predicted setlist with votes
      await supabase
        .from('setlists')
        .update({
          type: 'predicted',
          total_votes: 127,
          accuracy_score: 92,
          name: 'Fan Predicted Setlist'
        })
        .eq('id', setlist.id);

      console.log('Setlist updated to predicted type with votes!');

      // Verify the final setlist
      const { data: finalCheck } = await supabase
        .from('setlist_songs')
        .select('*, songs(title, artist)')
        .eq('setlist_id', setlist.id)
        .order('position');

      console.log('\nFinal Arctic Monkeys Setlist:');
      console.log('================================');
      finalCheck?.forEach(s => {
        const notes = s.notes ? ` [${s.notes}]` : '';
        console.log(`${s.position}. ${s.songs?.title}${notes} - ${s.upvotes} upvotes`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixArcticMonkeysSetlist();