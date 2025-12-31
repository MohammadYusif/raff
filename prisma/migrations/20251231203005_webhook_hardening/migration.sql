-- AlterTable
ALTER TABLE "ClickTracking" ADD COLUMN     "convertedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastConvertedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WebhookLog" ADD COLUMN     "orderKey" TEXT;

-- CreateIndex
CREATE INDEX "ClickTracking_convertedCount_idx" ON "ClickTracking"("convertedCount");

-- CreateIndex
CREATE INDEX "WebhookLog_orderKey_idx" ON "WebhookLog"("orderKey");
