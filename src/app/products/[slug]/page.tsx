// src/app/products/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ProductDetailContent } from "./ProductDetailContent";
import { addCartFields } from "@/lib/products/cart";
import { PageTransition } from "@/shared/components/PageTransition";
import { getLocalizedText } from "@/lib/utils";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const NOT_FOUND_TITLES = {
  ar: "المنتج غير موجود - رف",
  en: "Product Not Found - Raff",
} as const;

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  // Await params before using
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);

  try {
    const cookieStore = await cookies();
    const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    const locale = storedLocale === "en" ? "en" : "ar";
    const brandName = locale === "ar" ? "رف" : "Raff";

    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        title: true,
        titleAr: true,
        description: true,
        descriptionAr: true,
        thumbnail: true,
        images: true,
      },
    });

    if (!product) {
      return {
        title: NOT_FOUND_TITLES[locale],
      };
    }

    const title = getLocalizedText(locale, product.titleAr, product.title);
    const description = getLocalizedText(
      locale,
      product.descriptionAr,
      product.description
    );
    const image = product.thumbnail || product.images?.[0] || null;

    return {
      title: `${title} - ${brandName}`,
      description: description || "",
      openGraph: {
        title,
        description: description || "",
        images: image ? [image] : [],
      },
    };
  } catch {
    const cookieStore = await cookies();
    const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    const locale = storedLocale === "en" ? "en" : "ar";

    return {
      title: NOT_FOUND_TITLES[locale],
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  // Await params before using
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  let product;

  try {
    const data = await prisma.product.findUnique({
      where: { slug },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            logo: true,
            description: true,
            descriptionAr: true,
            sallaStoreUrl: true,
            zidStoreUrl: true,
            phone: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            slug: true,
          },
        },
      },
    });
    if (!data) {
      notFound();
    }
    product = addCartFields(data);
  } catch {
    notFound();
  }

  return (
    <PageTransition>
      <ProductDetailContent product={product} />
    </PageTransition>
  );
}

function normalizeSlug(raw: string): string {
  const cleaned = raw.trim().replaceAll("+", "%20");
  const once = safeDecode(cleaned);
  const twice = safeDecode(once);
  return twice.trim().normalize("NFC");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
