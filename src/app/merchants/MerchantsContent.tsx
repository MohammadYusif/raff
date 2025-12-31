// src/app/merchants/MerchantsContent.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  Button,
  Badge,
} from "@/shared/components/ui";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { Store, ExternalLink } from "lucide-react";
import { getMerchantStoreUrlFromObject } from "@/lib/platform/store";
import type { MerchantWithCount } from "@/types";

interface MerchantsContentProps {
  merchants: MerchantWithCount[];
}

export function MerchantsContent({ merchants }: MerchantsContentProps) {
  const t = useTranslations("merchants");
  const commonT = useTranslations("common");
  const locale = useLocale();

  return (
    <PageLayout>
      <div className="min-h-screen overflow-x-hidden bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/">
                <Button variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {commonT("actions.backToHome")}
                </Button>
              </Link>
            </div>
            <h1 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-lg text-raff-neutral-600">{t("subtitle")}</p>
          </Container>
        </div>

        <Container className="py-8">
          {/* Merchants Grid */}
          {merchants.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {merchants.map((merchant) => {
                const merchantName =
                  locale === "ar"
                    ? merchant.nameAr || merchant.name
                    : merchant.name;
                const merchantDescription =
                  locale === "ar"
                    ? merchant.descriptionAr || merchant.description
                    : merchant.description;
                const storeUrl = getMerchantStoreUrlFromObject(merchant);

                return (
                  <Card
                    key={merchant.id}
                    className="group h-full overflow-hidden transition-all hover:shadow-lg"
                  >
                    <CardContent className="flex h-full flex-col p-6">
                      {/* Logo & Title */}
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Store Icon */}
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-raff-primary/10 text-2xl transition-colors group-hover:bg-raff-primary/20">
                            <Store className="h-6 w-6 text-raff-primary" />
                          </div>
                          {/* Merchant Name */}
                          <div>
                            <h3 className="text-lg font-semibold text-raff-primary group-hover:text-raff-accent">
                              {merchantName}
                            </h3>
                          </div>
                        </div>

                        {/* Product Count Badge */}
                        <Badge variant="secondary" className="shrink-0">
                          {merchant._count.products}
                        </Badge>
                      </div>

                      {/* Description */}
                      {merchantDescription && (
                        <p className="mb-4 line-clamp-2 flex-1 text-sm text-raff-neutral-600">
                          {merchantDescription}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="space-y-2">
                        {/* View Products Link */}
                        <Link href={`/merchants/${merchant.id}`}>
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            size="sm"
                          >
                            {t("viewProducts")}
                            <ArrowForward
                              className={`h-4 w-4 transition-transform ${
                                locale === "ar"
                                  ? "group-hover:-translate-x-1"
                                  : "group-hover:translate-x-1"
                              }`}
                            />
                          </Button>
                        </Link>

                        {/* Visit Store Link */}
                        {storeUrl ? (
                          <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              className="w-full gap-2 text-raff-accent"
                              size="sm"
                            >
                              {t("visitStore")}
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        ) : (
                          <Button
                            variant="ghost"
                            className="w-full gap-2 text-raff-accent"
                            size="sm"
                            disabled
                          >
                            {t("visitStore")}
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Store className="mx-auto mb-4 h-16 w-16 text-raff-neutral-400" />
                <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                  {t("noMerchants")}
                </h3>
                <p className="text-raff-neutral-600">
                  {t("noMerchantsDescription")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* View All Products Link */}
          <div className="mt-12 text-center">
            <Link href="/products">
              <Button size="lg" variant="outline" className="gap-2">
                {t("viewAllProducts")}
                <ArrowForward className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
