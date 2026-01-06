// src/lib/sync/sallaStore.ts
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

  await prisma.merchant.update({
    where: { id: merchantId },
    data: updateData,
  });

  console.log("Salla store info synced", { merchantId, sallaStoreId });

  return { merchantId, sallaStoreId };
}
