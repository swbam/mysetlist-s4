#!/bin/bash

echo "Starting MySetlist development server..."

# Kill any existing processes on our port
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start the web server
echo "Starting web server on http://localhost:3001..."
cd apps/web && pnpm dev &
WEB_PID=$!

echo "Development server started!"
echo "Web: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"

# Function to handle cleanup
cleanup() {
    echo "Stopping server..."
    kill $WEB_PID 2>/dev/null
    exit
}

# Set up trap to handle Ctrl+C
trap cleanup INT

# Wait for process
wait