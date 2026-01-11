# Subscription-Based Billing Implementation

This document explains how to implement subscription checking for your Raff platform now that you're moving from commission-based to subscription-based billing.

---

## Overview

Both **Salla** and **Zid** support subscription billing through their app marketplaces. This implementation:

1. Checks subscription status via platform APIs
2. Listens to subscription webhooks for real-time updates
3. Enforces subscription requirements on protected routes
4. Caches subscription status to reduce API calls

---

## Database Schema Changes

Added to `Merchant` model:

```prisma
// Subscription Status
subscriptionStatus         SubscriptionStatus @default(INACTIVE)
subscriptionPlan           String?
subscriptionStartDate      DateTime?
subscriptionEndDate        DateTime?
lastSubscriptionCheckAt    DateTime?
```

New enum:

```prisma
enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  CANCELED
  EXPIRED
  TRIAL
}
```

**Migration command:**

```bash
npx prisma migrate dev --name add_subscription_fields
```

---

## Platform APIs

### Salla

**Endpoint:** `GET https://api.salla.dev/admin/v2/apps/{app_id}/subscriptions`

**Auth:** Bearer token (merchant's `sallaAccessToken`)

**Response:**

```json
{
  "data": [
    {
      "plan_type": "recurring",
      "plan_name": "Premium",
      "start_date": "2026-01-01T00:00:00Z",
      "end_date": "2026-02-01T00:00:00Z",
      "total": 99.00
    }
  ]
}
```

**Webhooks:**
- `app.subscription.started`
- `app.subscription.renewed`
- `app.subscription.canceled`
- `app.subscription.expired`

**Webhook URL:** `https://yourdomain.com/api/salla/subscription`

**Documentation:** [Salla App Subscription Details](https://docs.salla.dev/api-5401098)

---

### Zid

**Endpoint:** `GET https://api.zid.sa/v1/market/app/subscription`

**Auth:**
- Bearer token (merchant's `zidAccessToken`)
- `X-Manager-Token` header (merchant's `zidManagerToken`)

**Required Scope:** `Subscription.read`

**Body (form-encoded):**

```
app_id={your_zid_app_id}
```

**Response:**

```json
{
  "subscription": {
    "app_id": "123",
    "store_id": "456",
    "subscription_status": "active",
    "plan_name": "Premium",
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-02-01T00:00:00Z"
  }
}
```

**Webhook URL:** `https://yourdomain.com/api/zid/subscription`

**Documentation:** [Zid Subscription Details](https://docs.zid.sa/get-subscription-details-13896876e0)

---

## Environment Variables

Add to your `.env`:

```bash
# Salla App ID (get from Salla Partners dashboard)
SALLA_APP_ID=your_salla_app_id

# Zid App ID (get from Zid Partners dashboard)
ZID_APP_ID=your_zid_app_id
```

---

## Usage Examples

### 1. Check Subscription Status

```typescript
import { checkMerchantSubscription } from "@/lib/services/subscription.service";

const result = await checkMerchantSubscription(merchantId);

console.log(result);
// {
//   isSubscribed: true,
//   status: "ACTIVE",
//   plan: "Premium",
//   endsAt: Date
// }
```

### 2. Protect API Routes (Throw if Not Subscribed)

```typescript
import { requireActiveSubscription } from "@/lib/services/subscription.service";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
  });

  // Will throw error if not subscribed
  await requireActiveSubscription(merchant.id);

  // Continue with protected logic
  return NextResponse.json({ data: "protected content" });
}
```

### 3. Protect API Routes (Middleware Pattern)

```typescript
import { withSubscription } from "@/lib/middleware/subscription";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
  });

  return withSubscription(merchant.id, async () => {
    // This code only runs if subscription is active
    return NextResponse.json({ data: "protected content" });
  });
}
```

### 4. Soft Check (Show Warning, Don't Block)

```typescript
import { getSubscriptionStatus } from "@/lib/middleware/subscription";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
  });

  const subscription = await getSubscriptionStatus(merchant.id);

  return NextResponse.json({
    data: "your data",
    subscription: {
      isActive: subscription?.isSubscribed || false,
      plan: subscription?.plan,
      warning: !subscription?.isSubscribed
        ? "Your subscription has expired. Please renew to continue using Raff."
        : null,
    },
  });
}
```

### 5. Check if Expiring Soon

```typescript
import { isSubscriptionExpiringSoon } from "@/lib/services/subscription.service";

const expiringSoon = await isSubscriptionExpiringSoon(merchantId);

if (expiringSoon) {
  // Send notification to merchant
  console.log("Subscription expires in less than 7 days!");
}
```

---

## Frontend Integration

### Check Subscription Status

```typescript
// In your merchant dashboard component
const checkSubscription = async () => {
  const response = await fetch("/api/merchant/subscription/status");
  const data = await response.json();

  if (!data.subscription.isActive) {
    // Show subscription prompt
    router.push("/merchant/subscribe");
  }
};
```

### Force Refresh Status

```typescript
const refreshSubscription = async () => {
  const response = await fetch("/api/merchant/subscription/status", {
    method: "POST",
  });
  const data = await response.json();
  console.log("Subscription refreshed:", data);
};
```

---

## Webhook Setup

### Salla

1. Go to [Salla Partners Dashboard](https://salla.partners)
2. Navigate to your app settings
3. Add webhook URL: `https://yourdomain.com/api/salla/subscription`
4. Subscribe to events:
   - `app.subscription.started`
   - `app.subscription.renewed`
   - `app.subscription.canceled`
   - `app.subscription.expired`

### Zid

1. Go to Zid Partners Dashboard
2. Configure webhook URL: `https://yourdomain.com/api/zid/subscription`
3. Subscribe to subscription events (check Zid docs for exact event names)

---

## Migration Strategy

### Step 1: Add Subscription Fields

```bash
npx prisma migrate dev --name add_subscription_fields
npx prisma generate
```

### Step 2: Backfill Existing Merchants

Create a script to check subscription status for all existing merchants:

```typescript
// scripts/backfill-subscriptions.ts
import { prisma } from "@/lib/prisma";
import { checkMerchantSubscription } from "@/lib/services/subscription.service";

async function backfillSubscriptions() {
  const merchants = await prisma.merchant.findMany({
    where: {
      OR: [
        { sallaStoreId: { not: null } },
        { zidStoreId: { not: null } },
      ],
    },
  });

  console.log(`Backfilling ${merchants.length} merchants...`);

  for (const merchant of merchants) {
    try {
      const result = await checkMerchantSubscription(merchant.id);
      console.log(`✓ ${merchant.name}: ${result.status}`);
    } catch (error) {
      console.error(`✗ ${merchant.name}: ${error.message}`);
    }
  }
}

backfillSubscriptions();
```

Run:

```bash
npx tsx scripts/backfill-subscriptions.ts
```

### Step 3: Update Protected Routes

Gradually add subscription checks to your API routes:

```typescript
// Before (commission-based)
export async function GET(request: NextRequest) {
  const merchant = await getMerchant();
  // ... logic
}

// After (subscription-based)
export async function GET(request: NextRequest) {
  const merchant = await getMerchant();
  await requireActiveSubscription(merchant.id); // Add this line
  // ... logic
}
```

### Step 4: Update Frontend

Add subscription warnings to merchant dashboard:

```tsx
// components/SubscriptionBanner.tsx
export function SubscriptionBanner({ merchantId }: { merchantId: string }) {
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    fetch("/api/merchant/subscription/status")
      .then((r) => r.json())
      .then(setSubscription);
  }, []);

  if (!subscription || subscription.subscription.isActive) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
      <h3>Subscription Required</h3>
      <p>
        Your subscription has {subscription.subscription.status.toLowerCase()}.
        Please subscribe on your platform's app store to continue using Raff.
      </p>
      <a
        href={
          subscription.platform === "salla"
            ? "https://apps.salla.sa"
            : "https://market.zid.sa"
        }
        className="btn btn-primary"
      >
        Subscribe Now
      </a>
    </div>
  );
}
```

---

## Caching Strategy

Subscription status is cached in the database to reduce API calls:

- **Cache Duration:** 1 hour
- **Refresh Trigger:** API call if last check > 1 hour ago
- **Real-time Updates:** Via webhooks

This means:
- Fast responses (read from DB)
- Low API usage
- Near real-time accuracy via webhooks

---

## Testing

### Test Subscription Check

```bash
# Start your dev server
npm run dev

# Test Salla subscription check
curl http://localhost:3000/api/merchant/subscription/status \
  -H "Cookie: your-session-cookie"

# Force refresh
curl -X POST http://localhost:3000/api/merchant/subscription/status \
  -H "Cookie: your-session-cookie"
```

### Test Webhook

```bash
# Simulate Salla subscription.started webhook
curl -X POST http://localhost:3000/api/salla/subscription \
  -H "Content-Type: application/json" \
  -H "x-salla-signature: your-hmac-signature" \
  -d '{
    "event": "app.subscription.started",
    "data": {
      "merchant": { "id": "123456" },
      "plan_name": "Premium",
      "start_date": "2026-01-11T00:00:00Z",
      "end_date": "2026-02-11T00:00:00Z"
    }
  }'
```

---

## FAQ

**Q: What happens when a subscription expires?**
- Webhooks automatically update status to `EXPIRED`
- Protected routes return 403 with subscription prompt
- Merchant sees banner to renew

**Q: How often should I check subscription status?**
- On merchant login: Yes (cached)
- Before protected operations: Yes (cached)
- Background cron: Optional (webhooks handle most updates)

**Q: Can I offer a free trial?**
- Yes, set `subscriptionStatus` to `TRIAL` manually
- Check expiry date in your middleware

**Q: What if webhook fails?**
- Subscription check will refresh on next API call
- Consider adding a daily cron to sync all merchants

---

## Next Steps

1. ✅ Run migration: `npx prisma migrate dev`
2. ✅ Add `SALLA_APP_ID` and `ZID_APP_ID` to `.env`
3. ✅ Configure webhooks on Salla/Zid dashboards
4. ✅ Backfill existing merchants
5. ✅ Add subscription checks to protected routes
6. ✅ Add UI components for subscription warnings
7. ✅ Test with a test merchant account

---

## Resources

- [Salla App Subscription API](https://docs.salla.dev/api-5401098)
- [Salla Subscription Webhooks](https://docs.salla.dev/421413m0)
- [Zid Subscription API](https://docs.zid.sa/get-subscription-details-13896876e0)
- [Zid Apps Overview](https://docs.zid.sa/start-here)
