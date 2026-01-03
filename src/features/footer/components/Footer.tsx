// src/features/footer/components/Footer.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/shared/components/ui";
import Link from "next/link";

export function Footer() {
  const t = useTranslations("footer");
  const navT = useTranslations("nav");

  return (
    <footer className="border-t border-raff-neutral-200 bg-white">
      <Container>
        <div className="grid gap-8 py-12 sm:grid-cols-2 md:grid-cols-4">
          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-raff-primary">
              {t("quickLinks")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {navT("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {navT("products")}
                </Link>
              </li>
              <li>
                <Link
                  href="/trending"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {navT("trending")}
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {navT("categories")}
                </Link>
              </li>
            </ul>
          </div>

          {/* For Merchants */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-raff-primary">
              {t("forMerchants")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/merchant/join"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {t("joinAsStore")}
                </Link>
              </li>
              <li>
                <Link
                  href="/merchant/dashboard"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {t("merchantDashboard")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-raff-primary">
              {t("support")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {t("helpCenter")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {t("contactUs")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-raff-primary">
              {t("legal")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {t("termsOfService")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-raff-neutral-600 transition-colors hover:text-raff-primary"
                >
                  {t("privacyPolicy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-raff-neutral-200 py-6">
          <p className="text-center text-sm text-raff-neutral-600">
            © 2026 Raff. {t("allRightsReserved")}
          </p>
        </div>
      </Container>
    </footer>
  );
}
