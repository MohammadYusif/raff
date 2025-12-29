// src/app/products/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { fetchProduct } from "@/lib/api";
import { ProductDetailContent } from "./ProductDetailContent";

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
  const { slug } = await params;

  try {
    const { product } = await fetchProduct(slug);

    return {
      title: `${product.titleAr || product.title} - Raff`,
      description: product.descriptionAr || product.description || "",
      openGraph: {
        title: product.titleAr || product.title,
        description: product.descriptionAr || product.description || "",
        images: product.thumbnail ? [product.thumbnail] : [],
      },
    };
  } catch (error) {
    return {
      title: "Product Not Found - Raff",
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  // Await params before using
  const { slug } = await params;

  let product;

  try {
    const data = await fetchProduct(slug);
    product = data.product;
  } catch (error) {
    notFound();
  }

  return <ProductDetailContent product={product} />;
}
