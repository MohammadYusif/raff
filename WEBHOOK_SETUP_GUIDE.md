# Webhook Setup Guide - Salla & Zid

## ✅ What's Done

Your existing webhook handler now supports **subscription events** in addition to order/product events!

---

## 📍 Current Configuration (From Your Screenshot)

**Webhook URL:**
```
https://raff-production-51f5.up.railway.app/api/salla/webhook
```

**Security:** Signature-based (HMAC-SHA256)

**Secret Key:** Already configured (hidden)

---

## 🎯 What You Need To Do in Salla Dashboard

### Step 1: Enable Subscription Events ✅

Go back to that events page you showed me and make sure these are **checked**:

**Already Enabled (From your screenshot):**
- ✅ Subscription Created (`app.subscription.started`)
- ✅ Subscription Charge Succeeded (`app.subscription.renewed`)
- ✅ Subscription Charge Failed (optional)
- ✅ Subscription Cancelled (`app.subscription.canceled`)

**If not already checked, check them now!**

### Step 2: Save Configuration

Click "Save" or "Update" to apply the webhook configuration.

---

## 🔧 What Happens Now

When subscription events occur, Salla will send webhooks to:

```
POST https://raff-production-51f5.up.railway.app/api/salla/webhook
```

Your updated webhook handler will:

1. ✅ Verify signature
2. ✅ Detect subscription events
3. ✅ Update merchant's `subscriptionStatus` in database
4. ✅ Log the event

### Event → Status Mapping

| Event | Status Updated |
|-------|----------------|
| `app.subscription.started` | `ACTIVE` |
| `app.subscription.renewed` | `ACTIVE` |
| `app.subscription.canceled` | `CANCELED` |
| `app.subscription.expired` | `EXPIRED` |

---

## 📝 Deployment Checklist

### Before You Deploy:

1. **Run Migration** (when DB is online):
   ```bash
   npx prisma migrate deploy
   ```

2. **Add Environment Variables** to Railway:
   ```bash
   SALLA_APP_ID=your_actual_app_id
   ZID_APP_ID=your_actual_app_id
   ```

3. **Deploy Updated Code** to Railway:
   ```bash
   git add .
   git commit -m "Add subscription webhook handling"
   git push
   ```

4. **In Salla Dashboard:**
   - ✅ Verify webhook URL: `https://raff-production-51f5.up.railway.app/api/salla/webhook`
   - ✅ Enable subscription events (check the boxes)
   - ✅ Click Save

---

## 🧪 Testing

### Test 1: Webhook Delivery

After enabling events in Salla dashboard:

1. Look for "Test Webhook" button or "Send Test Event"
2. Send a test `app.subscription.started` event
3. Check your Railway logs:
   ```bash
   railway logs
   ```
4. Look for: `"Subscription started"` log entry

### Test 2: Real Subscription

1. Create a test merchant account
2. Subscribe to your app on Salla
3. Check database:
   ```sql
   SELECT name, subscriptionStatus, subscriptionPlan
   FROM Merchant
   WHERE sallaStoreId = 'test_store_id';
   ```
4. Should show: `subscriptionStatus = "ACTIVE"`

---

## 📊 What Gets Updated in Database

When subscription webhooks arrive, these fields update:

```typescript
{
  subscriptionStatus: "ACTIVE" | "CANCELED" | "EXPIRED",
  subscriptionPlan: "Premium" | "Basic" | etc.,
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
}
```

---

## 🔍 Monitoring Webhooks

### View Logs in Railway

```bash
# Watch live logs
railway logs --tail

# Filter for subscription events
railway logs | grep "subscription"
```

### Look for these log entries:

✅ **Success:**
```
[salla-webhook] Subscription started { merchantId: "...", plan: "Premium" }
[salla-webhook] Subscription renewed { merchantId: "...", plan: "Premium" }
```

❌ **Errors:**
```
[salla-webhook] Merchant not found for subscription webhook
[salla-webhook] Missing store ID in subscription webhook
```

---

## 🎯 Next Steps

1. ✅ **Enable subscription events** in Salla dashboard
2. ✅ **Get `SALLA_APP_ID`** from Salla Partners dashboard
3. ✅ **Add to Railway environment variables**
4. ✅ **Deploy updated code** to Railway
5. ✅ **Test with webhook** or real subscription
6. ✅ **Repeat for Zid** (when ready)

---

## ❓ FAQ

**Q: Do I need a separate webhook URL for subscriptions?**

No! We merged subscription handling into your existing `/api/salla/webhook` endpoint. One URL handles everything.

**Q: What if I already have merchants subscribed?**

Run the backfill script to sync their status:
```bash
npx tsx scripts/backfill-subscriptions.ts
```

**Q: How do I know if webhooks are working?**

Check Railway logs after enabling events. You should see webhook POSTs arriving.

**Q: What about Zid?**

Same process:
1. Find Zid webhook settings
2. Enable subscription events
3. Point to: `https://raff-production-51f5.up.railway.app/api/zid/webhook`
4. Update Zid webhook handler (similar to Salla)

---

## 🚀 You're Almost Done!

Just need to:
1. Check those subscription event boxes in Salla ✅
2. Click Save ✅
3. Get your `SALLA_APP_ID` and add to Railway ✅
4. Deploy! ✅

Then you'll have full subscription billing working! 🎉
