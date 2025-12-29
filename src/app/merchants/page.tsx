// src/app/merchants/page.tsx
import { fetchMerchants } from "@/lib/api/merchants";
import { MerchantsContent } from "./MerchantsContent";

export const metadata = {
  title: "Merchants - Raff",
  description: "Browse all merchants and their stores",
};

export default async function MerchantsPage() {
  // Fetch all merchants with product counts
  const { merchants } = await fetchMerchants();

  return <MerchantsContent merchants={merchants} />;
}
