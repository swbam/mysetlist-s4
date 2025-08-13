-- =====================================================================
-- Fix Missing Columns for Trending System
-- =====================================================================

-- Add missing columns to artist_stats if they don't exist
ALTER TABLE artist_stats 
ADD COLUMN IF NOT EXISTS trending_score DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS trending_score_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to shows if they don't exist  
ALTER TABLE shows
ADD COLUMN IF NOT EXISTS trending_score DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS trending_score_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trending_artists table if it doesn't exist
CREATE TABLE IF NOT EXISTS trending_artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  score DECIMAL(10,2) NOT NULL DEFAULT 0,
  period VARCHAR(20) NOT NULL DEFAULT 'weekly',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artist_id, period)
);

-- Create trending_shows table if it doesn't exist
CREATE TABLE IF NOT EXISTS trending_shows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  score DECIMAL(10,2) NOT NULL DEFAULT 0,
  period VARCHAR(20) NOT NULL DEFAULT 'weekly',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, period)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_artist_stats_trending_score ON artist_stats(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_artists_calculated ON trending_artists(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_shows_calculated ON trending_shows(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_artists_period ON trending_artists(period, score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_shows_period ON trending_shows(period, score DESC);