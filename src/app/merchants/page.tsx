// src/app/merchants/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { MerchantsContent } from "./MerchantsContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "التجار - رف",
  en: "Merchants - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "تصفح جميع التجار ومتاجرهم",
  en: "Browse all merchants and their stores",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  return {
    title: TITLES[locale],
    description: DESCRIPTIONS[locale],
  };
}

export default async function MerchantsPage() {
  // Fetch all merchants with product counts
  const merchants = await prisma.merchant.findMany({
    where: {
      isActive: true,
      status: "APPROVED",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      nameAr: true,
      description: true,
      descriptionAr: true,
      logo: true,
      sallaStoreUrl: true,
      zidStoreUrl: true,
      _count: {
        select: {
          products: {
            where: {
              isActive: true,
              inStock: true,
            },
          },
        },
      },
    },
  });

  return (
    <PageTransition>
      <MerchantsContent merchants={merchants} />
    </PageTransition>
  );
}