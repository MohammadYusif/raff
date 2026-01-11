# Subscription Billing - Quick Start Guide

## ✅ What's Been Implemented

You now have a complete subscription billing system that works with both **Salla** and **Zid**.

---

## 📋 Files Created

### Core Services
- `src/lib/services/subscription.service.ts` - Main subscription checking logic
- `src/lib/middleware/subscription.ts` - Middleware helpers for protecting routes

### API Routes
- `src/app/api/salla/subscription/route.ts` - Salla subscription webhooks
- `src/app/api/zid/subscription/route.ts` - Zid subscription webhooks
- `src/app/api/merchant/subscription/status/route.ts` - Check subscription status

### Database
- Updated `prisma/schema.prisma` with subscription fields
- Added `SubscriptionStatus` enum

### Documentation
- `SUBSCRIPTION_IMPLEMENTATION.md` - Complete implementation guide

---

## 🚀 How It Works

### 1. **Merchant Subscribes on Platform**

Merchants subscribe to your app on:
- **Salla:** https://apps.salla.sa
- **Zid:** https://market.zid.sa

### 2. **Webhooks Update Status**

When subscription status changes, platforms send webhooks to:
- Salla: `POST /api/salla/subscription`
- Zid: `POST /api/zid/subscription`

Events tracked:
- ✅ Started/Activated
- 🔄 Renewed
- ❌ Canceled
- ⏰ Expired

### 3. **You Check Status**

```typescript
import { checkMerchantSubscription } from "@/lib/services/subscription.service";

const result = await checkMerchantSubscription(merchantId);
// { isSubscribed: true, status: "ACTIVE", plan: "Premium", endsAt: Date }
```

### 4. **Protect Your Routes**

```typescript
import { requireActiveSubscription } from "@/lib/services/subscription.service";

export async function GET(request: NextRequest) {
  const merchant = await getMerchant();

  // This throws if not subscribed
  await requireActiveSubscription(merchant.id);

  // Protected code here...
}
```

---

## 📝 Next Steps (Required Setup)

### Step 1: Add Environment Variables

Add to your `.env`:

```bash
# Get these from your platform partner dashboards
SALLA_APP_ID="your_salla_app_id"
ZID_APP_ID="your_zid_app_id"
```

### Step 2: Run Database Migration

When your database is online:

```bash
npx prisma migrate dev --name add_subscription_fields
```

Or if using Railway/production:

```bash
npx prisma migrate deploy
```

### Step 3: Configure Webhooks

