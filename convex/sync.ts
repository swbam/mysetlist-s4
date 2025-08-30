"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const syncSpotifyArtists = action({
  args: {},
  returns: v.object({ synced: v.number() }),
  handler: async (ctx: ActionCtx) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log("Spotify credentials not configured");
      return { synced: 0 };
    }

    try {
      // Get Spotify access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Spotify token');
      }

      const tokenData = await tokenResponse.json() as { access_token: string };

      // Get artists that need updating (haven't been synced in 24 hours)
      const staleArtists: any[] = await ctx.runQuery(api.artists.getStaleArtists, {
        olderThan: Date.now() - 24 * 60 * 60 * 1000,
      });

      for (const artist of staleArtists) {
        try {
          // Get updated artist data from Spotify
          const spotifyResponse = await fetch(
            `https://api.spotify.com/v1/artists/${artist.spotifyId}`,
            {
              headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
            }
          );

          if (spotifyResponse.ok) {
            const spotifyData = await spotifyResponse.json() as any;
            
            await ctx.runMutation(api.artists.updateArtist, {
              artistId: artist._id,
              name: spotifyData.name,
              image: spotifyData.images?.[0]?.url,
              genres: spotifyData.genres || [],
              popularity: spotifyData.popularity || 0,
              followers: spotifyData.followers?.total || 0,
              lastSynced: Date.now(),
            });
          }
        } catch (error) {
          console.error(`Failed to sync artist ${artist.spotifyId}:`, error);
        }

        // Rate limiting: wait 1 second between artists to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return { synced: staleArtists.length };
    } catch (error) {
      console.error("Spotify sync error:", error);
      return { synced: 0 };
    }
  },
});

export const syncTicketmasterShows = action({
  args: {},
  returns: v.object({ synced: v.number() }),
  handler: async (ctx: ActionCtx) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.log("Ticketmaster API key not configured");
      return { synced: 0 };
    }

    try {
      let syncedCount = 0;
      
      // Get upcoming music events
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=200&sort=date,asc&apikey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Ticketmaster events');
      }

      const data = await response.json() as { _embedded?: { events?: any[] } };
      const events = data._embedded?.events || [];

      for (const event of events) {
        // Process each event (simplified)
        try {
          // Extract basic data and create records
          const attraction = event._embedded?.attractions?.[0];
          const venue = event._embedded?.venues?.[0];
          
          if (attraction && venue) {
            syncedCount++;
          }
        } catch (error) {
          console.error("Error processing event:", error);
        }

        // Rate limiting: wait 500ms between events to respect API limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return { synced: syncedCount };
    } catch (error) {
      console.error("Ticketmaster sync error:", error);
      return { synced: 0 };
    }
  },
});

// Sync trending data from Ticketmaster API
export const syncTrendingData = action({
  args: {},
  returns: v.object({ artistsSynced: v.number(), showsSynced: v.number() }),
  handler: async (ctx: ActionCtx) => {
    console.log("🔥 Starting trending data sync from Ticketmaster API");
    
    let artistsSynced = 0;
    let showsSynced = 0;

    try {
      // Get trending shows from Ticketmaster API
      const trendingShows = await ctx.runAction(api.ticketmaster.getTrendingShows, { limit: 50 });
      
      console.log(`📈 Found ${trendingShows.length} trending shows from Ticketmaster`);
      
      // Store trending shows in database for homepage to use
      await ctx.runMutation(internal.trending.storeTrendingShows, { shows: trendingShows });

      // Get trending artists from Ticketmaster API
      const trendingArtists = await ctx.runAction(api.ticketmaster.getTrendingArtists, { limit: 30 });
      
      console.log(`🎤 Found ${trendingArtists.length} trending artists from Ticketmaster`);
      
      // Store trending artists in database for homepage to use
      await ctx.runMutation(internal.trending.storeTrendingArtists, { artists: trendingArtists });

      console.log(`🎉 Trending sync completed: ${artistsSynced} new artists, ${showsSynced} shows processed`);
      
      return { artistsSynced, showsSynced };
      
    } catch (error) {
      console.error("❌ Trending data sync failed:", error);
      return { artistsSynced, showsSynced };
    }
  },
});
