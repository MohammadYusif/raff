-- Add performance indexes for Salla integration queries
-- Migration: 20260109_add_performance_indexes

-- Index for product lookup by sallaProductId (used in N+1 fix)
-- This speeds up the batch product lookup in order sync
CREATE INDEX IF NOT EXISTS "Product_sallaProductId_idx" ON "Product"("sallaProductId");

-- Composite index for product name searches (used in order sync fallback)
-- When product_id is not available, we search by name
CREATE INDEX IF NOT EXISTS "Product_merchantId_title_idx" ON "Product"("merchantId", "title");

-- Index for finding active products for sync
-- Used when syncing products or checking active catalog
CREATE INDEX IF NOT EXISTS "Product_merchantId_isActive_inStock_idx" ON "Product"("merchantId", "isActive", "inStock");

-- Index for commission status queries
-- Used in admin dashboard and merchant reports
CREATE INDEX IF NOT EXISTS "Commission_status_idx" ON "Commission"("status");

-- Index for commission date range queries
-- Used for reporting and analytics
CREATE INDEX IF NOT EXISTS "Commission_merchantId_createdAt_idx" ON "Commission"("merchantId", "createdAt");

-- Index for finding commissions by status and merchant
-- Used in payment processing and reporting
CREATE INDEX IF NOT EXISTS "Commission_merchantId_status_idx" ON "Commission"("merchantId", "status");

-- Index for order date range queries (used in sync)
-- Speeds up fromDate/toDate filtering in order sync
CREATE INDEX IF NOT EXISTS "Order_merchantId_createdAt_idx" ON "Order"("merchantId", "createdAt");

-- Index for finding orders with product matches
-- Used in analytics and reporting
CREATE INDEX IF NOT EXISTS "Order_merchantId_productId_idx" ON "Order"("merchantId", "productId");

-- Index for webhook event lookups by idempotency
-- Used to prevent duplicate webhook processing
CREATE INDEX IF NOT EXISTS "WebhookEvent_idempotencyKey_idx" ON "WebhookEvent"("idempotencyKey");

-- Index for finding recent webhook events by merchant
-- Used in monitoring and debugging
CREATE INDEX IF NOT EXISTS "WebhookEvent_merchantId_createdAt_idx" ON "WebhookEvent"("merchantId", "createdAt");

-- Index for webhook events by status (for monitoring failed webhooks)
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");
