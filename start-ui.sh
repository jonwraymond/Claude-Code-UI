#!/bin/bash

echo "🚀 Starting Claude Code UI..."

# Navigate to web-ui directory
cd "$(dirname "$0")/web-ui"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Kill any existing processes on ports 5173 and 3000
echo "🔄 Cleaning up old processes..."
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start the Claude CLI server in background
echo "🤖 Starting Claude CLI server on port 3000..."
node server-enhanced.js &
SERVER_PID=$!

# Give server time to start
sleep 2

# Start the Vite dev server
echo "🎨 Starting React UI on port 5173..."
echo ""
echo "📌 Opening http://localhost:5173 in your browser..."
echo ""

# Try to open in browser
if command -v open &> /dev/null; then
    sleep 2
    open http://localhost:5173
fi

# Start Vite in foreground
npm run dev

# When Vite exits, kill the server
kill $SERVER_PID 2>/dev/null