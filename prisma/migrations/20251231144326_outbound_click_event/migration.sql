-- CreateTable
CREATE TABLE "OutboundClickEvent" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT,
    "productId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "disqualifyReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboundClickEvent_trackingId_idx" ON "OutboundClickEvent"("trackingId");

-- CreateIndex
CREATE INDEX "OutboundClickEvent_productId_idx" ON "OutboundClickEvent"("productId");

-- CreateIndex
CREATE INDEX "OutboundClickEvent_merchantId_idx" ON "OutboundClickEvent"("merchantId");

-- CreateIndex
CREATE INDEX "OutboundClickEvent_platform_idx" ON "OutboundClickEvent"("platform");

-- CreateIndex
CREATE INDEX "OutboundClickEvent_qualified_idx" ON "OutboundClickEvent"("qualified");

-- CreateIndex
CREATE INDEX "OutboundClickEvent_createdAt_idx" ON "OutboundClickEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OutboundClickEvent" ADD CONSTRAINT "OutboundClickEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundClickEvent" ADD CONSTRAINT "OutboundClickEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
