# Commission Tracking System

## Overview

Raff's commission tracking system automatically tracks orders that come through the platform and calculates commissions owed to Raff. The system uses tracking IDs embedded in product URLs to attribute orders back to Raff.

## How It Works

### 1. **Click Tracking** (`/api/track/click`)

When a user clicks on a product in Raff:

1. **Generate Tracking ID**: A unique tracking ID is created using the format `raff_{random12chars}`
   - Example: `raff_X4m9K2pL7nQw`

2. **Create Click Record**: A `ClickTracking` record is stored in the database with:
   - `trackingId`: The unique ID
   - `productId`: The product being clicked
   - `merchantId`: The merchant who owns the product
   - `platform`: ZID or SALLA
   - `commissionRate`: Merchant's commission rate (default 5%)
   - `expiresAt`: 30 days from click
   - `ipAddress`, `userAgent`, `referrerUrl`: For fraud detection

3. **Build Tracking URL**: The destination URL is enhanced with tracking parameters:
   ```
   https://store.zid.sa/products/123?ref=raff_X4m9K2pL7nQw&utm_source=raff&utm_medium=affiliate&utm_campaign=product-slug
   ```

4. **Redirect User**: User is redirected to the merchant's store with the tracking URL

### 2. **Order Creation** (Webhook Handler)

When a customer places an order on the merchant's platform (Zid or Salla):

1. **Webhook Received**: Merchant's platform sends order webhook to `/api/zid/webhook` or `/api/salla/webhook`

2. **Extract Referrer Code**: The webhook payload contains the `ref` parameter from the URL:
   ```json
   {
     "order_id": "456",
     "referrer": "https://store.zid.sa/products/123?ref=raff_X4m9K2pL7nQw",
     "total": 500.00,
     "currency": "SAR",
     "payment_status": "pending"
   }
   ```

3. **Find Click Tracking**: Look up the `ClickTracking` record by `trackingId` (raff_X4m9K2pL7nQw)

4. **Calculate Commission**:
   ```
   Commission Amount = (Order Total × Commission Rate) / 100
   Example: (500.00 × 5.00) / 100 = 25.00 SAR
   ```

5. **Create Commission Record**:
   ```typescript
   {
     clickTrackingId: "click_abc123",
     merchantId: "merchant_xyz",
     orderId: "456",
     orderTotal: 500.00,
     orderCurrency: "SAR",
     commissionRate: 5.00,
     commissionAmount: 25.00,
     status: "PENDING"  // Initially pending
   }
   ```

### 3. **Commission Status Flow**

```
PENDING → APPROVED → PAID
   ↓
CANCELLED (if order cancelled/refunded)
```

- **PENDING**: Order created but payment not yet confirmed
- **APPROVED**: Payment confirmed (automatically triggers when `payment_status = "paid"`)
- **ON_HOLD**: Suspicious activity detected (fraud prevention)
- **PAID**: Raff has received payment from merchant
- **CANCELLED**: Order was cancelled or refunded

### 4. **Payment Threshold** (1000+ SAR Revenue)

The system tracks accumulated commissions per merchant:

```sql
-- Get merchant's total approved commissions
SELECT
  merchantId,
  SUM(commissionAmount) as totalOwed
FROM Commission
WHERE status IN ('APPROVED', 'PENDING')
GROUP BY merchantId
HAVING SUM(commissionAmount) >= 1000.00
```

When a merchant reaches 1000 SAR in commissions:
1. Admin reviews and marks commissions as `PAID`
2. System records `paidAt` timestamp
3. Invoice/receipt can be generated

## Database Schema

