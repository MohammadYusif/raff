// src/app/merchant/MerchantSidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useLocale as useLocaleHook } from "@/core/i18n";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useMerchantProfile } from "@/lib/hooks/useMerchantApi";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  Home,
  ShoppingBag,
} from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

const menuItems = [
  {
    label: "dashboard",
    href: "/merchant/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "products",
    href: "/merchant/products",
    icon: Package,
  },
  {
    label: "analytics",
    href: "/merchant/analytics",
    icon: BarChart3,
  },
  {
    label: "orders",
    href: "/merchant/orders",
    icon: ShoppingBag,
  },
  {
    label: "settings",
    href: "/merchant/settings",
    icon: Settings,
  },
];

export function MerchantSidebar() {
  const pathname = usePathname();
  const t = useTranslations("merchantSidebar");
  const layoutT = useTranslations("merchantLayout");
  const integrationsT = useTranslations("merchantIntegrations");
  const currentLocale = useLocale();
  const { switchLocale } = useLocaleHook();
  const { data: session } = useSession();
  const merchantId = session?.user?.merchantId ?? null;
  const { profile } = useMerchantProfile(Boolean(merchantId));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const platform = profile?.storeInfo.platform;
  const platformName =
    platform === "zid"
      ? integrationsT("platforms.zid.name")
      : platform === "salla"
        ? integrationsT("platforms.salla.name")
        : null;
  const platformLogo =
    platform === "zid"
      ? "/images/brands/zid.svg"
      : platform === "salla"
        ? "/images/brands/salla.svg"
        : null;

  return (
    <>
      {/* Mobile Menu Toggle */}
      <div className="fixed start-4 top-4 z-50 lg:hidden">
        <AnimatedButton
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-lg"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </AnimatedButton>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 z-40 flex w-64 flex-col border-e border-raff-neutral-200 bg-white transition-transform lg:translate-x-0",
          currentLocale === "ar" ? "end-0" : "start-0",
          isMobileMenuOpen
            ? "translate-x-0"
            : currentLocale === "ar"
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-raff-neutral-200 px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt={layoutT("brandAlt")}
              width={128}
              height={32}
              className="h-auto w-32 object-contain"
            />
            {platformLogo && platformName && (
              <>
                <span
                  className="h-6 w-px bg-raff-neutral-200"
                  aria-hidden="true"
                />
                <Image
                  src={platformLogo}
                  alt={platformName}
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-raff-primary text-white shadow-sm"
                    : "text-raff-neutral-700 hover:bg-raff-neutral-100 hover:text-raff-primary"
                )}
              >
                <Icon className="h-5 w-5" />
                {t(item.label)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-2 border-t border-raff-neutral-200 p-4">
          {/* View Storefront */}
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
            <AnimatedButton
              variant="outline"
              className="w-full justify-start gap-3"
              size="sm"
            >
              <Home className="h-4 w-4" />
              {t("viewStorefront")}
            </AnimatedButton>
          </Link>

          {/* Language Switcher */}
          <AnimatedButton
            variant="ghost"
            className="w-full justify-start gap-3"
            size="sm"
            onClick={() => switchLocale(currentLocale === "ar" ? "en" : "ar")}
          >
            <Globe className="h-4 w-4" />
            {currentLocale === "ar"
              ? layoutT("languageEnglish")
              : layoutT("languageArabic")}
          </AnimatedButton>

          {/* Logout */}
          <AnimatedButton
            variant="ghost"
            className="w-full justify-start gap-3 text-raff-error hover:bg-raff-error/10 hover:text-raff-error"
            size="sm"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </AnimatedButton>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
