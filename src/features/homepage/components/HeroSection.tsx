// src/features/homepage/components/HeroSection.tsx
"use client";

import { useTranslations } from "next-intl";
import { Button, Container, Input } from "@/shared/components/ui";
import { Search } from "lucide-react";
import { ArrowForward } from "@/core/i18n";

export function HeroSection() {
  const t = useTranslations("homepage.hero");

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-raff-neutral-50 to-white py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute end-1/4 top-0 h-96 w-96 rounded-full bg-raff-accent/20 blur-3xl" />
        <div className="absolute start-1/4 top-1/3 h-96 w-96 rounded-full bg-raff-primary/20 blur-3xl" />
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

          {/* Search Bar */}
          <div className="mx-auto mb-8 flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-raff-neutral-400" />
              <Input
                type="search"
                placeholder={t("searchPlaceholder")}
                className="h-12 ps-10 text-base"
              />
            </div>
            <Button size="lg" className="gap-2">
              {t("cta")}
              <ArrowForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { value: "10,000+", label: "products" },
              { value: "500+", label: "merchants" },
              { value: "50,000+", label: "customers" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-raff-primary sm:text-3xl">
                  {stat.value}
                </div>
                <div className="text-sm text-raff-neutral-600">
                  {useTranslations("homepage.stats")(stat.label)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
