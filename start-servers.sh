#!/bin/bash

# Kill any existing processes
pkill -f "next dev" 2>/dev/null

echo "Starting MySetlist development server..."

# Start web server
cd /Users/seth/mysetlist-sonnet/apps/web
nohup pnpm dev > ../../web.log 2>&1 &
WEB_PID=$!
echo "Web server starting with PID: $WEB_PID"

# Wait a bit for server to start
sleep 5

# Check if server is running
if lsof -i :3001 | grep -q LISTEN; then
    echo "✓ Web server running on http://localhost:3001"
else
    echo "✗ Web server failed to start. Check web.log"
fi

echo ""
echo "Server PID saved. To stop server, run:"
echo "  kill $WEB_PID"