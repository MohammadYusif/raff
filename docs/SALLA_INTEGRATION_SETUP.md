# Salla Integration Setup Guide

This guide walks you through setting up the Salla integration for the Raff affiliate tracking platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Salla App Registration](#salla-app-registration)
- [Environment Configuration](#environment-configuration)
- [OAuth Flow Setup](#oauth-flow-setup)
- [Webhook Configuration](#webhook-configuration)
- [Testing the Integration](#testing-the-integration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

1. ✅ A Salla partner account at https://salla.dev/
2. ✅ A registered Salla application
3. ✅ A publicly accessible HTTPS URL for your application
4. ✅ Database access (PostgreSQL with Prisma)
5. ✅ Node.js 18+ installed

## Salla App Registration

### Step 1: Create a Salla App

1. Go to https://salla.dev/ and sign in
2. Navigate to "My Apps" → "Create New App"
3. Fill in the app details:
   - **App Name**: Raff Affiliate Tracking
   - **Description**: Affiliate tracking and commission management
   - **Category**: Marketing & Sales
   - **Website**: Your application URL

### Step 2: Configure OAuth Settings

In your Salla app settings, configure:

1. **Redirect URIs**: Add your OAuth callback URL
   ```
   https://yourdomain.com/api/salla/oauth/callback
   ```

2. **Webhook URL**: Add your webhook endpoint
   ```
   https://yourdomain.com/api/salla/webhook
   ```

3. **Permissions (Scopes)**: Select the following:
   - ✅ `offline_access` - For refresh tokens
   - ✅ `products.read` - To sync product catalog
   - ✅ `orders.read` - To track orders and commissions
   - ✅ `store.read` - To get store information

### Step 3: Get Your Credentials

After creating the app, copy these credentials:
- **Client ID**: `salla_client_id_xxx`
- **Client Secret**: `salla_client_secret_xxx`

⚠️ **Keep your Client Secret secure!** Never commit it to version control.

## Environment Configuration

### Step 1: Set Environment Variables

Create or update your `.env` file with the following variables:

```bash
# Salla OAuth Configuration
SALLA_CLIENT_ID=your_salla_client_id
SALLA_CLIENT_SECRET=your_salla_client_secret
SALLA_REDIRECT_URI=https://yourdomain.com/api/salla/oauth/callback
SALLA_APP_BASE_URL=https://yourdomain.com

# Salla API URLs
SALLA_AUTH_URL=https://accounts.salla.sa/oauth2/auth
SALLA_TOKEN_URL=https://accounts.salla.sa/oauth2/token
SALLA_API_BASE_URL=https://api.salla.dev

# Salla Scopes (space-separated)
SALLA_SCOPES=offline_access products.read orders.read store.read

# Webhook Configuration
SALLA_WEBHOOK_SECRET=your_random_webhook_secret_min_32_chars
SALLA_WEBHOOK_CALLBACK_URL=https://yourdomain.com/api/salla/webhook
SALLA_WEBHOOK_HEADER=x-salla-signature
SALLA_WEBHOOK_SIGNATURE_MODE=hmac-sha256
SALLA_WEBHOOK_VERSION=2

# Optional: Webhook Events (comma-separated)
SALLA_WEBHOOK_EVENTS=app.installed,app.uninstalled,product.created,product.updated,order.created,order.updated,order.cancelled

# Optional: Debug Logging
RAFF_DEBUG=false
RAFF_SALLA_WEBHOOK_DEBUG=false
RAFF_SALLA_SYNC_DEBUG=false
```

### Step 2: Generate Webhook Secret

The webhook secret should be a strong random string. Generate one using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `SALLA_WEBHOOK_SECRET`.

### Step 3: Verify Configuration

Run the configuration validator:

```bash
npm run typecheck
```

If you see any errors about missing environment variables, check your `.env` file.

## OAuth Flow Setup

The OAuth flow allows merchants to connect their Salla store to your Raff platform.

### Flow Diagram

```
1. Merchant clicks "Connect Salla Store"
   ↓
2. Redirect to Salla authorization page
   ↓
3. Merchant authorizes your app
   ↓
4. Salla redirects back with authorization code
   ↓
5. Exchange code for access token
   ↓
6. Store tokens in database
   ↓
7. Register webhooks
   ↓
8. Start initial product sync
```

### Implementation

#### Step 1: Authorization Start

When a merchant wants to connect, redirect them to:

```
GET /api/salla/oauth/start?merchantId={merchant_id}
```

This endpoint will:
1. Generate a CSRF state token
2. Store it in a secure cookie
3. Redirect to Salla's authorization page

#### Step 2: Handle OAuth Callback

Salla will redirect back to:

```
GET /api/salla/oauth/callback?code={auth_code}&state={state_token}
```

Our callback handler will:
1. Verify the state token (CSRF protection)
2. Exchange the authorization code for tokens
3. Fetch store information from Salla
4. Save merchant's Salla credentials to database
5. Register webhooks automatically
6. Redirect merchant to success page

#### Step 3: Token Refresh

Access tokens expire after 1 year. The system automatically refreshes tokens when needed:

```typescript
// Automatic token refresh on 401 errors
if (response.status === 401) {
  const refreshed = await refreshSallaAccessToken(merchant);
  // Retry with new token
}
```

**Token Refresh Failures**:
- If refresh fails, merchant is marked as `isActive: false`
- Merchant will need to reconnect their Salla store
- Error is logged with structured logging

## Webhook Configuration

Webhooks allow Salla to notify your app about events in real-time.

### Automatic Webhook Registration

Webhooks are automatically registered after OAuth completion. The system registers these events:

| Event | Description | Handler |
|-------|-------------|---------|
| `app.installed` | App installed on store | Sync store info |
| `app.uninstalled` | App removed from store | Mark merchant inactive |
| `product.created` | New product added | Sync product |
| `product.updated` | Product modified | Update product |
| `order.created` | New order placed | Track commission |
| `order.updated` | Order status changed | Update order status |
| `order.cancelled` | Order cancelled | Cancel commission |

### Manual Webhook Registration

If you need to register webhooks manually:

```bash
curl -X POST https://api.salla.dev/admin/v2/webhooks/subscribe \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Raff Product Created",
    "url": "https://yourdomain.com/api/salla/webhook",
    "event": "product.created",
    "secret": "your_webhook_secret"
  }'
```

Repeat for each event you want to track.

### Webhook Signature Verification

Our webhook handler automatically verifies signatures using HMAC-SHA256:

```typescript
// Signature verification (automatic)
const signature = request.headers.get("x-salla-signature");
const calculatedSignature = hmacSha256(webhookSecret, requestBody);

if (!timingSafeEqual(signature, calculatedSignature)) {
  return Response.json({ error: "Invalid signature" }, { status: 401 });
}
```

**Security Features**:
- ✅ HMAC-SHA256 signature verification
- ✅ Timing-safe comparison (prevents timing attacks)
- ✅ Idempotency (duplicate webhooks ignored)
- ✅ Event validation

## Testing the Integration

### Step 1: Test OAuth Flow

1. Create a test merchant in your database:
   ```sql
   INSERT INTO "Merchant" (id, name, email, "isActive")
   VALUES ('test-merchant-1', 'Test Store', 'test@example.com', true);
   ```

2. Visit the OAuth start endpoint:
   ```
   https://yourdomain.com/api/salla/oauth/start?merchantId=test-merchant-1
   ```

3. Authorize the app in Salla

4. Verify merchant credentials are saved:
   ```sql
   SELECT id, name, "sallaStoreId", "sallaAccessToken" IS NOT NULL AS has_token
   FROM "Merchant"
   WHERE id = 'test-merchant-1';
   ```

### Step 2: Test Product Sync

Trigger a manual product sync:

```bash
# Via API endpoint
curl -X POST https://yourdomain.com/api/salla/sync/products \
  -H "Content-Type: application/json" \
  -d '{"merchantId": "test-merchant-1"}'
```

Check if products were synced:

```sql
SELECT COUNT(*) FROM "Product" WHERE "merchantId" = 'test-merchant-1';
```

### Step 3: Test Webhooks

Use a tool like ngrok for local testing:

```bash
# Start ngrok
ngrok http 3000

# Update webhook URL in Salla app settings to ngrok URL
https://your-subdomain.ngrok.io/api/salla/webhook

# Trigger a webhook by creating/updating a product in Salla store
# Check logs for webhook processing
```

### Step 4: Test Order Tracking

1. Place a test order in your Salla store with a Raff referrer code
2. Wait for `order.created` webhook
3. Verify commission was created:
   ```sql
   SELECT * FROM "Commission"
   WHERE "merchantId" = 'test-merchant-1'
   ORDER BY "createdAt" DESC
   LIMIT 5;
   ```

### Step 5: Run Integration Tests

```bash
npm test
```

This runs the webhook signature verification tests.

## Troubleshooting

### Common Issues

#### Issue: "Redirect URI mismatch"

**Cause**: The redirect URI in your OAuth request doesn't match the registered URI in Salla.

**Solution**:
1. Check `SALLA_REDIRECT_URI` in `.env`
2. Verify it matches exactly in Salla app settings (including https://)
3. No trailing slashes!

#### Issue: "Invalid signature" on webhooks

**Cause**: Webhook secret mismatch or signature calculation error.

**Solution**:
1. Verify `SALLA_WEBHOOK_SECRET` matches the secret used when registering webhooks
2. Check `SALLA_WEBHOOK_SIGNATURE_MODE=hmac-sha256`
3. Enable debug logging: `RAFF_SALLA_WEBHOOK_DEBUG=true`
4. Check logs for signature comparison details

#### Issue: "Token refresh failed"

**Cause**: Refresh token expired or invalid.

**Solution**:
1. Check merchant's `isActive` status (may be set to false)
2. Have merchant reconnect their Salla store
3. Check logs for specific error message
4. Verify `SALLA_CLIENT_SECRET` is correct

#### Issue: "Products not syncing"

**Cause**: Missing `products.read` scope or API errors.

**Solution**:
1. Verify `products.read` is in `SALLA_SCOPES`
2. Check if merchant has products in their Salla store
3. Enable debug logging: `RAFF_SALLA_SYNC_DEBUG=true`
4. Check for rate limiting (429 errors)

#### Issue: "Rate limit exceeded (429)"

**Cause**: Too many API requests in short time.

**Solution**:
1. Our integration automatically handles rate limiting with exponential backoff
2. Check logs for `rate-limit` messages
3. Reduce sync frequency if needed
4. Use pagination with smaller `per_page` values

### Debug Logging

Enable different levels of debug logging:

```bash
# All Salla debug logs
RAFF_DEBUG=true

# Webhook-specific logs
RAFF_SALLA_WEBHOOK_DEBUG=true

# Sync-specific logs
RAFF_SALLA_SYNC_DEBUG=true
```

View logs in production-ready JSON format:

```bash
# Development (human-readable)
npm run dev

# Production (JSON format for log aggregation)
NODE_ENV=production npm start
```

### Health Check

Verify integration health:

```bash
# Check database connection
npm run db:studio

# Verify environment variables
npm run typecheck

# Test webhook signature
npm test
```

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set
- [ ] HTTPS enabled for all URLs
- [ ] Webhook secret is strong (32+ characters)
- [ ] OAuth redirect URI registered in Salla
- [ ] Webhooks registered for all required events
- [ ] Database migrations applied
- [ ] Structured logging enabled
- [ ] Rate limiting properly configured
- [ ] Error handling tested
- [ ] Integration tests passing

## Security Best Practices

1. **Never commit secrets**: Use `.env` file and `.gitignore`
2. **Use HTTPS everywhere**: No HTTP in production
3. **Verify webhook signatures**: Always check HMAC-SHA256
4. **Encrypt tokens at rest**: Consider database encryption
5. **Rotate secrets regularly**: Update webhook secrets periodically
6. **Monitor for anomalies**: Set up alerts for failed webhooks
7. **Implement rate limiting**: Protect your webhook endpoint
8. **Log security events**: Track authorization failures

## Monitoring

### Key Metrics to Monitor

1. **OAuth Success Rate**: Track successful vs failed OAuth flows
2. **Webhook Processing Time**: Should be < 500ms per webhook
3. **Token Refresh Failures**: Alert if > 5% failure rate
4. **API Error Rates**: Track 401, 429, 500 errors
5. **Sync Duration**: Monitor product/order sync times
6. **Database Query Performance**: Watch for N+1 queries

### Recommended Alerts

- Token refresh failure rate > 10%
- Webhook signature verification failure rate > 5%
- Merchant marked as inactive
- API rate limit exceeded (429 errors)
- Database connection failures

## Support

For issues not covered in this guide:

- **Raff Support**: Contact your development team
- **Salla API Docs**: https://docs.salla.dev/
- **Salla Developer Portal**: https://salla.dev/
- **Salla Partner Support**: Contact via developer portal

## Next Steps

After successful setup:

1. Read [SALLA_API.md](./SALLA_API.md) for API details
2. Read [SALLA_WEBHOOKS.md](./SALLA_WEBHOOKS.md) for webhook event details
3. Set up monitoring and alerting
4. Configure automated testing
5. Plan for scale (caching, queueing)

## Changelog

- **2024-01-15**: Added structured logging and error handling sections
- **2024-01-10**: Updated webhook signature verification details
- **2024-01-01**: Initial integration guide
