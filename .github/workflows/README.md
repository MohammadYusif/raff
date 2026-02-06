# GitHub Actions Workflows

## Trending Score Calculation

**File**: `trending.yml`

**What it does**: Calculates and updates trending scores for all products.

**Status**: The scheduled cron trigger is **disabled by default**. Only manual trigger (`workflow_dispatch`) is enabled. Uncomment the schedule once the required secrets are configured.

### Setup

#### 1. Add Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Your app's NextAuth secret |

#### 2. Enable the Schedule

Once secrets are set, uncomment the schedule in `trending.yml`:

```yaml
on:
  schedule:
    - cron: "0 */3 * * *"   # Every 3 hours
  workflow_dispatch:
```

#### 3. Manual Trigger

Run the workflow manually anytime from the **Actions** tab → **Calculate Trending Scores** → **Run workflow**.

### Schedule Options

| Schedule | Cron Expression |
|----------|----------------|
| Every hour | `0 * * * *` |
| Every 3 hours (default) | `0 */3 * * *` |
| Every 6 hours | `0 */6 * * *` |
| Daily at midnight UTC | `0 0 * * *` |

### Troubleshooting

- **Missing secrets**: Add `DATABASE_URL` and `NEXTAUTH_SECRET` in repo Settings → Secrets
- **Database connection failed**: Verify `DATABASE_URL` is correct and allows external connections
- **Test locally**: `npm run calculate:trending`

### Related Documentation

- [Trending System](../../docs/TRENDING-SYSTEM.md)
- [Cron Setup Options](../../scripts/cron/README.md)
