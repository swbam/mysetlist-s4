-- Remove bio references and update FTS indexes
-- This migration removes bio column from artists table if it exists and updates full-text search indexes

-- Drop bio column if it exists
ALTER TABLE artists DROP COLUMN IF EXISTS bio;

-- Update the FTS index to use genres instead of bio
DROP INDEX IF EXISTS idx_artists_search;
CREATE INDEX IF NOT EXISTS idx_artists_search ON artists USING gin(to_tsvector('english', name || ' ' || COALESCE(genres, '')));

-- Update comments
COMMENT ON INDEX idx_artists_search IS 'Full-text search index for artist names and genres';

-- Ensure the index is properly updated in the performance migration as well
-- The index in 0002_optimize_database_performance.sql should also be updated
DROP INDEX IF EXISTS idx_artists_search CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_search ON artists 
USING gin((name || ' ' || COALESCE(genres, '')) gin_trgm_ops);