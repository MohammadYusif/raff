-- Temporary script to set trending scores for testing
-- Run this in Railway's PostgreSQL Query tab or via psql

-- Set trending scores for products with views
UPDATE "Product"
SET "trendingScore" = "viewCount" * 1.5 + "clickCount" * 5
WHERE "isActive" = true
  AND ("viewCount" > 0 OR "clickCount" > 0)
  AND "trendingScore" = 0;

-- Check results
SELECT
  id,
  title,
  "trendingScore",
  "viewCount",
  "clickCount"
FROM "Product"
WHERE "trendingScore" > 0
ORDER BY "trendingScore" DESC
LIMIT 10;
