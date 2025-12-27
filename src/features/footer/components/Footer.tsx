// src/features/footer/components/Footer.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/shared/components/ui";
import Link from "next/link";

export function Footer() {
  const t = useTranslations("footer");
  const navT = useTranslations("nav");

  return (
    <footer className="border-t border-raff-neutral-200 bg-raff-neutral-50">
      <Container>
        <div className="grid gap-8 py-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 text-2xl font-bold text-raff-primary">
              رَفّ
            </div>
            <p className="text-sm text-raff-neutral-600">
              {t("description")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-semibold text-raff-primary">
              {t("quickLinks")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {navT("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {navT("products")}
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {navT("categories")}
                </Link>
              </li>
            </ul>
          </div>

          {/* For Merchants */}
          <div>
            <h3 className="mb-4 font-semibold text-raff-primary">
              {t("forMerchants")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/merchant/join"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {t("joinAsStore")}
                </Link>
              </li>
              <li>
                <Link
                  href="/merchant/dashboard"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {t("merchantDashboard")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-semibold text-raff-primary">
              {t("support")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/help"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {t("helpCenter")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {t("contactUs")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {t("termsOfService")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-raff-neutral-600 hover:text-raff-accent"
                >
                  {t("privacyPolicy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-raff-neutral-200 py-6 text-center text-sm text-raff-neutral-600">
          © 2024 Raff. {t("allRightsReserved")}
        </div>
      </Container>
    </footer>
  );
}
