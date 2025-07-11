#!/bin/bash
# Start dev server and sync artists

echo "🚀 Starting MySetlist development server..."
cd /Users/seth/mysetlist-s4-1

# Kill any existing dev server
pkill -f "next dev" || true

# Start dev server in background
nohup pnpm dev > /tmp/mysetlist-dev.log 2>&1 &
DEV_PID=$!

echo "⏳ Waiting for server to start (PID: $DEV_PID)..."
sleep 15

# Check if server is running
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Server is running on port 3001!"
    
    echo -e "\n🎤 Syncing top 5 US artists..."
    
    # Sync each artist
    artists=(
        '{"spotifyId": "06HL4z0CvFAxyc27GXpf02", "artistName": "Taylor Swift"}'
        '{"spotifyId": "3TVXtAsR1Inumwj472S9r4", "artistName": "Drake"}'
        '{"spotifyId": "4q3ewBCX7sLwd24euuV69X", "artistName": "Bad Bunny"}'
        '{"spotifyId": "1Xyo4u8uXC1ZmMpatF05PJ", "artistName": "The Weeknd"}'
        '{"spotifyId": "246dkjvS1zLTtiykXe5h60", "artistName": "Post Malone"}'
    )
    
    for artist in "${artists[@]}"; do
        echo -e "\nSyncing: $artist"
        curl -X POST http://localhost:3001/api/artists/sync \
            -H "Content-Type: application/json" \
            -d "$artist" \
            -s | jq '.' || echo "Failed to sync"
        sleep 2
    done
    
    echo -e "\n✅ Artist sync complete!"
    echo "📝 Dev server log: /tmp/mysetlist-dev.log"
    echo "🌐 Open http://localhost:3001 to view the app"
else
    echo "❌ Server failed to start. Check /tmp/mysetlist-dev.log for errors"
    tail -20 /tmp/mysetlist-dev.log
fi