import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Updating trending scores...');

    // Update trending scores for shows
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id,
        created_at,
        show_votes:votes(count),
        show_attendees:show_attendees(count)
      `)
      .gte(
        'created_at',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (showsError) throw showsError;

    // Calculate and update trending scores for shows
    for (const show of shows || []) {
      const votes = show.show_votes?.[0]?.count || 0;
      const attendees = show.show_attendees?.[0]?.count || 0;
      const score = calculateTrendingScore(
        votes,
        attendees,
        new Date(show.created_at)
      );

      await supabase
        .from('shows')
        .update({ trending_score: score })
        .eq('id', show.id);
    }

    // Update trending scores for artists based on their recent shows
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select(`
        id,
        shows(
          id,
          created_at,
          show_votes:votes(count),
          show_attendees:show_attendees(count)
        ),
        user_follows_artists(count)
      `);

    if (artistsError) throw artistsError;

    // Calculate aggregate scores for artists
    for (const artist of artists || []) {
      const recentShows = artist.shows.filter(
        (show) =>
          new Date(show.created_at) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (recentShows.length > 0) {
        const totalVotes = recentShows.reduce(
          (sum, show) => sum + (show.show_votes?.[0]?.count || 0),
          0
        );
        const totalAttendees = recentShows.reduce(
          (sum, show) => sum + (show.show_attendees?.[0]?.count || 0),
          0
        );
        const followers = artist.user_follows_artists?.[0]?.count || 0;

        const mostRecentShow = recentShows.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const score = calculateTrendingScore(
          totalVotes,
          totalAttendees + followers,
          new Date(mostRecentShow.created_at)
        );

        await supabase
          .from('artists')
          .update({ trending_score: score })
          .eq('id', artist.id);
      }
    }

    // Clean up old data (optional)
    const cleanupDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from('shows')
      .update({ trending_score: 0 })
      .lt('created_at', cleanupDate);

    await supabase
      .from('artists')
      .update({ trending_score: 0 })
      .not('shows.created_at', 'gte', cleanupDate);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trending scores updated successfully',
        updated: {
          shows: shows?.length || 0,
          artists: artists?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating trending scores:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateTrendingScore(
  votes: number,
  attendees: number,
  createdAt: Date
): number {
  // Normalize values using logarithmic scale
  const normalizedVotes = Math.log10(votes + 1);
  const normalizedAttendees = Math.log10(attendees + 1);

  // Calculate recency score (0-1, where 1 is most recent)
  const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - hoursAgo / 168); // 168 hours = 7 days

  // Weighted score calculation
  const score =
    normalizedVotes * 0.5 + // 50% weight for votes
    normalizedAttendees * 0.3 + // 30% weight for attendees
    recencyScore * 0.2; // 20% weight for recency

  return Math.round(score * 1000) / 1000; // Round to 3 decimal places
}
