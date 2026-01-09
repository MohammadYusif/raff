-- Mark the failed migration as rolled back
-- Run this SQL directly on your production database

UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '20260109_add_performance_indexes';
