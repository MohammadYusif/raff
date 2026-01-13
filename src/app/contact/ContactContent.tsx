// src/app/contact/ContactContent.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { Mail, Phone, MapPin, MessageSquare, Store, Shield } from "lucide-react";

export function ContactContent() {
  const t = useTranslations("contact");

  const contactOptions = [
    {
      icon: MessageSquare,
      key: "general" as const,
      email: "support@raff.sa",
    },
    {
      icon: Store,
      key: "merchant" as const,
      email: "merchants@raff.sa",
    },
    {
      icon: Shield,
      key: "legal" as const,
      email: "legal@raff.sa",
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

          {/* Contact Options */}
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            {contactOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card key={option.key} className="text-center">
                  <CardContent className="p-6">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-raff-primary/10">
                        <Icon className="h-8 w-8 text-raff-primary" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                      {t(`${option.key}.title`)}
                    </h3>
                    <p className="mb-4 text-sm text-raff-neutral-600">
                      {t(`${option.key}.description`)}
                    </p>
                    <a
                      href={`mailto:${option.email}`}
                      className="text-sm font-semibold text-raff-accent hover:underline"
                    >
                      {option.email}
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-8">
              <h2 className="mb-6 text-2xl font-semibold text-raff-primary">
                {t("info.title")}
              </h2>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary/10">
                    <Mail className="h-6 w-6 text-raff-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-raff-primary">
                      {t("info.email")}
                    </h3>
                    <a
                      href="mailto:support@raff.sa"
                      className="text-raff-neutral-700 hover:text-raff-accent"
                    >
                      support@raff.sa
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary/10">
                    <Phone className="h-6 w-6 text-raff-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-raff-primary">
                      {t("info.phone")}
                    </h3>
                    <p className="text-raff-neutral-700">{t("info.phoneValue")}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary/10">
                    <MapPin className="h-6 w-6 text-raff-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-raff-primary">
                      {t("info.address")}
                    </h3>
                    <p className="text-raff-neutral-700">{t("info.addressValue")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-raff-primary">
                {t("hours.title")}
              </h2>
              <div className="space-y-2 text-raff-neutral-700">
                <p>
                  <strong>{t("hours.weekdays")}:</strong> {t("hours.weekdaysValue")}
                </p>
                <p>
                  <strong>{t("hours.weekend")}:</strong> {t("hours.weekendValue")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
