# Automated Trending Score Calculation Setup

This directory contains configuration files to automatically run trending score calculations every 3 hours.

## Quick Start

Choose the method that fits your deployment environment:

### Option 1: Automated Setup (Linux with systemd)

```bash
# Make script executable
chmod +x scripts/cron/setup-cron.sh

# Run setup script (requires sudo)
sudo bash scripts/cron/setup-cron.sh
```

The script will:
- Create systemd service and timer
- Configure to run every 3 hours
- Set up logging to `/var/log/raff/`
- Enable auto-start on boot

### Option 2: Manual Crontab (Linux/Mac)

```bash
# Open crontab editor
crontab -e

# Add this line (replace /path/to/raff with actual path):
0 */3 * * * cd /path/to/raff && npm run calculate:trending >> /var/log/raff-trending.log 2>&1
```

This runs every 3 hours: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00

### Option 3: Vercel Cron (Vercel Deployment)

If you're deployed on Vercel, use the provided `vercel.json` configuration.

See [Vercel Cron Setup](#vercel-cron-setup-vercel-deployment) below.

---

## Detailed Instructions

### Systemd Setup (Ubuntu/Debian/CentOS/RHEL)

#### Prerequisites
- Linux system with systemd
- Root/sudo access
- Node.js and npm installed
- Raff project deployed

#### Installation Steps

1. **Copy service files**:
   ```bash
   sudo cp scripts/cron/raff-trending.service /etc/systemd/system/
   sudo cp scripts/cron/raff-trending.timer /etc/systemd/system/
   ```

2. **Edit service file** to match your setup:
   ```bash
   sudo nano /etc/systemd/system/raff-trending.service
   ```

   Update these lines:
   - `User=raff` → Your username
   - `Group=raff` → Your group
   - `WorkingDirectory=/path/to/raff` → Your project path
   - `Environment="DATABASE_URL=..."` → Your database URL (or remove to use .env)

3. **Create log directory**:
   ```bash
   sudo mkdir -p /var/log/raff
   sudo chown your-user:your-user /var/log/raff
   ```

4. **Enable and start timer**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable raff-trending.timer
   sudo systemctl start raff-trending.timer
   ```

5. **Verify it's running**:
   ```bash
   sudo systemctl status raff-trending.timer
   sudo systemctl list-timers raff-trending.timer
   ```

#### Managing Systemd Timer

**Check status**:
```bash
sudo systemctl status raff-trending.timer
```

**View next scheduled runs**:
```bash
sudo systemctl list-timers raff-trending.timer
```

**View logs** (real-time):
```bash
sudo journalctl -u raff-trending.service -f
```

**View recent logs**:
```bash
sudo journalctl -u raff-trending.service -n 100
```

**Manual execution**:
```bash
sudo systemctl start raff-trending.service
```

**Stop timer**:
```bash
sudo systemctl stop raff-trending.timer
```

**Disable auto-start**:
```bash
sudo systemctl disable raff-trending.timer
```

---

### Crontab Setup (Linux/macOS)

#### Installation

1. **Open crontab editor**:
   ```bash
   crontab -e
   ```

2. **Add cron job** (every 3 hours):
   ```bash
   # Raff trending calculation - every 3 hours
   0 */3 * * * cd /path/to/raff && npm run calculate:trending >> /var/log/raff-trending.log 2>&1
   ```

3. **Save and exit** (usually Ctrl+X, then Y, then Enter)

#### Alternative Schedules

**Every 6 hours** (for low traffic):
```bash
0 */6 * * * cd /path/to/raff && npm run calculate:trending >> /var/log/raff-trending.log 2>&1
```

**Every hour** (for high traffic):
```bash
0 * * * * cd /path/to/raff && npm run calculate:trending >> /var/log/raff-trending.log 2>&1
```

**Specific times** (00:00, 06:00, 12:00, 18:00):
```bash
0 0,6,12,18 * * * cd /path/to/raff && npm run calculate:trending >> /var/log/raff-trending.log 2>&1
```

#### Managing Crontab

**View current crontab**:
```bash
crontab -l
```

**Edit crontab**:
```bash
crontab -e
```

**Remove all cron jobs**:
```bash
crontab -r
```

**View logs**:
```bash
tail -f /var/log/raff-trending.log
```

---

### Vercel Cron Setup (Vercel Deployment)

If your app is deployed on Vercel, use Vercel Cron for automatic execution.

#### Setup

1. **Create/update `vercel.json`** in project root:
   ```json
   {
     "crons": [
       {
         "path": "/api/admin/calculate-trending",
         "schedule": "0 */3 * * *"
       }
     ]
   }
   ```

2. **Secure the endpoint** - Update `/api/admin/calculate-trending/route.ts`:

   Add API key authentication for Vercel Cron:
   ```typescript
   // Check for Vercel Cron secret
   const authHeader = request.headers.get('authorization');
   const cronSecret = process.env.CRON_SECRET;

   if (authHeader !== `Bearer ${cronSecret}`) {
     // Fall back to session auth
     const session = await getServerSession(authOptions);
     if (!session || session.user.role !== 'ADMIN') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
   }
   ```

3. **Add environment variable** in Vercel dashboard:
   - Key: `CRON_SECRET`
   - Value: Generate a random secret (e.g., `openssl rand -base64 32`)

4. **Deploy**:
   ```bash
   git add vercel.json
   git commit -m "Add Vercel Cron for trending calculation"
   git push
   ```

Vercel will automatically set up the cron job on your next deployment.

**View Cron Logs** in Vercel dashboard:
- Go to your project
- Click "Deployments"
- Click on a deployment
- View "Functions" logs

---

## Troubleshooting

### Systemd Issues

**Timer not running**:
```bash
# Check if enabled
sudo systemctl is-enabled raff-trending.timer

# Enable if not
sudo systemctl enable raff-trending.timer
sudo systemctl start raff-trending.timer
```

**Service fails**:
```bash
# View detailed error
sudo journalctl -u raff-trending.service -n 50

# Common issues:
# - Wrong user/group
# - Wrong working directory
# - Missing environment variables
# - Database connection failure
```

**Permissions error**:
```bash
# Ensure user has access
sudo chown -R your-user:your-user /path/to/raff
sudo chmod +x /path/to/raff/node_modules/.bin/tsx
```

### Crontab Issues

**Cron job not running**:
```bash
# Check if cron service is running
sudo systemctl status cron    # Debian/Ubuntu
sudo systemctl status crond   # CentOS/RHEL

# Check system cron logs
sudo grep CRON /var/log/syslog   # Debian/Ubuntu
sudo grep CRON /var/log/cron     # CentOS/RHEL
```

**Path issues**:
```bash
# Use absolute paths in crontab
which node    # Get node path
which npm     # Get npm path

# Update cron job with full paths:
0 */3 * * * cd /path/to/raff && /usr/bin/npm run calculate:trending
```

**Environment variables**:
```bash
# Cron has limited environment
# Source .env file in cron job:
0 */3 * * * cd /path/to/raff && . .env && npm run calculate:trending
```

### General Debugging

**Test script manually**:
```bash
cd /path/to/raff
npm run calculate:trending
```

**Check database connection**:
```bash
# Test with psql
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Product\";"
```

**Check logs**:
```bash
# Systemd
sudo journalctl -u raff-trending.service --since "1 hour ago"

# Crontab
tail -f /var/log/raff-trending.log

# Application logs
tail -f /path/to/raff/logs/*.log
```

---

## Monitoring

### Check if Calculations are Running

**Database query**:
```sql
-- Check recent updates
SELECT
  COUNT(*) as trending_products,
  MAX("updatedAt") as last_update
FROM "Product"
WHERE "trendingScore" > 0;
```

**Log monitoring**:
```bash
# Watch for calculation runs
tail -f /var/log/raff/trending.log | grep "Starting trending score"
```

### Set Up Alerts

**Using Systemd** (email on failure):

1. Install mail utility:
   ```bash
   sudo apt-get install mailutils
   ```

2. Add to service file:
   ```ini
   [Service]
   OnFailure=status-email@%n.service
   ```

**Using monitoring service**:
- Set up with services like Datadog, New Relic, or Sentry
- Monitor for calculation failures
- Alert if trending scores aren't updating

---

## Performance Tuning

### Adjust Frequency

Edit timer file for different schedules:

**Every 2 hours**:
```ini
OnUnitActiveSec=2h
```

**Every 6 hours**:
```ini
OnUnitActiveSec=6h
```

**Specific times only**:
```ini
OnCalendar=00:00
OnCalendar=06:00
OnCalendar=12:00
OnCalendar=18:00
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart raff-trending.timer
```

### Optimize Calculation

If calculations are slow:

1. **Add database indexes** (if not already present):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_trending_log_product_created
   ON "TrendingLog"("productId", "createdAt");
   ```

2. **Reduce lookback window** in `calculate-trending-scores.ts`:
   ```typescript
   lookbackDate.setDate(lookbackDate.getDate() - 7); // 7 days instead of 14
   ```

3. **Run during off-peak hours**:
   ```ini
   OnCalendar=03:00  # 3 AM
   OnCalendar=15:00  # 3 PM
   ```

---

## Security Notes

- ✅ Service runs as non-root user
- ✅ Limited file system access (ProtectSystem, ProtectHome)
- ✅ Admin API requires authentication
- ✅ Structured logging (no sensitive data)
- ⚠️ Secure your `CRON_SECRET` for Vercel
- ⚠️ Don't expose calculation endpoint publicly

---

## Support

For issues:
1. Check logs (systemd/crontab)
2. Test manual execution
3. Review troubleshooting section
4. Check [main documentation](../../docs/TRENDING-SYSTEM.md)
5. Report issues on GitHub
