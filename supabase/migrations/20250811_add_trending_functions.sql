-- Add database functions to support trending insights

-- Function to get vote counts for artists
CREATE OR REPLACE FUNCTION get_artist_vote_counts(artist_ids uuid[])
RETURNS TABLE (
  artist_id uuid,
  total_votes bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    s.artist_id,
    COALESCE(SUM(ss.upvotes), 0) as total_votes
  FROM setlists s
  LEFT JOIN setlist_songs ss ON s.id = ss.setlist_id
  WHERE s.artist_id = ANY(artist_ids)
  GROUP BY s.artist_id;
$$;

-- Function to get trending artists with vote counts (optimized)
CREATE OR REPLACE FUNCTION get_trending_artists_with_votes(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  image_url text,
  trending_score double precision,
  popularity integer,
  follower_count integer,
  followers integer,
  genres text,
  total_shows integer,
  upcoming_shows integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  previous_follower_count integer,
  previous_popularity integer,
  total_votes bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    a.id,
    a.name,
    a.slug,
    a.image_url,
    a.trending_score,
    a.popularity,
    a.follower_count,
    a.followers,
    a.genres,
    a.total_shows,
    a.upcoming_shows,
    a.created_at,
    a.updated_at,
    a.previous_follower_count,
    a.previous_popularity,
    COALESCE(v.total_votes, 0) as total_votes
  FROM artists a
  LEFT JOIN (
    SELECT 
      s.artist_id,
      SUM(ss.upvotes) as total_votes
    FROM setlists s
    LEFT JOIN setlist_songs ss ON s.id = ss.setlist_id
    GROUP BY s.artist_id
  ) v ON a.id = v.artist_id
  WHERE a.trending_score > 0
  ORDER BY a.trending_score DESC
  LIMIT limit_count;
$$;

-- Function to get most voted songs with metadata
CREATE OR REPLACE FUNCTION get_most_voted_songs(
  timeframe_days integer DEFAULT 7,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  song_id uuid,
  title text,
  artist text,
  album_art_url text,
  total_votes bigint,
  show_count bigint,
  last_voted_at timestamp with time zone,
  artist_slug text
)
LANGUAGE sql
STABLE
AS $$
  WITH song_votes AS (
    SELECT 
      ss.song_id,
      SUM(ss.upvotes) as total_votes,
      COUNT(DISTINCT s.show_id) as show_count,
      MAX(v.created_at) as last_voted_at,
      array_agg(DISTINCT ar.slug) as artist_slugs
    FROM setlist_songs ss
    JOIN setlists s ON ss.setlist_id = s.id
    JOIN artists ar ON s.artist_id = ar.id
    LEFT JOIN votes v ON ss.id = v.setlist_song_id
    WHERE (timeframe_days = 0 OR v.created_at >= NOW() - (timeframe_days || ' days')::interval)
    AND ss.upvotes > 0
    GROUP BY ss.song_id
  )
  SELECT 
    sv.song_id,
    so.title,
    so.artist,
    so.album_art_url,
    sv.total_votes,
    sv.show_count,
    sv.last_voted_at,
    COALESCE(sv.artist_slugs[1], '') as artist_slug
  FROM song_votes sv
  JOIN songs so ON sv.song_id = so.id
  ORDER BY sv.total_votes DESC
  LIMIT limit_count;
$$;

-- Function to get trending locations with statistics
CREATE OR REPLACE FUNCTION get_trending_locations(limit_count integer DEFAULT 10)
RETURNS TABLE (
  city text,
  state text,
  country text,
  show_count bigint,
  upcoming_shows bigint,
  total_votes bigint,
  total_venues bigint,
  top_artist text
)
LANGUAGE sql
STABLE
AS $$
  WITH location_stats AS (
    SELECT 
      v.city,
      v.state,
      v.country,
      COUNT(DISTINCT s.id) as show_count,
      COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'upcoming') as upcoming_shows,
      SUM(s.vote_count) as total_votes,
      COUNT(DISTINCT v.id) as total_venues,
      mode() WITHIN GROUP (ORDER BY a.name) as top_artist
    FROM venues v
    LEFT JOIN shows s ON v.id = s.venue_id
    LEFT JOIN artists a ON s.headliner_artist_id = a.id
    WHERE v.total_shows > 0
    GROUP BY v.city, v.state, v.country
  )
  SELECT 
    ls.city,
    ls.state,
    ls.country,
    ls.show_count,
    ls.upcoming_shows,
    COALESCE(ls.total_votes, 0) as total_votes,
    ls.total_venues,
    COALESCE(ls.top_artist, '') as top_artist
  FROM location_stats ls
  ORDER BY ls.upcoming_shows DESC, ls.total_votes DESC
  LIMIT limit_count;
$$;

-- Function to get recent activity (votes and setlist creation)
CREATE OR REPLACE FUNCTION get_recent_setlist_activity(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  type text,
  show_name text,
  show_slug text,
  artist_name text,
  artist_slug text,
  venue_name text,
  venue_city text,
  show_date date,
  created_at timestamp with time zone,
  song_title text
)
LANGUAGE sql
STABLE
AS $$
  WITH recent_votes AS (
    SELECT 
      v.id,
      'new_vote'::text as type,
      sh.name as show_name,
      sh.slug as show_slug,
      a.name as artist_name,
      a.slug as artist_slug,
      ve.name as venue_name,
      ve.city as venue_city,
      sh.date as show_date,
      v.created_at,
      so.title as song_title
    FROM votes v
    JOIN setlist_songs ss ON v.setlist_song_id = ss.id
    JOIN songs so ON ss.song_id = so.id
    JOIN setlists sl ON ss.setlist_id = sl.id
    JOIN shows sh ON sl.show_id = sh.id
    JOIN artists a ON sl.artist_id = a.id
    LEFT JOIN venues ve ON sh.venue_id = ve.id
    WHERE v.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY v.created_at DESC
    LIMIT limit_count
  )
  SELECT * FROM recent_votes;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC) WHERE trending_score > 0;
CREATE INDEX IF NOT EXISTS idx_setlist_songs_upvotes ON setlist_songs(upvotes DESC) WHERE upvotes > 0;
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shows_status_date ON shows(status, date) WHERE status = 'upcoming';
CREATE INDEX IF NOT EXISTS idx_venues_city_shows ON venues(city, total_shows DESC) WHERE total_shows > 0;