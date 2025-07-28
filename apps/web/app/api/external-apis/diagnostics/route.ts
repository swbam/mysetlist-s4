import { type NextRequest, NextResponse } from "next/server"
import {
  SetlistFmClient,
  SpotifyClient,
  TicketmasterClient,
} from "~/lib/api/external-apis"

interface APIHealthStatus {
  service: string
  status: "healthy" | "degraded" | "unhealthy"
  responseTime: number
  lastCheck: Date
  error?: string
  metrics?: {
    averageResponseTime: number
    successRate: number
    cacheHitRate: number
    requestCount: number
  }
}

// GET /api/external-apis/diagnostics - Check health of all external APIs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const service = searchParams.get("service")
    const detailed = searchParams.get("detailed") === "true"

    const results: APIHealthStatus[] = []

    // Helper function to check API health
    async function checkAPIHealth(
      apiName: string,
      client: any,
      testFunction: () => Promise<any>
    ): Promise<APIHealthStatus> {
      const startTime = Date.now()
      try {
        await testFunction()
        const responseTime = Date.now() - startTime

        const metrics = detailed
          ? {
              averageResponseTime: client.getAverageResponseTime?.() || 0,
              successRate: client.getSuccessRate?.() || 1,
              cacheHitRate: client.getCacheHitRate?.() || 0,
              requestCount: client.getMetrics?.()?.length || 0,
            }
          : undefined

        return {
          service: apiName,
          status: responseTime < 5000 ? "healthy" : "degraded",
          responseTime,
          lastCheck: new Date(),
          ...(metrics && { metrics }),
        }
      } catch (error) {
        const responseTime = Date.now() - startTime
        return {
          service: apiName,
          status: "unhealthy",
          responseTime,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }

    // Check specific service or all services
    if (service) {
      switch (service.toLowerCase()) {
        case "spotify": {
          const spotifyClient = new SpotifyClient({})
          await spotifyClient.authenticate()

          const healthStatus = await checkAPIHealth(
            "Spotify",
            spotifyClient,
            async () => {
              // Simple test: search for a common artist
              return await spotifyClient.searchArtists("The Beatles", 1)
            }
          )
          results.push(healthStatus)
          break
        }

        case "ticketmaster": {
          const ticketmasterClient = new TicketmasterClient({
            apiKey: process.env["TICKETMASTER_API_KEY"]!,
          })

          const healthStatus = await checkAPIHealth(
            "Ticketmaster",
            ticketmasterClient,
            async () => {
              // Simple test: search for events
              return await ticketmasterClient.searchEvents({
                countryCode: "US",
                size: 1,
              })
            }
          )
          results.push(healthStatus)
          break
        }

        case "setlistfm": {
          const setlistfmClient = new SetlistFmClient({
            apiKey: process.env["SETLISTFM_API_KEY"]!,
          })

          const healthStatus = await checkAPIHealth(
            "Setlist.fm",
            setlistfmClient,
            async () => {
              // Simple test: search for setlists
              return await setlistfmClient.searchSetlists({
                artistName: "Radiohead",
                p: 1,
              })
            }
          )
          results.push(healthStatus)
          break
        }

        default:
          return NextResponse.json(
            {
              error:
                "Invalid service. Valid services: spotify, ticketmaster, setlistfm",
            },
            { status: 400 }
          )
      }
    } else {
      // Check all services
      const services = [
        {
          name: "Spotify",
          check: async () => {
            const client = new SpotifyClient({})
            await client.authenticate()
            return checkAPIHealth("Spotify", client, async () => {
              return await client.searchArtists("The Beatles", 1)
            })
          },
        },
        {
          name: "Ticketmaster",
          check: async () => {
            const client = new TicketmasterClient({
              apiKey: process.env["TICKETMASTER_API_KEY"]!,
            })
            return checkAPIHealth("Ticketmaster", client, async () => {
              return await client.searchEvents({ countryCode: "US", size: 1 })
            })
          },
        },
        {
          name: "Setlist.fm",
          check: async () => {
            const client = new SetlistFmClient({
              apiKey: process.env["SETLISTFM_API_KEY"]!,
            })
            return checkAPIHealth("Setlist.fm", client, async () => {
              return await client.searchSetlists({
                artistName: "Radiohead",
                p: 1,
              })
            })
          },
        },
      ]

      // Run all checks in parallel with timeout
      const checkPromises = services.map(async (service) => {
        try {
          const timeoutPromise = new Promise<APIHealthStatus>((_, reject) => {
            setTimeout(() => reject(new Error("Health check timeout")), 10000)
          })

          return await Promise.race([service.check(), timeoutPromise])
        } catch (error) {
          return {
            service: service.name,
            status: "unhealthy" as const,
            responseTime: 10000,
            lastCheck: new Date(),
            error:
              error instanceof Error ? error.message : "Health check failed",
          }
        }
      })

      const healthResults = await Promise.all(checkPromises)
      results.push(...healthResults)
    }

    // Calculate overall health
    const healthyCount = results.filter((r) => r.status === "healthy").length
    const degradedCount = results.filter((r) => r.status === "degraded").length
    const unhealthyCount = results.filter(
      (r) => r.status === "unhealthy"
    ).length

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy"
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy"
    } else if (degradedCount > 0) {
      overallStatus = "degraded"
    }

    const avgResponseTime =
      results.reduce((sum, r) => sum + r.responseTime, 0) / results.length

    return NextResponse.json({
      overallStatus,
      averageResponseTime: Math.round(avgResponseTime),
      summary: {
        total: results.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
      },
      services: results,
      timestamp: new Date().toISOString(),
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to check API health" },
      { status: 500 }
    )
  }
}

