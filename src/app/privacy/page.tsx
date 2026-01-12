// src/app/privacy/page.tsx
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME } from "@/core/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  const titles = {
    ar: "سياسة الخصوصية - رف",
    en: "Privacy Policy - Raff",
  };

  const descriptions = {
    ar: "سياسة الخصوصية لمنصة رف - كيف نجمع ونستخدم ونحمي بياناتك الشخصية",
    en: "Raff's Privacy Policy - How we collect, use, and protect your personal data",
  };

  return {
    title: titles[locale],
    description: descriptions[locale],
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("privacy");

  return (
    <div className="min-h-screen bg-raff-neutral-50 py-12">
      <Container>
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-4xl font-bold text-raff-primary">
            {t("title")}
          </h1>

          <p className="mb-8 text-lg text-raff-neutral-600">
            {t("lastUpdated")}: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div className="space-y-8">
            {/* Introduction */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("introduction.title")}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t("introduction.p1")}</p>
                  <p>{t("introduction.p2")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("collect.title")}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">{t("collect.account.title")}</h3>
                    <ul className="list-inside list-disc space-y-1 ps-4">
                      <li>{t("collect.account.name")}</li>
                      <li>{t("collect.account.email")}</li>
                      <li>{t("collect.account.password")}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">{t("collect.merchant.title")}</h3>
                    <ul className="list-inside list-disc space-y-1 ps-4">
                      <li>{t("collect.merchant.store")}</li>
                      <li>{t("collect.merchant.products")}</li>
                      <li>{t("collect.merchant.orders")}</li>
                      <li>{t("collect.merchant.tokens")}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">{t("collect.usage.title")}</h3>
                    <ul className="list-inside list-disc space-y-1 ps-4">
                      <li>{t("collect.usage.clicks")}</li>
                      <li>{t("collect.usage.views")}</li>
                      <li>{t("collect.usage.device")}</li>
                      <li>{t("collect.usage.ip")}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("use.title")}
                </h2>
                <ul className="list-inside list-disc space-y-2 text-raff-neutral-700 ps-4">
                  <li>{t("use.platform")}</li>
                  <li>{t("use.commissions")}</li>
                  <li>{t("use.analytics")}</li>
                  <li>{t("use.communication")}</li>
                  <li>{t("use.security")}</li>
                  <li>{t("use.legal")}</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Sharing */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("sharing.title")}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t("sharing.intro")}</p>
                  <ul className="list-inside list-disc space-y-2 ps-4">
                    <li><strong>{t("sharing.merchants.title")}:</strong> {t("sharing.merchants.desc")}</li>
                    <li><strong>{t("sharing.platforms.title")}:</strong> {t("sharing.platforms.desc")}</li>
                    <li><strong>{t("sharing.service.title")}:</strong> {t("sharing.service.desc")}</li>
                    <li><strong>{t("sharing.legal.title")}:</strong> {t("sharing.legal.desc")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("security.title")}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t("security.p1")}</p>
                  <ul className="list-inside list-disc space-y-2 ps-4">
                    <li>{t("security.encryption")}</li>
                    <li>{t("security.access")}</li>
                    <li>{t("security.monitoring")}</li>
                    <li>{t("security.updates")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("rights.title")}
                </h2>
                <ul className="list-inside list-disc space-y-2 text-raff-neutral-700 ps-4">
                  <li><strong>{t("rights.access.title")}:</strong> {t("rights.access.desc")}</li>
                  <li><strong>{t("rights.correct.title")}:</strong> {t("rights.correct.desc")}</li>
                  <li><strong>{t("rights.delete.title")}:</strong> {t("rights.delete.desc")}</li>
                  <li><strong>{t("rights.export.title")}:</strong> {t("rights.export.desc")}</li>
                  <li><strong>{t("rights.opt.title")}:</strong> {t("rights.opt.desc")}</li>
                </ul>
              </CardContent>
            </Card>

            {/* Cookies */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("cookies.title")}
                </h2>
                <div className="space-y-4 text-raff-neutral-700">
                  <p>{t("cookies.desc")}</p>
                  <ul className="list-inside list-disc space-y-2 ps-4">
                    <li><strong>{t("cookies.essential")}:</strong> {t("cookies.essentialDesc")}</li>
                    <li><strong>{t("cookies.analytics")}:</strong> {t("cookies.analyticsDesc")}</li>
                    <li><strong>{t("cookies.functional")}:</strong> {t("cookies.functionalDesc")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-2xl font-semibold text-raff-primary">
                  {t("contact.title")}
                </h2>
                <div className="space-y-2 text-raff-neutral-700">
                  <p>{t("contact.desc")}</p>
                  <p><strong>{t("contact.email")}:</strong> privacy@raff.sa</p>
                  <p><strong>{t("contact.address")}:</strong> {t("contact.addressValue")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