### ClickTracking Table
```prisma
model ClickTracking {
  id                String    @id @default(cuid())
  trackingId        String    @unique          // "raff_X4m9K2pL7nQw"
  productId         String
  merchantId        String
  platform          Platform                  // ZID or SALLA
  commissionRate    Decimal?  @db.Decimal(5, 2)

  // Conversion tracking
  converted         Boolean   @default(false)
  convertedCount    Int       @default(0)
  conversionValue   Decimal?  @db.Decimal(10, 2)
  commissionValue   Decimal?  @db.Decimal(10, 2)

  // Timestamps
  clickedAt         DateTime  @default(now())
  convertedAt       DateTime?
  lastConvertedAt   DateTime?
  expiresAt         DateTime                  // 30 days from click

  // Relations
  orders            Order[]
  commissions       Commission[]
}
```

### Commission Table
```prisma
model Commission {
  id                String           @id @default(cuid())
  clickTrackingId   String
  clickTracking     ClickTracking    @relation(...)

  merchantId        String
  merchant          Merchant         @relation(...)

  orderId           String
  orderTotal        Decimal          @db.Decimal(10, 2)
  orderCurrency     String           @default("SAR")

  commissionRate    Decimal          @db.Decimal(5, 2)    // 5.00 = 5%
  commissionAmount  Decimal          @db.Decimal(10, 2)   // 25.00 SAR

  status            CommissionStatus @default(PENDING)
  paidAt            DateTime?

  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  @@unique([merchantId, orderId])  // One commission per order
}
```

### Order Table (Simplified)
```prisma
model Order {
  id              String    @id @default(cuid())
  merchantId      String
  platform        Platform

  // Platform-specific IDs
  zidOrderId      String?   @unique
  sallaOrderId    String?   @unique

  totalPrice      Decimal   @db.Decimal(10, 2)
  currency        String    @default("SAR")
  status          OrderStatus

  // Link to tracking
  clickTrackingId String?
  clickTracking   ClickTracking? @relation(...)
}
```

## Fraud Detection & Risk Scoring

The system includes fraud prevention:

### High-Frequency Orders Detection
```typescript
// If more than 3 orders from same tracking ID within 10 minutes
if (orderCount >= 3 && windowMinutes <= 10) {
  // Mark as suspicious
  status = CommissionStatus.ON_HOLD

  // Create fraud signal
  await FraudSignal.create({
    signalType: "HIGH_FREQUENCY_ORDERS",
    severity: "HIGH",
    score: 70,
    reason: "High frequency orders detected"
  })
}
```

### Disqualification Reasons
- `RATE_LIMIT`: Too many clicks from same IP
- `BOT_UA`: Bot or crawler user agent detected
- `INVALID_REFERRER`: Click didn't come from Raff product page
- `SEC_FETCH_SITE`: Security headers indicate suspicious origin
- `DUPLICATE_RECENT`: Same user clicked same product within 15 seconds
- `PRODUCT_INACTIVE`: Product is no longer active
- `INVALID_DESTINATION`: Destination URL doesn't match merchant's store

## API Endpoints

### Track Click
```http
POST /api/track/click
Content-Type: application/json

{
  "productId": "prod_123"
}

Response:
{
  "success": true,
  "qualified": true,
  "trackingId": "raff_X4m9K2pL7nQw",
  "redirectUrl": "https://store.zid.sa/products/123?ref=raff_X4m9K2pL7nQw&utm_source=raff&utm_medium=affiliate&utm_campaign=product-slug",
  "expiresAt": "2026-02-07T12:00:00.000Z"
}
```

### Webhook Handler (Internal - called by platform)
```http
POST /api/zid/webhook
X-Zid-Webhook-Secret: {secret}
Content-Type: application/json

{
  "event": "order.create",
  "order_id": "456",
  "store_id": "789",
  "total": 500.00,
  "currency": "SAR",
  "payment_status": "pending",
  "referrer": "https://store.zid.sa/products/123?ref=raff_X4m9K2pL7nQw"
}

Response:
{
  "success": true,
  "message": "Commission pending",
  "commission": 25.00
}
```

## Query Examples

### Get Merchant's Total Owed
```typescript
const merchantCommissions = await prisma.commission.aggregate({
  where: {
    merchantId: "merchant_xyz",
    status: {
      in: ["PENDING", "APPROVED"]
    }
  },
  _sum: {
    commissionAmount: true
  }
});

const totalOwed = merchantCommissions._sum.commissionAmount || 0;
```

