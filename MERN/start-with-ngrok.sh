#!/bin/bash

# Script to start the server and ngrok together
# Make sure your server is running on port 5000 (or update the port below)

echo "🚀 Starting ngrok tunnel..."
echo ""
echo "📋 Your ngrok URL will be displayed below."
echo "   Copy the 'Forwarding' URL (e.g., https://xxxx.ngrok.io)"
echo "   and use it in your Twilio webhook configuration."
echo ""
echo "⚠️  Make sure your server is running first!"
echo "   Run 'npm run server' in the server directory, or"
echo "   run 'npm run dev' from the root directory."
echo ""
echo "Press Ctrl+C to stop ngrok"
echo ""

# Start ngrok on port 5000 (change if your server uses a different port)
ngrok http 5000

