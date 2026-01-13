// src/app/terms/page.tsx
import { Metadata } from "next";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME } from "@/core/i18n/config";
import arMessages from "@/../public/messages/ar.json";
import enMessages from "@/../public/messages/en.json";

const MESSAGES = {
  ar: arMessages,
  en: enMessages,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  const titles = {
    ar: "شروط الخدمة - رف",
    en: "Terms of Service - Raff",
  };

  const descriptions = {
    ar: "شروط وأحكام استخدام منصة رف للتجارة الإلكترونية",
    en: "Terms and conditions for using the Raff e-commerce platform",
  };

  return {
    title: titles[locale],
    description: descriptions[locale],
  };
}

export default async function TermsOfServicePage() {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";
  const t = MESSAGES[locale].terms;

  return (
    <div className="min-h-screen bg-raff-neutral-50 py-12">
      <Container>
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-4xl font-bold text-raff-primary">
            {t.title}
          </h1>

          <p className="mb-8 text-lg text-raff-neutral-600">
            {t.lastUpdated}: {new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div className="space-y-8">
            {/* Acceptance */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.acceptance.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t.acceptance.p1}</p>
                  <p>{t.acceptance.p2}</p>
                </div>
              </CardContent>
            </Card>

            {/* Platform Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.platform.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t.platform.desc}</p>
                  <ul className="list-inside list-disc space-y-2 ps-4">
                    <li>{t.platform.discover}</li>
                    <li>{t.platform.redirect}</li>
                    <li>{t.platform.track}</li>
                    <li>{t.platform.commissions}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* User Accounts */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.accounts.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">{t.accounts.registration.title}</h3>
                    <ul className="list-inside list-disc space-y-1 ps-4">
                      <li>{t.accounts.registration.accurate}</li>
                      <li>{t.accounts.registration.age}</li>
                      <li>{t.accounts.registration.security}</li>
                      <li>{t.accounts.registration.responsible}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">{t.accounts.merchant.title}</h3>
                    <ul className="list-inside list-disc space-y-1 ps-4">
                      <li>{t.accounts.merchant.ownership}</li>
                      <li>{t.accounts.merchant.integration}</li>
                      <li>{t.accounts.merchant.products}</li>
                      <li>{t.accounts.merchant.orders}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchases */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.purchases.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t.purchases.desc}</p>
                  <ul className="list-inside list-disc space-y-2 ps-4">
                    <li><strong>{t.purchases.redirect}</strong>: {t.purchases.redirectDesc}</li>
                    <li><strong>{t.purchases.merchant}</strong>: {t.purchases.merchantDesc}</li>
                    <li><strong>{t.purchases.payment}</strong>: {t.purchases.paymentDesc}</li>
                    <li><strong>{t.purchases.returns}</strong>: {t.purchases.returnsDesc}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Commissions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.commissions.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t.commissions.desc}</p>
                  <ul className="list-inside list-disc space-y-2 ps-4">
                    <li><strong>{t.commissions.tracking}</strong>: {t.commissions.trackingDesc}</li>
                    <li><strong>{t.commissions.calculation}</strong>: {t.commissions.calculationDesc}</li>
                    <li><strong>{t.commissions.payment}</strong>: {t.commissions.paymentDesc}</li>
                    <li><strong>{t.commissions.disputes}</strong>: {t.commissions.disputesDesc}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Prohibited Uses */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.prohibited.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t.prohibited.desc}</p>
                  <ul className="list-inside list-disc space-y-1 ps-4">
                    <li>{t.prohibited.fraudulent}</li>
                    <li>{t.prohibited.unauthorized}</li>
                    <li>{t.prohibited.spam}</li>
                    <li>{t.prohibited.harmful}</li>
                    <li>{t.prohibited.infringe}</li>
                    <li>{t.prohibited.manipulate}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* IP */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.ip.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t.ip.desc}</p>
                  <p>{t.ip.merchant}</p>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.disclaimer.title}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t.disclaimer.p1}</p>
                  <ul className="list-inside list-disc space-y-1 ps-4">
                    <li>{t.disclaimer.availability}</li>
                    <li>{t.disclaimer.pricing}</li>
                    <li>{t.disclaimer.quality}</li>
                  </ul>
                  <p>{t.disclaimer.p2}</p>
                  <ul className="list-inside list-disc space-y-1 ps-4">
                    <li>{t.disclaimer.fulfillment}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Liability */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.liability.title}
                </h2>
                <p className="text-raff-neutral-700">{t.liability.desc}</p>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.termination.title}
                </h2>
                <p className="text-raff-neutral-700">{t.termination.desc}</p>
              </CardContent>
            </Card>

            {/* Changes */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.changes.title}
                </h2>
                <p className="text-raff-neutral-700">{t.changes.desc}</p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t.contact.title}
                </h2>
                <div className="space-y-2 text-raff-neutral-700">
                  <p>{t.contact.desc}</p>
                  <p><strong>{t.contact.email}:</strong> support@raff.sa</p>
                  <p><strong>{t.contact.address}:</strong> {t.contact.addressValue}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
