import { SetlistFmClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";
import { monitor } from "~/lib/api/monitoring";
import { createServiceClient } from "~/lib/supabase/server";
import { withRateLimit } from "~/middleware/rate-limit";

interface SyncRequest {
  artistName?: string;
  artistMbid?: string;
  showId?: string;
  days?: number;
  forceSync?: boolean;
}

async function syncSetlistFmData(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const supabase = createServiceClient();
    const body = (await request.json()) as SyncRequest;

    // Validate input
    if (!body.artistName && !body.artistMbid && !body.showId) {
      return NextResponse.json(
        { error: "Must provide artistName, artistMbid, or showId" },
        { status: 400 },
      );
    }

    const setlistFmClient = new SetlistFmClient({
      apiKey: process.env.SETLISTFM_API_KEY!,
    });
    const results = {
      setlistsSynced: 0,
      songsAdded: 0,
      venuesUpdated: 0,
      errors: [] as string[],
    };

    // Get artist MBID if not provided
    let mbid = body.artistMbid;
    if (!mbid && body.artistName) {
      const mbidTimer = monitor.startTimer("setlistfm_find_mbid");
      try {
        const searchResult = await setlistFmClient.searchArtists(
          body.artistName,
        );
        if (searchResult.artist && searchResult.artist.length > 0) {
          // Find best match or use first result
          const artist =
            searchResult.artist.find(
              (a) => a.name.toLowerCase() === body.artistName?.toLowerCase(),
            ) || searchResult.artist[0];
          if (artist) {
            mbid = artist.mbid;
          }
        }
      } catch (error) {
        console.error("Error searching for artist on Setlist.fm:", error);
      }
      mbidTimer();

      if (!mbid) {
        return NextResponse.json(
          { error: "Artist not found on Setlist.fm" },
          { status: 404 },
        );
      }

      // Update artist with MBID
      await supabase
        .from("artists")
        .update({
          external_ids: { setlistfm_mbid: mbid },
        })
        .eq("name", body.artistName);
    }

    // Get recent setlists
    const setlistsTimer = monitor.startTimer("setlistfm_get_setlists");
    const setlistResponse = await setlistFmClient.getArtistSetlists(mbid!, 1);
    setlistsTimer();

    const setlists = setlistResponse.setlist || [];

    monitor.log("Retrieved setlists from Setlist.fm", {
      artistName: body.artistName,
      mbid,
      count: setlists.length,
    });

    // Process each setlist
    for (const setlist of setlists) {
      try {
        const processTimer = monitor.startTimer("setlistfm_process_setlist");

        // Check if setlist already exists
        const { data: existingSetlist } = await supabase
          .from("setlists")
          .select("id")
          .eq("external_ids->>setlistfm_id", setlist.id)
          .single();

        if (existingSetlist && !body.forceSync) {
          processTimer();
          continue; // Skip if already exists
        }

        // Get or create venue
        const venueResult = await syncVenue(supabase, setlist.venue);
        if (venueResult.error) {
          results.errors.push(`Venue sync error: ${venueResult.error}`);
          processTimer();
          continue;
        }

        // Get artist from database
        const { data: artist } = await supabase
          .from("artists")
          .select("id")
          .eq("name", setlist.artist.name)
          .single();

        if (!artist) {
          results.errors.push(
            `Artist not found in database: ${setlist.artist.name}`,
          );
          processTimer();
          continue;
        }

        // Find corresponding show
        const showDate = new Date(setlist.eventDate);
        const { data: show } = await supabase
          .from("shows")
          .select("id")
          .eq("artist_id", artist.id)
          .eq("venue_id", venueResult.venueId)
          .gte("show_date", showDate.toISOString().split("T")[0])
          .lte(
            "show_date",
            new Date(showDate.getTime() + 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          )
          .single();

        if (!show) {
          results.errors.push(
            `No matching show found for setlist: ${setlist.id}`,
          );
          processTimer();
          continue;
        }

        // Create or update setlist
        const { data: setlistRecord, error: setlistError } = await supabase
          .from("setlists")
          .upsert(
            {
              show_id: show.id,
              name: `${setlist.artist.name} - ${setlist.eventDate}`,
              is_locked: true, // Setlist.fm data is historical
              external_ids: {
                setlistfm_id: setlist.id,
                setlistfm_version_id: setlist.versionId,
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "show_id",
            },
          )
          .select("id")
          .single();

        if (setlistError) {
          results.errors.push(
            `Setlist creation error: ${setlistError.message}`,
          );
          processTimer();
          continue;
        }

        // Add songs to setlist
        let songPosition = 0;
        for (const set of setlist.sets.set || []) {
          const setName =
            set.name || (set.encore ? `Encore ${set.encore}` : "Main Set");
          for (const song of set.song || []) {
            // Get or create song
            const { data: songRecord, error: songError } = await supabase
              .from("songs")
              .upsert(
                {
                  title: song.name,
                  artist_id: artist.id,
                  external_ids: {},
                },
                {
                  onConflict: "title,artist_id",
                },
              )
              .select("id")
              .single();

            if (songError) {
              results.errors.push(`Song creation error: ${songError.message}`);
              continue;
            }

            // Add song to setlist
            const { error: setlistSongError } = await supabase
              .from("setlist_songs")
              .upsert(
                {
                  setlist_id: setlistRecord.id,
                  song_id: songRecord.id,
                  position: songPosition++,
                  set_name: setName,
                },
                {
                  onConflict: "setlist_id,song_id",
                },
              );

            if (setlistSongError) {
              results.errors.push(
                `Setlist song error: ${setlistSongError.message}`,
              );
            } else {
              results.songsAdded++;
            }
          }
        }

        results.setlistsSynced++;
        processTimer();

        // Rate limiting - respect Setlist.fm API limits
        await new Promise((resolve) => setTimeout(resolve, 1100));
      } catch (error) {
        results.errors.push(`Error processing setlist ${setlist.id}: ${error}`);
        monitor.error("Error processing setlist", error, {
          setlistId: setlist.id,
          artistName: body.artistName,
        } as any);
      }
    }

    // Track performance
    const duration = Date.now() - startTime;
    monitor.trackExternalAPI(
      "setlistfm",
      "/sync",
      duration,
      results.errors.length === 0,
    );
    monitor.trackRequest(
      {
        url: "/api/sync/setlistfm",
        method: "POST",
        headers: Object.fromEntries(request.headers.entries()),
      },
      { statusCode: 200 },
      duration,
    );

    return NextResponse.json({
      success: true,
      results,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    monitor.error("Error syncing Setlist.fm data", error, {
      endpoint: "/api/sync/setlistfm",
      duration,
    } as any);

    return NextResponse.json(
      { error: "Failed to sync Setlist.fm data" },
      { status: 500 },
    );
  }
}

async function syncVenue(supabase: any, venue: any) {
  try {
    const { data: existingVenue } = await supabase
      .from("venues")
      .select("id")
      .eq("name", venue.name)
      .eq("city", venue.city.name)
      .single();

    if (existingVenue) {
      return { venueId: existingVenue.id, error: null };
    }

    // Create new venue
    const { data: newVenue, error } = await supabase
      .from("venues")
      .insert({
        name: venue.name,
        slug: venue.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        city: venue.city.name,
        state: venue.city.state,
        country: venue.city.country.name,
        latitude: venue.city.coords?.lat,
        longitude: venue.city.coords?.long,
        external_ids: {
          setlistfm_id: venue.id,
        },
      })
      .select("id")
      .single();

    if (error) {
      return { venueId: null, error: error.message };
    }

    return { venueId: newVenue.id, error: null };
  } catch (error) {
    return {
      venueId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Apply rate limiting (10 requests per hour due to Setlist.fm API limits)
export const POST = withRateLimit(syncSetlistFmData, {
  maxRequests: 10,
  windowSeconds: 3600,
  keyGenerator: (req) => {
    const userId = req.headers.get("x-user-id") || "anonymous";
    return `setlistfm-sync:${userId}`;
  },
});

// GET endpoint for sync status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const artistName = searchParams.get("artist");

    if (!artistName) {
      return NextResponse.json(
        { error: "Artist name is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Get sync status
    const { data: artist } = await supabase
      .from("artists")
      .select(
        `
        id,
        name,
        external_ids,
        shows (
          id,
          show_date,
          setlists (
            id,
            name,
            external_ids,
            setlist_songs (count)
          )
        )
      `,
      )
      .eq("name", artistName)
      .single();

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const syncStatus = {
      artist: artist.name,
      hasMbid: !!artist.external_ids?.setlistfm_mbid,
      mbid: artist.external_ids?.setlistfm_mbid,
      totalShows: artist.shows?.length || 0,
      showsWithSetlists:
        artist.shows?.filter((show) => show.setlists?.length > 0).length || 0,
      totalSetlists:
        artist.shows?.reduce(
          (sum, show) => sum + (show.setlists?.length || 0),
          0,
        ) || 0,
      lastSyncDate: null, // Could be stored in database
    };

    return NextResponse.json(syncStatus);
  } catch (error) {
    monitor.error("Error getting sync status", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    },
  );
}
