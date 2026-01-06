// src/shared/components/layouts/MerchantLayout.tsx
"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useMerchantProfile } from "@/lib/hooks/useMerchantApi";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Link2,
  Target,
  Users,
  Bell,
  Settings,
  Plug,
  ChevronRight,
  Store,
  Menu,
  X,
} from "lucide-react";
import { Badge } from "@/shared/components/ui";
import { useState } from "react";

interface MerchantLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard className="h-5 w-5" />,
    label: "Dashboard",
    href: "/merchant/dashboard",
  },
  {
    icon: <Package className="h-5 w-5" />,
    label: "Products",
    href: "/merchant/products",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Analytics",
    href: "/merchant/analytics",
  },
  {
    icon: <Link2 className="h-5 w-5" />,
    label: "Traffic Sources",
    href: "/merchant/traffic-sources",
  },
  {
    icon: <Target className="h-5 w-5" />,
    label: "Campaigns",
    href: "/merchant/campaigns",
  },
  {
    icon: <Users className="h-5 w-5" />,
    label: "Customer Insights",
    href: "/merchant/customer-insights",
  },
  {
    icon: <Bell className="h-5 w-5" />,
    label: "Notifications",
    href: "/merchant/notifications",
    badge: "3",
  },
  {
    icon: <Settings className="h-5 w-5" />,
    label: "Settings",
    href: "/merchant/settings",
  },
  {
    icon: <Plug className="h-5 w-5" />,
    label: "Integrations",
    href: "/merchant/integrations",
  },
];

export function MerchantLayout({ children }: MerchantLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const merchantId = session?.user?.merchantId ?? null;
  const { profile } = useMerchantProfile(Boolean(merchantId));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const platform = profile?.storeInfo.platform;
  const platformName = platform === "zid" ? "Zid" : platform === "salla" ? "Salla" : null;
  const platformLogo = platform === "zid" ? "/zid-icon.png" : platform === "salla" ? "/salla-icon.png" : null;

  return (
    <div className="flex h-screen bg-raff-neutral-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-raff-neutral-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <Link href="/merchant/dashboard" className="flex items-center gap-2">
                <Store className="h-6 w-6 text-raff-primary" />
                <span className="text-lg font-bold text-raff-primary">Raff</span>
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
                  <Image
                    src={platformLogo}
                    alt={platformName}
                    width={20}
                    height={20}
                    className="h-5 w-5"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="font-semibold text-raff-primary">
                    {profile?.name || "Your Store"}
                  </span>
                </div>
                <Badge variant="success" className="gap-1 text-xs">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-raff-success" />
                  Connected
                </Badge>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
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
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.badge && !isActive && (
                        <Badge variant="error" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-raff-neutral-200 p-4">
            <div className="text-xs text-raff-neutral-500">
              <p>Logged in as</p>
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
