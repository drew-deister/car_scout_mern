# AWS Deployment Guide for Car Scout

This guide will help you deploy your Car Scout MERN application on AWS.

## Architecture Overview

- **Frontend**: AWS Amplify (easiest) or S3 + CloudFront
- **Backend**: AWS Elastic Beanstalk (recommended) or EC2
- **Database**: MongoDB Atlas (keep existing) or AWS DocumentDB

---

## Prerequisites

1. AWS Account ([sign up here](https://aws.amazon.com))
2. AWS CLI installed ([install guide](https://aws.amazon.com/cli/))
3. Node.js and npm installed
4. Git repository (GitHub recommended)

---

## Step 1: Set up MongoDB Atlas (or use existing)

If you don't have MongoDB Atlas set up:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist IP: Add `0.0.0.0/0` (or your AWS Elastic Beanstalk IP after deployment)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/car_scout`

---

## Step 2: Deploy Backend to AWS Elastic Beanstalk

### Option A: Using AWS Console (Easiest)

1. **Prepare your backend code:**
   - Make sure your code is in a Git repository (GitHub recommended)

2. **Create Elastic Beanstalk Application:**
   - Go to [AWS Elastic Beanstalk Console](https://console.aws.amazon.com/elasticbeanstalk)
   - Click "Create Application"
   - **Application name:** `car-scout-backend`
   - **Platform:** Node.js
   - **Platform branch:** Node.js 18 or 20 (latest)
   - **Platform version:** Latest
   - Click "Create application"

3. **Create Environment:**
   - Click "Create environment"
   - **Environment tier:** Web server environment
   - **Application name:** `car-scout-backend` (should be pre-filled)
   - **Environment name:** `car-scout-backend-prod`
   - **Domain:** Leave default or enter custom
   - **Platform:** Node.js (should match above)
   - **Application code:** 
     - Choose "Upload your code"
     - Create a ZIP file using the provided script:
       ```bash
       cd MERN
       ./deploy-aws-backend.sh
       ```
     - Or manually:
       ```bash
       cd MERN/server
       zip -r ../server-deploy.zip . -x "node_modules/*" "*.log" ".git/*"
       ```
     - Upload the `server-deploy.zip` file
   - Click "Configure more options"

4. **Configure Environment:**
   - **Software:** 
     - Add environment properties:
       - `PORT` = `8080` (Elastic Beanstalk uses port 8080)
       - `MONGODB_URI` = your MongoDB Atlas connection string
       - `OPENAI_API_KEY` = your OpenAI API key
       - `MTA_API_KEY` = your Mobile Text Alerts API key
       - `MTA_AUTO_REPLY_TEMPLATE_ID` = your template ID (if applicable)
       - `FRONTEND_URL` = (we'll set this after deploying frontend)
       - `NODE_ENV` = `production`
   - **Capacity:**
     - Instance type: `t3.micro` (free tier eligible) or `t3.small`
     - Auto Scaling: Enable (min 1, max 2)
   - Click "Create environment"

5. **Wait for deployment** (5-10 minutes)

6. **Get your backend URL:**
   - Once deployed, copy the URL (e.g., `http://car-scout-backend-prod.us-east-1.elasticbeanstalk.com`)

### Option B: Using EB CLI (Advanced)

1. **Install EB CLI:**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB in server directory:**
   ```bash
   cd MERN/server
   eb init
   ```
   - Select region
   - Select application name: `car-scout-backend`
   - Select platform: Node.js
   - Select platform version

3. **Create environment:**
   ```bash
   eb create car-scout-backend-prod
   ```

4. **Set environment variables:**
   ```bash
   eb setenv PORT=8080 \
     MONGODB_URI="your_mongodb_uri" \
     OPENAI_API_KEY="your_openai_key" \
     MTA_API_KEY="your_mta_key" \
     FRONTEND_URL="https://your-frontend-url.amplify.app" \
     NODE_ENV=production
   ```

5. **Deploy:**
   ```bash
   eb deploy
   ```

---

## Step 3: Deploy Frontend to AWS Amplify

### Option A: Using AWS Console

1. **Go to AWS Amplify Console:**
   - Navigate to [AWS Amplify](https://console.aws.amazon.com/amplify)

2. **Create New App:**
   - Click "New app" → "Host web app"
   - Choose your Git provider (GitHub, GitLab, Bitbucket)
   - Authorize AWS Amplify to access your repository
   - Select your repository
   - Select branch (usually `main` or `master`)

3. **Configure Build Settings:**
   - **App name:** `car-scout-frontend`
   - **Environment:** `production`
   - **Build settings:** Use the following YAML:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - cd MERN/client
             - npm ci
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: MERN/client/build
         files:
           - '**/*'
       cache:
         paths:
           - MERN/client/node_modules/**/*
     ```
   - Or use the Amplify console to configure:
     - **Root directory:** `MERN/client`
     - **Build command:** `npm run build`
     - **Output directory:** `build`

4. **Add Environment Variables:**
   - Click "Environment variables"
   - Add: `REACT_APP_API_URL` = `https://your-eb-url.elasticbeanstalk.com/api`
   - (Update this after you get your backend URL)

5. **Save and Deploy:**
   - Click "Save and deploy"
   - Wait for build to complete (5-10 minutes)

6. **Get your frontend URL:**
   - Once deployed, you'll get a URL like: `https://main.xxxxx.amplify.app`

### Option B: Using Amplify CLI

1. **Install Amplify CLI:**
   ```bash
   npm install -g @aws-amplify/cli
   ```

2. **Initialize Amplify:**
   ```bash
   cd MERN/client
   amplify init
   ```
   - Follow prompts to set up your app

3. **Add hosting:**
   ```bash
   amplify add hosting
   ```
   - Select "Hosting with Amplify Console"
   - Select "Manual deployment"

4. **Publish:**
   ```bash
   amplify publish
   ```

---

## Step 4: Update Environment Variables

### Update Backend (Elastic Beanstalk):

1. Go to Elastic Beanstalk Console
2. Select your environment
3. Go to "Configuration" → "Software" → "Edit"
4. Update `FRONTEND_URL` to your Amplify URL (e.g., `https://main.xxxxx.amplify.app`)
5. Click "Apply"

Or using EB CLI:
```bash
cd MERN/server
eb setenv FRONTEND_URL="https://your-amplify-url.amplify.app"
```

### Update Frontend (Amplify):

1. Go to Amplify Console
2. Select your app
3. Go to "Environment variables"
4. Update `REACT_APP_API_URL` to your Elastic Beanstalk URL + `/api`
5. Redeploy (trigger a new build)

---

## Step 5: Configure HTTPS (Important!)

### For Elastic Beanstalk:

1. **Get a domain** (optional but recommended):
   - Use Route 53 or any domain registrar
   - Or use the free Elastic Beanstalk URL (already has HTTPS if configured)

2. **Configure SSL Certificate:**
   - Go to Elastic Beanstalk → Configuration → Load balancer
   - Add listener on port 443 (HTTPS)
   - Select or create SSL certificate in AWS Certificate Manager

### For Amplify:

- Amplify automatically provides HTTPS for your domain
- Custom domain: Go to Amplify → Domain management → Add domain

---

## Alternative: Deploy Backend to EC2 (More Control)

If you prefer more control over your backend:

1. **Launch EC2 Instance:**
   - Go to EC2 Console
   - Launch instance
   - Choose Amazon Linux 2 or Ubuntu
   - Instance type: `t2.micro` (free tier) or `t3.micro`
   - Configure security group: Allow HTTP (80), HTTPS (443), and SSH (22)
   - Launch and download key pair

2. **Connect to EC2:**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

3. **Install Node.js:**
   ```bash
   # For Amazon Linux 2
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   
   # Install PM2 for process management
   npm install -g pm2
   ```

4. **Clone and Setup:**
   ```bash
   git clone your-repo-url
   cd car_scout_mern/MERN/server
   npm install
   ```

5. **Create .env file:**
   ```bash
   nano .env
   ```
   Add all environment variables

6. **Start with PM2:**
   ```bash
   pm2 start server.js --name car-scout-backend
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx (reverse proxy):**
   ```bash
   sudo yum install nginx -y
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

8. **Configure Nginx:**
   ```bash
   sudo nano /etc/nginx/conf.d/car-scout.conf
   ```
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Alternative: Deploy Frontend to S3 + CloudFront

1. **Build your React app:**
   ```bash
   cd MERN/client
   npm run build
   ```

2. **Create S3 Bucket:**
   - Go to S3 Console
   - Create bucket (e.g., `car-scout-frontend`)
   - Enable static website hosting
   - Set index document: `index.html`
   - Set error document: `index.html` (for React Router)

3. **Upload build files:**
   ```bash
   aws s3 sync build/ s3://car-scout-frontend --delete
   ```

4. **Create CloudFront Distribution:**
   - Go to CloudFront Console
   - Create distribution
   - Origin: Your S3 bucket
   - Default root object: `index.html`
   - Create distribution

5. **Update environment variables:**
   - You'll need to rebuild and redeploy when API URL changes

---

## Cost Estimation

**Free Tier (First 12 months):**
- EC2: 750 hours/month of t2.micro
- Elastic Beanstalk: Free (pay for underlying EC2)
- Amplify: 15 GB storage, 5 GB served per month
- S3: 5 GB storage, 20,000 GET requests
- CloudFront: 50 GB data transfer out

**After Free Tier (estimated monthly):**
- Elastic Beanstalk + EC2 t3.micro: ~$10-15/month
- Amplify: ~$0.15/GB served (first 5 GB free)
- S3 + CloudFront: ~$1-5/month (depending on traffic)

---

## Troubleshooting

### Backend Issues:

1. **Check Elastic Beanstalk logs:**
   - Go to Elastic Beanstalk → Logs → Request logs

2. **Common issues:**
   - Port mismatch: Elastic Beanstalk uses port 8080, but your app might use 5000
   - Solution: Update server.js to use `process.env.PORT || 5000`

3. **Database connection:**
   - Make sure MongoDB Atlas whitelist includes Elastic Beanstalk IP
   - Check security groups allow outbound connections

### Frontend Issues:

1. **CORS errors:**
   - Verify `FRONTEND_URL` in backend matches Amplify URL exactly
   - Check backend CORS configuration

2. **API calls failing:**
   - Verify `REACT_APP_API_URL` is set correctly
   - Check browser console for errors
   - Verify backend is accessible

3. **Build failures:**
   - Check Amplify build logs
   - Verify all dependencies are in package.json
   - Check Node.js version compatibility

---

## Quick Deployment Checklist

- [ ] Set up MongoDB Atlas
- [ ] Deploy backend to Elastic Beanstalk
- [ ] Get backend URL
- [ ] Deploy frontend to Amplify
- [ ] Set `REACT_APP_API_URL` in Amplify
- [ ] Set `FRONTEND_URL` in Elastic Beanstalk
- [ ] Test the application
- [ ] Configure custom domain (optional)
- [ ] Set up HTTPS/SSL certificates
- [ ] Share URL with your friend!

---

## Recommended AWS Setup

1. **Backend:** AWS Elastic Beanstalk (easiest, auto-scaling, monitoring)
2. **Frontend:** AWS Amplify (automatic deployments, HTTPS, CDN)
3. **Database:** MongoDB Atlas (keep existing, or migrate to DocumentDB later)

This gives you:
- Scalable infrastructure
- Automatic deployments
- Built-in monitoring
- HTTPS by default
- Easy to manage

