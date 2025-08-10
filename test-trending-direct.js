#!/usr/bin/env node

process.env.DATABASE_URL =
  "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";
process.env.NODE_ENV = "development";

const postgres = require("postgres");

async function testTrendingLogic() {
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: "require",
    prepare: false,
  });

  try {
    console.log("=== Testing Live Trending Logic ===\n");

    const timeframe = "24h";
    const limit = 10;
    const type = "all";

    const trending = [];

    // Calculate time window
    const now = new Date();
    const timeWindow = new Date();
    switch (timeframe) {
      case "1h":
        timeWindow.setHours(now.getHours() - 1);
        break;
      case "6h":
        timeWindow.setHours(now.getHours() - 6);
        break;
      case "24h":
      default:
        timeWindow.setDate(now.getDate() - 1);
        break;
    }

    // Test Artists
    console.log("1. Fetching trending artists...");
    const trendingArtists = await sql`
      SELECT id, name, slug, image_url, popularity, followers, follower_count, monthly_listeners, trending_score
      FROM artists
      ORDER BY trending_score DESC NULLS LAST, popularity DESC NULLS LAST
      LIMIT ${Math.ceil(limit / 3)}
    `;

    console.log(`Found ${trendingArtists.length} artists`);

    if (trendingArtists && trendingArtists.length > 0) {
      trendingArtists.forEach((artist) => {
        const searches = Math.round((artist.popularity || 0) * 1.5);
        const views = artist.popularity || 0;
        const interactions = artist.follower_count || artist.followers || 0;
        const trendingScore = artist.trending_score || 0;

        const growth =
          trendingScore > 80
            ? 15
            : trendingScore > 60
              ? 10
              : trendingScore > 40
                ? 5
                : 2;
        const score =
          trendingScore + searches * 2 + views * 1.5 + interactions * 3;

        trending.push({
          id: artist.id,
          type: "artist",
          name: artist.name,
          slug: artist.slug,
          imageUrl: artist.image_url,
          score: Math.round(score),
          metrics: {
            searches,
            views,
            interactions,
            growth,
          },
          timeframe,
        });
      });
    }

    // Test Shows
    console.log("2. Fetching trending shows...");
    const trendingShows = await sql`
      SELECT id, name, slug, view_count, vote_count, attendee_count, setlist_count, trending_score, date
      FROM shows
      ORDER BY trending_score DESC NULLS LAST, attendee_count DESC NULLS LAST
      LIMIT ${Math.ceil(limit / 3)}
    `;

    console.log(`Found ${trendingShows.length} shows`);

    if (trendingShows && trendingShows.length > 0) {
      trendingShows.forEach((show) => {
        const searches = Math.round((show.view_count || 0) * 0.3);
        const views = show.view_count || 0;
        const interactions =
          (show.vote_count || 0) + (show.attendee_count || 0);
        const trendingScore = show.trending_score || 0;

        const growth =
          trendingScore > 800
            ? 20
            : trendingScore > 500
              ? 15
              : trendingScore > 200
                ? 10
                : 5;
        const score =
          trendingScore + searches * 2 + views * 1.5 + interactions * 3;

        trending.push({
          id: show.id,
          type: "show",
          name: show.name || "Unnamed Show",
          slug: show.slug,
          score: Math.round(score),
          metrics: {
            searches,
            views,
            interactions,
            growth,
          },
          timeframe,
        });
      });
    }

    // Test Venues
    console.log("3. Fetching trending venues...");
    const trendingVenues = await sql`
      SELECT id, name, slug, image_url, capacity, city, state
      FROM venues
      WHERE capacity IS NOT NULL AND capacity > 0
      ORDER BY capacity DESC
      LIMIT ${Math.floor(limit / 3)}
    `;

    console.log(`Found ${trendingVenues.length} venues`);

    if (trendingVenues && trendingVenues.length > 0) {
      trendingVenues.forEach((venue) => {
        const capacity = venue.capacity || 1000;
        const searches = Math.round(capacity * 0.01);
        const views = Math.round(capacity * 0.02);
        const interactions = Math.round(capacity * 0.005);

        const growth =
          capacity > 50000
            ? 15
            : capacity > 20000
              ? 10
              : capacity > 10000
                ? 5
                : 2;
        const score = capacity * 0.01 + searches * 2 + views * 1.5;

        trending.push({
          id: venue.id,
          type: "venue",
          name: venue.name,
          slug: venue.slug,
          imageUrl: venue.image_url,
          score: Math.round(score),
          metrics: {
            searches,
            views,
            interactions,
            growth,
          },
          timeframe,
        });
      });
    }

    console.log(`\n4. Final results - Total items: ${trending.length}`);

    // Sort by score and return top results
    const sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`\n=== TOP ${sortedTrending.length} TRENDING ITEMS ===`);
    sortedTrending.forEach((item, i) => {
      console.log(`${i + 1}. [${item.type.toUpperCase()}] ${item.name}`);
      console.log(`   Score: ${item.score}, Growth: +${item.metrics.growth}%`);
      console.log(
        `   Metrics: ${item.metrics.searches} searches, ${item.metrics.views} views, ${item.metrics.interactions} interactions`,
      );
      console.log(
        `   Slug: /${item.type === "artist" ? "artists" : item.type === "show" ? "shows" : "venues"}/${item.slug}\n`,
      );
    });

    const response = {
      trending: sortedTrending,
      timeframe,
      type: type || "all",
      total: sortedTrending.length,
      generatedAt: new Date().toISOString(),
    };

    console.log("=== API RESPONSE STRUCTURE ===");
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sql.end();
  }
}

testTrendingLogic();
