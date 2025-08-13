# TheSet - Database Schema Documentation

## Overview

TheSet uses Supabase (PostgreSQL) with Drizzle ORM for type-safe database operations. The schema is designed to support the modern ArtistImportOrchestrator system with real-time progress tracking and intelligent caching.

## Core Tables

### Artists Table
The central table for artist data with import tracking capabilities:

```sql
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id VARCHAR(255) UNIQUE,
  ticketmaster_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  image_url TEXT,
  small_image_url TEXT,
  genres JSONB DEFAULT '[]',
  popularity INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  external_urls JSONB DEFAULT '{}',
  verified BOOLEAN DEFAULT false,
  
  -- Import tracking fields
  last_synced_at TIMESTAMP WITH TIME ZONE,
  song_catalog_synced_at TIMESTAMP WITH TIME ZONE,
  last_full_sync_at TIMESTAMP WITH TIME ZONE,
  total_songs INTEGER DEFAULT 0,
  total_albums INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX idx_artists_ticketmaster_id ON artists(ticketmaster_id);
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_last_synced ON artists(last_synced_at);
```

### Import Status Tracking
New tables to support real-time import progress via SSE:

```sql
CREATE TABLE import_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(255) UNIQUE NOT NULL,
  artist_id UUID REFERENCES artists(id),
  stage VARCHAR(50) NOT NULL,
  progress INTEGER DEFAULT 0,
  message TEXT,
  error TEXT,
  estimated_time_remaining INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE import_status;

-- Index for SSE queries
CREATE INDEX idx_import_status_job_id ON import_status(job_id);
CREATE INDEX idx_import_status_artist_id ON import_status(artist_id);
```

### Shows Table
Enhanced with venue relationships and import tracking:

```sql
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketmaster_id VARCHAR(255) UNIQUE,
  headliner_artist_id UUID REFERENCES artists(id) NOT NULL,
  venue_id UUID REFERENCES venues(id),
  name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  status VARCHAR(50) DEFAULT 'upcoming',
  ticket_url TEXT,
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Metadata
  description TEXT,
  age_restrictions VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shows_artist_id ON shows(headliner_artist_id);
CREATE INDEX idx_shows_venue_id ON shows(venue_id);
CREATE INDEX idx_shows_date ON shows(date);
CREATE INDEX idx_shows_status ON shows(status);
```

### Songs Table
Optimized for catalog management with duplicate detection:

```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  album_art_url TEXT,
  release_date DATE,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  is_explicit BOOLEAN DEFAULT false,
  is_playable BOOLEAN DEFAULT true,
  
  -- Metadata for filtering
  is_live BOOLEAN DEFAULT false,
  is_demo BOOLEAN DEFAULT false,
  track_number INTEGER,
  disc_number INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_songs_spotify_id ON songs(spotify_id);
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_songs_popularity ON songs(popularity DESC);
```

### Artist-Song Relationships
Junction table for many-to-many relationships:

```sql
CREATE TABLE artist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  is_primary_artist BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(artist_id, song_id)
);

-- Indexes
CREATE INDEX idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX idx_artist_songs_song_id ON artist_songs(song_id);
```

### Venues Table
Enhanced with location data and PostGIS support:

```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketmaster_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(2),
  postal_code VARCHAR(20),
  
  -- PostGIS location data
  location GEOMETRY(POINT, 4326),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  
  -- Venue details
  timezone VARCHAR(50),
  capacity INTEGER,
  website TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes including spatial
CREATE INDEX idx_venues_ticketmaster_id ON venues(ticketmaster_id);
CREATE INDEX idx_venues_slug ON venues(slug);
CREATE INDEX idx_venues_location ON venues USING GIST(location);
CREATE INDEX idx_venues_city_state ON venues(city, state);
```

### Setlists and Voting
Enhanced voting system with real-time capabilities:

```sql
CREATE TABLE setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) NOT NULL,
  type VARCHAR(50) DEFAULT 'predicted', -- 'predicted', 'actual', 'user_created'
  name VARCHAR(255) NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  total_votes INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE setlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(setlist_id, song_id),
  UNIQUE(setlist_id, position)
);

-- Enable real-time for voting
ALTER PUBLICATION supabase_realtime ADD TABLE setlist_songs;
```

## User and Authentication Tables

