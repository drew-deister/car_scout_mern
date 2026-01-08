#!/bin/bash

# Start script for Car Scout Python application

echo "Starting Car Scout Python Application..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with the required environment variables."
    echo "See .env.example for reference."
    echo ""
fi

# Start backend server in background
echo "Starting FastAPI backend server on port 5001..."
python3 server.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start Streamlit frontend
echo "Starting Streamlit frontend on port 8501..."
python3 -m streamlit run app.py

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT

