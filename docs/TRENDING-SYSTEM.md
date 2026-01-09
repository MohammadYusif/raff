# Trending System Documentation

## Overview

The Raff trending system identifies and ranks products based on user engagement, helping surface popular and fast-rising items to customers.

## How It Works

### 1. Data Collection

User interactions are tracked and weighted:

| Event Type | Weight | Description |
|------------|--------|-------------|
| **VIEW** | 1.0 | Product page view |
| **SAVE** | 3.0 | Product saved to wishlist |
| **CLICK** | 5.0 | Outbound click to merchant store |
| **ORDER** | 10.0 | Confirmed purchase |

Events are logged to the `TrendingLog` table with:
- Product ID
- Event type
- Weight
- Timestamp
- Metadata (user agent, etc.)

### 2. Score Calculation

Trending scores are calculated using a sophisticated algorithm that considers:

#### Time Decay (Exponential)
- **Formula**: `2^(-hours_passed / half_life)`
- **Half-life**: 48 hours (configurable)
- Older events contribute less to the score
- Prevents stale products from staying trending

#### Recency Boost
- **Boost window**: Last 24 hours (configurable)
- **Multiplier**: 1.5x (configurable)
- Fast-rising products get extra weight

#### Velocity Score
- Compares last 24 hours vs previous 24 hours
- Identifies acceleration in engagement
- Adds 20% bonus for products with >50% growth

#### Final Score Formula
```typescript
for each event:
  eventScore = weight × decayFactor × recencyBoost

totalScore = sum(allEventScores)
           + (clickCount × 5.0 × 0.7)
           + (orderCount × 10.0 × 0.8)

if velocityGrowth > 50%:
  finalScore = totalScore × 1.2
else:
  finalScore = totalScore

if finalScore < minimumThreshold (10):
  finalScore = 0
```

### 3. Display

Products with `trendingScore > 0` appear in:
- Trending section (`/trending`)
- Homepage trending carousel
- Search results (boosted ranking)
- Category pages (with trending badge)

---

## Configuration

Default configuration in `scripts/calculate-trending-scores.ts`:

```typescript
{
  decayHalfLifeHours: 48,          // Time decay rate
  viewWeight: 1.0,                  // View event weight
  clickWeight: 5.0,                 // Click event weight
  saveWeight: 3.0,                  // Save event weight
  orderWeight: 10.0,                // Order event weight
  recentActivityBoostHours: 24,    // Recency boost window
  recentActivityMultiplier: 1.5,   // Recency boost amount
  minimumScore: 10,                 // Minimum score to show
}
```

---

## Running the Calculator

### Manual Execution

Run the calculation script manually:

```bash
npm run calculate:trending
```

Expected output:
```
✅ Trending scores calculated successfully
{
  "success": true,
  "totalProcessed": 245,
  "updated": 187,
  "zeroed": 58
}
```

### Via Admin API

Trigger calculation via authenticated API call:

```bash
POST /api/admin/calculate-trending
Authorization: Bearer <admin-token>
```

Check current trending stats:

```bash
GET /api/admin/calculate-trending
```

Response:
```json
{
  "trendingCount": 187,
  "topTrending": [
    {
      "id": "...",
      "title": "Product Name",
      "trendingScore": 425.67,
      "viewCount": 1234,
      "clickCount": 89,
      "orderCount": 12
    },
    ...
  ]
}
```

### Automated Schedule (Recommended)

Set up a cron job to run every 3-6 hours:

#### Using cron (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add line (runs every 3 hours)
0 */3 * * * cd /path/to/raff && npm run calculate:trending
```

#### Using systemd timer (Linux)
Create `/etc/systemd/system/raff-trending.service`:
```ini
[Unit]
Description=Calculate Raff trending scores

[Service]
Type=oneshot
WorkingDirectory=/path/to/raff
ExecStart=/usr/bin/npm run calculate:trending
User=raff
```

Create `/etc/systemd/system/raff-trending.timer`:
```ini
[Unit]
Description=Run Raff trending calculation every 3 hours

[Timer]
OnBootSec=5min
OnUnitActiveSec=3h

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl enable raff-trending.timer
sudo systemctl start raff-trending.timer
```

#### Using Vercel Cron (if deployed on Vercel)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/calculate-trending",
    "schedule": "0 */3 * * *"
  }]
}
```

**Note**: Secure the endpoint with proper authentication for production.

---

## Database Schema

### TrendingLog Table
```prisma
model TrendingLog {
  id        String        @id @default(cuid())
  productId String
  eventType TrendingEvent // VIEW | SAVE
  weight    Float
  metadata  Json?
  createdAt DateTime      @default(now())

  @@index([productId, createdAt])
  @@index([eventType])
}
```

### Product Fields
```prisma
model Product {
  // ...
  trendingScore Float @default(0)  // Calculated score
  viewCount     Int   @default(0)  // Total views
  clickCount    Int   @default(0)  // Total outbound clicks
  orderCount    Int   @default(0)  // Total orders
  // ...

  @@index([trendingScore])
}
```

---

## Fraud Prevention

The tracking system includes robust fraud prevention:

### Bot Detection
- User agent validation
- Blocks known bot patterns (crawler, spider, headless, etc.)

### Rate Limiting
- 100 events/minute per IP (global)
- 20 events/minute per IP per product
- 30 clicks/minute per IP

