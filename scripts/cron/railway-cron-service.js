// scripts/cron/railway-cron-service.js
// Railway Cron Service for Trending Score Calculation
// This runs as a separate Railway service to handle scheduled tasks

const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

console.log('🚀 Railway Cron Service Starting...');
console.log('📅 Schedule: Every 3 hours');
console.log('🌍 Timezone: Asia/Riyadh (Saudi Arabia)');
console.log('⏰ Run times: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00');
console.log('');

// Validate environment
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Run every 3 hours: 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
cron.schedule('0 */3 * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${timestamp}] 🔄 Starting trending score calculation...`);
  console.log(`${'='.repeat(60)}`);

  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execPromise('npm run calculate:trending');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`[${timestamp}] ✅ Calculation complete in ${duration}s`);

    if (stdout) {
      console.log('\n📊 Output:');
      console.log(stdout);
    }

    if (stderr && stderr.trim()) {
      console.warn('\n⚠️  Warnings:');
      console.warn(stderr);
    }
  } catch (error) {
    console.error(`[${timestamp}] ❌ Calculation failed:`);
    console.error(error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
  }

  console.log(`${'='.repeat(60)}\n`);
}, {
  timezone: "Asia/Riyadh" // Saudi Arabia timezone (UTC+3)
});

// Also run immediately on startup
(async () => {
  console.log('🚀 Running initial trending calculation on startup...');
  console.log('');

  try {
    const startTime = Date.now();
    const { stdout } = await execPromise('npm run calculate:trending');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Initial calculation complete in ${duration}s`);
    if (stdout) console.log(stdout);
    console.log('');
  } catch (error) {
    console.error('❌ Initial calculation failed:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    console.log('');
  }
})();

// Keep the process alive and handle shutdown gracefully
console.log('✅ Cron service is now running and waiting for scheduled tasks');
console.log('📝 Logs will appear here when calculations run');
console.log('');

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM signal');
  console.log('🛑 Shutting down cron service gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT signal');
  console.log('🛑 Shutting down cron service gracefully...');
  process.exit(0);
});

// Log a heartbeat every hour to show the service is alive
setInterval(() => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 💓 Cron service is alive and running`);
}, 60 * 60 * 1000); // Every hour
