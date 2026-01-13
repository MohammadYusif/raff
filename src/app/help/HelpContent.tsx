// src/app/help/HelpContent.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container, Card, CardContent } from "@/shared/components/ui";
import Link from "next/link";
import {
  ShoppingCart,
  Store,
  Package,
  HelpCircle,
  Mail,
} from "lucide-react";

export function HelpContent() {
  const t = useTranslations("help");

  const faqs = [
    {
      category: "general" as const,
      icon: HelpCircle,
      questions: [
        { q: "whatIsRaff", a: "whatIsRaffAnswer" },
        { q: "howItWorks", a: "howItWorksAnswer" },
        { q: "isFree", a: "isFreeAnswer" },
      ],
    },
    {
      category: "shopping" as const,
      icon: ShoppingCart,
      questions: [
        { q: "howToBuy", a: "howToBuyAnswer" },
        { q: "payment", a: "paymentAnswer" },
        { q: "returns", a: "returnsAnswer" },
      ],
    },
    {
      category: "tracking" as const,
      icon: Package,
      questions: [
        { q: "trackOrder", a: "trackOrderAnswer" },
        { q: "orderHistory", a: "orderHistoryAnswer" },
        { q: "orderStatus", a: "orderStatusAnswer" },
      ],
    },
    {
      category: "merchants" as const,
      icon: Store,
      questions: [
        { q: "joinMerchant", a: "joinMerchantAnswer" },
        { q: "commissions", a: "commissionsAnswer" },
        { q: "integration", a: "integrationAnswer" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-raff-neutral-50 py-12">
      <Container>
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-raff-primary">
              {t("title")}
            </h1>
            <p className="text-lg text-raff-neutral-600">{t("subtitle")}</p>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-8">
            {faqs.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.category}>
                  <CardContent className="p-6">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary/10">
                        <Icon className="h-6 w-6 text-raff-primary" />
                      </div>
                      <h2 className="text-2xl font-semibold text-raff-primary">
                        {t(`${section.category}.title`)}
                      </h2>
                    </div>

                    <div className="space-y-6">
                      {section.questions.map((item, idx) => (
                        <div
                          key={idx}
                          className="border-b border-raff-neutral-200 pb-4 last:border-0"
                        >
                          <h3 className="mb-2 text-lg font-semibold text-raff-primary">
                            {t(`${section.category}.${item.q}`)}
                          </h3>
                          <p className="text-raff-neutral-700">
                            {t(`${section.category}.${item.a}`)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Contact CTA */}
          <Card className="mt-12 border-2 border-raff-accent">
            <CardContent className="p-8 text-center">
              <Mail className="mx-auto mb-4 h-12 w-12 text-raff-accent" />
              <h2 className="mb-2 text-2xl font-bold text-raff-primary">
                {t("needMoreHelp")}
              </h2>
              <p className="mb-6 text-raff-neutral-600">{t("contactDesc")}</p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-raff-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-raff-accent/90"
              >
                {t("contactUs")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
