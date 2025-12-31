// scripts/seed-test-data.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_DATA = {
  zid: {
    merchantEmail: "test-zid@raff.local",
    merchantName: "Test Zid Store",
    storeId: "1052373",
    storeUrl: "test-store.zid.sa",
    productId: "56367672",
    trackingId: "raff_test_zid_001",
  },
  salla: {
    merchantEmail: "test-salla@raff.local",
    merchantName: "Test Salla Store",
    storeId: "123456789",
    storeUrl: "test-store.salla.sa",
    productId: "987654321",
    trackingId: "raff_test_salla_001",
  },
};

function getExpiryDate(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

async function seedTestData() {
  console.log("Seeding test data...");

  const zidMerchantData = {
    name: TEST_DATA.zid.merchantName,
    nameAr: null,
    email: TEST_DATA.zid.merchantEmail,
    zidStoreId: TEST_DATA.zid.storeId,
    zidStoreUrl: TEST_DATA.zid.storeUrl,
    zidAccessToken: "test-zid-token",
    status: "APPROVED" as const,
    commissionRate: 5.0,
  };

  const sallaMerchantData = {
    name: TEST_DATA.salla.merchantName,
    nameAr: null,
    email: TEST_DATA.salla.merchantEmail,
    sallaStoreId: TEST_DATA.salla.storeId,
    sallaStoreUrl: TEST_DATA.salla.storeUrl,
    sallaAccessToken: "test-salla-token",
    status: "APPROVED" as const,
    commissionRate: 5.0,
  };

  // Create test Zid merchant
  const zidMerchant = await prisma.merchant.upsert({
    where: { email: TEST_DATA.zid.merchantEmail },
    update: zidMerchantData,
    create: zidMerchantData,
  });
  console.log("Created Zid merchant:", zidMerchant.id);

  // Create test Salla merchant
  const sallaMerchant = await prisma.merchant.upsert({
    where: { email: TEST_DATA.salla.merchantEmail },
    update: sallaMerchantData,
    create: sallaMerchantData,
  });
  console.log("Created Salla merchant:", sallaMerchant.id);

  // Create test category
  const category = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {
      name: "Electronics",
      nameAr: null,
      isActive: true,
    },
    create: {
      name: "Electronics",
      nameAr: null,
      slug: "electronics",
      isActive: true,
    },
  });
  console.log("Created category:", category.id);

  const zidProductData = {
    title: "Test Zid Product",
    titleAr: null,
    description: "This is a test product for Zid webhooks",
    descriptionAr: null,
    slug: "test-zid-product-1",
    price: 100.0,
    currency: "SAR",
    merchantId: zidMerchant.id,
    categoryId: category.id,
    zidProductId: TEST_DATA.zid.productId,
    externalProductUrl: `https://${TEST_DATA.zid.storeUrl}/products/${TEST_DATA.zid.productId}`,
    thumbnail: "https://via.placeholder.com/400",
    images: ["https://via.placeholder.com/400"],
    isActive: true,
    inStock: true,
    trendingScore: 0,
  };

  // Create test Zid product
  const zidProduct = await prisma.product.upsert({
    where: { slug: "test-zid-product-1" },
    update: zidProductData,
    create: zidProductData,
  });
  console.log("Created Zid product:", zidProduct.id);

  const sallaProductData = {
    title: "Test Salla Product",
    titleAr: null,
    description: "This is a test product for Salla webhooks",
    descriptionAr: null,
    slug: "test-salla-product-1",
    price: 150.0,
    currency: "SAR",
    merchantId: sallaMerchant.id,
    categoryId: category.id,
    sallaProductId: TEST_DATA.salla.productId,
    externalProductUrl: `https://${TEST_DATA.salla.storeUrl}/product/${TEST_DATA.salla.productId}`,
    thumbnail: "https://via.placeholder.com/400",
    images: ["https://via.placeholder.com/400"],
    isActive: true,
    inStock: true,
    trendingScore: 0,
  };

  // Create test Salla product
  const sallaProduct = await prisma.product.upsert({
    where: { slug: "test-salla-product-1" },
    update: sallaProductData,
    create: sallaProductData,
  });
  console.log("Created Salla product:", sallaProduct.id);

  // Create test click tracking for Zid
  const zidTracking = await prisma.clickTracking.upsert({
    where: { trackingId: TEST_DATA.zid.trackingId },
    update: {
      productId: zidProduct.id,
      merchantId: zidMerchant.id,
      platform: "ZID",
      destinationUrl: `https://${TEST_DATA.zid.storeUrl}/products/${TEST_DATA.zid.productId}?ref=raff_test`,
      clickedAt: new Date(),
      expiresAt: getExpiryDate(),
      converted: false,
      convertedAt: null,
      conversionId: null,
      conversionValue: null,
      commissionValue: null,
      commissionRate: zidMerchant.commissionRate,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test",
      referrerUrl: null,
      sessionId: null,
    },
    create: {
      trackingId: TEST_DATA.zid.trackingId,
      productId: zidProduct.id,
      merchantId: zidMerchant.id,
      platform: "ZID",
      destinationUrl: `https://${TEST_DATA.zid.storeUrl}/products/${TEST_DATA.zid.productId}?ref=raff_test`,
      clickedAt: new Date(),
      expiresAt: getExpiryDate(),
      converted: false,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test",
    },
  });
  console.log("Created Zid click tracking:", zidTracking.trackingId);

  // Create test click tracking for Salla
  const sallaTracking = await prisma.clickTracking.upsert({
    where: { trackingId: TEST_DATA.salla.trackingId },
    update: {
      productId: sallaProduct.id,
      merchantId: sallaMerchant.id,
      platform: "SALLA",
      destinationUrl: `https://${TEST_DATA.salla.storeUrl}/product/${TEST_DATA.salla.productId}?ref=raff_test`,
      clickedAt: new Date(),
      expiresAt: getExpiryDate(),
      converted: false,
      convertedAt: null,
      conversionId: null,
      conversionValue: null,
      commissionValue: null,
      commissionRate: sallaMerchant.commissionRate,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test",
      referrerUrl: null,
      sessionId: null,
    },
    create: {
      trackingId: TEST_DATA.salla.trackingId,
      productId: sallaProduct.id,
      merchantId: sallaMerchant.id,
      platform: "SALLA",
      destinationUrl: `https://${TEST_DATA.salla.storeUrl}/product/${TEST_DATA.salla.productId}?ref=raff_test`,
      clickedAt: new Date(),
      expiresAt: getExpiryDate(),
      converted: false,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test",
    },
  });
  console.log("Created Salla click tracking:", sallaTracking.trackingId);

  console.log("\nTest Data Summary:");
  console.log("==========================================");
  console.log("Zid Merchant ID:", zidMerchant.id);
  console.log("Zid Store ID:", zidMerchant.zidStoreId);
  console.log("Zid Product ID:", zidProduct.zidProductId);
  console.log("Zid Tracking ID:", zidTracking.trackingId);
  console.log("");
  console.log("Salla Merchant ID:", sallaMerchant.id);
  console.log("Salla Store ID:", sallaMerchant.sallaStoreId);
  console.log("Salla Product ID:", sallaProduct.sallaProductId);
  console.log("Salla Tracking ID:", sallaTracking.trackingId);
  console.log("==========================================\n");

  return {
    zid: {
      merchantId: zidMerchant.id,
      storeId: zidMerchant.zidStoreId!,
      productId: zidProduct.zidProductId!,
      trackingId: zidTracking.trackingId,
    },
    salla: {
      merchantId: sallaMerchant.id,
      storeId: sallaMerchant.sallaStoreId!,
      productId: sallaProduct.sallaProductId!,
      trackingId: sallaTracking.trackingId,
    },
  };
}

seedTestData()
  .then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
