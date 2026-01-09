// Script to mark the failed migration as rolled back
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:XKklJQdEYZEbETQXmNFfDZllkkBUhxSL@metro.proxy.rlwy.net:59089/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check current status
    const checkResult = await client.query(
      `SELECT migration_name, finished_at, rolled_back_at, started_at
       FROM "_prisma_migrations"
       WHERE migration_name = '20260109_add_performance_indexes'`
    );

    console.log('\n📊 Current migration status:');
    console.log(checkResult.rows[0]);

    // Mark as rolled back
    const updateResult = await client.query(
      `UPDATE "_prisma_migrations"
       SET rolled_back_at = NOW()
       WHERE migration_name = '20260109_add_performance_indexes'`
    );

    console.log(`\n✅ Updated ${updateResult.rowCount} migration(s)`);

    // Verify
    const verifyResult = await client.query(
      `SELECT migration_name, finished_at, rolled_back_at
       FROM "_prisma_migrations"
       WHERE migration_name = '20260109_add_performance_indexes'`
    );

    console.log('\n📊 New migration status:');
    console.log(verifyResult.rows[0]);

    console.log('\n✨ Migration marked as rolled back successfully!');
    console.log('You can now push your code and the new migration will apply.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixMigration();
