-- CreateEnum
CREATE TYPE "FraudSignalType" AS ENUM ('SELF_PURCHASE_SUSPECTED', 'HIGH_FREQUENCY_ORDERS', 'MANY_ORDERS_SAME_IP', 'MANY_ORDERS_SAME_USER_AGENT', 'UNUSUAL_ORDER_VALUE', 'REFERRER_REUSED_ACROSS_MERCHANTS');

-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
ALTER TYPE "CommissionStatus" ADD VALUE 'ON_HOLD';

-- DropIndex
DROP INDEX "Commission_clickTrackingId_key";

-- DropIndex
DROP INDEX "Order_clickTrackingId_key";

-- CreateTable
CREATE TABLE "FraudSignal" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "storeId" TEXT,
    "clickTrackingId" TEXT,
    "orderId" TEXT,
    "commissionId" TEXT,
    "signalType" "FraudSignalType" NOT NULL,
    "severity" "FraudSeverity" NOT NULL DEFAULT 'LOW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FraudSignal_merchantId_idx" ON "FraudSignal"("merchantId");

-- CreateIndex
CREATE INDEX "FraudSignal_platform_idx" ON "FraudSignal"("platform");

-- CreateIndex
CREATE INDEX "FraudSignal_storeId_idx" ON "FraudSignal"("storeId");

-- CreateIndex
CREATE INDEX "FraudSignal_clickTrackingId_idx" ON "FraudSignal"("clickTrackingId");

-- CreateIndex
CREATE INDEX "FraudSignal_orderId_idx" ON "FraudSignal"("orderId");

-- CreateIndex
CREATE INDEX "FraudSignal_commissionId_idx" ON "FraudSignal"("commissionId");

-- CreateIndex
CREATE INDEX "FraudSignal_signalType_idx" ON "FraudSignal"("signalType");

-- CreateIndex
CREATE INDEX "FraudSignal_severity_idx" ON "FraudSignal"("severity");

-- CreateIndex
CREATE INDEX "FraudSignal_createdAt_idx" ON "FraudSignal"("createdAt");

-- CreateIndex
CREATE INDEX "Commission_clickTrackingId_idx" ON "Commission"("clickTrackingId");

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_clickTrackingId_fkey" FOREIGN KEY ("clickTrackingId") REFERENCES "ClickTracking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
