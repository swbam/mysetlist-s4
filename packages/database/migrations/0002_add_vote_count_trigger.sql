-- Create a function to update vote counts on setlist_songs
CREATE OR REPLACE FUNCTION update_setlist_song_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the vote counts for the affected setlist_song
  UPDATE setlist_songs
  SET 
    upvotes = (
      SELECT COUNT(*) 
      FROM votes 
      WHERE setlist_song_id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
        AND vote_type = 'up'
    ),
    downvotes = (
      SELECT COUNT(*) 
      FROM votes 
      WHERE setlist_song_id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
        AND vote_type = 'down'
    ),
    net_votes = (
      SELECT 
        COUNT(CASE WHEN vote_type = 'up' THEN 1 END) - 
        COUNT(CASE WHEN vote_type = 'down' THEN 1 END)
      FROM votes 
      WHERE setlist_song_id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER update_vote_counts_on_insert
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_setlist_song_vote_counts();

-- Create trigger for UPDATE operations
CREATE TRIGGER update_vote_counts_on_update
AFTER UPDATE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_setlist_song_vote_counts();

-- Create trigger for DELETE operations
CREATE TRIGGER update_vote_counts_on_delete
AFTER DELETE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_setlist_song_vote_counts();