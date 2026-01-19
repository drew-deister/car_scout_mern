# Simple HTTPS Fix for Backend

## Problem
- Frontend is on HTTPS (Amplify)
- Backend is on HTTP (Elastic Beanstalk)
- Browsers block mixed content (HTTPS → HTTP)

## Solution: Use CloudFront (5 minutes, no code changes)

CloudFront automatically provides HTTPS and can proxy to your HTTP backend.

### Step 1: Create CloudFront Distribution

1. Go to: https://console.aws.amazon.com/cloudfront/v3/home
2. Click "Create distribution"
3. Configure:
   - **Origin domain:** `car-scout-backend-updated-env.eba-2xmcecpg.us-east-1.elasticbeanstalk.com`
   - **Origin path:** Leave empty
   - **Name:** `car-scout-backend` (auto-filled)
   - **Protocol:** HTTP only (your backend is HTTP)
   - **HTTP port:** 80
   - **HTTPS port:** 443
   
4. **Default cache behavior:**
   - **Viewer protocol policy:** Redirect HTTP to HTTPS
   - **Allowed HTTP methods:** GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache policy:** CachingDisabled (for API)
   
5. **Settings:**
   - **Price class:** Use all edge locations (or cheapest)
   - **Alternate domain names:** Leave empty
   - **SSL certificate:** Default CloudFront certificate (automatic HTTPS)
   
6. Click "Create distribution"
7. Wait 5-10 minutes for deployment

### Step 2: Update Frontend

Once CloudFront is deployed, you'll get a URL like:
`https://d1234567890abc.cloudfront.net`

Update the frontend code to use this URL instead of the Elastic Beanstalk URL.

### Step 3: Update Environment Variable in Amplify

1. Go to Amplify Console
2. Environment variables
3. Set `REACT_APP_API_URL` = `https://your-cloudfront-url.cloudfront.net/api`
4. Redeploy

That's it! CloudFront provides HTTPS automatically.