#### Salla
1. Go to [Salla Partners Dashboard](https://salla.partners)
2. Navigate to your app → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/salla/subscription`
4. Subscribe to events:
   - `app.subscription.started`
   - `app.subscription.renewed`
   - `app.subscription.canceled`
   - `app.subscription.expired`

#### Zid
1. Go to Zid Partners Dashboard
2. Configure webhook: `https://yourdomain.com/api/zid/subscription`
3. Subscribe to subscription events

### Step 4: Backfill Existing Merchants

Check subscription status for merchants already connected:

```typescript
// Create: scripts/backfill-subscriptions.ts
import { prisma } from "@/lib/prisma";
import { checkMerchantSubscription } from "@/lib/services/subscription.service";

async function backfill() {
  const merchants = await prisma.merchant.findMany({
    where: {
      OR: [
        { sallaStoreId: { not: null } },
        { zidStoreId: { not: null } },
      ],
    },
  });

  for (const merchant of merchants) {
    try {
      await checkMerchantSubscription(merchant.id);
      console.log(`✓ ${merchant.name}`);
    } catch (error) {
      console.error(`✗ ${merchant.name}: ${error.message}`);
    }
  }
}

backfill();
```

Run:
```bash
npx tsx scripts/backfill-subscriptions.ts
```

### Step 5: Add UI Components

Show subscription status in merchant dashboard:

```tsx
// components/SubscriptionStatus.tsx
"use client";

import { useEffect, useState } from "react";

export function SubscriptionStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/merchant/subscription/status")
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  if (!status) return <div>Loading...</div>;

  if (!status.subscription.isActive) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded">
        <h3 className="font-bold">Subscription Required</h3>
        <p>Please subscribe to continue using Raff.</p>
        <a
          href={status.platform === "salla" ? "https://apps.salla.sa" : "https://market.zid.sa"}
          className="btn btn-primary mt-2"
        >
          Subscribe Now
        </a>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 p-4 rounded">
      <p>✓ Active subscription: {status.subscription.plan}</p>
      <p className="text-sm text-gray-600">
        Renews: {new Date(status.subscription.endDate).toLocaleDateString()}
      </p>
    </div>
  );
}
```

---

## 🔒 Protecting Routes

### Example 1: Merchant Dashboard

```typescript
// src/app/merchant/dashboard/page.tsx
import { requireActiveSubscription } from "@/lib/services/subscription.service";

export default async function MerchantDashboard() {
  const session = await getServerSession(authOptions);
  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
  });

  try {
    await requireActiveSubscription(merchant.id);
  } catch {
    redirect("/merchant/subscribe");
  }

  return <div>Dashboard content...</div>;
}
```

### Example 2: API Route

```typescript
// src/app/api/merchant/products/route.ts
import { withSubscription } from "@/lib/middleware/subscription";

export async function GET(request: NextRequest) {
  const merchant = await getMerchant(request);

  return withSubscription(merchant.id, async () => {
    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id },
    });
    return NextResponse.json({ products });
  });
}
```

---

## 🧪 Testing

### Test Subscription Check

```bash
# Check your subscription status
curl http://localhost:3000/api/merchant/subscription/status \
  -H "Cookie: next-auth.session-token=your_token"
```

### Test Webhook (Salla)

```bash
# Simulate subscription started
curl -X POST http://localhost:3000/api/salla/subscription \
  -H "Content-Type: application/json" \
  -H "x-salla-signature: $(echo -n 'your_secret{"event":"app.subscription.started"}' | openssl dgst -sha256 -hmac 'your_secret' | cut -d' ' -f2)" \
  -d '{
    "event": "app.subscription.started",
    "data": {
      "merchant": { "id": "your_store_id" },
      "plan_name": "Premium",
      "start_date": "2026-01-11T00:00:00Z",
      "end_date": "2026-02-11T00:00:00Z"
    }
  }'
```

---

## 📊 Database Schema

New fields added to `Merchant` model:

```prisma
model Merchant {
  // ... existing fields ...

  // Subscription Status
  subscriptionStatus         SubscriptionStatus @default(INACTIVE)
  subscriptionPlan           String?
  subscriptionStartDate      DateTime?
  subscriptionEndDate        DateTime?
  lastSubscriptionCheckAt    DateTime?

  // Commission Settings (DEPRECATED)
  commissionRate Decimal @default(5.00) @db.Decimal(5, 2)
}

enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  CANCELED
  EXPIRED
  TRIAL
}
```

---

## 🔑 API Reference

### Check Subscription

```typescript
checkMerchantSubscription(merchantId: string)
// Returns: { isSubscribed, status, plan, endsAt }
```

### Require Active Subscription (Throws)

```typescript
requireActiveSubscription(merchantId: string)
// Throws if not subscribed
```

### Check if Expiring Soon

```typescript
isSubscriptionExpiringSoon(merchantId: string)
// Returns: boolean (true if expires within 7 days)
```

### Platform-Specific Checks

```typescript
checkSallaSubscription(merchantId: string)
checkZidSubscription(merchantId: string)
```

---

## 📚 Resources

### Salla
- [Subscription API](https://docs.salla.dev/api-5401098)
- [Subscription Webhooks](https://docs.salla.dev/421413m0)
- [Partners Dashboard](https://salla.partners)

### Zid
- [Subscription API](https://docs.zid.sa/get-subscription-details-13896876e0)
- [Partners Dashboard](https://zid.sa/partners)
- [API Documentation](https://docs.zid.sa)

---

## ❓ FAQ

**Q: What happens if a merchant's subscription expires?**
- Status changes to `EXPIRED` automatically via webhook
- Protected routes return 403 error
- Merchant sees prompt to renew

**Q: How often is subscription status checked?**
- **Real-time:** via webhooks (instant updates)
- **On-demand:** when you call `checkMerchantSubscription()`
- **Cached:** for 1 hour to reduce API calls

**Q: Can I offer a free trial?**
- Yes! Set `subscriptionStatus = TRIAL` manually
- Check `subscriptionEndDate` in your middleware

**Q: What if the webhook fails?**
- Next API call will refresh status from platform
- Consider adding a daily cron to sync all merchants

**Q: Do I need to remove commission tracking?**
- No! Keep it for now (marked as deprecated)
- You can phase it out gradually

---

## ✅ Checklist

Before going live:

- [ ] Add `SALLA_APP_ID` and `ZID_APP_ID` to production `.env`
- [ ] Run database migration in production
- [ ] Configure Salla subscription webhooks
- [ ] Configure Zid subscription webhooks
- [ ] Test with a real merchant account
- [ ] Backfill existing merchants
- [ ] Add subscription UI to merchant dashboard
- [ ] Protect all merchant-only routes
- [ ] Update merchant onboarding flow
- [ ] Add monitoring/alerts for failed subscription checks

---

## 🎯 Summary

You now have:

✅ **Database schema** ready for subscriptions
✅ **API service** to check subscription status
✅ **Webhook handlers** for real-time updates
✅ **Middleware** to protect routes
✅ **Frontend integration** examples
✅ **Complete documentation**

Next: Configure webhooks and start protecting your routes! 🚀
