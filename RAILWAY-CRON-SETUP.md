# Railway Cron Service Setup Guide

## The Problem You're Experiencing

When you create a new Railway service from your repo, Railway automatically detects it's a Next.js app and runs `npm start`, which starts the Next.js server instead of the cron service. That's why you're seeing the `NEXTAUTH_URL` warning instead of "Railway Cron Service Starting".

## Solution: Proper Railway Configuration

Follow these steps **exactly** to set up the cron service:

---

## Step-by-Step Setup

### 1. Push Latest Code

First, make sure you have the latest code:

```bash
git pull origin production
```

You should have these files:
- `scripts/cron/railway-cron-service.js` ✓
- `nixpacks.toml` ✓
- `Procfile.cron` ✓

### 2. Create New Service in Railway

1. **Go to Railway Dashboard** → Your Project
2. **Click "+ New"** → **"Empty Service"**
3. **Name it**: `raff-cron` (or any name you like)

### 3. Connect to GitHub (Important!)

1. In the new service settings, click **"Settings"** tab
2. Scroll to **"Service Source"**
3. Click **"Connect Repo"**
4. Select your `raff` repository
5. **Important**: Set **Root Directory** to `/` (leave blank)
6. **Branch**: `production` (or your main branch)

### 4. Configure Build & Start Commands

In the service **Settings** tab:

1. **Custom Build Command**: (leave empty or use default)
   ```
   npm install
   ```

2. **Custom Start Command**: **THIS IS CRITICAL**
   ```
   node scripts/cron/railway-cron-service.js
   ```

3. **Watch Paths**: (optional, helps with auto-deploys)
   ```
   scripts/cron/**
   scripts/calculate-trending-scores.ts
   ```

### 5. Add Environment Variables

In the service **Variables** tab, add these:

**Required**:
```env
DATABASE_URL=postgresql://...  (copy from your main app)
NEXTAUTH_SECRET=...  (copy from your main app)
NODE_ENV=production
```

**Optional** (for better logging):
```env
RAFF_TRENDING_CALCULATOR_DEBUG=true
RAFF_MERCHANT_SYNC_DEBUG=true
```

### 6. Deploy

1. Click **"Deploy"** button (top right)
2. Wait for build to complete (1-2 minutes)

### 7. Verify It's Working

**Check the logs** (in Railway dashboard):

You should see:
```
🚀 Railway Cron Service Starting...
Schedule: Every 3 hours (0 */3 * * *)
Running initial calculation...
[2026-01-11T...] Starting trending score calculation...
✅ Initial calculation complete
✅ Cron service is running
Next run: [next 3-hour mark]
```

**If you see `NEXTAUTH_URL` warning instead**, the start command is wrong. Go back to Step 4.

---

## Troubleshooting

### Issue: Still seeing NEXTAUTH_URL warning

**Cause**: Railway is running Next.js instead of the cron service.

**Solution**:
1. Check **Settings** → **Deploy** → **Custom Start Command**
2. Make sure it says: `node scripts/cron/railway-cron-service.js`
3. NOT: `npm start` or anything else
4. Click **"Deploy"** again

### Issue: Cannot find module 'node-cron'

**Cause**: Dependencies not installed.

**Solution**:
1. Make sure `package.json` has `node-cron` in dependencies (not devDependencies)
2. Redeploy the service
3. Check build logs for install errors

### Issue: Cannot connect to database

**Cause**: Missing or incorrect `DATABASE_URL`.

**Solution**:
1. Go to **Variables** tab
2. Copy `DATABASE_URL` from your main Raff app
3. Paste it exactly (including `?schema=public` or any other parameters)
4. Redeploy

### Issue: Prisma Client not generated

**Error**: `@prisma/client did not initialize yet`

**Solution**:
1. Make sure `nixpacks.toml` is in your repo
2. It should have: `cmds = ["npx prisma generate"]`
3. Redeploy

### Issue: Service keeps restarting

**Cause**: The cron service script has an error.

**Solution**:
1. Check logs for error messages
2. Make sure all environment variables are set
3. Test locally: `npm run cron:service`

---

## Alternative: Simpler Approach (If Above Doesn't Work)

If you're still having issues, use the **GitHub Actions** method instead (100% free and very reliable):

### GitHub Actions Setup

1. **Create file**: `.github/workflows/trending-cron.yml`

```yaml
name: Calculate Trending Scores

on:
  schedule:
    # Every 3 hours
    - cron: '0 */3 * * *'
  workflow_dispatch: # Manual trigger

jobs:
  calculate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Calculate trending scores
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
        run: npm run calculate:trending
```

2. **Add secrets** in GitHub:
   - Go to your repo → Settings → Secrets → Actions
   - Add `DATABASE_URL` (from Railway)
   - Add `NEXTAUTH_SECRET` (from Railway)

3. **Commit and push**:
```bash
git add .github/workflows/trending-cron.yml
git commit -m "Add GitHub Actions cron for trending"
git push
```

4. **Done!** GitHub will run it every 3 hours.

**Benefits**:
- ✅ Completely free
- ✅ Very reliable (GitHub infrastructure)
- ✅ Easy to monitor (Actions tab)
- ✅ No Railway configuration needed

---

## Monitoring

### Check if calculations are running

**Query your database**:
```sql
SELECT
  COUNT(*) as trending_count,
  MAX("updatedAt") as last_update
FROM "Product"
WHERE "trendingScore" > 0;
```

If `last_update` is within the last 3 hours, it's working!

### View logs

**Railway Dashboard**:
- Go to your `raff-cron` service
- Click "View Logs"
- Filter by time range

**GitHub Actions** (if using that method):
- Go to your repo
- Click "Actions" tab
- Click on the workflow run

---

## Cost Comparison

| Method | Cost | Reliability | Complexity |
|--------|------|-------------|------------|
| Railway Cron Service | ~$5/mo | ⭐⭐⭐⭐⭐ | Medium |
| GitHub Actions | FREE | ⭐⭐⭐⭐⭐ | Easy |
| External Cron (cron-job.org) | FREE | ⭐⭐⭐⭐ | Easy |

## Recommendation

If you're having trouble with Railway setup, **use GitHub Actions**. It's:
- Free
- Super reliable
- Easier to set up
- Well documented
- Easy to monitor

---

## Need Help?

1. **Check Railway logs** for error messages
2. **Test locally**: `npm run cron:service`
3. **Verify environment variables** are set correctly
4. **Try GitHub Actions** if Railway is too complex
5. Report issues with logs attached

---

## Summary

**Working Setup Should Show**:
```
Railway Logs:
🚀 Railway Cron Service Starting...
Schedule: Every 3 hours (0 */3 * * *)
Running initial calculation...
✅ Initial calculation complete
✅ Cron service is running
💓 Cron service is alive and running (every hour)
[Every 3 hours]: 🔄 Starting trending score calculation...
```

**Not Working** (shows NEXTAUTH_URL warning):
- Wrong start command
- Railway detected Next.js and ran that instead
- Fix: Set Custom Start Command to `node scripts/cron/railway-cron-service.js`
