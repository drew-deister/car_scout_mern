#!/bin/bash

# Update Mobile Text Alerts webhook to use CloudFront URL
# Based on: https://developers.mobile-text-alerts.com/tutorials/webhooks/setting-up-your-first-webhook

CLOUDFRONT_URL="https://d11a1w5wjp8pmi.cloudfront.net"
WEBHOOK_URL="${CLOUDFRONT_URL}/api/webhook/sms"
MTA_API_URL="https://api.mobile-text-alerts.com/v3"

# Check if MTA_API_KEY is provided
if [ -z "$MTA_API_KEY" ]; then
  echo "❌ Error: MTA_API_KEY environment variable is not set"
  echo ""
  echo "Usage:"
  echo "  export MTA_API_KEY='your-api-key-here'"
  echo "  ./update-mta-webhook.sh"
  echo ""
  echo "Or provide it inline:"
  echo "  MTA_API_KEY='your-api-key' ./update-mta-webhook.sh"
  exit 1
fi

# Generate a secret if not provided (128 character hex string)
if [ -z "$MTA_WEBHOOK_SECRET" ]; then
  echo "⚠️  MTA_WEBHOOK_SECRET not set. Generating a random secret..."
  MTA_WEBHOOK_SECRET=$(openssl rand -hex 64)
  echo "Generated secret: $MTA_WEBHOOK_SECRET"
  echo "⚠️  Save this secret! You'll need it to validate webhook requests."
  echo ""
fi

# Check if we're updating an existing webhook
if [ -n "$WEBHOOK_ID" ]; then
  echo "📡 Updating existing webhook (ID: $WEBHOOK_ID)..."
  METHOD="PATCH"
  ENDPOINT="${MTA_API_URL}/webhooks/${WEBHOOK_ID}"
else
  echo "📡 Registering new webhook with Mobile Text Alerts..."
  METHOD="POST"
  ENDPOINT="${MTA_API_URL}/webhooks"
fi

echo "   Event: message-reply"
echo "   URL: $WEBHOOK_URL"
echo ""

# Build the JSON payload
if [ -n "$MTA_ALERT_EMAIL" ]; then
  PAYLOAD="{
    \"event\": \"message-reply\",
    \"url\": \"${WEBHOOK_URL}\",
    \"secret\": \"${MTA_WEBHOOK_SECRET}\",
    \"alertEmail\": \"${MTA_ALERT_EMAIL}\",
    \"sendAlertEmail\": ${MTA_SEND_ALERT_EMAIL:-false}
  }"
else
  PAYLOAD="{
    \"event\": \"message-reply\",
    \"url\": \"${WEBHOOK_URL}\",
    \"secret\": \"${MTA_WEBHOOK_SECRET}\"
  }"
fi

# Register or update the webhook
RESPONSE=$(curl -s -w "\n%{http_code}" -X "${METHOD}" "${ENDPOINT}" \
  -H "Authorization: Bearer ${MTA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  if [ "$METHOD" = "PATCH" ]; then
    echo "✅ Webhook updated successfully!"
  else
    echo "✅ Webhook registered successfully!"
  fi
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Save your webhook secret: $MTA_WEBHOOK_SECRET"
  echo "   2. Update your backend environment variable MTA_WEBHOOK_SECRET if needed"
  echo "   3. Test by sending a message to your Mobile Text Alerts number"
else
  echo "❌ Failed to register webhook (HTTP $HTTP_CODE)"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Tips:"
  echo "   - Make sure your MTA_API_KEY is valid"
  echo "   - Check that the webhook URL is accessible (HTTPS required)"
  echo "   - If you have an existing webhook, set WEBHOOK_ID to update it:"
  echo "     WEBHOOK_ID=123 MTA_API_KEY='your-key' ./update-mta-webhook.sh"
  echo "   - To list existing webhooks, use:"
  echo "     curl -H 'Authorization: Bearer \$MTA_API_KEY' '${MTA_API_URL}/webhooks'"
  exit 1
fi

