// src/features/navbar/components/UserMenu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, Package } from "lucide-react";
import { ArrowForward } from "@/core/i18n";
import { toast } from "sonner";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

export interface UserMenuProps {
  /**
   * Whether the menu is being rendered in mobile context
   * This affects dropdown positioning
   */
  isMobile?: boolean;
}

/**
 * User Menu Component
 *
 * Displays user avatar and dropdown menu
 * Works properly on both mobile and desktop
 * No duplication issues
 */
export function UserMenu({ isMobile = false }: UserMenuProps) {
  const t = useTranslations("common");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    const userName = session?.user?.name || "User";

    try {
      await signOut({ redirect: false });
      setIsOpen(false);

      toast.success(t("notifications.logoutSuccess"), {
        description: t("notifications.logoutDescription", { name: userName }),
        duration: 2000,
      });

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(t("notifications.logoutError"));
    }
  };

  // Don't show anything while loading or if not authenticated
  if (status === "loading" || status === "unauthenticated" || !session?.user) {
    return null;
  }

  const userName = session.user.name || session.user.email || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  // Split name for better mobile display
  const firstName = userName.split(" ")[0];
  const displayName =
    firstName.length > 10 ? `${firstName.slice(0, 10)}...` : firstName;

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <AnimatedButton
        onClick={() => setIsOpen(!isOpen)}
        unstyled
        className="flex items-center gap-1 rounded-lg px-1 py-1.5 transition-colors hover:bg-raff-neutral-100 sm:gap-2 sm:px-2"
      >
        {/* User Avatar Circle */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raff-primary text-white transition-transform hover:scale-105">
          <span className="text-sm font-semibold">{userInitial}</span>
        </div>

        {/* User Name - Hidden on mobile, visible on sm+ */}
        <span className="hidden truncate text-sm font-medium text-raff-neutral-700 sm:block">
          {displayName}
        </span>

        {/* Dropdown Icon - Hidden on mobile, visible on sm+ */}
        <ChevronDown
          className={`hidden h-4 w-4 shrink-0 text-raff-neutral-500 transition-transform sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </AnimatedButton>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-2 w-56 rounded-lg border border-raff-neutral-200 bg-white shadow-lg ${
            isMobile
              ? "start-0" // In mobile menu, align to start (left in LTR, right in RTL)
              : "end-0" // In desktop navbar, align to end (right in LTR, left in RTL)
          }`}
        >
          {/* User Info */}
          <div className="border-b border-raff-neutral-200 p-4">
            <p className="truncate text-sm font-medium text-raff-neutral-900">
              {userName}
            </p>
            {session.user.email && (
              <p className="mt-1 truncate text-xs text-raff-neutral-600">
                {session.user.email}
              </p>
            )}
            {session.user.role && (
              <p className="mt-2 inline-block rounded-full bg-raff-accent/10 px-2 py-1 text-xs font-medium text-raff-accent">
                {session.user.role === "CUSTOMER"
                  ? t("roles.customer")
                  : session.user.role === "MERCHANT"
                    ? t("roles.merchant")
                    : t("roles.admin")}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {/* Admin Dashboard Link - Only for admins */}
            {session.user.role === "ADMIN" && (
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-raff-neutral-700 transition-all hover:bg-raff-primary/10 hover:text-raff-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="font-medium">
                  {t("actions.adminDashboard")}
                </span>
              </Link>
            )}

            {/* Orders Link - Only for customers */}
            {session.user.role === "CUSTOMER" && (
              <Link
                href="/orders"
                onClick={() => setIsOpen(false)}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-raff-neutral-700 transition-all hover:bg-raff-primary/10 hover:text-raff-primary"
              >
                <Package className="h-4 w-4" />
                <span className="font-medium">{t("actions.orders")}</span>
              </Link>
            )}

            {/* Dashboard Link - Only for merchants */}
            {session.user.role === "MERCHANT" && (
              <Link
                href="/merchant/dashboard"
                onClick={() => setIsOpen(false)}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-raff-neutral-700 transition-all hover:bg-raff-primary/10 hover:text-raff-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="font-medium">
                  {t("actions.goToDashboard")}
                </span>
              </Link>
            )}

            {/* Logout Button */}
            <AnimatedButton
              onClick={handleLogout}
              unstyled
              className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-raff-neutral-700 transition-all hover:bg-red-50 hover:text-red-700"
            >
              <ArrowForward className="h-4 w-4 transition-transform ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              <span className="font-medium">{t("actions.logout")}</span>
            </AnimatedButton>
          </div>
        </div>
      )}
    </div>
  );
}
