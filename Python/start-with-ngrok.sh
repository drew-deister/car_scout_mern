#!/bin/bash

# Script to start the Python server and ngrok together
# This makes the webhook endpoint accessible to Mobile Text Alerts

echo "🚀 Starting Car Scout with ngrok tunnel..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with the required environment variables."
    echo "See .env.example for reference."
    echo ""
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ Error: ngrok is not installed!"
    echo ""
    echo "Please install ngrok:"
    echo "  - macOS: brew install ngrok/ngrok/ngrok"
    echo "  - Or download from: https://ngrok.com/download"
    echo ""
    exit 1
fi

# Get the port from environment or default to 5001
PORT=${PORT:-5001}

# Start backend server in background
echo "📡 Starting FastAPI backend server on port $PORT..."
python3 server.py &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for server to start..."
sleep 3

# Check if server started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Error: Backend server failed to start!"
    exit 1
fi

echo "✅ Backend server started (PID: $BACKEND_PID)"
echo ""
echo "🌐 Starting ngrok tunnel on port $PORT..."
echo ""
echo "📋 IMPORTANT: Copy the 'Forwarding' URL below (e.g., https://xxxx.ngrok.io)"
echo "   and use it in your Mobile Text Alerts webhook configuration:"
echo "   https://xxxx.ngrok.io/api/webhook/sms"
echo ""
echo "⚠️  Press Ctrl+C to stop both ngrok and the server"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    echo "✅ Cleaned up"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start ngrok
ngrok http $PORT &
NGROK_PID=$!

# Wait for ngrok to start
sleep 2

echo "✅ ngrok tunnel is running!"
echo ""
echo "📊 View ngrok dashboard at: http://localhost:4040"
echo ""

# Wait for user to stop
wait

