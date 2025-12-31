-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "TrendingEvent" AS ENUM ('VIEW', 'CLICK', 'ORDER', 'SAVE');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ZID', 'SALLA');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "zidStoreId" TEXT,
    "zidStoreUrl" TEXT,
    "zidAccessToken" TEXT,
    "zidRefreshToken" TEXT,
    "zidTokenExpiry" TIMESTAMP(3),
    "zidManagerToken" TEXT,
    "sallaStoreId" TEXT,
    "sallaStoreUrl" TEXT,
    "sallaAccessToken" TEXT,
    "sallaRefreshToken" TEXT,
    "sallaTokenExpiry" TIMESTAMP(3),
    "status" "MerchantStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSyncProducts" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "originalPrice" DOUBLE PRECISION,
    "images" TEXT[],
    "thumbnail" TEXT,
    "categoryId" TEXT,
    "tags" TEXT[],
    "sallaProductId" TEXT,
    "sallaVariantId" TEXT,
    "sallaUrl" TEXT,
    "zidProductId" TEXT,
    "externalProductUrl" TEXT,
    "merchantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "icon" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "sallaOrderId" TEXT NOT NULL,
    "sallaStatus" TEXT NOT NULL,
    "shippingAddress" JSONB,
    "shippingCity" TEXT,
    "shippingMethod" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT,
    "clickTrackingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "password" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "language" TEXT NOT NULL DEFAULT 'ar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickTracking" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "merchantId" TEXT NOT NULL,
    "referrerUrl" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "sessionId" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversionId" TEXT,
    "conversionValue" DECIMAL(10,2),
    "commissionValue" DECIMAL(10,2),
    "commissionRate" DECIMAL(5,2),
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "clickTrackingId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderTotal" DECIMAL(10,2) NOT NULL,
    "orderCurrency" TEXT NOT NULL DEFAULT 'SAR',
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingLog" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "eventType" "TrendingEvent" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SavedProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SavedProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_zidStoreId_key" ON "Merchant"("zidStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_sallaStoreId_key" ON "Merchant"("sallaStoreId");

-- CreateIndex
CREATE INDEX "Merchant_status_idx" ON "Merchant"("status");

-- CreateIndex
CREATE INDEX "Merchant_zidStoreId_idx" ON "Merchant"("zidStoreId");

-- CreateIndex
CREATE INDEX "Merchant_sallaStoreId_idx" ON "Merchant"("sallaStoreId");

-- CreateIndex
CREATE INDEX "Merchant_email_idx" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_merchantId_idx" ON "Product"("merchantId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_trendingScore_idx" ON "Product"("trendingScore");

-- CreateIndex
CREATE INDEX "Product_isActive_inStock_idx" ON "Product"("isActive", "inStock");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_zidProductId_idx" ON "Product"("zidProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sallaProductId_merchantId_key" ON "Product"("sallaProductId", "merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_zidProductId_merchantId_key" ON "Product"("zidProductId", "merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_sallaOrderId_key" ON "Order"("sallaOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_clickTrackingId_key" ON "Order"("clickTrackingId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_productId_idx" ON "Order"("productId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_sallaOrderId_idx" ON "Order"("sallaOrderId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_clickTrackingId_idx" ON "Order"("clickTrackingId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ClickTracking_trackingId_key" ON "ClickTracking"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickTracking_sessionId_key" ON "ClickTracking"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickTracking_conversionId_key" ON "ClickTracking"("conversionId");

-- CreateIndex
CREATE INDEX "ClickTracking_trackingId_idx" ON "ClickTracking"("trackingId");

-- CreateIndex
CREATE INDEX "ClickTracking_userId_idx" ON "ClickTracking"("userId");

-- CreateIndex
CREATE INDEX "ClickTracking_productId_idx" ON "ClickTracking"("productId");

-- CreateIndex
CREATE INDEX "ClickTracking_merchantId_idx" ON "ClickTracking"("merchantId");

-- CreateIndex
CREATE INDEX "ClickTracking_sessionId_idx" ON "ClickTracking"("sessionId");

-- CreateIndex
CREATE INDEX "ClickTracking_clickedAt_idx" ON "ClickTracking"("clickedAt");

-- CreateIndex
CREATE INDEX "ClickTracking_converted_idx" ON "ClickTracking"("converted");

-- CreateIndex
CREATE INDEX "ClickTracking_expiresAt_idx" ON "ClickTracking"("expiresAt");

-- CreateIndex
CREATE INDEX "ClickTracking_conversionId_idx" ON "ClickTracking"("conversionId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_clickTrackingId_key" ON "Commission"("clickTrackingId");

-- CreateIndex
CREATE INDEX "Commission_merchantId_idx" ON "Commission"("merchantId");

-- CreateIndex
CREATE INDEX "Commission_orderId_idx" ON "Commission"("orderId");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "Commission_createdAt_idx" ON "Commission"("createdAt");

-- CreateIndex
CREATE INDEX "TrendingLog_productId_createdAt_idx" ON "TrendingLog"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "TrendingLog_eventType_idx" ON "TrendingLog"("eventType");

-- CreateIndex
CREATE INDEX "_SavedProducts_B_index" ON "_SavedProducts"("B");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clickTrackingId_fkey" FOREIGN KEY ("clickTrackingId") REFERENCES "ClickTracking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickTracking" ADD CONSTRAINT "ClickTracking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickTracking" ADD CONSTRAINT "ClickTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickTracking" ADD CONSTRAINT "ClickTracking_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_clickTrackingId_fkey" FOREIGN KEY ("clickTrackingId") REFERENCES "ClickTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SavedProducts" ADD CONSTRAINT "_SavedProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SavedProducts" ADD CONSTRAINT "_SavedProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
