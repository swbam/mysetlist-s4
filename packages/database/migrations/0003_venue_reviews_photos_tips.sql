-- Create venue_reviews table
CREATE TABLE IF NOT EXISTS venue_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  acoustics INTEGER CHECK (acoustics IS NULL OR (acoustics >= 1 AND acoustics <= 5)),
  accessibility INTEGER CHECK (accessibility IS NULL OR (accessibility >= 1 AND accessibility <= 5)),
  sightlines INTEGER CHECK (sightlines IS NULL OR (sightlines >= 1 AND sightlines <= 5)),
  parking_ease INTEGER CHECK (parking_ease IS NULL OR (parking_ease >= 1 AND parking_ease <= 5)),
  concessions INTEGER CHECK (concessions IS NULL OR (concessions >= 1 AND concessions <= 5)),
  visited_at TIMESTAMP NOT NULL,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create venue_photos table
CREATE TABLE IF NOT EXISTS venue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create venue_insider_tips table
CREATE TABLE IF NOT EXISTS venue_insider_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tip_category TEXT NOT NULL,
  tip TEXT NOT NULL,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_venue_reviews_venue_id ON venue_reviews(venue_id);
CREATE INDEX idx_venue_reviews_user_id ON venue_reviews(user_id);
CREATE INDEX idx_venue_reviews_rating ON venue_reviews(rating);
CREATE INDEX idx_venue_reviews_created_at ON venue_reviews(created_at DESC);

CREATE INDEX idx_venue_photos_venue_id ON venue_photos(venue_id);
CREATE INDEX idx_venue_photos_user_id ON venue_photos(user_id);
CREATE INDEX idx_venue_photos_created_at ON venue_photos(created_at DESC);

CREATE INDEX idx_venue_insider_tips_venue_id ON venue_insider_tips(venue_id);
CREATE INDEX idx_venue_insider_tips_user_id ON venue_insider_tips(user_id);
CREATE INDEX idx_venue_insider_tips_category ON venue_insider_tips(tip_category);
CREATE INDEX idx_venue_insider_tips_helpful ON venue_insider_tips(helpful DESC);

-- Add unique constraint to prevent duplicate reviews from same user for same venue
CREATE UNIQUE INDEX idx_venue_reviews_unique_user_venue ON venue_reviews(user_id, venue_id);

-- Add updated_at trigger for venue_reviews
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_venue_reviews_updated_at BEFORE UPDATE ON venue_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();