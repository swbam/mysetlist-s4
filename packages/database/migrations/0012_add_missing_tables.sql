-- Create attendance_status enum
CREATE TYPE "attendance_status" AS ENUM('going', 'interested', 'not_going');

-- Create user_show_attendance table
CREATE TABLE IF NOT EXISTS "user_show_attendance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "show_id" uuid NOT NULL REFERENCES "shows"("id") ON DELETE CASCADE,
  "status" "attendance_status" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("user_id", "show_id")
);

-- Create show_comments table
CREATE TABLE IF NOT EXISTS "show_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "show_id" uuid NOT NULL REFERENCES "shows"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "parent_id" uuid REFERENCES "show_comments"("id") ON DELETE CASCADE,
  "is_edited" boolean DEFAULT false,
  "edited_at" timestamp,
  "upvotes" integer DEFAULT 0,
  "downvotes" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_user_show_attendance_user ON user_show_attendance(user_id);
CREATE INDEX idx_user_show_attendance_show ON user_show_attendance(show_id);
CREATE INDEX idx_user_show_attendance_status ON user_show_attendance(status);

CREATE INDEX idx_show_comments_show ON show_comments(show_id);
CREATE INDEX idx_show_comments_user ON show_comments(user_id);
CREATE INDEX idx_show_comments_parent ON show_comments(parent_id);
CREATE INDEX idx_show_comments_created ON show_comments(created_at DESC);

-- Enable RLS
ALTER TABLE user_show_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_show_attendance
CREATE POLICY user_show_attendance_select ON user_show_attendance
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY user_show_attendance_insert ON user_show_attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_show_attendance_update ON user_show_attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_show_attendance_delete ON user_show_attendance
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for show_comments
CREATE POLICY show_comments_select ON show_comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY show_comments_insert ON show_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY show_comments_update ON show_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY show_comments_delete ON show_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_user_show_attendance_updated_at BEFORE UPDATE ON user_show_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_show_comments_updated_at BEFORE UPDATE ON show_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update show attendee_count when attendance changes
CREATE OR REPLACE FUNCTION update_show_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE shows
    SET attendee_count = (
      SELECT COUNT(*) 
      FROM user_show_attendance 
      WHERE show_id = NEW.show_id 
      AND status = 'going'
    )
    WHERE id = NEW.show_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shows
    SET attendee_count = (
      SELECT COUNT(*) 
      FROM user_show_attendance 
      WHERE show_id = OLD.show_id 
      AND status = 'going'
    )
    WHERE id = OLD.show_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_show_attendee_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_show_attendance
FOR EACH ROW EXECUTE FUNCTION update_show_attendee_count();