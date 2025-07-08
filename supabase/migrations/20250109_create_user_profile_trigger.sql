-- Migration: Create User Profile Trigger
-- Description: Automatically creates user profiles when new users sign up

-- 1. Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new user profile for the new auth user
  INSERT INTO public.user_profiles (
    user_id,
    bio,
    location,
    is_public,
    show_attended_shows,
    show_voted_songs,
    shows_attended,
    songs_voted,
    artists_followed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NULL,
    NULL,
    true,
    true,
    true,
    0,
    0,
    0,
    NOW(),
    NOW()
  );
  
  -- If the user has email, create email preferences with defaults
  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.email_preferences (
      user_id,
      new_shows,
      artist_updates,
      voting_reminders,
      weekly_digest,
      marketing,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      true,
      true,
      true,
      true,
      false,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON user_profiles TO authenticated;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_public ON user_profiles(is_public) WHERE is_public = true;

-- 6. Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates user profile and email preferences when a new user signs up';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers profile creation for new users';