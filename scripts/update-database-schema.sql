-- Add missing columns to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS previous_followers INTEGER;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS previous_popularity INTEGER;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS previous_monthly_listeners INTEGER;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS previous_follower_count INTEGER;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS last_growth_calculated TIMESTAMP;

-- Add missing columns to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS total_shows INTEGER DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS upcoming_shows INTEGER DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS total_attendance INTEGER DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS average_rating DOUBLE PRECISION;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS previous_total_shows INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS previous_upcoming_shows INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS previous_total_attendance INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_growth_calculated TIMESTAMP;

-- Add missing columns to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS plays INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS skips INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS features TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS last_calculated TIMESTAMP;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS previous_plays INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS last_growth_calculated TIMESTAMP;

-- Add missing columns to shows table if they don't exist
ALTER TABLE shows ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS genres TEXT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS support_acts TEXT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS external_ids TEXT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS seatmap_url TEXT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS view_history TEXT DEFAULT '[]';
ALTER TABLE shows ADD COLUMN IF NOT EXISTS previous_view_count INTEGER;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS previous_vote_count INTEGER;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS last_growth_calculated TIMESTAMP;