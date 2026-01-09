# Salla Webhooks Documentation

This document describes all Salla webhook events, their payloads, and how Raff processes them.

## Table of Contents

- [Overview](#overview)
- [Webhook Security](#webhook-security)
- [Event Types](#event-types)
- [Example Payloads](#example-payloads)
- [Processing Logic](#processing-logic)
- [Error Handling](#error-handling)
- [Testing Webhooks](#testing-webhooks)

## Overview

Webhooks allow Salla to send real-time notifications to your application when events occur in a merchant's store. Raff uses webhooks to:

- Sync product catalog changes instantly
- Track orders for commission calculation
- Handle app installation/uninstallation
- Update order statuses in real-time

### Webhook Endpoint

```
POST https://yourdomain.com/api/salla/webhook
```

### Request Headers

| Header | Value | Description |
|--------|-------|-------------|
| `X-Salla-Signature` | HMAC signature | HMAC-SHA256 signature for verification |
| `Content-Type` | `application/json` | Payload format |
| `User-Agent` | `Salla-Webhook/1.0` | Salla webhook client |

### Response Format

Always respond with a 200 OK status, even if processing fails:

```json
{
  "success": true
}
```

⚠️ **Important**: Respond quickly (< 5 seconds). Process long-running tasks asynchronously.

## Webhook Security

### Signature Verification

Every webhook includes an `X-Salla-Signature` header with an HMAC-SHA256 signature.

**Signature Calculation**:

```typescript
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(rawRequestBody)
  .digest("hex");

if (providedSignature !== signature) {
  throw new Error("Invalid signature");
}
```

**Security Features**:
- ✅ HMAC-SHA256 verification
- ✅ Timing-safe comparison (prevents timing attacks)
- ✅ Raw body verification (no JSON parsing before verification)

### Idempotency

Salla may send the same webhook multiple times. Raff handles this by:

1. **Idempotency Key**: Each webhook has a unique `idempotencyKey` based on event + orderId
2. **Duplicate Detection**: Checks `webhookEvents` table for existing events
3. **Skip Processing**: If event already processed, returns 200 OK without reprocessing

## Event Types

### Application Events

#### `app.installed`

Triggered when a merchant installs your app.

**Raff Actions**:
1. Fetch and sync store information
2. Mark merchant as active
3. Log installation event

**Use Case**: Initialize merchant data, start product sync

---

#### `app.uninstalled`

Triggered when a merchant removes your app.

**Raff Actions**:
1. Mark merchant as inactive (`isActive = false`)
2. Keep historical data (don't delete)
3. Log uninstallation event

**Use Case**: Disable sync, preserve data for potential reinstall

---

### Product Events

#### `product.created`

Triggered when a new product is added to the store.

**Raff Actions**:
1. Fetch product details from Salla API
2. Create product record in database
3. Generate product slug
4. Process product images
5. Link to categories
6. Set tracking URL with merchant's referrer code

**Use Case**: Real-time product catalog updates

---

#### `product.updated`

Triggered when a product is modified (price, stock, name, etc).

**Raff Actions**:
1. Fetch updated product details
2. Update product record (upsert)
3. Update stock status
4. Update pricing information
5. Trigger out-of-stock notifications if needed

**Use Case**: Keep product catalog synchronized

---

### Order Events

#### `order.created`

Triggered when a new order is placed.

**Raff Actions**:
1. Fetch order details (customer, items, amounts)
2. Check for Raff referrer code in order data
3. If referrer found:
   - Create Order record
   - Create Commission record
   - Link to merchant and customer
4. Calculate commission amount
5. Set commission status (pending/confirmed)

**Use Case**: Track affiliate sales and commissions

**Commission Logic**:
```typescript
if (isValidRaffReferrer(order.referrer)) {
  const commission = {
    merchantId: merchant.id,
    orderId: order.id,
    amount: order.total * merchant.commissionRate,
    status: isPaymentConfirmed ? "CONFIRMED" : "PENDING"
  };
}
```

---

#### `order.updated`

Triggered when order status or details change.

**Raff Actions**:
1. Fetch updated order details
2. Update order record
3. Update commission status based on payment status:
   - `paid` → Commission: CONFIRMED
   - `shipped` → Commission: CONFIRMED
   - Keep tracking for delivery
4. Update order status

**Use Case**: Track order lifecycle, confirm commissions

---

#### `order.cancelled`

Triggered when an order is cancelled.

**Raff Actions**:
1. Update order status to CANCELLED
2. Update commission status to CANCELLED
3. Don't delete records (keep audit trail)

**Use Case**: Handle refunds and cancellations

---

#### `order.shipped`

Triggered when an order is shipped.

**Raff Actions**:
1. Update order status to SHIPPED
2. Confirm commission (if payment confirmed)
3. Update shipping information

**Use Case**: Final commission confirmation

---

## Example Payloads

### Product Created/Updated

```json
{
  "event": "product.created",
  "merchant": "store-id-123",
  "created_at": "2024-01-15T14:30:00Z",
  "data": {
    "id": 123456,
    "name": "Premium Widget",
    "status": "active",
    "price": 99.99,
    "quantity": 50
  }
}
```

### Order Created

```json
{
  "event": "order.created",
  "merchant": "store-id-123",
  "created_at": "2024-01-15T14:30:00Z",
  "data": {
    "id": 789012,
    "reference_id": "ORD-2024-001",
    "status": {
      "slug": "pending",
      "name": "Pending"
    },
    "amounts": {
      "total": {
        "amount": 299.99,
        "currency": "SAR"
      }
    },
    "customer": {
      "name": "Ahmed Ali",
      "email": "ahmed@example.com",
      "mobile": {
        "number": "+966501234567"
      }
    },
    "payment_method": "credit_card",
    "payment_status": "paid",
    "referrer": "https://yourstore.com?raff_ref=MERCHANT123_CLICK456",
    "date": {
      "date": "2024-01-15 14:30:00"
    }
  }
}
```

### Order Updated

```json
{
  "event": "order.updated",
  "merchant": "store-id-123",
  "created_at": "2024-01-15T15:00:00Z",
  "data": {
    "id": 789012,
    "status": {
      "slug": "processing",
      "name": "Processing"
    },
    "payment_status": "paid"
  }
}
```

### Order Cancelled

```json
{
  "event": "order.cancelled",
  "merchant": "store-id-123",
  "created_at": "2024-01-15T16:00:00Z",
  "data": {
    "id": 789012,
    "status": {
      "slug": "cancelled",
      "name": "Cancelled"
    }
  }
}
```

### App Installed

```json
{
  "event": "app.installed",
  "merchant": "store-id-123",
  "created_at": "2024-01-15T12:00:00Z",
  "data": {
    "store": {
      "id": "store-id-123",
      "name": "Premium Store",
      "domain": "premium.salla.sa"
    }
  }
}
```

## Processing Logic

### Webhook Processing Flow

```
1. Receive webhook request
   ↓
2. Verify signature (HMAC-SHA256)
   ↓
3. Parse JSON payload
   ↓
4. Extract event type and merchant ID
   ↓
5. Check idempotency (duplicate detection)
   ↓
6. Route to event handler
   ↓
7. Process event (sync data, create records)
   ↓
8. Log webhook event
   ↓
9. Return 200 OK
```

### Concurrent Processing

Webhooks are processed with:
- **Concurrency Limit**: 4 concurrent webhook handlers
- **Timeout**: 5 seconds per webhook
- **Retry**: No automatic retry (idempotency ensures safe reprocessing)

### Database Transactions

Order and commission creation uses transactions:

```typescript
await prisma.$transaction([
  prisma.order.upsert({...}),
  prisma.commission.create({...})
]);
```

This ensures data consistency.

## Error Handling

### Webhook Processing Errors

If webhook processing fails:

1. **Log Error**: Structured logging with full context
2. **Update Status**: Mark webhook event as `FAILED`
3. **Store Error**: Save error message in `webhookEvents` table
4. **Return 200**: Still return 200 OK (prevents retry storms)

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid signature | Wrong webhook secret | Verify `SALLA_WEBHOOK_SECRET` |
| Merchant not found | Webhook for unregistered merchant | Check merchant exists and is active |
| Product not found | Order item references unknown product | Trigger product sync |
| Duplicate webhook | Salla sent same event twice | Idempotency handles this automatically |
| Database error | Connection or constraint issue | Check database health |

### Failed Webhook Recovery

Failed webhooks can be reprocessed:

```sql
-- Find failed webhooks
SELECT * FROM "WebhookEvent"
WHERE status = 'FAILED'
AND "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;

-- Manual reprocessing (if needed)
-- Trigger sync for affected merchants
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

3. Update webhook URL in Salla app:
   ```
   https://your-subdomain.ngrok.io/api/salla/webhook
   ```

4. Trigger events in your test Salla store

5. Watch logs:
   ```bash
   # Enable debug logging
   RAFF_SALLA_WEBHOOK_DEBUG=true npm run dev
   ```

### Manual Webhook Testing

Send a test webhook using curl:

```bash
# Calculate signature
WEBHOOK_SECRET="your_webhook_secret"
PAYLOAD='{"event":"product.created","merchant":"test-123","data":{"id":1}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

# Send webhook
curl -X POST https://yourdomain.com/api/salla/webhook \
  -H "Content-Type: application/json" \
  -H "X-Salla-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Integration Tests

Run webhook signature verification tests:

```bash
npm test
```

### Webhook Event Monitoring

Query webhook processing stats:

```sql
-- Webhook events by status (last 24 hours)
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM ("processedAt" - "createdAt"))) as avg_processing_time_seconds
FROM "WebhookEvent"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Failed webhooks with errors
SELECT
  "eventType",
  "merchantId",
  error,
  "createdAt"
FROM "WebhookEvent"
WHERE status = 'FAILED'
AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC
LIMIT 20;

-- Most frequent event types
SELECT
  "eventType",
  COUNT(*) as count
FROM "WebhookEvent"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY "eventType"
ORDER BY count DESC;
```

## Debugging Tips

### Enable Debug Logging

```bash
# Webhook-specific logs
RAFF_SALLA_WEBHOOK_DEBUG=true npm run dev
```

Debug logs include:
- Incoming webhook headers
- Raw request body
- Signature calculation details
- Event routing decisions
- Database operations
- Error stack traces

### Common Debug Scenarios

#### Signature Verification Failing

Check these debug logs:
- `signature-check`: Shows provided vs expected signature
- `config`: Shows webhook configuration
- `incoming-headers`: Shows all request headers

#### Duplicate Webhooks

Check these debug logs:
- `duplicate-webhook`: Webhook already processed
- Shows idempotency key and original event timestamp

#### Order Not Creating Commission

Check these debug logs:
- `received-event`: Event type and merchant ID
- Look for `order-webhook`: Order processing details
- Check if referrer validation passed

## Best Practices

1. **Always verify signatures**: Never skip signature verification in production
2. **Respond quickly**: Return 200 OK within 5 seconds
3. **Process asynchronously**: Use background jobs for heavy processing
4. **Handle duplicates**: Use idempotency keys
5. **Log everything**: Use structured logging for debugging
6. **Monitor failures**: Set up alerts for webhook failures
7. **Graceful degradation**: Don't stop entire process if one webhook fails
8. **Rate limiting**: Protect your webhook endpoint from abuse

## Webhook Retry Policy

Salla's retry policy (as of 2024):
- **Retries**: Up to 3 retries for failed webhooks
- **Backoff**: Exponential backoff (5s, 25s, 125s)
- **Timeout**: 10 seconds per webhook
- **Failure**: After 3 failures, webhook is marked as failed

## Monitoring and Alerts

### Recommended Alerts

1. **High Failure Rate**: > 10% webhooks failing
2. **Signature Failures**: > 5% signature verification failures
3. **Processing Time**: Average processing time > 3 seconds
4. **Queue Buildup**: Unprocessed webhooks > 100

### Health Check

Check webhook system health:

```bash
# Recent webhook success rate
curl https://yourdomain.com/api/admin/webhook/health
```

Expected response:

```json
{
  "status": "healthy",
  "metrics": {
    "totalWebhooks24h": 1234,
    "successRate": 0.98,
    "avgProcessingTimeMs": 850,
    "failedWebhooks": 25
  }
}
```

## Troubleshooting

### Issue: Webhooks not being received

**Checklist**:
- [ ] Webhook URL is publicly accessible via HTTPS
- [ ] Webhook URL is registered in Salla app settings
- [ ] Firewall/load balancer allows POST requests
- [ ] Application is running and listening on correct port
- [ ] No ngrok/tunnel expiration (for local testing)

### Issue: All webhooks failing signature verification

**Checklist**:
- [ ] `SALLA_WEBHOOK_SECRET` matches secret used in registration
- [ ] `SALLA_WEBHOOK_SIGNATURE_MODE=hmac-sha256`
- [ ] No request body modification by middleware
- [ ] Raw body used for signature verification (not parsed JSON)

### Issue: Duplicate webhooks creating duplicate commissions

**Solution**: Already handled by idempotency system. Check:
- `webhookEvents` table has unique constraint on idempotency key
- Check debug logs for "duplicate-webhook" messages

## Security Considerations

1. **HTTPS Only**: Never use HTTP for webhooks in production
2. **Signature Verification**: Always verify signatures
3. **Rate Limiting**: Limit webhook requests per IP
4. **Input Validation**: Validate all webhook data before processing
5. **SQL Injection**: Use parameterized queries (Prisma handles this)
6. **XSS Protection**: Sanitize data before displaying
7. **DoS Protection**: Limit webhook payload size (< 1MB)

## Support Resources

- **Salla Webhook Docs**: https://docs.salla.dev/webhooks
- **Salla Developer Portal**: https://salla.dev/
- **Raff Integration Guide**: See [SALLA_INTEGRATION_SETUP.md](./SALLA_INTEGRATION_SETUP.md)
- **Raff API Docs**: See [SALLA_API.md](./SALLA_API.md)

## Changelog

- **2024-01-15**: Added security best practices and monitoring section
- **2024-01-10**: Updated signature verification method to HMAC-SHA256
- **2024-01-05**: Added idempotency handling documentation
- **2024-01-01**: Initial webhook documentation
