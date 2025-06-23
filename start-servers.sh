#!/bin/bash

# Kill any existing processes
pkill -f "next dev" 2>/dev/null

echo "Starting MySetlist development servers..."

# Start web server
cd /Users/seth/mysetlist-sonnet/apps/web
nohup pnpm dev > ../../web.log 2>&1 &
WEB_PID=$!
echo "Web server starting with PID: $WEB_PID"

# Start API server
cd /Users/seth/mysetlist-sonnet/apps/api
nohup pnpm next > ../../api.log 2>&1 &
API_PID=$!
echo "API server starting with PID: $API_PID"

# Wait a bit for servers to start
sleep 5

# Check if servers are running
if lsof -i :3001 | grep -q LISTEN; then
    echo "✓ Web server running on http://localhost:3001"
else
    echo "✗ Web server failed to start. Check web.log"
fi

if lsof -i :3002 | grep -q LISTEN; then
    echo "✓ API server running on http://localhost:3002"
else
    echo "✗ API server failed to start. Check api.log"
fi

echo ""
echo "Server PIDs saved. To stop servers, run:"
echo "  kill $WEB_PID $API_PID"