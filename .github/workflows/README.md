# GitHub Actions Workflows

This directory contains automated workflows that run on GitHub Actions.

## Trending Score Calculation

**File**: `trending-calculation.yml`

**What it does**: Automatically calculates and updates trending scores for all products every 3 hours.

**Schedule**: Every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)

### Setup Instructions

#### 1. Add Secrets to GitHub

The workflow needs access to your database. Add these secrets:

1. **Go to your GitHub repository**
2. **Click**: Settings → Secrets and variables → Actions
3. **Click**: "New repository secret"
4. **Add these secrets**:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `DATABASE_URL` | `postgresql://...` | Railway Dashboard → Your Database → Connect → Database URL |
| `NEXTAUTH_SECRET` | `your-secret-key` | Railway Dashboard → Your App → Variables → NEXTAUTH_SECRET |

#### 2. Enable GitHub Actions

1. Go to your repository
2. Click the **"Actions"** tab
3. If prompted, click **"I understand my workflows, go ahead and enable them"**

#### 3. Verify It's Working

**First Run** (manual test):
1. Go to **Actions** tab
2. Click **"Calculate Trending Scores"** workflow
3. Click **"Run workflow"** → "Run workflow"
4. Wait 2-3 minutes
5. Check the run - should show ✅ green checkmark

**Automatic Runs**:
- The workflow runs automatically every 3 hours
- Check **Actions** tab to see history
- Each run should complete in 1-2 minutes

#### 4. Monitor

**View logs**:
1. Go to **Actions** tab
2. Click on a workflow run
3. Click on **"Calculate and Update Trending Scores"**
4. Expand steps to see detailed logs

**Verify database**:
```sql
SELECT COUNT(*) FROM "Product" WHERE "trendingScore" > 0;
```

---

## Features

✅ **100% Free** - GitHub Actions is free for public repos (2000 minutes/month for private)
✅ **Reliable** - Runs on GitHub infrastructure
✅ **No Railway costs** - No additional service needed
✅ **Easy monitoring** - View all runs in Actions tab
✅ **Manual trigger** - Can run manually anytime
✅ **Failure notifications** - See failures in Actions tab

---

## Troubleshooting

### Workflow not running

**Check**:
1. Is the workflow file committed and pushed?
2. Are GitHub Actions enabled for your repo?
3. Check Actions tab → look for errors

### Workflow failing

**Common issues**:

1. **Missing secrets**:
   - Error: `Environment variable not found: DATABASE_URL`
   - Fix: Add `DATABASE_URL` and `NEXTAUTH_SECRET` secrets (see Setup above)

2. **Database connection failed**:
   - Error: `Can't reach database server`
   - Fix: Check if `DATABASE_URL` is correct
   - Ensure Railway database allows external connections

3. **Prisma generation failed**:
   - Error: `Prisma schema not found`
   - Fix: This shouldn't happen - file an issue if it does

### Manual run

To run the calculation manually:
1. Go to **Actions** tab
2. Click **"Calculate Trending Scores"**
3. Click **"Run workflow"** button
4. Select branch (`production`)
5. Click green **"Run workflow"** button

---

## Schedule Customization

To change the frequency, edit `trending-calculation.yml`:

**Every hour**:
```yaml
cron: '0 * * * *'
```

**Every 6 hours**:
```yaml
cron: '0 */6 * * *'
```

**Specific times** (e.g., 6am, 12pm, 6pm, 12am UTC):
```yaml
cron: '0 0,6,12,18 * * *'
```

**Daily at midnight UTC**:
```yaml
cron: '0 0 * * *'
```

After editing, commit and push. The new schedule will apply automatically.

---

## Cost

**Free** for:
- Public repositories (unlimited)
- Private repositories (2000 minutes/month)

Each trending calculation uses ~2 minutes, so:
- Every 3 hours = 8 runs/day × 2 min = 16 min/day
- Monthly: 16 × 30 = 480 minutes/month

Well within free tier! ✅

---

## Comparison with Other Methods

| Method | Cost | Reliability | Ease of Setup |
|--------|------|-------------|---------------|
| **GitHub Actions** ✅ | FREE | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Railway Cron Service | ~$5/mo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| External Cron Service | FREE | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Systemd (VPS) | Varies | ⭐⭐⭐⭐ | ⭐⭐ |

---

## Additional Documentation

- **Trending System Overview**: [docs/TRENDING-SYSTEM.md](../../docs/TRENDING-SYSTEM.md)
- **Cron Setup Options**: [scripts/cron/README.md](../../scripts/cron/README.md)
- **Calculate Script**: [scripts/calculate-trending-scores.ts](../../scripts/calculate-trending-scores.ts)

---

## Support

**Need help?**

1. Check workflow logs in Actions tab
2. Review [TRENDING-SYSTEM.md](../../docs/TRENDING-SYSTEM.md)
3. Test locally: `npm run calculate:trending`
4. Check database connection
5. Report issues on GitHub

**Working correctly when**:
- ✅ Workflow runs every 3 hours
- ✅ Shows green checkmark ✓
- ✅ Products have `trendingScore > 0`
- ✅ Trending section shows products
