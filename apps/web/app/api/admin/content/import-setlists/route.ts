import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SetlistFmClient } from "@repo/external-apis";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body with import parameters
    const body = await request.json();
    const { artistName, limit = 20 } = body;

    if (!artistName) {
      return NextResponse.json(
        { error: "Artist name is required" },
        { status: 400 }
      );
    }

    // Initialize Setlist.fm client
    const setlistfmApiKey = process.env['SETLISTFM_API_KEY'];
    if (!setlistfmApiKey) {
      return NextResponse.json(
        { error: "Setlist.fm API key not configured" },
        { status: 500 }
      );
    }

    const setlistfm = new SetlistFmClient({
      apiKey: setlistfmApiKey,
    });

    let importedCount = 0;
    let songsImported = 0;

    try {
      // Search for setlists using real Setlist.fm API
      const setlistsResponse = await setlistfm.searchSetlists({
        artistName: artistName,
        p: 1, // page 1
      });

      const setlists = setlistsResponse.setlist || [];
      const limitedSetlists = setlists.slice(0, limit);

      for (const setlist of limitedSetlists) {
        try {
          // Check if we already have this show
          const { data: existingShow } = await supabase
            .from("shows")
            .select("id")
            .eq("name", setlist.artist.name)
            .eq("date", setlist.eventDate)
            .single();

          let showId = existingShow?.id;

          // If show doesn't exist, create it
          if (!showId) {
            const { data: newShow, error: showError } = await supabase
              .from("shows")
              .insert({
                name: `${setlist.artist.name} at ${setlist.venue.name}`,
                date: setlist.eventDate,
                status: "completed",
                venue_name: setlist.venue.name,
                venue_city: setlist.venue.city.name,
                setlistfm_id: setlist.id,
                created_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (showError || !newShow) {
              console.error("Error creating show:", showError);
              continue;
            }
            showId = newShow.id;
          }

          // Check if setlist already exists
          const { data: existingSetlist } = await supabase
            .from("setlists")
            .select("id")
            .eq("show_id", showId)
            .eq("setlistfm_id", setlist.id)
            .single();

          if (existingSetlist) {
            continue; // Skip if setlist already exists
          }

          // Create setlist
          const { data: newSetlist, error: setlistError } = await supabase
            .from("setlists")
            .insert({
              show_id: showId,
              name: `${setlist.artist.name} - ${setlist.venue.name}`,
              type: "official",
              setlistfm_id: setlist.id,
              created_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (setlistError || !newSetlist) {
            console.error("Error creating setlist:", setlistError);
            continue;
          }

          // Import songs from setlist
          const sets = setlist.sets?.set || [];
          let position = 1;

          for (const set of sets) {
            const songs = set.song || [];
            
            for (const song of songs) {
              if (!song.name) continue;

              // Create or find song
              const { data: existingSong } = await supabase
                .from("songs")
                .select("id")
                .eq("name", song.name)
                .single();

              let songId = existingSong?.id;

              if (!songId) {
                const { data: newSong, error: songError } = await supabase
                  .from("songs")
                  .insert({
                    name: song.name,
                    artist: setlist.artist.name,
                    is_cover: !!song.cover,
                    created_at: new Date().toISOString(),
                  })
                  .select("id")
                  .single();

                if (songError || !newSong) {
                  console.error("Error creating song:", songError);
                  continue;
                }
                songId = newSong.id;
                songsImported++;
              }

              // Add song to setlist
              await supabase
                .from("setlist_songs")
                .insert({
                  setlist_id: newSetlist.id,
                  song_id: songId,
                  position: position,
                  is_encore: ((set as any)['encore'] || 0) > 0,
                  created_at: new Date().toISOString(),
                });

              position++;
            }
          }

          importedCount++;
        } catch (insertError) {
          console.error("Error processing setlist:", insertError);
        }
      }
    } catch (apiError) {
      console.error("Setlist.fm API error:", apiError);
      return NextResponse.json(
        { error: "Failed to fetch setlists from Setlist.fm API" },
        { status: 500 }
      );
    }

    // Log the import action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "import_setlists",
      target_type: "system",
      target_id: "bulk_import",
      reason: "Bulk setlist import initiated from admin panel",
      metadata: {
        artist_name: artistName,
        setlists_imported: importedCount,
        songs_imported: songsImported,
        import_timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Setlists import completed",
      setlists_imported: importedCount,
      songs_imported: songsImported
    });
  } catch (error) {
    console.error("Error importing setlists:", error);
    return NextResponse.json(
      { error: "Failed to import setlists" },
      { status: 500 }
    );
  }
}