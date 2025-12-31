// scripts/seed-test-data-prod.ts
import { PrismaClient, MerchantStatus, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type SeedConfig = {
  merchantEmail: string;
  merchantName: string;
  storeId: string;
  storeUrl: string;
  productId: string;
  trackingId: string;
  expiredTrackingId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  managerToken?: string | null;
};

function envOr(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value : fallback;
}

function envOptional(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value;
  }
  return null;
}

function toExpiry(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getFutureExpiry(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function getPastExpiry(): Date {
  return new Date(Date.now() - 60 * 60 * 1000);
}

function logConfig(name: string, config: SeedConfig) {
  console.log(`${name} Store ID: ${config.storeId}`);
  console.log(`${name} Product ID: ${config.productId}`);
  console.log(`${name} Tracking ID: ${config.trackingId}`);
  console.log(`${name} Expired Tracking ID: ${config.expiredTrackingId}`);
  console.log(`${name} Access Token: ${config.accessToken ? "set" : "missing"}`);
}

async function upsertMerchant(
  platform: "zid" | "salla",
  data: SeedConfig
) {
  const commissionRate = new Prisma.Decimal(5);
  const tokenExpiryDays = Number(
    process.env.SEED_TOKEN_EXPIRY_DAYS ?? "30"
  );
  const tokenExpiry = data.accessToken ? toExpiry(tokenExpiryDays) : null;

  if (platform === "zid") {
    return prisma.merchant.upsert({
      where: { zidStoreId: data.storeId },
      create: {
        name: data.merchantName,
        nameAr: null,
        email: data.merchantEmail,
        zidStoreId: data.storeId,
        zidStoreUrl: data.storeUrl,
        zidAccessToken: data.accessToken ?? null,
        zidRefreshToken: data.refreshToken ?? null,
        zidTokenExpiry: tokenExpiry,
        zidManagerToken: data.managerToken ?? null,
        status: MerchantStatus.APPROVED,
        commissionRate,
      },
      update: {
        name: data.merchantName,
        zidStoreUrl: data.storeUrl,
        commissionRate,
        ...(data.accessToken ? { zidAccessToken: data.accessToken } : {}),
        ...(data.refreshToken ? { zidRefreshToken: data.refreshToken } : {}),
        ...(data.accessToken ? { zidTokenExpiry: tokenExpiry } : {}),
        ...(data.managerToken ? { zidManagerToken: data.managerToken } : {}),
      },
    });
  }

  return prisma.merchant.upsert({
    where: { sallaStoreId: data.storeId },
    create: {
      name: data.merchantName,
      nameAr: null,
      email: data.merchantEmail,
      sallaStoreId: data.storeId,
      sallaStoreUrl: data.storeUrl,
      sallaAccessToken: data.accessToken ?? null,
      sallaRefreshToken: data.refreshToken ?? null,
      sallaTokenExpiry: tokenExpiry,
      status: MerchantStatus.APPROVED,
      commissionRate,
    },
    update: {
      name: data.merchantName,
      sallaStoreUrl: data.storeUrl,
      commissionRate,
      ...(data.accessToken ? { sallaAccessToken: data.accessToken } : {}),
      ...(data.refreshToken ? { sallaRefreshToken: data.refreshToken } : {}),
      ...(data.accessToken ? { sallaTokenExpiry: tokenExpiry } : {}),
    },
  });
}

async function ensureCategory() {
  return prisma.category.upsert({
    where: { slug: "test-platform-category" },
    update: {
      name: "Test Platform Category",
      nameAr: null,
      isActive: true,
    },
    create: {
      name: "Test Platform Category",
      nameAr: null,
      slug: "test-platform-category",
      isActive: true,
    },
  });
}

async function upsertProduct(params: {
  platform: "zid" | "salla";
  merchantId: string;
  categoryId: string;
  storeUrl: string;
  productId: string;
}) {
  const slug = `test-${params.platform}-product-${params.productId}`;
  const baseData = {
    title: `Test ${params.platform.toUpperCase()} Product`,
    titleAr: null,
    description: `Test product for ${params.platform} webhooks`,
    descriptionAr: null,
    slug,
    price: params.platform === "zid" ? 100.0 : 150.0,
    currency: "SAR",
    merchantId: params.merchantId,
    categoryId: params.categoryId,
    externalProductUrl: `https://${params.storeUrl}/products/${params.productId}`,
    thumbnail: "https://via.placeholder.com/400",
    images: ["https://via.placeholder.com/400"],
    isActive: true,
    inStock: true,
    trendingScore: 0,
  };

  const existing = await prisma.product.findFirst({
    where:
      params.platform === "zid"
        ? { merchantId: params.merchantId, zidProductId: params.productId }
        : { merchantId: params.merchantId, sallaProductId: params.productId },
    select: { id: true },
  });

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...baseData,
        ...(params.platform === "zid"
          ? { zidProductId: params.productId }
          : { sallaProductId: params.productId }),
      },
    });
    return existing.id;
  }

  const created = await prisma.product.create({
    data: {
      ...baseData,
      ...(params.platform === "zid"
        ? { zidProductId: params.productId }
        : { sallaProductId: params.productId }),
    },
  });
  return created.id;
}

