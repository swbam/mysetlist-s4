#!/bin/bash

echo "🎸 Triggering sync for Metallica..."

# Metallica's artist ID from database
ARTIST_ID="609416b2-e4f4-41e1-9e17-3cffd351ab48"

# Trigger the sync orchestration
curl -X POST http://localhost:3001/api/sync/orchestration \
  -H "Content-Type: application/json" \
  -d "{
    \"artistId\": \"$ARTIST_ID\",
    \"syncSongs\": true,
    \"syncShows\": true,
    \"syncSetlists\": true
  }" \
  --silent | jq '.'

echo ""
echo "⏳ Waiting 10 seconds for sync to complete..."
sleep 10

echo ""
echo "📊 Checking database for results..."

# Load environment variables
source .env.local

# Check songs count
echo ""
echo "🎵 Songs imported:"
psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM songs s 
  JOIN artist_songs ars ON s.id = ars.song_id 
  WHERE ars.artist_id = '$ARTIST_ID'
"

# Check shows count  
echo "🎤 Shows imported:"
psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM shows 
  WHERE headliner_artist_id = '$ARTIST_ID'
"

# Check setlists count
echo "📝 Setlists created:"
psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM setlists sl 
  JOIN shows s ON sl.show_id = s.id 
  WHERE s.headliner_artist_id = '$ARTIST_ID'
"

echo ""
echo "✅ Sync complete!"