### User Profiles
Extended user data beyond Supabase auth:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  location VARCHAR(100),
  website TEXT,
  
  -- Preferences
  email_notifications BOOLEAN DEFAULT true,
  public_profile BOOLEAN DEFAULT true,
  
  -- Statistics
  total_votes INTEGER DEFAULT 0,
  total_follows INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### User Follows Artists
Track artist following relationships:

```sql
CREATE TABLE user_follows_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, artist_id)
);
```

## Row Level Security (RLS)

### Security Policies
Comprehensive RLS setup for data protection:

```sql
-- Enable RLS on all tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_status ENABLE ROW LEVEL SECURITY;

-- Public read access for core content
CREATE POLICY "Public read access" ON artists FOR SELECT USING (true);
CREATE POLICY "Public read access" ON shows FOR SELECT USING (true);
CREATE POLICY "Public read access" ON songs FOR SELECT USING (true);
CREATE POLICY "Public read access" ON venues FOR SELECT USING (true);
CREATE POLICY "Public read access" ON setlists FOR SELECT USING (true);
CREATE POLICY "Public read access" ON setlist_songs FOR SELECT USING (true);

-- User-specific policies
CREATE POLICY "Users can view own profile" ON user_profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own follows" ON user_follows_artists 
  FOR ALL USING (auth.uid() = user_id);

-- Import status policies (users can view progress of their imports)
CREATE POLICY "Users can view import status" ON import_status 
  FOR SELECT USING (true);
```

## Database Functions and Triggers

### Trending Calculation Function
Automated trending score calculation:

```sql
CREATE OR REPLACE FUNCTION calculate_trending_score(
  artist_id_param UUID,
  days_back INTEGER DEFAULT 7
) RETURNS DECIMAL AS $$
DECLARE
  vote_score DECIMAL := 0;
  view_score DECIMAL := 0;
  follow_score DECIMAL := 0;
  total_score DECIMAL := 0;
BEGIN
  -- Calculate vote activity (weight: 0.5)
  SELECT COALESCE(COUNT(*) * 0.5, 0) INTO vote_score
  FROM setlist_songs ss
  JOIN setlists s ON ss.setlist_id = s.id
  WHERE s.artist_id = artist_id_param
    AND ss.created_at >= NOW() - INTERVAL '%s days', days_back;

  -- Calculate follow activity (weight: 0.3)
  SELECT COALESCE(COUNT(*) * 0.3, 0) INTO follow_score
  FROM user_follows_artists
  WHERE artist_id = artist_id_param
    AND followed_at >= NOW() - INTERVAL '%s days', days_back;

  -- Simple trending calculation
  total_score := vote_score + follow_score;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql;
```

### Auto-update Triggers
Automatic timestamp and statistic updates:

```sql
-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- And so on for other tables...
```

## Performance Optimizations

### Database Configuration
Optimized settings for the import system:

```sql
-- Enable parallel query execution
SET max_parallel_workers_per_gather = 4;
SET max_parallel_workers = 8;

-- Optimize for import workloads
SET work_mem = '256MB';
SET shared_buffers = '1GB';
SET effective_cache_size = '4GB';

-- Connection pooling settings
SET max_connections = 100;
SET max_prepared_transactions = 100;
```

### Materialized Views
Pre-computed data for performance:

```sql
-- Trending artists view
CREATE MATERIALIZED VIEW trending_artists AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.image_url,
  calculate_trending_score(a.id) as trending_score,
  COUNT(DISTINCT s.id) as show_count,
  COUNT(DISTINCT ufa.user_id) as follower_count
FROM artists a
LEFT JOIN shows s ON a.id = s.headliner_artist_id
LEFT JOIN user_follows_artists ufa ON a.id = ufa.artist_id
WHERE a.verified = true
GROUP BY a.id, a.name, a.slug, a.image_url
ORDER BY trending_score DESC;

-- Refresh hourly via cron job
CREATE INDEX idx_trending_artists_score ON trending_artists(trending_score DESC);
```

## Migration Strategy

### Drizzle Integration
The schema is managed through Drizzle ORM with migration support:

```typescript
// packages/database/drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Migration Commands
```bash
# Generate migration
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema changes
pnpm db:push

# Open database studio
pnpm db:studio
```

This database schema provides a robust foundation for TheSet's modern import system with real-time capabilities, comprehensive tracking, and production-scale performance optimizations.