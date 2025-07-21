// @ts-nocheck
import { type NextRequest, NextResponse } from 'next/server';
import { SpotifyClient, TicketmasterClient, SetlistFmClient } from '@repo/external-apis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist') || 'Taylor Swift';

    // Test all APIs in parallel
    const spotifyClient = new SpotifyClient();
    await spotifyClient.authenticate();
    const ticketmasterClient = new TicketmasterClient();
    const setlistfmClient = new SetlistFmClient();

    const [spotifyResult, ticketmasterResult, setlistfmResult] =
      await Promise.allSettled([
        spotifyClient.searchArtists(artist, { limit: 5 }),
        ticketmasterClient.searchEvents({ keyword: artist, size: 5 }),
        setlistfmClient.searchArtists(artist, 1),
      ]);

    const response = {
      success: true,
      artist,
      timestamp: new Date().toISOString(),
      results: {
        spotify:
          spotifyResult.status === 'fulfilled'
            ? {
                success: true,
                artistCount: spotifyResult.value.artists.items.length,
                total: spotifyResult.value.artists.total,
                artists: spotifyResult.value.artists.items
                  .slice(0, 3)
                  .map((a: any) => ({
                    id: a.id,
                    name: a.name,
                    popularity: a.popularity,
                    followers: a.followers.total,
                    genres: a.genres,
                    imageUrl: a.images[0]?.url,
                  })),
              }
            : {
                success: false,
                error: spotifyResult.reason?.message,
              },
        ticketmaster:
          ticketmasterResult.status === 'fulfilled'
            ? {
                success: true,
                eventCount:
                  ticketmasterResult.value._embedded?.events?.length || 0,
                total: ticketmasterResult.value.page?.totalElements || 0,
                events:
                  ticketmasterResult.value._embedded?.events
                    ?.slice(0, 3)
                    .map((e: any) => ({
                      id: e.id,
                      name: e.name,
                      date: e.dates.start.localDate,
                      venue: e._embedded?.venues?.[0]?.name,
                      city: e._embedded?.venues?.[0]?.city?.name,
                    })) || [],
              }
            : {
                success: false,
                error: ticketmasterResult.reason?.message,
              },
        setlistfm:
          setlistfmResult.status === 'fulfilled'
            ? {
                success: true,
                artistCount: setlistfmResult.value.artist?.length || 0,
                total: setlistfmResult.value.total || 0,
                artists:
                  setlistfmResult.value.artist?.slice(0, 3).map((a: any) => ({
                    mbid: a.mbid,
                    name: a.name,
                    sortName: a.sortName,
                  })) || [],
              }
            : {
                success: false,
                error: setlistfmResult.reason?.message,
              },
      },
    };

    // Test setlists if we found an artist
    if (
      setlistfmResult.status === 'fulfilled' &&
      setlistfmResult.value.artist?.length > 0
    ) {
      try {
        const setlistData = await setlistfmClient.searchSetlists({
          artistName: artist,
          p: 1,
        });

        response.results.setlistfm.setlistCount =
          setlistData.setlist?.length || 0;
        response.results.setlistfm.setlists =
          setlistData.setlist?.slice(0, 2).map((s: any) => ({
            id: s.id,
            eventDate: s.eventDate,
            venueName: s.venue.name,
            cityName: s.venue.city.name,
            songCount: s.sets.set.reduce(
              (count: number, set: any) => count + set.song.length,
              0
            ),
          })) || [];
      } catch (_error) {}
    }
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
