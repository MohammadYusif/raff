// src/features/homepage/components/HeroSection.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/shared/components/ui";

export function HeroSection() {
  const t = useTranslations("homepage.hero");
  const statsT = useTranslations("homepage.stats");

  return (
    <section className="relative overflow-hidden from-raff-neutral-50 via-white to-raff-neutral-50 py-20 sm:py-32">
      {/* Minimal background decoration */}
      <div className="absolute inset-0 -z-10 opacity-5">
        <div className="absolute end-1/4 top-0 h-96 w-96 rounded-full bg-raff-primary blur-3xl" />
        <div className="absolute start-1/4 top-1/3 h-96 w-96 rounded-full bg-raff-primary-light blur-3xl" />
      </div>

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-raff-primary sm:text-5xl md:text-6xl">
            {t("title")}
          </h1>

          {/* Subtitle */}
          <p className="mb-8 text-lg text-raff-neutral-600 sm:text-xl">
            {t("subtitle")}
          </p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8">
            {[
              { value: "10,000+", label: "products" },
              { value: "500+", label: "merchants" },
              { value: "50,000+", label: "customers" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-raff-primary sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-raff-neutral-600">
                  {statsT(stat.label)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
