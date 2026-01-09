# Railway Cron Setup for Trending Calculation

Railway doesn't have native cron job support like Vercel, but we have several good options.

## Recommended: Railway Cron Service (Separate Service)

The best approach on Railway is to create a **separate cron service** that runs the calculation script.

### Option 1: Node Cron Service (Recommended)

Create a dedicated cron service that runs alongside your main app.

#### 1. Create Cron Service File

Create `scripts/cron/railway-cron-service.js`:

```javascript
// scripts/cron/railway-cron-service.js
const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

console.log('🚀 Railway Cron Service Starting...');
console.log('Schedule: Every 3 hours (*/3)');

// Run every 3 hours: 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
cron.schedule('0 */3 * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting trending score calculation...`);

  try {
    const { stdout, stderr } = await execPromise('npm run calculate:trending');
    console.log(`[${timestamp}] ✅ Calculation complete`);
    if (stdout) console.log('Output:', stdout);
    if (stderr) console.error('Errors:', stderr);
  } catch (error) {
    console.error(`[${timestamp}] ❌ Calculation failed:`, error);
  }
}, {
  timezone: "Asia/Riyadh" // Saudi Arabia timezone
});

// Also run immediately on startup
(async () => {
  console.log('Running initial calculation...');
  try {
    const { stdout } = await execPromise('npm run calculate:trending');
    console.log('✅ Initial calculation complete');
    if (stdout) console.log(stdout);
  } catch (error) {
    console.error('❌ Initial calculation failed:', error);
  }
})();

// Keep the process alive
console.log('✅ Cron service is running');
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});
```

#### 2. Add node-cron Dependency

```bash
npm install node-cron
```

#### 3. Add Script to package.json

```json
{
  "scripts": {
    "cron:service": "node scripts/cron/railway-cron-service.js"
  }
}
```

#### 4. Deploy as Separate Railway Service

**In Railway Dashboard:**

1. **Add New Service** → **Empty Service**
2. **Connect to your GitHub repo**
3. **Configure the service**:
   - Name: `raff-cron`
   - Build Command: `npm install`
   - Start Command: `npm run cron:service`
4. **Add Environment Variables** (same as main app):
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NODE_ENV=production`
5. **Deploy**

This creates a small, dedicated service that just runs the cron jobs.

**Benefits**:
- ✅ Isolated from main app
- ✅ Won't be affected by app restarts
- ✅ Lightweight (minimal resources)
- ✅ Easy to monitor in Railway dashboard

---

### Option 2: External Cron Service (EasyCron, cron-job.org)

Use a free external cron service to hit your API endpoint.

#### Setup with EasyCron (Free tier available)

1. **Sign up** at https://www.easycron.com

2. **Create Cron Job**:
   - URL: `https://your-app.up.railway.app/api/admin/calculate-trending`
   - Schedule: Every 3 hours (`0 */3 * * *`)
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

3. **Secure your endpoint** - Update `/api/admin/calculate-trending/route.ts`:

```typescript
// Add cron secret authentication
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

// Check cron secret first
if (authHeader === `Bearer ${cronSecret}`) {
  // Authenticated via cron secret
} else {
  // Fall back to admin session
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

4. **Add environment variable** in Railway:
   - Key: `CRON_SECRET`
   - Value: Generate random string: `openssl rand -base64 32`

**Alternatives to EasyCron**:
- **cron-job.org** (Free, unlimited jobs): https://cron-job.org
- **Cronhub** (Free tier): https://cronhub.io
- **Cronitor** (Free tier): https://cronitor.io

---

### Option 3: GitHub Actions (Free)

Use GitHub Actions to run the calculation.

#### Create `.github/workflows/trending-calculation.yml`:

```yaml
name: Calculate Trending Scores

on:
  schedule:
    # Every 3 hours
    - cron: '0 */3 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  calculate:
    runs-on: ubuntu-latest

    steps:
      - name: Trigger calculation
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app.up.railway.app/api/admin/calculate-trending
```

#### Setup:

1. Add secret in GitHub repo:
   - Go to Settings → Secrets → Actions
   - Add `CRON_SECRET` (same as Railway env var)

2. Commit and push the workflow file

3. GitHub will run it every 3 hours automatically

**Benefits**:
- ✅ Free
- ✅ Reliable
- ✅ Easy to monitor (GitHub Actions UI)
- ✅ No additional infrastructure

---

### Option 4: Railway Dockerfile with Cron

Run cron inside your Railway container using supercronic.

#### Create `Dockerfile.cron`:

```dockerfile
FROM node:18-alpine

# Install supercronic
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.2.1/supercronic-linux-amd64 \
    SUPERCRONIC=supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=d7f4c0886eb85249ad05ed592902fa6865bb9d70

RUN wget "$SUPERCRONIC_URL" \
 && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
 && chmod +x "$SUPERCRONIC" \
 && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
 && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create crontab
RUN echo "0 */3 * * * cd /app && npm run calculate:trending" > /app/crontab

CMD ["supercronic", "/app/crontab"]
```

Deploy as separate Railway service with this Dockerfile.

---

## Comparison of Options

| Method | Cost | Reliability | Ease of Setup | Maintenance |
|--------|------|-------------|---------------|-------------|
| **Railway Cron Service** | ~$5/mo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Low |
| **External Cron Service** | Free | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Very Low |
| **GitHub Actions** | Free | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Very Low |
| **Dockerfile + Supercronic** | ~$5/mo | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium |

## Recommendation for Railway

**Best Choice: Railway Cron Service (Option 1)**

Why:
- ✅ Most reliable (same infrastructure as your app)
- ✅ Direct database access (no HTTP overhead)
- ✅ Easy monitoring in Railway dashboard
- ✅ Automatic environment variable sync
- ✅ No external dependencies

**Cheap Alternative: GitHub Actions (Option 3)**

Why:
- ✅ Completely free
- ✅ Very reliable (GitHub infrastructure)
- ✅ Easy to set up
- ✅ Good monitoring UI
- ⚠️ Requires HTTP call (slight overhead)

---

## Quick Start: Railway Cron Service

1. **Install dependency**:
   ```bash
   npm install node-cron
   ```

2. **Create the files** (already provided above):
   - `scripts/cron/railway-cron-service.js`
   - Add `cron:service` script to package.json

3. **In Railway Dashboard**:
   - Add new service from your repo
   - Name it `raff-cron`
   - Start command: `npm run cron:service`
   - Copy environment variables from main app

4. **Deploy and monitor** in Railway dashboard

That's it! Your trending scores will calculate every 3 hours automatically.

---

## Monitoring on Railway

**View logs**:
- Go to Railway dashboard
- Select `raff-cron` service
- Click "View Logs"
- You'll see timestamped calculation runs

**Check if it's working**:
```bash
# Via Railway CLI
railway logs --service raff-cron

# Or check your database
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Product\" WHERE \"trendingScore\" > 0;"
```

---

## Troubleshooting

**Cron service crashes**:
- Check Railway logs for errors
- Verify DATABASE_URL is correct
- Ensure all environment variables are set

**Calculations not running**:
- Check timezone setting in cron schedule
- Verify cron expression is correct
- Check Railway service status

**Database connection fails**:
- Ensure DATABASE_URL is set in cron service
- Check network connectivity between services
- Verify database service is running

---

## Need Help?

1. Check Railway logs: Railway Dashboard → raff-cron → Logs
2. Test manually: `npm run calculate:trending`
3. Check database: Verify trending scores are updating
4. Review [main documentation](../../docs/TRENDING-SYSTEM.md)
