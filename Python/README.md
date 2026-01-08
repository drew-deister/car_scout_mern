# Car Scout - Python/Streamlit Version

A Python application built with FastAPI backend and Streamlit frontend, converted from the MERN stack version.

## Features

- SMS webhook handling via Mobile Text Alerts
- AI-powered car buying agent using OpenAI GPT-4o
- Web scraping and data extraction from car listing URLs
- Thread and message management
- Car listings visualization with scatter plots
- Real-time conversation tracking

## Tech Stack

- **FastAPI** - Backend API framework
- **Streamlit** - Frontend framework
- **MongoDB** - Database (using pymongo)
- **OpenAI** - AI agent and data extraction
- **Mobile Text Alerts** - SMS integration
- **BeautifulSoup** - Web scraping
- **Plotly** - Data visualization

## Prerequisites

- Python 3.8 or higher
- MongoDB (local or cloud instance)
- OpenAI API key
- Mobile Text Alerts API key

## Installation

1. Install dependencies:
```bash
pip3 install -r requirements.txt
```

2. Create a `.env` file in the `Python` directory:
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/car_scout
OPENAI_API_KEY=your_openai_api_key_here
MTA_API_KEY=your_mobile_text_alerts_api_key_here
MTA_AUTO_REPLY_TEMPLATE_ID=
MTA_WEBHOOK_SECRET=your_secret_key_here
MTA_ALERT_EMAIL=
```

## Running the Application

### Option 1: Local Development (No Webhooks)
```bash
./start.sh
```

This starts both the backend and frontend locally:
- Frontend: http://localhost:8501
- Backend API: http://localhost:5001

### Option 2: With ngrok (For Webhook Access)
To receive SMS webhooks from Mobile Text Alerts, you need to expose your server publicly:

```bash
./start-with-ngrok.sh
```

This will:
1. Start the backend server on port 5001
2. Start ngrok tunnel pointing to your server
3. Display the public ngrok URL

**Important Steps:**
1. Copy the ngrok URL (e.g., `https://xxxx.ngrok.io`)
2. Configure Mobile Text Alerts webhook to: `https://xxxx.ngrok.io/api/webhook/sms`
3. You can view ngrok traffic at: http://localhost:4040

**Note:** The ngrok URL changes each time you restart (unless you have a paid ngrok account with a static domain).

### Manual Start (Three Separate Terminals)

**Terminal 1 - Backend Server:**
```bash
cd /Users/drewdeister/Downloads/car_scout/Python
python3 server.py
```
Backend will run on: http://localhost:5001

**Terminal 2 - Frontend (Streamlit):**
```bash
cd /Users/drewdeister/Downloads/car_scout/Python
python3 -m streamlit run app.py
```
Frontend will run on: http://localhost:8501

**Terminal 3 - ngrok Tunnel (for webhooks):**
```bash
ngrok http 5001
```
- Copy the ngrok URL (e.g., `https://xxxx.ngrok.io`)
- Configure Mobile Text Alerts webhook to: `https://xxxx.ngrok.io/api/webhook/sms`
- View ngrok traffic at: http://localhost:4040

**To stop:** Press `Ctrl+C` in each terminal

## API Endpoints

- `GET /api` - Health check
- `GET /api/test-db` - Test MongoDB connection
- `GET /api/threads` - Get all text threads
- `GET /api/threads/{thread_id}/messages` - Get messages for a thread
- `GET /api/car-listings` - Get all car listings
- `GET /api/threads/{thread_id}/car-listing` - Get car listing for a thread
- `POST /api/webhook/sms` - Mobile Text Alerts webhook endpoint
- `GET /api/templates` - List Mobile Text Alerts templates
- `POST /api/register-webhook` - Register webhook with Mobile Text Alerts

## Project Structure

```
Python/
├── app.py              # Streamlit frontend
├── server.py           # FastAPI backend
├── models.py           # MongoDB models
├── utils.py            # Utility functions (AI, SMS, scraping)
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variables template
└── README.md          # This file
```

## Environment Variables

The application uses the same environment variables as the MERN version:
- `PORT` - Server port (default: 5001)
- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key for AI agent
- `MTA_API_KEY` - Mobile Text Alerts API key
- `MTA_AUTO_REPLY_TEMPLATE_ID` - Optional template ID for auto-replies
- `MTA_WEBHOOK_SECRET` - Secret for webhook verification
- `MTA_ALERT_EMAIL` - Email for webhook alerts

## Notes

- The application uses the same MongoDB database as the MERN version, so data is shared
- All credentials and configuration should match the MERN folder's `.env` file
- The Streamlit app auto-refreshes can be enabled/disabled in `app.py`

