-- CreateEnum for SubscriptionStatus (if not exists)
DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELED', 'EXPIRED', 'TRIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add subscription columns to Merchant table
ALTER TABLE "Merchant"
ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastSubscriptionCheckAt" TIMESTAMP(3);
