# AWS Quick Start Guide

This is a condensed version for quick deployment. See `AWS_DEPLOYMENT.md` for detailed instructions.

## Prerequisites
- AWS Account
- MongoDB Atlas connection string
- Your API keys (OpenAI, Mobile Text Alerts)

## Step 1: Deploy Backend (5 minutes)

### Using AWS Console:

1. **Go to Elastic Beanstalk:** https://console.aws.amazon.com/elasticbeanstalk
2. **Create Application:**
   - Name: `car-scout-backend`
   - Platform: Node.js 18 or 20
3. **Create Environment:**
   - Upload ZIP of `MERN/server` folder (exclude node_modules)
   - Environment variables:
     ```
     PORT=8080
     MONGODB_URI=your_mongodb_atlas_uri
     OPENAI_API_KEY=your_key
     MTA_API_KEY=your_key
     FRONTEND_URL=(set after frontend deploy)
     NODE_ENV=production
     ```
4. **Wait for deployment** → Copy the URL

### Create ZIP file:
```bash
# Use the provided script (recommended)
cd MERN
./deploy-aws-backend.sh

# Or manually
cd MERN/server
zip -r ../server-deploy.zip . -x "node_modules/*" "*.log" ".git/*"
```

## Step 2: Deploy Frontend (5 minutes)

### Using AWS Console:

1. **Go to Amplify:** https://console.aws.amazon.com/amplify
2. **New App** → Connect GitHub repo
3. **Build Settings:**
   - Root directory: `MERN/client`
   - Build command: `npm run build`
   - Output directory: `build`
4. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-eb-url.elasticbeanstalk.com/api
   ```
5. **Deploy** → Copy the URL

## Step 3: Link Them Together

1. **Update Backend:**
   - Elastic Beanstalk → Configuration → Software
   - Set `FRONTEND_URL` = your Amplify URL
   - Apply changes

2. **Update Frontend:**
   - Amplify → Environment variables
   - Set `REACT_APP_API_URL` = your EB URL + `/api`
   - Redeploy

## Done! 🎉

Share your Amplify URL with your friend.

## Troubleshooting

- **Backend not working?** Check Elastic Beanstalk logs
- **CORS errors?** Verify FRONTEND_URL matches Amplify URL exactly
- **API calls failing?** Check REACT_APP_API_URL includes `/api`

