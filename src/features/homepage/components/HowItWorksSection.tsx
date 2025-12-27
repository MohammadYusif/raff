// src/features/homepage/components/HowItWorksSection.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/shared/components/ui";
import { Search, Heart, ShoppingBag } from "lucide-react";

const steps = [
  { icon: Search, step: "step1" },
  { icon: Heart, step: "step2" },
  { icon: ShoppingBag, step: "step3" },
];

export function HowItWorksSection() {
  const t = useTranslations("homepage.howItWorks");

  return (
    <section className="bg-raff-neutral-50 py-16 sm:py-24">
      <Container>
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, step }, index) => (
            <div key={step} className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-raff-accent/10">
                <Icon className="h-8 w-8 text-raff-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                {t(`${step}.title`)}
              </h3>
              <p className="text-raff-neutral-600">
                {t(`${step}.description`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