### Get Orders Above Threshold
```typescript
const merchantsAboveThreshold = await prisma.commission.groupBy({
  by: ["merchantId"],
  where: {
    status: {
      in: ["PENDING", "APPROVED"]
    }
  },
  _sum: {
    commissionAmount: true
  },
  having: {
    commissionAmount: {
      _sum: {
        gte: 1000.00
      }
    }
  }
});
```

### Get Commission Details
```typescript
const commissions = await prisma.commission.findMany({
  where: {
    merchantId: "merchant_xyz",
    status: "APPROVED"
  },
  include: {
    clickTracking: {
      select: {
        trackingId: true,
        product: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    }
  },
  orderBy: {
    createdAt: "desc"
  }
});
```

## Environment Variables

```env
# Commission Settings (in Merchant model, default 5%)
# No global env var needed

# Risk/Fraud Settings
ENABLE_RISK_SCORING=true
RISK_SCORE_THRESHOLD=70
RISK_TRACKING_WINDOW_MINUTES=10
RISK_TRACKING_ORDER_THRESHOLD=3

# Webhook Configuration
ZID_WEBHOOK_SECRET=your_secret
ZID_WEBHOOK_HEADER=X-Zid-Webhook-Secret
ZID_WEBHOOK_SIGNATURE_MODE=plain

SALLA_WEBHOOK_SECRET=your_secret
SALLA_WEBHOOK_HEADER=x-salla-signature
SALLA_WEBHOOK_SIGNATURE_MODE=hmac-sha256
```

## Testing

### Manual Testing
1. Click a product in Raff → Get tracking URL
2. Complete purchase on merchant's store using tracking URL
3. Check database for `Commission` record with `status: PENDING`
4. Simulate payment webhook → Status should change to `APPROVED`
5. Mark as `PAID` after merchant reaches threshold

### Automated Testing
```bash
# Run webhook test suite
npm run test:webhooks

# Or use the test scripts
./scripts/test-webhooks.sh
```

## Admin Dashboard Queries

### Merchants Near Threshold (800+ SAR)
```sql
SELECT
  m.id,
  m.name,
  SUM(c.commissionAmount) as totalOwed,
  COUNT(c.id) as orderCount
FROM Merchant m
JOIN Commission c ON c.merchantId = m.id
WHERE c.status IN ('PENDING', 'APPROVED')
GROUP BY m.id, m.name
HAVING SUM(c.commissionAmount) >= 800.00
ORDER BY totalOwed DESC;
```

### Recent High-Value Commissions
```sql
SELECT
  c.id,
  c.orderId,
  c.commissionAmount,
  c.status,
  m.name as merchantName,
  p.name as productName,
  c.createdAt
FROM Commission c
JOIN Merchant m ON m.id = c.merchantId
JOIN ClickTracking ct ON ct.id = c.clickTrackingId
JOIN Product p ON p.id = ct.productId
WHERE c.commissionAmount >= 50.00
ORDER BY c.createdAt DESC
LIMIT 20;
```

## Key Features

✅ **Automatic Tracking**: No manual intervention needed
✅ **Idempotent**: Duplicate webhooks don't create duplicate commissions
✅ **Status Transitions**: PENDING → APPROVED on payment confirmation
✅ **Fraud Detection**: High-frequency order detection
✅ **Multi-Platform**: Works with both Zid and Salla
✅ **Commission Attribution**: 30-day cookie window
✅ **Revenue Threshold**: Track when merchants owe 1000+ SAR

## Next Steps

1. **Admin Dashboard**: Build UI to view merchants above threshold
2. **Payment Processing**: Integrate payment gateway for merchant payouts
3. **Invoicing**: Generate invoices when marking commissions as PAID
4. **Notifications**: Alert admin when merchant reaches threshold
5. **Reporting**: Monthly commission reports per merchant
