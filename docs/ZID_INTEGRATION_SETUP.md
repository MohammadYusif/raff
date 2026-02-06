# Zid Integration Setup Guide

This guide walks you through setting up the Zid integration for the Raff affiliate tracking platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Zid App Registration](#zid-app-registration)
- [Environment Configuration](#environment-configuration)
- [OAuth Flow Setup](#oauth-flow-setup)
- [Webhook Configuration](#webhook-configuration)
- [Testing the Integration](#testing-the-integration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

1. A Zid developer account at https://web.zid.sa/
2. A registered Zid application
3. A publicly accessible HTTPS URL for your application
4. Database access (PostgreSQL with Prisma)
5. Node.js 18+ installed

## Zid App Registration

### Step 1: Create a Zid App

1. Go to https://web.zid.sa/ and sign in to the developer portal
2. Navigate to "Apps" → "Create New App"
3. Fill in the app details:
   - **App Name**: Raff Affiliate Tracking
   - **Description**: Affiliate tracking and commission management
   - **Category**: Marketing & Sales
   - **Website**: Your application URL

### Step 2: Configure OAuth Settings

In your Zid app settings, configure:

1. **Redirect URI**: Add your OAuth callback URL
   ```
   https://yourdomain.com/api/zid/oauth/callback
   ```

2. **Webhook URL**: Add your webhook endpoint
   ```
   https://yourdomain.com/api/zid/webhook
   ```

3. **Permissions (Scopes)**: Select the following:
   - `products.read` — To sync product catalog
   - `categories.read` — To sync categories
   - `orders.read` — To track orders and commissions
   - `webhooks.read` — To manage webhook subscriptions
   - `webhooks.write` — To register webhooks
   - `abandoned_carts.read` — Optional, for cart recovery

### Step 3: Get Your Credentials

After creating the app, copy these credentials:
- **Client ID**: Found in app settings
- **Client Secret**: Found in app settings
- **App ID**: Found in the URL when viewing your app (e.g., `web.zid.sa/apps/YOUR_APP_ID`)

> **Keep your Client Secret secure!** Never commit it to version control.

## Environment Configuration

### Step 1: Set Environment Variables

Add the following to your `.env` file:

```bash
# Zid OAuth Configuration
ZID_AUTH_URL="https://oauth.zid.sa/oauth/authorize"
ZID_TOKEN_URL="https://oauth.zid.sa/oauth/token"
ZID_API_BASE_URL="https://api.zid.sa/v1"
ZID_CLIENT_ID=""                    # From your Zid developer dashboard
ZID_CLIENT_SECRET=""                # From your Zid developer dashboard
ZID_APP_BASE_URL="https://yourdomain.com"
ZID_REDIRECT_URI="https://yourdomain.com/api/zid/oauth/callback"
ZID_SCOPES="products.read categories.read orders.read webhooks.read webhooks.write"

# App ID (required for subscription status checks)
ZID_APP_ID=""

# Webhook Configuration
ZID_WEBHOOK_SECRET=""
ZID_WEBHOOK_HEADER="X-Zid-Webhook-Secret"
ZID_WEBHOOK_CREATE_URL="https://api.zid.sa/v1/managers/webhooks"
ZID_WEBHOOK_CALLBACK_URL="https://yourdomain.com/api/zid/webhook"
ZID_WEBHOOK_EVENTS="product.create,product.update,product.publish,product.delete,order.create,order.status.update,order.payment_status.update"

# Signature verification mode: "plain" (default), "sha256", or "hmac-sha256"
ZID_WEBHOOK_SIGNATURE_MODE="plain"

# Optional: query parameter token for webhook verification
ZID_WEBHOOK_TOKEN=""

# Product URLs
ZID_PRODUCT_URL_TEMPLATE="https://{store_url}/products/{product_id}"
```

### Step 2: Generate Webhook Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `ZID_WEBHOOK_SECRET`.

### Step 3: Verify Configuration

```bash
npm run typecheck
```

## OAuth Flow Setup

The OAuth flow allows merchants to connect their Zid store to Raff. Zid supports two flows:

### Flow 1: Existing Merchant (Connect Store)

```
1. Authenticated merchant clicks "Connect Zid Store"
   ↓
2. GET /api/zid/oauth/start
   ↓
3. Redirect to Zid authorization page
   ↓
4. Merchant authorizes your app
   ↓
5. Zid redirects to /api/zid/oauth/callback with code
   ↓
6. Exchange code for tokens (Bearer + Manager)
   ↓
7. Store both tokens in database
   ↓
8. Register webhooks automatically
   ↓
9. Start initial product sync
```

### Flow 2: New Merchant (Join via Zid)

```
1. New user clicks "Join with Zid"
   ↓
2. GET /api/zid/oauth/join
   ↓
3. Redirect to Zid authorization page
   ↓
4. User authorizes your app
   ↓
5. Zid redirects to /api/zid/oauth/callback with code
   ↓
6. Exchange code for tokens
   ↓
7. Create new user + merchant (incomplete registration)
   ↓
8. Redirect to complete-registration page
   ↓
9. Register webhooks after registration complete
```

### Token Handling

Zid returns **two tokens** that must be stored and sent with every API request:

| Token | Header | Database Field | Purpose |
|-------|--------|----------------|---------|
| `Authorization` | `Authorization: Bearer {token}` | `zidAccessToken` | Primary auth token |
| `access_token` | `X-Manager-Token: {token}` and `Access-Token: {token}` | `zidManagerToken` | Manager-level access |

### Token Refresh

Access tokens expire after ~1 year. The system automatically refreshes tokens:

```typescript
// Automatic token refresh on 401 errors
if (response.status === 401) {
  const refreshed = await refreshZidAccessToken(merchant);
  // Retry with new token
}
```

> **Note**: Unlike Salla, Zid requires `redirect_uri` in refresh token requests.

**Token Refresh Failures**:
- If refresh fails, merchant is marked as `isActive: false`
- Merchant will need to reconnect their Zid store
- Error is logged with structured logging

## Webhook Configuration

### Automatic Webhook Registration

Webhooks are automatically registered after OAuth completion. The system registers these events:

| Event | Description | Handler |
|-------|-------------|---------|
| `product.create` | New product added | Sync product |
| `product.update` | Product modified | Update product |
| `product.publish` | Product published | Sync product |
| `product.delete` | Product removed | Deactivate product |
| `order.create` | New order placed | Track commission |
| `order.status.update` | Order status changed | Update commission |
| `order.payment_status.update` | Payment status changed | Confirm/cancel commission |

### Manual Webhook Registration

If you need to register webhooks manually:

```bash
curl -X POST https://api.zid.sa/v1/managers/webhooks \
  -H "Authorization: Bearer {authorization_token}" \
  -H "X-Manager-Token: {manager_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/zid/webhook",
    "event": "product.create",
    "app_id": "your-app-id"
  }'
```

Repeat for each event you want to track.

### Webhook Signature Verification

Zid supports three signature verification modes:

| Mode | How It Works |
|------|-------------|
| `plain` (default) | Direct string comparison of header value vs secret |
| `sha256` | `SHA256(secret + body)` compared to header |
| `hmac-sha256` | `HMAC-SHA256(secret, body)` compared to header |

All modes use timing-safe comparison to prevent timing attacks.

**Security Features**:
- Timing-safe comparison (prevents timing attacks)
- Configurable signature mode
- Alternative query parameter token verification (`ZID_WEBHOOK_TOKEN`)
- Idempotency (duplicate webhooks ignored)
- Event validation

## Testing the Integration

### Step 1: Test OAuth Flow

1. Create a test merchant in your database:
   ```sql
   INSERT INTO "Merchant" (id, name, email, "isActive")
   VALUES ('test-merchant-1', 'Test Store', 'test@example.com', true);
   ```

2. Visit the OAuth start endpoint:
   ```
   https://yourdomain.com/api/zid/oauth/start?merchantId=test-merchant-1
   ```

3. Authorize the app in Zid

4. Verify merchant credentials are saved:
   ```sql
   SELECT id, name, "zidStoreId",
          "zidAccessToken" IS NOT NULL AS has_bearer,
          "zidManagerToken" IS NOT NULL AS has_manager
   FROM "Merchant"
   WHERE id = 'test-merchant-1';
   ```

### Step 2: Test Product Sync

Trigger a manual product sync:

```bash
curl -X POST https://yourdomain.com/api/zid/sync/products \
  -H "Content-Type: application/json" \
  -d '{"merchantId": "test-merchant-1"}'
```

Check if products were synced:

```sql
SELECT COUNT(*) FROM "Product" WHERE "merchantId" = 'test-merchant-1';
```

### Step 3: Test Webhooks

Use ngrok for local testing:

```bash
# Start ngrok
ngrok http 3000

# Update webhook URL in Zid app settings
# Trigger a webhook by creating/updating a product in Zid store
# Check logs for webhook processing
```

### Step 4: Run Tests

```bash
npm test
```

## Troubleshooting

### Common Issues

#### Issue: "Redirect URI mismatch"

**Cause**: The redirect URI in your OAuth request doesn't match the registered URI in Zid.

**Solution**:
1. Check `ZID_REDIRECT_URI` in `.env`
2. Verify it matches exactly in Zid app settings (including `https://`)
3. No trailing slashes

#### Issue: "Invalid signature" on webhooks

**Cause**: Webhook secret mismatch or wrong signature mode.

**Solution**:
1. Verify `ZID_WEBHOOK_SECRET` matches the secret in your Zid app
2. Check `ZID_WEBHOOK_SIGNATURE_MODE` — Zid defaults to `plain`
3. Enable debug logging: `RAFF_DEBUG=true`
4. Try using `ZID_WEBHOOK_TOKEN` as alternative verification

#### Issue: "Token refresh failed"

**Cause**: Refresh token expired or `redirect_uri` missing.

**Solution**:
1. Ensure `ZID_REDIRECT_URI` is set (required for Zid token refresh)
2. Check merchant's `isActive` status
3. Have merchant reconnect their Zid store
4. Verify `ZID_CLIENT_SECRET` is correct

#### Issue: "Products not syncing"

**Cause**: Missing scopes, wrong token, or API errors.

**Solution**:
1. Verify both `zidAccessToken` and `zidManagerToken` are stored
2. Check that `products.read` scope is granted
3. Enable debug logging: `RAFF_SYNC_DEBUG=true`
4. Check for rate limiting (60 req/min per store)

#### Issue: "Missing X-Manager-Token"

**Cause**: Only sending the Bearer token without the manager token.

**Solution**:
Zid requires **three** auth headers on every request:
```
Authorization: Bearer {zidAccessToken}
X-Manager-Token: {zidManagerToken}
Access-Token: {zidManagerToken}
```

### Debug Logging

```bash
# All debug logs
RAFF_DEBUG=true

# Sync-specific logs
RAFF_SYNC_DEBUG=true

# Webhook payload logging
LOG_WEBHOOK_PAYLOADS=true
```

## Deployment Checklist

Before deploying to production:

- [ ] All Zid environment variables set
- [ ] HTTPS enabled for all URLs
- [ ] Webhook secret is strong (32+ characters)
- [ ] OAuth redirect URI registered in Zid
- [ ] Both token fields stored securely
- [ ] Webhooks registered for all required events
- [ ] Database migrations applied
- [ ] Structured logging enabled
- [ ] Rate limiting respected (60 req/min)
- [ ] Error handling tested
- [ ] Signature verification mode configured correctly

## Security Best Practices

1. **Never commit secrets**: Use `.env` file and `.gitignore`
2. **Use HTTPS everywhere**: No HTTP in production
3. **Verify webhook signatures**: Use `hmac-sha256` mode for strongest security
4. **Store both tokens securely**: Encrypt tokens at rest
5. **Rotate secrets regularly**: Update webhook secrets periodically
6. **Monitor for anomalies**: Set up alerts for failed webhooks
7. **Protect your webhook endpoint**: Implement rate limiting
8. **Log security events**: Track authorization failures

## Support

- **Zid Developer Portal**: https://web.zid.sa/
- **Zid API Docs**: https://docs.zid.sa/
- **Raff API Reference**: See [ZID_API.md](./ZID_API.md)
- **Raff Webhook Docs**: See [ZID_WEBHOOKS.md](./ZID_WEBHOOKS.md)