async function upsertClickTracking(params: {
  trackingId: string;
  expired: boolean;
  productId: string;
  merchantId: string;
  platform: "ZID" | "SALLA";
  storeUrl: string;
  productIdRef: string;
}) {
  const destinationUrl = `https://${params.storeUrl}/products/${params.productIdRef}?ref=raff_test`;
  const expiresAt = params.expired ? getPastExpiry() : getFutureExpiry();

  await prisma.clickTracking.upsert({
    where: { trackingId: params.trackingId },
    update: {
      productId: params.productId,
      merchantId: params.merchantId,
      platform: params.platform,
      destinationUrl,
      clickedAt: new Date(),
      expiresAt,
      converted: false,
      convertedCount: 0,
      conversionValue: null,
      commissionValue: null,
      commissionRate: new Prisma.Decimal(5),
      convertedAt: null,
      lastConvertedAt: null,
      ipAddress: "127.0.0.1",
      userAgent: "Seed Script",
      referrerUrl: null,
      sessionId: null,
    },
    create: {
      trackingId: params.trackingId,
      productId: params.productId,
      merchantId: params.merchantId,
      platform: params.platform,
      destinationUrl,
      clickedAt: new Date(),
      expiresAt,
      converted: false,
      convertedCount: 0,
      ipAddress: "127.0.0.1",
      userAgent: "Seed Script",
    },
  });
}

async function seed() {
  const zidConfig: SeedConfig = {
    merchantEmail: envOr("SEED_ZID_MERCHANT_EMAIL", "test-zid@raff.local"),
    merchantName: envOr("SEED_ZID_MERCHANT_NAME", "Test Zid Store"),
    storeId: envOr("SEED_ZID_STORE_ID", "1052373"),
    storeUrl: envOr("SEED_ZID_STORE_URL", "test-store.zid.sa"),
    productId: envOr("SEED_ZID_PRODUCT_ID", "56367672"),
    trackingId: envOr("SEED_ZID_TRACKING_ID", "raff_test_zid_001"),
    expiredTrackingId: envOr(
      "SEED_ZID_TRACKING_ID_EXPIRED",
      "raff_test_zid_expired"
    ),
    accessToken: envOptional("SEED_ZID_ACCESS_TOKEN", "ZID_ACCESS_TOKEN"),
    refreshToken: envOptional("SEED_ZID_REFRESH_TOKEN", "ZID_REFRESH_TOKEN"),
    managerToken: envOptional("SEED_ZID_MANAGER_TOKEN", "ZID_MANAGER_TOKEN"),
  };

  const sallaConfig: SeedConfig = {
    merchantEmail: envOr("SEED_SALLA_MERCHANT_EMAIL", "test-salla@raff.local"),
    merchantName: envOr("SEED_SALLA_MERCHANT_NAME", "Test Salla Store"),
    storeId: envOr("SEED_SALLA_STORE_ID", "123456789"),
    storeUrl: envOr("SEED_SALLA_STORE_URL", "test-store.salla.sa"),
    productId: envOr("SEED_SALLA_PRODUCT_ID", "987654321"),
    trackingId: envOr("SEED_SALLA_TRACKING_ID", "raff_test_salla_001"),
    expiredTrackingId: envOr(
      "SEED_SALLA_TRACKING_ID_EXPIRED",
      "raff_test_salla_expired"
    ),
    accessToken: envOptional("SEED_SALLA_ACCESS_TOKEN", "SALLA_ACCESS_TOKEN"),
    refreshToken: envOptional("SEED_SALLA_REFRESH_TOKEN", "SALLA_REFRESH_TOKEN"),
  };

  console.log("Seeding production test data...");
  logConfig("Zid", zidConfig);
  logConfig("Salla", sallaConfig);

  const category = await ensureCategory();

  const zidMerchant = await upsertMerchant("zid", zidConfig);
  const sallaMerchant = await upsertMerchant("salla", sallaConfig);

  const zidProductId = await upsertProduct({
    platform: "zid",
    merchantId: zidMerchant.id,
    categoryId: category.id,
    storeUrl: zidConfig.storeUrl,
    productId: zidConfig.productId,
  });

  const sallaProductId = await upsertProduct({
    platform: "salla",
    merchantId: sallaMerchant.id,
    categoryId: category.id,
    storeUrl: sallaConfig.storeUrl,
    productId: sallaConfig.productId,
  });

  await upsertClickTracking({
    trackingId: zidConfig.trackingId,
    expired: false,
    productId: zidProductId,
    merchantId: zidMerchant.id,
    platform: "ZID",
    storeUrl: zidConfig.storeUrl,
    productIdRef: zidConfig.productId,
  });

  await upsertClickTracking({
    trackingId: zidConfig.expiredTrackingId,
    expired: true,
    productId: zidProductId,
    merchantId: zidMerchant.id,
    platform: "ZID",
    storeUrl: zidConfig.storeUrl,
    productIdRef: zidConfig.productId,
  });

  await upsertClickTracking({
    trackingId: sallaConfig.trackingId,
    expired: false,
    productId: sallaProductId,
    merchantId: sallaMerchant.id,
    platform: "SALLA",
    storeUrl: sallaConfig.storeUrl,
    productIdRef: sallaConfig.productId,
  });

  await upsertClickTracking({
    trackingId: sallaConfig.expiredTrackingId,
    expired: true,
    productId: sallaProductId,
    merchantId: sallaMerchant.id,
    platform: "SALLA",
    storeUrl: sallaConfig.storeUrl,
    productIdRef: sallaConfig.productId,
  });

  console.log("Seed complete.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
