#!/bin/bash

echo "🎸 Triggering authenticated sync for Metallica..."

# Load environment variables
source .env.local

# Metallica's data
ARTIST_ID="609416b2-e4f4-41e1-9e17-3cffd351ab48"
SPOTIFY_ID="2ye2Wgw4gimLv2eAKyk1NB"

# Trigger the sync orchestration with auth
echo "Calling sync orchestration API..."
curl -X POST http://localhost:3001/api/sync/orchestration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d "{
    \"spotifyId\": \"$SPOTIFY_ID\",
    \"options\": {
      \"syncSongs\": true,
      \"syncShows\": true,
      \"createDefaultSetlists\": true,
      \"fullDiscography\": true
    }
  }" \
  --silent | jq '.'

echo ""
echo "⏳ Waiting 15 seconds for sync to complete..."
sleep 15

echo ""
echo "📊 Checking database for results..."

# Check songs count
echo ""
echo "🎵 Songs imported:"
psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM songs s 
  JOIN artist_songs ars ON s.id = ars.song_id 
  WHERE ars.artist_id = '$ARTIST_ID'
"

# Sample songs
echo "Sample songs:"
psql "$DATABASE_URL" -t -c "
  SELECT s.title || ' (' || s.album || ')' as song
  FROM songs s 
  JOIN artist_songs ars ON s.id = ars.song_id 
  WHERE ars.artist_id = '$ARTIST_ID'
  LIMIT 5
"

# Check shows count  
echo ""
echo "🎤 Shows imported:"
psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM shows 
  WHERE headliner_artist_id = '$ARTIST_ID'
"

# Sample shows
echo "Sample shows:"
psql "$DATABASE_URL" -t -c "
  SELECT s.name || ' at ' || v.name || ' on ' || s.date::text as show
  FROM shows s
  LEFT JOIN venues v ON s.venue_id = v.id
  WHERE s.headliner_artist_id = '$ARTIST_ID'
  LIMIT 3
"

# Check setlists count
echo ""
echo "📝 Setlists created:"
psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM setlists sl 
  JOIN shows s ON sl.show_id = s.id 
  WHERE s.headliner_artist_id = '$ARTIST_ID'
"

echo ""
echo "✅ Sync complete!"