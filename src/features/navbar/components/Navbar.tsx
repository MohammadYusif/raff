// src/features/navbar/components/Navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useLocale as useLocaleHook } from "@/core/i18n";
import { useSession } from "next-auth/react";
import { Button, Container } from "@/shared/components/ui";
import { SearchInput } from "@/shared/components/SearchInput";
import { Menu, X, Globe, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { UserMenu } from "./UserMenu";
import {
  navbarConfig,
  getNavItemsForVariant,
  isFeatureEnabled,
  type NavbarVariant,
} from "../config/navbar.config";

export interface NavbarProps {
  variant?: NavbarVariant;
}

/**
 * Navbar Component
 *
 * Configurable navbar with multiple variants:
 * - main: Full navbar with all features (default)
 * - minimal: Logo, home, and language switcher only
 * - merchant: For merchant-specific pages
 * - auth: For authentication pages
 *
 * @param variant - The navbar variant to render (default: "main")
 *
 * @example
 * // Main navbar (default)
 * <Navbar />
 *
 * @example
 * // Minimal navbar for merchant pages
 * <Navbar variant="minimal" />
 */
export function Navbar({ variant = "main" }: NavbarProps) {
  const t = useTranslations();
  const currentLocale = useLocale();
  const { switchLocale } = useLocaleHook();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();

  const navItems = getNavItemsForVariant(variant);
  const showSearch = isFeatureEnabled("search", variant);
  const showCart = isFeatureEnabled("cart", variant);
  const showAuth = isFeatureEnabled("auth", variant);
  const showLanguageSwitcher = isFeatureEnabled("languageSwitcher", variant);

  // Determine if this is a minimal variant
  const isMinimal = variant === "minimal" || variant === "auth";

  // Check if user is logged in
  const isAuthenticated = status === "authenticated" && session?.user;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-raff-neutral-200 bg-white/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center py-2">
            <Image
              src={navbarConfig.logo.src}
              alt={navbarConfig.logo.alt}
              width={navbarConfig.logo.width}
              height={navbarConfig.logo.height}
              className="h-auto w-28 object-contain sm:w-32 md:w-36"
            />
          </Link>

          {/* Desktop Navigation - Only show if not minimal */}
          {!isMinimal && navItems.length > 0 && (
            <div className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap text-sm font-medium text-raff-neutral-700 transition-colors hover:text-raff-primary"
                >
                  {t(item.label)}
                </Link>
              ))}
            </div>
          )}

          {/* Search - Desktop Only */}
          {showSearch && (
            <div className="hidden flex-1 max-w-md lg:block">
              <SearchInput
                placeholder={t("common.searchPlaceholder")}
                size="sm"
                showSuggestions={true}
              />
            </div>
          )}

          {/* Right Section */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Cart */}
            {showCart && (
              <Link href="/cart" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-raff-neutral-100"
                >
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                {itemCount > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-5 items-center justify-center rounded-full bg-raff-accent px-1 text-[10px] font-semibold text-white">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Language Switcher */}
            {showLanguageSwitcher && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  switchLocale(currentLocale === "ar" ? "en" : "ar")
                }
                className="hover:bg-raff-neutral-100"
              >
                <Globe className="h-5 w-5" />
              </Button>
            )}

            {/* Auth Section - Show either UserMenu or Login button */}
            {showAuth && (
              <>
                {isAuthenticated ? (
                  // Show User Menu when logged in
                  <div className="hidden sm:block">
                    <UserMenu />
                  </div>
                ) : (
                  // Show Login button when not logged in
                  <Link href="/auth/login" className="hidden sm:inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-raff-primary text-raff-primary hover:bg-raff-primary hover:text-white"
                    >
                      {t("common.actions.login")}
                    </Button>
                  </Link>
                )}
              </>
            )}

            {/* Mobile Menu Toggle - Only show if not minimal or has items */}
            {(!isMinimal || navItems.length > 0) && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar - Only show if search is enabled */}
        {showSearch && (
          <div className="pb-3 pt-2 lg:hidden">
            <SearchInput
              placeholder={t("common.searchPlaceholder")}
              size="md"
              showSuggestions={true}
            />
          </div>
        )}
      </Container>

      {/* Mobile Menu */}
      {mobileMenuOpen && !isMinimal && (
        <div className="border-t border-raff-neutral-200 bg-white md:hidden">
          <Container>
            <div className="flex flex-col gap-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-raff-neutral-700 hover:text-raff-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(item.label)}
                </Link>
              ))}

              {showCart && (
                <Link href="/cart" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-raff-primary text-raff-primary"
                  >
                    {t("nav.cart")}
                  </Button>
                </Link>
              )}

              {showAuth && (
                <>
                  {isAuthenticated ? (
                    // Show User Menu in mobile
                    <div className="border-t border-raff-neutral-200 pt-4">
                      <UserMenu />
                    </div>
                  ) : (
                    // Show Login button when not logged in
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-raff-primary text-raff-primary"
                      >
                        {t("common.actions.login")}
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </nav>
  );
}
