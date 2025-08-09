// Debug the exact issue with all types query
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function debugAllIssue() {
  console.log('🔍 Debugging the all types API issue...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const trending = [];
    const limit = 5;
    const type = "all";

    console.log('\n1️⃣ Testing artists query...');
    const { data: trendingArtists } = await supabase
      .from("artists")
      .select("id, name, slug, image_url, popularity, followers, follower_count, monthly_listeners, trending_score")
      .order("trending_score", { ascending: false, nullsLast: true })
      .order("popularity", { ascending: false, nullsLast: true })
      .limit(type === "artist" ? limit : Math.ceil(limit / 3));

    console.log('Artists found:', trendingArtists?.length || 0);
    
    if (trendingArtists && trendingArtists.length > 0) {
      trendingArtists.forEach((artist) => {
        const searches = Math.round((artist.popularity || 0) * 1.5);
        const views = artist.popularity || 0;
        const interactions = artist.follower_count || artist.followers || 0;
        const trendingScore = artist.trending_score || 0;
        const growth = trendingScore > 80 ? 15 : trendingScore > 60 ? 10 : trendingScore > 40 ? 5 : 2;
        const score = trendingScore + searches * 2 + views * 1.5 + interactions * 3;

        trending.push({
          id: artist.id,
          type: "artist",
          name: artist.name,
          slug: artist.slug,
          ...(artist.image_url && { imageUrl: artist.image_url }),
          score: Math.round(score),
          metrics: { searches, views, interactions, growth },
          timeframe: "24h",
        });
      });
    }

    console.log('After artists, trending length:', trending.length);

    console.log('\n2️⃣ Testing shows query...');
    const { data: trendingShows, error: showError } = await supabase
      .from("shows")
      .select("id, name, slug, view_count, vote_count, attendee_count, setlist_count, trending_score, date")
      .order("trending_score", { ascending: false, nullsLast: true })
      .order("attendee_count", { ascending: false, nullsLast: true })
      .limit(type === "show" ? limit : Math.ceil(limit / 3));

    if (showError) {
      console.error('Shows error:', showError);
    } else {
      console.log('Shows found:', trendingShows?.length || 0);
      
      if (trendingShows && trendingShows.length > 0) {
        trendingShows.forEach((show) => {
          const searches = Math.round((show.view_count || 0) * 0.3);
          const views = show.view_count || 0;
          const interactions = (show.vote_count || 0) + (show.attendee_count || 0);
          const trendingScore = show.trending_score || 0;
          const growth = trendingScore > 800 ? 20 : trendingScore > 500 ? 15 : trendingScore > 200 ? 10 : 5;
          const score = trendingScore + searches * 2 + views * 1.5 + interactions * 3;
          const showName = show.name || "Unnamed Show";

          trending.push({
            id: show.id,
            type: "show",
            name: showName,
            slug: show.slug,
            score: Math.round(score),
            metrics: { searches, views, interactions, growth },
            timeframe: "24h",
          });
        });
      }
    }

    console.log('After shows, trending length:', trending.length);

    console.log('\n3️⃣ Testing venues query...');
    const { data: trendingVenues, error: venueError } = await supabase
      .from("venues")
      .select("id, name, slug, image_url, capacity, city, state")
      .not("capacity", "is", null)
      .gt("capacity", 0)
      .order("capacity", { ascending: false })
      .limit(Math.floor(limit / 3));

    if (venueError) {
      console.error('Venues error:', venueError);
    } else {
      console.log('Venues found:', trendingVenues?.length || 0);
      
      if (trendingVenues && trendingVenues.length > 0) {
        trendingVenues.forEach((venue) => {
          const capacity = venue.capacity || 1000;
          const searches = Math.round(capacity * 0.01);
          const views = Math.round(capacity * 0.02);
          const interactions = Math.round(capacity * 0.005);
          const growth = capacity > 50000 ? 15 : capacity > 20000 ? 10 : capacity > 10000 ? 5 : 2;
          const score = capacity * 0.01 + searches * 2 + views * 1.5;

          trending.push({
            id: venue.id,
            type: "venue",
            name: venue.name,
            slug: venue.slug,
            ...(venue.image_url && { imageUrl: venue.image_url }),
            score: Math.round(score),
            metrics: { searches, views, interactions, growth },
            timeframe: "24h",
          });
        });
      }
    }

    console.log('After venues, trending length:', trending.length);

    // Sort by score and return top results
    const sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log('\n🎯 Final result:');
    console.log('Total items:', sortedTrending.length);
    sortedTrending.forEach((item, i) => {
      console.log(`${i + 1}. ${item.name} (${item.type}) - Score: ${item.score}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAllIssue();