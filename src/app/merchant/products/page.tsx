// src/app/merchant/products/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container, Card, CardContent, Button } from "@/shared/components/ui";
import { Package, RefreshCw } from "lucide-react";

export default function MerchantProductsPage() {
  const t = useTranslations("merchantProducts");

  return (
    <div className="min-h-screen bg-raff-neutral-50">
      <div className="border-b border-raff-neutral-200 bg-white">
        <Container className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-raff-primary">
                {t("title")}
              </h1>
              <p className="text-raff-neutral-600">{t("subtitle")}</p>
            </div>
            <Button className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("syncNow")}
            </Button>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-raff-neutral-400" />
            <h3 className="mb-2 text-xl font-semibold text-raff-primary">
              {t("comingSoon")}
            </h3>
            <p className="text-raff-neutral-600">{t("comingSoonDesc")}</p>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
