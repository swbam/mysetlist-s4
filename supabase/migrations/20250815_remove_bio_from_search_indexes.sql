-- Remove bio from artists search indexes and replace with name + genres only
-- Safe to run multiple times

-- Drop legacy FTS and trigram indexes that reference bio
DROP INDEX IF EXISTS idx_artists_search;
DROP INDEX IF EXISTS idx_artists_fulltext;

-- Recreate FTS index without bio
CREATE INDEX IF NOT EXISTS idx_artists_search ON artists USING gin(
  to_tsvector('english',
    name || ' ' || COALESCE(genres::text, '')
  )
);

-- Optional: trigram index without bio for fuzzy search on name only
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON artists USING gin(name gin_trgm_ops);