// POST /api/external-apis/diagnostics - Test specific API functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { service, action, params = {} } = body

    const results: any = {}

    switch (service?.toLowerCase()) {
      case "spotify": {
        const client = new SpotifyClient({})
        await client.authenticate()

        switch (action) {
          case "search_artists":
            results.data = await client.searchArtists(
              params.query || "test",
              params.limit || 5
            )
            break
          case "get_artist": {
            if (!params.artistId) {
              throw new Error("Artist ID required")
            }
            results.data = await client.getArtist(params.artistId)
            break
          }
          case "get_top_tracks": {
            if (!params.artistId) {
              throw new Error("Artist ID required")
            }
            results.data = await client.getArtistTopTracks(
              params.artistId,
              params.market || "US"
            )
            break
          }
          case "get_recommendations":
            results.data = await client.getRecommendations({
              seed_artists: params.seedArtists || [],
              seed_genres: params.seedGenres || ["rock"],
              limit: params.limit || 10,
            })
            break
          default:
            throw new Error("Invalid Spotify action")
        }
        break
      }

      case "ticketmaster": {
        const client = new TicketmasterClient({
          apiKey: process.env["TICKETMASTER_API_KEY"]!,
        })

        switch (action) {
          case "search_events":
            results.data = await client.searchEvents({
              keyword: params.keyword,
              city: params.city,
              countryCode: params.countryCode || "US",
              size: params.size || 10,
            })
            break
          case "get_event": {
            if (!params.eventId) {
              throw new Error("Event ID required")
            }
            results.data = await client.getEvent(params.eventId)
            break
          }
          case "search_venues":
            results.data = await client.searchVenues({
              keyword: params.keyword,
              city: params.city,
              countryCode: params.countryCode || "US",
              size: params.size || 10,
            })
            break
          default:
            throw new Error("Invalid Ticketmaster action")
        }
        break
      }

      case "setlistfm": {
        const client = new SetlistFmClient({
          apiKey: process.env["SETLISTFM_API_KEY"]!,
        })

        switch (action) {
          case "search_setlists":
            results.data = await client.searchSetlists({
              artistName: params.artistName,
              venueName: params.venueName,
              cityName: params.cityName,
              year: params.year,
              p: params.page || 1,
            })
            break
          case "get_setlist": {
            if (!params.setlistId) {
              throw new Error("Setlist ID required")
            }
            results.data = await client.getSetlist(params.setlistId)
            break
          }
          default:
            throw new Error("Invalid Setlist.fm action")
        }
        break
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid service. Valid services: spotify, ticketmaster, setlistfm",
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      service,
      action,
      params,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
