/*
  Warnings:

  - A unique constraint covering the columns `[platform,conversionId]` on the table `ClickTracking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchantId,orderId]` on the table `Commission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[zidOrderId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_productId_fkey";

-- DropIndex
DROP INDEX "ClickTracking_conversionId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "merchantId" TEXT,
ADD COLUMN     "platform" "Platform",
ADD COLUMN     "zidOrderId" TEXT,
ADD COLUMN     "zidStatus" TEXT,
ALTER COLUMN "orderNumber" DROP NOT NULL,
ALTER COLUMN "customerName" DROP NOT NULL,
ALTER COLUMN "customerEmail" DROP NOT NULL,
ALTER COLUMN "customerPhone" DROP NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "sallaOrderId" DROP NOT NULL,
ALTER COLUMN "sallaStatus" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WebhookLog" ADD COLUMN     "platform" "Platform",
ADD COLUMN     "storeId" TEXT,
ALTER COLUMN "merchantId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ClickTracking_platform_conversionId_key" ON "ClickTracking"("platform", "conversionId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_merchantId_orderId_key" ON "Commission"("merchantId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_zidOrderId_key" ON "Order"("zidOrderId");

-- CreateIndex
CREATE INDEX "Order_merchantId_idx" ON "Order"("merchantId");

-- CreateIndex
CREATE INDEX "Order_platform_idx" ON "Order"("platform");

-- CreateIndex
CREATE INDEX "Order_zidOrderId_idx" ON "Order"("zidOrderId");

-- CreateIndex
CREATE INDEX "WebhookLog_platform_idx" ON "WebhookLog"("platform");

-- CreateIndex
CREATE INDEX "WebhookLog_storeId_idx" ON "WebhookLog"("storeId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
