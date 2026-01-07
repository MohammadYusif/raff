// src/shared/components/layouts/MerchantLayout.tsx
"use client";

import { ReactNode, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useLocale as useLocaleHook, ChevronForward } from "@/core/i18n";
import { useMerchantProfile } from "@/lib/hooks/useMerchantApi";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  Plug,
  ShoppingBag,
  Menu,
  X,
  Globe,
} from "lucide-react";
import { Badge } from "@/shared/components/ui";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

interface MerchantLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "dashboard",
    href: "/merchant/dashboard",
  },
  {
    icon: Package,
    label: "products",
    href: "/merchant/products",
  },
  {
    icon: BarChart3,
    label: "analytics",
    href: "/merchant/analytics",
  },
  {
    icon: ShoppingBag,
    label: "orders",
    href: "/merchant/orders",
  },
  {
    icon: Settings,
    label: "settings",
    href: "/merchant/settings",
  },
  {
    icon: Plug,
    label: "integrations",
    href: "/merchant/integrations",
  },
];

export function MerchantLayout({ children }: MerchantLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const locale = useLocale();
  const { switchLocale } = useLocaleHook();
  const t = useTranslations("merchantSidebar");
  const layoutT = useTranslations("merchantLayout");
  const integrationsT = useTranslations("merchantIntegrations");
  const isRtl = locale === "ar";
  const merchantId = session?.user?.merchantId ?? null;
  const { profile } = useMerchantProfile(Boolean(merchantId));
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div
      className={`flex h-screen bg-raff-neutral-50 ${
        isRtl ? "lg:flex-row-reverse" : "lg:flex-row"
      }`}
    >
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 ${
          isRtl ? "end-0 lg:end-auto" : "start-0 lg:start-auto"
        } ${
          sidebarOpen
            ? "translate-x-0"
            : isRtl
              ? "translate-x-full"
              : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-raff-neutral-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <Link
                href="/merchant/dashboard"
                className="flex items-center gap-3"
              >
                <Image
                  src="/logo.svg"
                  alt={layoutT("brandAlt")}
                  width={128}
                  height={36}
                  className="h-9 w-auto object-contain"
                  priority
                  unoptimized
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
                      priority
                      unoptimized
                    />
                  </>
                )}
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-5 w-5 text-raff-neutral-600" />
              </button>
            </div>

            {/* Platform Badge */}
            {platformName && platformLogo && (
              <div className="rounded-lg border border-raff-neutral-200 bg-raff-neutral-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-5 w-5 flex items-center justify-center">
                    <Image
                      src={platformLogo}
                      alt={platformName}
                      width={20}
                      height={20}
                      className="h-full w-full object-contain"
                      priority
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                  <span className="font-semibold text-raff-primary">
                    {profile?.name || layoutT("storeFallback")}
                  </span>
                </div>
                <Badge variant="success" className="gap-1 text-xs">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-raff-success" />
                  {layoutT("connected")}
                </Badge>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                        isActive
                          ? "bg-raff-primary text-white"
                          : "text-raff-neutral-700 hover:bg-raff-neutral-100"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{t(item.label)}</span>
                      </div>
                      {isActive && <ChevronForward className="h-4 w-4" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-raff-neutral-200 p-4">
            <AnimatedButton
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3"
              onClick={() => switchLocale(locale === "ar" ? "en" : "ar")}
            >
              <Globe className="h-4 w-4" />
              {locale === "ar"
                ? layoutT("languageEnglish")
                : layoutT("languageArabic")}
            </AnimatedButton>
            <div className="mt-4 text-xs text-raff-neutral-500">
              <p>{layoutT("loggedInAs")}</p>
              <p className="font-medium text-raff-neutral-700">
                {session?.user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="border-b border-raff-neutral-200 bg-white p-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 hover:bg-raff-neutral-100"
          >
            <Menu className="h-6 w-6 text-raff-neutral-700" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
