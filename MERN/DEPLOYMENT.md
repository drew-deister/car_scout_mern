# Deployment Guide for Car Scout

This guide will help you deploy your Car Scout MERN application so your friend can access it.

## Quick Options

### Option 1: Quick Testing with ngrok (Temporary)

**Best for:** Quick testing, temporary access

1. Make sure your server is running:
   ```bash
   cd MERN/server
   npm start
   ```

2. In another terminal, start ngrok:
   ```bash
   cd MERN
   ./start-with-ngrok.sh
   ```
   Or manually:
   ```bash
   ngrok http 5001
   ```

3. Copy the ngrok URL (e.g., `https://xxxx.ngrok.io`)

4. Update your frontend `.env` file:
   ```bash
   cd MERN/client
   echo "REACT_APP_API_URL=https://xxxx.ngrok.io/api" > .env
   ```

5. Start your frontend:
   ```bash
   npm start
   ```

6. Share the ngrok URL with your friend (they'll access the React app on localhost:3000, but API calls will go through ngrok)

**Note:** ngrok free tier gives you a random URL that changes each time. For permanent hosting, use the options below.

---

## Option 2: Free Hosting (Recommended)

### Step 1: Set up MongoDB Atlas (Free Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (choose the free tier)
4. Create a database user (remember username/password)
5. Whitelist IP addresses (add `0.0.0.0/0` to allow all IPs, or your server's IP)
6. Get your connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/car_scout`)

### Step 2: Deploy Backend (Choose one)

#### A. Railway (Easiest - Free tier available)

1. Go to [Railway](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo" (or use Railway CLI)
3. Select your repository
4. Add environment variables:
   - `PORT` = `5000` (or let Railway assign one)
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `OPENAI_API_KEY` = your OpenAI API key
   - `MTA_API_KEY` = your Mobile Text Alerts API key
   - `MTA_AUTO_REPLY_TEMPLATE_ID` = your template ID (if applicable)
   - `FRONTEND_URL` = your frontend URL (set this after deploying frontend)
5. Railway will automatically detect it's a Node.js app and deploy
6. Copy your backend URL (e.g., `https://your-app.railway.app`)

#### B. Render (Free tier available)

1. Go to [Render](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Root Directory:** `MERN/server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables (same as Railway above)
6. Deploy and copy your backend URL

#### C. Fly.io (Free tier available)

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. In `MERN/server` directory:
   ```bash
   fly launch
   ```
4. Follow prompts and add environment variables
5. Deploy: `fly deploy`

### Step 3: Deploy Frontend

#### A. Vercel (Recommended - Easiest)

1. Go to [Vercel](https://vercel.com) and sign up
2. Click "New Project" → Import your GitHub repository
3. Configure:
   - **Root Directory:** `MERN/client`
   - **Framework Preset:** Create React App
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
4. Add environment variable:
   - `REACT_APP_API_URL` = your backend URL + `/api` (e.g., `https://your-app.railway.app/api`)
5. Deploy
6. Copy your frontend URL (e.g., `https://your-app.vercel.app`)

#### B. Netlify

1. Go to [Netlify](https://netlify.com) and sign up
2. Click "New site from Git" → Connect GitHub
3. Configure:
   - **Base directory:** `MERN/client`
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
4. Add environment variable:
   - `REACT_APP_API_URL` = your backend URL + `/api`
5. Deploy

### Step 4: Update Backend CORS

After deploying your frontend, update your backend's `FRONTEND_URL` environment variable to your frontend URL (e.g., `https://your-app.vercel.app`).

---

## Option 3: All-in-One Hosting (VPS)

If you want everything on one server:

### DigitalOcean App Platform (Free tier available)

1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Create an App Platform project
3. Add two components:
   - **Backend:** Point to `MERN/server`, Node.js, add environment variables
   - **Frontend:** Point to `MERN/client`, static site, build command: `npm run build`
4. Deploy both

---

## Environment Variables Summary

### Backend (`.env` in `MERN/server/`):
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/car_scout
OPENAI_API_KEY=your_openai_key
MTA_API_KEY=your_mta_key
MTA_AUTO_REPLY_TEMPLATE_ID=your_template_id
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### Frontend (`.env` in `MERN/client/`):
```
REACT_APP_API_URL=https://your-backend-url.railway.app/api
```

---

## Quick Start Checklist

- [ ] Set up MongoDB Atlas and get connection string
- [ ] Deploy backend to Railway/Render/Fly.io
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Update backend `FRONTEND_URL` environment variable
- [ ] Update frontend `REACT_APP_API_URL` environment variable
- [ ] Test the deployed app
- [ ] Share the frontend URL with your friend!

---

## Troubleshooting

### CORS Errors
- Make sure `FRONTEND_URL` in backend matches your frontend URL exactly
- Check that your backend allows your frontend's origin

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0` or your server IP
- Check connection string has correct username/password
- Ensure database name matches in connection string

### API Not Working
- Verify `REACT_APP_API_URL` includes `/api` at the end
- Check backend logs for errors
- Ensure environment variables are set correctly

---

## Recommended Setup (Easiest Path)

1. **Database:** MongoDB Atlas (free)
2. **Backend:** Railway (easiest deployment)
3. **Frontend:** Vercel (automatic deployments)

This combination gives you:
- Free hosting
- Easy setup
- Automatic deployments from GitHub
- HTTPS by default
- Good performance

