// src/lib/sync/sallaStore.ts
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchSallaStoreInfo } from "@/lib/integrations/salla/store";

export async function syncSallaStoreInfo(
  merchantId: string
): Promise<{ merchantId: string; sallaStoreId: string }> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      name: true,
      email: true,
      sallaAccessToken: true,
      user: {
        select: { emailVerified: true },
      },
    },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  if (!merchant.sallaAccessToken) {
    throw new Error("Salla access token missing");
  }

  const storeInfo = await fetchSallaStoreInfo(merchant.sallaAccessToken);
  const sallaStoreId = String(storeInfo.id);

  const updateData: {
    sallaStoreId: string;
    sallaStoreUrl: string | null;
    logo: string | null;
    descriptionAr: string | null;
    isActive: boolean;
    name?: string;
    email?: string;
  } = {
    sallaStoreId,
    sallaStoreUrl: storeInfo.domain ?? null,
    logo: storeInfo.avatar ?? null,
    descriptionAr: storeInfo.description ?? null,
    isActive: storeInfo.status === "active",
  };

  if (!merchant.name) {
    updateData.name = storeInfo.name;
  }

  if (!merchant.user?.emailVerified && storeInfo.email) {
    updateData.email = storeInfo.email;
  }

  const diffConditions: Prisma.MerchantWhereInput[] = [
    { sallaStoreId: { not: sallaStoreId } },
    { sallaStoreUrl: { not: updateData.sallaStoreUrl } },
    { logo: { not: updateData.logo } },
    { descriptionAr: { not: updateData.descriptionAr } },
    { isActive: { not: updateData.isActive } },
  ];

  if (updateData.name !== undefined) {
    diffConditions.push({ name: { not: updateData.name } });
  }

  if (updateData.email !== undefined) {
    diffConditions.push({ email: { not: updateData.email } });
  }

  const updated = await prisma.merchant.updateMany({
    where: { id: merchantId, OR: diffConditions },
    data: updateData,
  });

  if (updated.count > 0) {
    console.log("Salla store info synced", { merchantId, sallaStoreId });
  }

  return { merchantId, sallaStoreId };
}