### Referrer Validation
- Must be same-origin
- Must be from valid paths (product pages, categories, homepage)
- Checks `Sec-Fetch-Site` header

### Silent Failures
Suspicious requests return `200 OK` but don't count toward trending scores.

---

## Monitoring

### Check Trending Status

```sql
-- Top 10 trending products
SELECT
  id, title, trendingScore, viewCount, clickCount, orderCount
FROM "Product"
WHERE "trendingScore" > 0
ORDER BY "trendingScore" DESC
LIMIT 10;

-- Recent trending events
SELECT
  productId, eventType, weight,
  COUNT(*) as event_count,
  DATE_TRUNC('hour', "createdAt") as hour
FROM "TrendingLog"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY productId, eventType, weight, hour
ORDER BY hour DESC;

-- Products with suspicious activity
SELECT
  p.id, p.title, p.viewCount, p.clickCount, p.orderCount,
  (p.clickCount::float / NULLIF(p.viewCount, 0)) as click_rate
FROM "Product" p
WHERE p.viewCount > 100
AND (p.clickCount::float / NULLIF(p.viewCount, 0)) > 0.5 -- Unusually high
ORDER BY click_rate DESC;
```

### Logs

The calculator uses structured logging:

```typescript
logger.info("Starting trending score calculation", { config });
logger.debug("Updated trending score", { productId, score, velocity });
logger.error("Failed to calculate score", { productId, error });
```

Filter logs by namespace:
```bash
# In development
RAFF_TRENDING_CALCULATOR_DEBUG=true npm run calculate:trending

# In production, filter JSON logs
grep '"namespace":"trending-calculator"' app.log | jq
```

---

## Performance

### Optimization Tips

1. **Run during low-traffic hours**: Schedule for 3-6 AM
2. **Adjust frequency**: More frequent = more accurate, but higher load
3. **Tune lookback window**: Default 14 days, reduce if DB is slow
4. **Database indexes**: Ensure indexes on:
   - `TrendingLog(productId, createdAt)`
   - `Product(trendingScore)`
   - `ClickTracking(productId, createdAt)`
   - `Order(productId, createdAt)`

### Expected Performance

- **Calculation time**: 5-30 seconds for 1000 products
- **Database load**: Moderate (mostly reads)
- **Memory usage**: ~50-100MB

---

## Troubleshooting

### No products showing as trending

1. **Check if calculator has run**:
   ```sql
   SELECT MAX("trendingScore") FROM "Product";
   ```
   If 0, calculator hasn't run yet.

2. **Run calculator manually**:
   ```bash
   npm run calculate:trending
   ```

3. **Check for events**:
   ```sql
   SELECT COUNT(*) FROM "TrendingLog";
   ```
   If 0, events aren't being tracked.

4. **Verify minimum threshold**: Default is 10 points
   - 10 views OR
   - 3 saves + 1 view OR
   - 2 clicks OR
   - 1 order

### Scores seem wrong

1. **Check event weights**: Verify in `DEFAULT_CONFIG`
2. **Check time decay**: 48-hour half-life means 4-day-old events count ~1/4
3. **Verify fraud prevention**: Suspicious activity doesn't count
4. **Review logs**: Check for calculation errors

### Calculator fails

1. **Check database connection**: Ensure `DATABASE_URL` is correct
2. **Check permissions**: User needs SELECT/UPDATE on Product, TrendingLog
3. **Review error logs**: Look for specific error messages
4. **Check disk space**: Ensure adequate space for calculations

---

## Future Enhancements

Potential improvements:

1. **Category-specific trending**: Track trending per category
2. **Personalized trending**: Factor in user preferences
3. **Geographic trending**: Regional trending products
4. **Real-time scores**: Use Redis for live updates
5. **A/B testing**: Test different algorithms
6. **ML-based scoring**: Predict future trending items

---

## API Reference

### Public Endpoints

#### GET /api/products/trending
Get trending products for display.

**Query Parameters**:
- `limit` (optional): Number of products (default: 8, max: 50)

**Response**:
```json
{
  "products": [
    {
      "id": "...",
      "title": "Product Name",
      "price": 99.99,
      "trendingScore": 425.67,
      "merchant": { ... },
      "category": { ... }
    }
  ]
}
```

### Admin Endpoints

#### POST /api/admin/calculate-trending
Manually trigger trending score calculation.

**Authentication**: Required (ADMIN role)

**Response**:
```json
{
  "success": true,
  "message": "Trending scores calculated successfully",
  "result": {
    "totalProcessed": 245,
    "updated": 187,
    "zeroed": 58
  }
}
```

#### GET /api/admin/calculate-trending
Get current trending statistics.

**Authentication**: Required (ADMIN role)

**Response**:
```json
{
  "trendingCount": 187,
  "topTrending": [ ... ]
}
```

---

## Security Considerations

1. **Admin API**: Ensure proper authentication on `/api/admin/calculate-trending`
2. **Rate limiting**: Already implemented for event tracking
3. **Bot protection**: Already implemented in tracking endpoint
4. **Cron security**: If using external cron service, use signed requests
5. **Database access**: Calculator needs read/write on specific tables only

---

## Questions?

For support:
- Check logs: `grep "trending" app.log`
- Review code: `scripts/calculate-trending-scores.ts`
- Contact: [Your support contact]
