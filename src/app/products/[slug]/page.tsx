// src/app/products/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { fetchProduct } from "@/lib/api";
import { ProductDetailContent } from "./ProductDetailContent";

interface ProductPageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  try {
    const { product } = await fetchProduct(params.slug);

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
  let product;

  try {
    const data = await fetchProduct(params.slug);
    product = data.product;
  } catch (error) {
    notFound();
  }

  return <ProductDetailContent product={product} />;
}
