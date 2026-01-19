#!/bin/bash

# Update Mobile Text Alerts webhook to use CloudFront URL
# Make sure your MTA_API_KEY is set in your environment or Elastic Beanstalk

CLOUDFRONT_URL="https://d11a1w5wjp8pmi.cloudfront.net"
WEBHOOK_URL="${CLOUDFRONT_URL}/api/webhook/sms"

echo "Updating webhook URL to: ${WEBHOOK_URL}"

# If you have MTA_API_KEY locally, you can use this:
# curl -X POST "${CLOUDFRONT_URL}/api/register-webhook" \
#   -H "Content-Type: application/json" \
#   -d "{\"webhookUrl\": \"${WEBHOOK_URL}\"}"

# Or use the Elastic Beanstalk URL directly if CloudFront isn't ready:
EB_URL="http://car-scout-backend-updated-env.eba-2xmcecpg.us-east-1.elasticbeanstalk.com"
echo ""
echo "To update via API, make a POST request to:"
echo "  ${CLOUDFRONT_URL}/api/register-webhook"
echo ""
echo "With body:"
echo "  {\"webhookUrl\": \"${WEBHOOK_URL}\"}"
echo ""
echo "Or use curl:"
echo "  curl -X POST '${CLOUDFRONT_URL}/api/register-webhook' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"webhookUrl\": \"${WEBHOOK_URL}\"}'"

