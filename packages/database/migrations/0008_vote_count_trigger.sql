-- Update vote counts trigger
CREATE OR REPLACE FUNCTION update_setlist_song_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update vote counts for the new vote
    UPDATE setlist_songs 
    SET 
      upvotes = (
        SELECT COUNT(*) 
        FROM votes 
        WHERE setlist_song_id = NEW.setlist_song_id 
        AND vote_type = 'up'
      ),
      downvotes = (
        SELECT COUNT(*) 
        FROM votes 
        WHERE setlist_song_id = NEW.setlist_song_id 
        AND vote_type = 'down'
      ),
      net_votes = (
        SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - 
               COUNT(*) FILTER (WHERE vote_type = 'down')
        FROM votes 
        WHERE setlist_song_id = NEW.setlist_song_id
      ),
      updated_at = NOW()
    WHERE id = NEW.setlist_song_id;
    
    -- Update total votes on the setlist
    UPDATE setlists
    SET 
      total_votes = (
        SELECT COUNT(DISTINCT v.user_id)
        FROM votes v
        JOIN setlist_songs ss ON v.setlist_song_id = ss.id
        WHERE ss.setlist_id = (
          SELECT setlist_id 
          FROM setlist_songs 
          WHERE id = NEW.setlist_song_id
        )
      ),
      updated_at = NOW()
    WHERE id = (
      SELECT setlist_id 
      FROM setlist_songs 
      WHERE id = NEW.setlist_song_id
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Update vote counts for the deleted vote
    UPDATE setlist_songs 
    SET 
      upvotes = (
        SELECT COUNT(*) 
        FROM votes 
        WHERE setlist_song_id = OLD.setlist_song_id 
        AND vote_type = 'up'
      ),
      downvotes = (
        SELECT COUNT(*) 
        FROM votes 
        WHERE setlist_song_id = OLD.setlist_song_id 
        AND vote_type = 'down'
      ),
      net_votes = (
        SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - 
               COUNT(*) FILTER (WHERE vote_type = 'down')
        FROM votes 
        WHERE setlist_song_id = OLD.setlist_song_id
      ),
      updated_at = NOW()
    WHERE id = OLD.setlist_song_id;
    
    -- Update total votes on the setlist
    UPDATE setlists
    SET 
      total_votes = (
        SELECT COUNT(DISTINCT v.user_id)
        FROM votes v
        JOIN setlist_songs ss ON v.setlist_song_id = ss.id
        WHERE ss.setlist_id = (
          SELECT setlist_id 
          FROM setlist_songs 
          WHERE id = OLD.setlist_song_id
        )
      ),
      updated_at = NOW()
    WHERE id = (
      SELECT setlist_id 
      FROM setlist_songs 
      WHERE id = OLD.setlist_song_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS setlist_song_vote_count_trigger ON votes;

-- Create trigger
CREATE TRIGGER setlist_song_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_setlist_song_votes();

-- Update show vote counts when setlists are voted on
CREATE OR REPLACE FUNCTION update_show_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shows
  SET 
    vote_count = (
      SELECT COUNT(DISTINCT v.user_id)
      FROM votes v
      JOIN setlist_songs ss ON v.setlist_song_id = ss.id
      JOIN setlists s ON ss.setlist_id = s.id
      WHERE s.show_id = (
        SELECT show_id 
        FROM setlists 
        WHERE id = NEW.setlist_id
      )
    ),
    updated_at = NOW()
  WHERE id = (
    SELECT show_id 
    FROM setlists 
    WHERE id = NEW.setlist_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for show vote count updates
CREATE TRIGGER update_show_vote_count_trigger
  AFTER UPDATE OF total_votes ON setlists
  FOR EACH ROW EXECUTE FUNCTION update_show_vote_count();