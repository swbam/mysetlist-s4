import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/api/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id: userId } = await params;

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userData ||
      (userData.role !== "admin" && userData.role !== "moderator")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user statistics in parallel
    const [
      { count: setlistsCreated },
      { count: reviewsWritten },
      { count: votesCast },
      { count: photosUploaded },
      { count: commentsWritten },
      { count: reportsSubmitted },
      { data: recentActivity },
      { data: loginHistory },
    ] = await Promise.all([
      // Setlists created
      supabase
        .from("setlists")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId),

      // Reviews written
      supabase
        .from("venue_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),

      // Votes cast
      supabase
        .from("setlist_song_votes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),

      // Photos uploaded
      supabase
        .from("venue_photos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),

      // Comments written (if you have a comments table)
      supabase
        .from("venue_review_comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),

      // Reports submitted
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("reporter_id", userId),

      // Recent activity (last 10 actions)
      supabase
        .from("user_activity_log")
        .select(
          `
          action,
          target_type,
          details,
          created_at
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),

      // Login history (last 10 logins)
      supabase
        .from("user_login_history")
        .select(
          `
          ip_address,
          user_agent,
          created_at
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Get content engagement stats
    const { data: setlistStats } = await supabase
      .from("setlists")
      .select(
        `
        id,
        views,
        votes:setlist_song_votes(count),
        created_at
      `,
      )
      .eq("created_by", userId)
      .order("views", { ascending: false })
      .limit(5);

    // Get user's most active venues/artists
    const { data: venueActivity } = await supabase
      .from("venue_reviews")
      .select(
        `
        venue:venues(id, name),
        rating
      `,
      )
      .eq("user_id", userId)
      .limit(5);

    // Calculate engagement metrics
    const totalContentCreated =
      (setlistsCreated || 0) + (reviewsWritten || 0) + (photosUploaded || 0);
    const engagementScore = calculateEngagementScore({
      setlists: setlistsCreated || 0,
      reviews: reviewsWritten || 0,
      votes: votesCast || 0,
      photos: photosUploaded || 0,
      comments: commentsWritten || 0,
    });

    const stats = {
      content: {
        setlists_created: setlistsCreated || 0,
        reviews_written: reviewsWritten || 0,
        votes_cast: votesCast || 0,
        photos_uploaded: photosUploaded || 0,
        comments_written: commentsWritten || 0,
        total_content: totalContentCreated,
      },

      engagement: {
        reports_submitted: reportsSubmitted || 0,
        engagement_score: engagementScore,
        avg_review_rating:
          venueActivity && venueActivity.length > 0
            ? venueActivity.reduce((sum, v) => sum + (v.rating || 0), 0) /
              venueActivity.length
            : 0,
      },

      activity: {
        recent_actions: recentActivity || [],
        login_history: loginHistory || [],
        most_viewed_setlists: setlistStats || [],
        favorite_venues: venueActivity || [],
      },

      behavior: {
        content_quality_score: calculateContentQualityScore({
          setlists: setlistsCreated || 0,
          reviews: reviewsWritten || 0,
          votes: votesCast || 0,
        }),
        community_engagement: calculateCommunityEngagement({
          votes: votesCast || 0,
          reviews: reviewsWritten || 0,
          comments: commentsWritten || 0,
        }),
        platform_tenure_days: calculateTenureDays(userId),
      },
    };

    return NextResponse.json(stats);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch user statistics" },
      { status: 500 },
    );
  }
}

function calculateEngagementScore(metrics: {
  setlists: number;
  reviews: number;
  votes: number;
  photos: number;
  comments: number;
}): number {
  const weights = {
    setlists: 10,
    reviews: 5,
    votes: 1,
    photos: 3,
    comments: 2,
  };

  const score =
    metrics.setlists * weights.setlists +
    metrics.reviews * weights.reviews +
    metrics.votes * weights.votes +
    metrics.photos * weights.photos +
    metrics.comments * weights.comments;

  // Normalize to 0-100 scale
  return Math.min(100, Math.round(score / 10));
}

function calculateContentQualityScore(metrics: {
  setlists: number;
  reviews: number;
  votes: number;
}): number {
  // Simple quality score based on content creation
  const totalContent = metrics.setlists + metrics.reviews;
  const voteRatio = totalContent > 0 ? metrics.votes / totalContent : 0;

  // Score out of 100
  let score = 50; // Base score

  if (totalContent > 10) {
    score += 20;
  }
  if (totalContent > 25) {
    score += 15;
  }
  if (voteRatio > 5) {
    score += 15;
  }

  return Math.min(100, score);
}

function calculateCommunityEngagement(metrics: {
  votes: number;
  reviews: number;
  comments: number;
}): number {
  const totalInteractions =
    metrics.votes + metrics.reviews * 2 + metrics.comments;

  if (totalInteractions < 5) {
    return 20;
  }
  if (totalInteractions < 25) {
    return 60;
  }
  return 90;
}

function calculateTenureDays(_userId: string): number {
  // This would need to be calculated from user creation date
  // For now, return a placeholder
  return 90;
}
