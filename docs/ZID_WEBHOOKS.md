# Zid Webhooks Documentation

This document describes all Zid webhook events, their payloads, and how Raff processes them.

## Table of Contents

- [Overview](#overview)
- [Webhook Security](#webhook-security)
- [Event Types](#event-types)
- [Example Payloads](#example-payloads)
- [Processing Logic](#processing-logic)
- [Order & Commission Handling](#order--commission-handling)
- [Error Handling](#error-handling)
- [Testing Webhooks](#testing-webhooks)

## Overview

Webhooks allow Zid to send real-time notifications to your application when events occur in a merchant's store. Raff uses webhooks to:

- Sync product catalog changes instantly
- Track orders for commission calculation
- Handle product publishing/unpublishing
- Process payment status updates in real-time

### Webhook Endpoint

```
POST https://yourdomain.com/api/zid/webhook
```

### Request Headers

| Header | Value | Description |
|--------|-------|-------------|
| `X-Zid-Webhook-Secret` | Signature value | Webhook signature (configurable header) |
| `Content-Type` | `application/json` | Payload format |

### Response Format

Always respond with a `200 OK` status:

```json
{
  "success": true
}
```

> **Important**: Respond quickly (< 5 seconds). Process long-running tasks asynchronously.

## Webhook Security

### Signature Verification

Zid supports three signature verification modes, configured via `ZID_WEBHOOK_SIGNATURE_MODE`:

#### Plain Mode (Default)

Direct timing-safe string comparison of the header value against the webhook secret:

```typescript
// Header value === ZID_WEBHOOK_SECRET
crypto.timingSafeEqual(
  Buffer.from(headerValue),
  Buffer.from(webhookSecret)
);
```

#### SHA256 Mode

SHA256 hash of the secret concatenated with the raw request body:

```typescript
const expected = crypto
  .createHash("sha256")
  .update(webhookSecret + rawBody)
  .digest("hex");

crypto.timingSafeEqual(Buffer.from(headerValue, "hex"), Buffer.from(expected, "hex"));
```

#### HMAC-SHA256 Mode

HMAC-SHA256 of the raw body using the webhook secret as the key:

```typescript
const expected = crypto
  .createHmac("sha256", webhookSecret)
  .update(rawBody)
  .digest("hex");

crypto.timingSafeEqual(Buffer.from(headerValue, "hex"), Buffer.from(expected, "hex"));
```

### Alternative: Query Parameter Token

Zid also supports verification via a query parameter token (`ZID_WEBHOOK_TOKEN`), appended to your webhook callback URL.

### Idempotency

Zid may send the same webhook multiple times. Raff handles this by:

1. **Idempotency Key**: SHA256 hash of `event + storeId + orderId/productId + timestamp`
2. **Duplicate Detection**: Checks `webhookEvents` table for existing events
3. **Skip Processing**: If event already processed, returns `200 OK` without reprocessing

## Event Types

### Product Events

#### `product.create` / `product.created`

Triggered when a new product is added to the store.

**Raff Actions**:
1. Extract `product_id` and `store_id` from payload
2. Find merchant by `zidStoreId`
3. Fetch full product details from Zid API
4. Create product record in database
5. Generate product slug (`zid-{merchantId}-{productId}-{title}`)
6. Process product images
7. Link to categories
8. Set external product URL

---

#### `product.update` / `product.updated` / `product.publish`

Triggered when a product is modified or published.

**Raff Actions**:
1. Fetch updated product details from Zid API
2. Upsert product record
3. Update stock status (handles `is_infinite` flag)
4. Update pricing information (including `sale_price`)
5. Handle i18n fields (name/description can be `{ en, ar }` objects)

---

#### `product.delete` / `product.deleted` / `product.remove` / `product.removed`

Triggered when a product is removed from the store.

**Raff Actions**:
1. Find product by `zidProductId` and `merchantId`
2. Deactivate product (`isActive = false`)
3. Keep historical data (don't delete records)

**Use Case**: Preserve product data for existing orders and commission tracking.

---

### Order Events

All order events are processed through the same commission pipeline:

#### `order.create` / `order.created`

Triggered when a new order is placed.

---

#### `order.status.update`

Triggered when the order's fulfillment status changes (e.g., pending → processing → shipped → delivered).

---

#### `order.payment_status.update`

Triggered when the payment status changes (e.g., pending → paid → refunded).

---

#### `order.cancelled` / `order.canceled` / `order.refunded` / `order.voided`

Triggered when an order is cancelled, refunded, or voided.

---

**Raff Actions for All Order Events**:
1. Extract order data from payload (handles nested `data`, `order` objects)
2. Find merchant by `zidStoreId`
3. Normalize payload via `normalizeZidOrderWebhook()`
4. Check for Raff referrer code (`raff_`, `raff:`, or `click_` prefix)
5. If referrer found:
   - Look up click tracking record
   - Calculate commission amount
   - Create or update Commission record
   - Update ClickTracking conversion metrics
   - Run fraud detection checks
6. Log webhook event with processing status

## Example Payloads

### Product Created/Updated

```json
{
  "event": "product.create",
  "store_id": "store-123",
  "data": {
    "id": 123456,
    "product_id": 123456
  }
}
```

### Product Deleted

```json
{
  "event": "product.delete",
  "store_id": "store-123",
  "data": {
    "id": 123456,
    "product_id": 123456
  }
}
```

### Order Created

```json
{
  "event": "order.create",
  "store_id": "store-123",
  "data": {
    "id": 789012,
    "order_id": 789012,
    "store_id": "store-123",
    "total": 299.99,
    "currency_code": "SAR",
    "payment_status": "paid",
    "order_status": {
      "code": "pending",
      "name": "Pending"
    },
    "referer_code": "raff_MERCHANT123_CLICK456",
    "created_at": "2024-01-15T14:30:00Z"
  }
}
```

### Order Status Updated

```json
{
  "event": "order.status.update",
  "store_id": "store-123",
  "data": {
    "id": 789012,
    "order_status": {
      "code": "delivered",
      "name": "Delivered"
    },
    "payment_status": "paid"
  }
}
```

### Order Cancelled

```json
{
  "event": "order.cancelled",
  "store_id": "store-123",
  "data": {
    "id": 789012,
    "order_status": {
      "code": "cancelled",
      "name": "Cancelled"
    },
    "payment_status": "refunded"
  }
}
```

## Processing Logic

### Webhook Processing Flow

```
1. Receive POST request
   ↓
2. Read raw body for signature verification
   ↓
3. Verify signature (plain / sha256 / hmac-sha256)
   ↓
4. Parse JSON payload
   ↓
5. Normalize event name (lowercase, trim)
   ↓
6. Extract store_id → find merchant
   ↓
7. Check idempotency (skip if duplicate)
   ↓
8. Route by event type:
   ├─ Product create/update/publish → syncZidProductById()
   ├─ Product delete/remove → deactivateZidProduct()
   └─ Order events → processOrderWebhook()
   ↓
9. Log webhook event in database
   ↓
10. Return 200 OK
```

### Payload Normalization

Zid webhook payloads can be structured in multiple ways. The normalizer handles all variations:

| Field | Possible Locations |
|-------|-------------------|
| Order ID | `order_id`, `data.id`, `order.id` |
| Store ID | `store_id`, `data.store_id`, `store.id` |
| Total | `total`, `order_total`, `data.total` |
| Currency | `currency`, `data.currency_code` |
| Referrer | `referer_code`, `referrer_code`, `data.referer_code` |
| Payment Status | `payment_status`, `data.payment_status` |
| Order Status | `status`, `order_status`, `data.order_status.code` |

## Order & Commission Handling

### Commission Status Flow

```
Order Created (with referrer)
   ↓
PENDING (initial state)
   ↓
   ├─ Payment confirmed → APPROVED
   ├─ Order delivered → APPROVED
   ├─ Order cancelled → CANCELLED
   └─ Order refunded → CANCELLED
```

### Payment Confirmation

An order is considered **payment confirmed** when:
- `payment_status` is one of: `paid`, `completed`, `success`, `confirmed`, `approved`
- OR `order_status` is one of: `delivered`, `completed`, `fulfilled`

### Cancellation Detection

An order is considered **cancelled** when:
- `payment_status` is one of: `refunded`, `voided`, `canceled`, `cancelled`, `rejected`
- OR `order_status` is one of: `refunded`, `voided`, `canceled`, `cancelled`

### Commission Calculation

```typescript
commission = orderTotal × (merchantCommissionRate / 100)
```

### Status Transition Rules

| Current Status | Can Transition To |
|---------------|-------------------|
| PENDING | APPROVED, CANCELLED |
| APPROVED | CANCELLED (refund) |
| CANCELLED | — (terminal state) |
| PAID | — (immutable, set by admin) |

### Fraud Detection

When `ENABLE_RISK_SCORING=true`, the system monitors for suspicious patterns:

- **High Frequency**: 3+ orders from the same tracking link within 10 minutes
- **Risk Score**: Calculated 0–100, flagged if ≥ `RISK_SCORE_THRESHOLD` (default: 70)
- **Action**: Creates `FraudSignal` record for admin review

Configuration:
```bash
ENABLE_RISK_SCORING="true"
RISK_SCORE_THRESHOLD="70"
RISK_TRACKING_WINDOW_MINUTES="10"
RISK_TRACKING_ORDER_THRESHOLD="3"
```

## Error Handling

### Webhook Processing Errors

If webhook processing fails:

1. **Log Error**: Structured logging with full context
2. **Update Status**: Mark webhook event as `FAILED`
3. **Store Error**: Save error message in `webhookEvents` table
4. **Return 200**: Still return `200 OK` (prevents retry storms)

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid signature | Wrong webhook secret or mode | Verify `ZID_WEBHOOK_SECRET` and `ZID_WEBHOOK_SIGNATURE_MODE` |
| Merchant not found | Webhook for unregistered merchant | Check merchant exists with matching `zidStoreId` |
| Token expired | Access token needs refresh | System auto-refreshes; if fails, merchant must reconnect |
| Duplicate webhook | Zid sent same event twice | Idempotency handles this automatically |
| Product fetch failed | API error when syncing product | Check rate limits (60 req/min), verify tokens |

### Failed Webhook Recovery

```sql
-- Find failed webhooks
SELECT * FROM "WebhookEvent"
WHERE status = 'FAILED'
  AND platform = 'ZID'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;
```

## Testing Webhooks

### Local Testing with ngrok

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Start ngrok:
   ```bash
   ngrok http 3000
   ```

3. Update webhook URL in Zid app settings:
   ```
   https://your-subdomain.ngrok.io/api/zid/webhook
   ```

4. Trigger events in your test Zid store

5. Watch logs:
   ```bash
   RAFF_DEBUG=true LOG_WEBHOOK_PAYLOADS=true npm run dev
   ```

### Manual Webhook Testing

#### Plain Mode (Default)

```bash
WEBHOOK_SECRET="your_webhook_secret"
PAYLOAD='{"event":"product.create","store_id":"test-123","data":{"id":1,"product_id":1}}'

curl -X POST https://yourdomain.com/api/zid/webhook \
  -H "Content-Type: application/json" \
  -H "X-Zid-Webhook-Secret: $WEBHOOK_SECRET" \
  -d "$PAYLOAD"
```

#### HMAC-SHA256 Mode

```bash
WEBHOOK_SECRET="your_webhook_secret"
PAYLOAD='{"event":"product.create","store_id":"test-123","data":{"id":1,"product_id":1}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

curl -X POST https://yourdomain.com/api/zid/webhook \
  -H "Content-Type: application/json" \
  -H "X-Zid-Webhook-Secret: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Webhook Event Monitoring

```sql
-- Webhook events by status (last 24 hours)
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM ("processedAt" - "createdAt"))) as avg_processing_seconds
FROM "WebhookEvent"
WHERE platform = 'ZID'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Most frequent event types
SELECT
  "eventType",
  COUNT(*) as count
FROM "WebhookEvent"
WHERE platform = 'ZID'
  AND "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY "eventType"
ORDER BY count DESC;
```

## Debugging Tips

### Enable Debug Logging

```bash
RAFF_DEBUG=true LOG_WEBHOOK_PAYLOADS=true npm run dev
```

### Common Debug Scenarios

#### Signature Verification Failing
- Check `ZID_WEBHOOK_SIGNATURE_MODE` matches your Zid app config
- Plain mode: ensure header value exactly matches `ZID_WEBHOOK_SECRET`
- HMAC mode: ensure raw body is used (not parsed JSON)

#### Product Not Syncing After Webhook
- Check if merchant has valid `zidAccessToken` and `zidManagerToken`
- Verify `product_id` is extractable from the payload
- Check rate limits (60 req/min per store)

#### Order Not Creating Commission
- Verify the order contains a valid Raff referrer code (`raff_`, `raff:`, or `click_` prefix)
- Check if the referrer code matches an existing ClickTracking record
- Look for fraud detection flags

## Support Resources

- **Zid Developer Portal**: https://web.zid.sa/
- **Zid API Docs**: https://docs.zid.sa/
- **Raff API Reference**: See [ZID_API.md](./ZID_API.md)
- **Raff Integration Guide**: See [ZID_INTEGRATION_SETUP.md](./ZID_INTEGRATION_SETUP.md)
