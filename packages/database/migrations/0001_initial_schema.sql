-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create enums
CREATE TYPE "user_role" AS ENUM('user', 'moderator', 'admin');
CREATE TYPE "show_status" AS ENUM('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE "setlist_type" AS ENUM('predicted', 'actual');
CREATE TYPE "vote_type" AS ENUM('up', 'down');

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "display_name" text,
  "avatar_url" text,
  "spotify_id" text UNIQUE,
  "spotify_refresh_token" text,
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "email_verified" timestamp,
  "last_login_at" timestamp,
  "preferences" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "bio" text,
  "location" text,
  "website" text,
  "favorite_genres" text,
  "concert_count" integer DEFAULT 0,
  "is_public" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create artists table
CREATE TABLE IF NOT EXISTS "artists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "spotify_id" text UNIQUE,
  "name" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "image_url" text,
  "small_image_url" text,
  "genres" text,
  "popularity" integer DEFAULT 0,
  "followers" integer DEFAULT 0,
  "monthly_listeners" integer,
  "verified" boolean DEFAULT false,
  "bio" text,
  "external_urls" text,
  "last_synced_at" timestamp,
  "trending_score" double precision DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create artist_stats table
CREATE TABLE IF NOT EXISTS "artist_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "artist_id" uuid NOT NULL REFERENCES "artists"("id"),
  "total_shows" integer DEFAULT 0,
  "total_setlists" integer DEFAULT 0,
  "avg_setlist_length" double precision,
  "most_played_song" text,
  "last_show_date" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create venues table
CREATE TABLE IF NOT EXISTS "venues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "address" text,
  "city" text NOT NULL,
  "state" text,
  "country" text NOT NULL,
  "postal_code" text,
  "latitude" double precision,
  "longitude" double precision,
  "timezone" text NOT NULL,
  "capacity" integer,
  "venue_type" text,
  "phone_number" text,
  "website" text,
  "image_url" text,
  "description" text,
  "amenities" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create shows table
CREATE TABLE IF NOT EXISTS "shows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "headliner_artist_id" uuid NOT NULL REFERENCES "artists"("id"),
  "venue_id" uuid REFERENCES "venues"("id"),
  "name" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "date" date NOT NULL,
  "start_time" time,
  "doors_time" time,
  "status" "show_status" DEFAULT 'upcoming' NOT NULL,
  "description" text,
  "ticket_url" text,
  "min_price" integer,
  "max_price" integer,
  "currency" text DEFAULT 'USD',
  "view_count" integer DEFAULT 0,
  "attendee_count" integer DEFAULT 0,
  "setlist_count" integer DEFAULT 0,
  "vote_count" integer DEFAULT 0,
  "trending_score" double precision DEFAULT 0,
  "is_featured" boolean DEFAULT false,
  "is_verified" boolean DEFAULT false,
  "ticketmaster_id" text,
  "setlistfm_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create show_artists table
CREATE TABLE IF NOT EXISTS "show_artists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "show_id" uuid NOT NULL REFERENCES "shows"("id"),
  "artist_id" uuid NOT NULL REFERENCES "artists"("id"),
  "order_index" integer NOT NULL,
  "set_length" integer,
  "is_headliner" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create songs table
CREATE TABLE IF NOT EXISTS "songs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "spotify_id" text UNIQUE,
  "title" text NOT NULL,
  "artist" text NOT NULL,
  "album" text,
  "album_art_url" text,
  "release_date" date,
  "duration_ms" integer,
  "popularity" integer DEFAULT 0,
  "preview_url" text,
  "is_explicit" boolean DEFAULT false,
  "is_playable" boolean DEFAULT true,
  "acousticness" text,
  "danceability" text,
  "energy" text,
  "valence" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create setlists table
CREATE TABLE IF NOT EXISTS "setlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "show_id" uuid NOT NULL REFERENCES "shows"("id"),
  "artist_id" uuid NOT NULL REFERENCES "artists"("id"),
  "type" "setlist_type" NOT NULL,
  "name" text DEFAULT 'Main Set',
  "order_index" integer DEFAULT 0,
  "is_locked" boolean DEFAULT false,
  "total_votes" integer DEFAULT 0,
  "accuracy_score" integer DEFAULT 0,
  "imported_from" text,
  "external_id" text,
  "imported_at" timestamp,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create setlist_songs table
CREATE TABLE IF NOT EXISTS "setlist_songs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "setlist_id" uuid NOT NULL REFERENCES "setlists"("id"),
  "song_id" uuid NOT NULL REFERENCES "songs"("id"),
  "position" integer NOT NULL,
  "notes" text,
  "is_played" boolean,
  "play_time" timestamp,
  "upvotes" integer DEFAULT 0,
  "downvotes" integer DEFAULT 0,
  "net_votes" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("setlist_id", "position")
);

-- Create votes table
CREATE TABLE IF NOT EXISTS "votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "setlist_song_id" uuid NOT NULL REFERENCES "setlist_songs"("id"),
  "vote_type" "vote_type" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("user_id", "setlist_song_id")
);

-- Create indexes for performance
CREATE INDEX idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX idx_shows_date ON shows(date);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_venues_location ON venues USING GIST(ST_Point(longitude, latitude));
CREATE INDEX idx_setlist_songs_position ON setlist_songs(setlist_id, position);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artist_stats_updated_at BEFORE UPDATE ON artist_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON shows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlists_updated_at BEFORE UPDATE ON setlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlist_songs_updated_at BEFORE UPDATE ON setlist_songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();