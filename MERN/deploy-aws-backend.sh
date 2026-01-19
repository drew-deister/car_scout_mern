#!/bin/bash

# Script to create deployment package for AWS Elastic Beanstalk

echo "📦 Creating deployment package for AWS Elastic Beanstalk..."
echo ""

# Navigate to server directory
cd "$(dirname "$0")/server"

# Remove old deployment package if it exists
if [ -f "../server-deploy.zip" ]; then
  echo "🗑️  Removing old deployment package..."
  rm ../server-deploy.zip
fi

# Create new deployment package
echo "📦 Creating ZIP file (excluding node_modules, logs, git files)..."
zip -r ../server-deploy.zip . \
  -x "node_modules/*" \
  -x "*.log" \
  -x ".git/*" \
  -x ".DS_Store" \
  -x "*.zip" \
  -x ".env" \
  > /dev/null

echo "✅ Deployment package created: ../server-deploy.zip"
echo ""
echo "📋 Next steps:"
echo "1. Go to AWS Elastic Beanstalk Console"
echo "2. Create new environment"
echo "3. Upload server-deploy.zip"
echo "4. Configure environment variables"
echo ""

