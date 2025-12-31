// src/app/merchant/settings/page.tsx
import { getTranslations } from "next-intl/server";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { Settings } from "lucide-react";
import { requireMerchant } from "@/lib/auth/guards";

export default async function MerchantSettingsPage() {
  await requireMerchant("page");
  const t = await getTranslations("merchantSettings");

  return (
    <div className="min-h-screen bg-raff-neutral-50">
      <div className="border-b border-raff-neutral-200 bg-white">
        <Container className="py-6">
          <h1 className="mb-2 text-3xl font-bold text-raff-primary">
            {t("title")}
          </h1>
          <p className="text-raff-neutral-600">{t("subtitle")}</p>
        </Container>
      </div>

      <Container className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="mx-auto mb-4 h-16 w-16 text-raff-neutral-400" />
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
