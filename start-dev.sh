#!/bin/bash

echo "Starting MySetlist development servers..."

# Kill any existing processes on our ports
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Start the web server
echo "Starting web server on http://localhost:3001..."
cd apps/web && pnpm dev &
WEB_PID=$!

# Give the web server time to start
sleep 3

# Start the API server
echo "Starting API server on http://localhost:3002..."
cd apps/api && pnpm next &
API_PID=$!

echo "Development servers started!"
echo "Web: http://localhost:3001"
echo "API: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to handle cleanup
cleanup() {
    echo "Stopping servers..."
    kill $WEB_PID 2>/dev/null
    kill $API_PID 2>/dev/null
    exit
}

# Set up trap to handle Ctrl+C
trap cleanup INT

# Wait for processes
wait