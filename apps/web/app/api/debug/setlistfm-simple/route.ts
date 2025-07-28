import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || "Taylor Swift"

  try {
    // Check if API key is configured
    const apiKey = process.env["SETLISTFM_API_KEY"]
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "SETLISTFM_API_KEY is not configured",
          solution: "Please add SETLISTFM_API_KEY to your .env.local file",
        },
        { status: 500 }
      )
    }
    const artistUrl = `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(query)}`
    const artistResponse = await fetch(artistUrl, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
        "User-Agent": "MySetlist/1.0",
      },
    })

    if (!artistResponse.ok) {
      const errorText = await artistResponse.text()
      throw new Error(
        `Artist search failed: ${artistResponse.status} ${artistResponse.statusText} - ${errorText}`
      )
    }

    const artistData = await artistResponse.json()
    const setlistUrl = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(query)}&p=1`
    const setlistResponse = await fetch(setlistUrl, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
        "User-Agent": "MySetlist/1.0",
      },
    })

    if (!setlistResponse.ok) {
      const errorText = await setlistResponse.text()
      throw new Error(
        `Setlist search failed: ${setlistResponse.status} ${setlistResponse.statusText} - ${errorText}`
      )
    }

    const setlistData = await setlistResponse.json()

    return NextResponse.json({
      success: true,
      query,
      apiKeyConfigured: true,
      apiKeyPrefix: apiKey.substring(0, 8),
      response: {
        artistSearch: {
          hasArtists: !!artistData.artist,
          artistsCount: artistData.artist?.length || 0,
          total: artistData.total,
          artists:
            artistData.artist?.map((a: any) => ({
              mbid: a.mbid,
              name: a.name,
              sortName: a.sortName,
              url: a.url,
            })) || [],
        },
        setlistSearch: {
          hasSetlists: !!setlistData.setlist,
          setlistsCount: setlistData.setlist?.length || 0,
          total: setlistData.total,
          setlists:
            setlistData.setlist?.slice(0, 3).map((s: any) => ({
              id: s.id,
              eventDate: s.eventDate,
              artistName: s.artist.name,
              venueName: s.venue.name,
              cityName: s.venue.city.name,
              songCount: s.sets.set.reduce(
                (count: number, set: any) => count + set.song.length,
                0
              ),
            })) || [],
        },
        rawResponse: {
          artistResponse: artistData,
          setlistResponse: setlistData,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Setlist.fm API test failed",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        query,
        apiKeyConfigured: !!process.env["SETLISTFM_API_KEY"],
        baseUrl: "https://api.setlist.fm/rest/1.0/",
      },
      { status: 500 }
    )
  }
}
