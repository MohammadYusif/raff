// src/features/navbar/components/Navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useLocale as useLocaleHook } from "@/core/i18n";
import { useSession } from "next-auth/react";
import { Container } from "@/shared/components/ui";
import { SearchInput } from "@/shared/components/SearchInput";
import { Menu, X, Globe, ShoppingCart, Search } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { UserMenu } from "./UserMenu";
import {
  navbarConfig,
  getNavItemsForVariant,
  isFeatureEnabled,
  type NavbarVariant,
} from "../config/navbar.config";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { itemCount, isLoading: isCartLoading } = useCart();

  const navItems = getNavItemsForVariant(variant);
  const showSearch = isFeatureEnabled("search", variant);
  const showCart = isFeatureEnabled("cart", variant);
  const showAuth = isFeatureEnabled("auth", variant);
  const showLanguageSwitcher = isFeatureEnabled("languageSwitcher", variant);

  // Determine if this is a minimal variant
  const isMinimal = variant === "minimal" || variant === "auth";

  const isAuthReady = status !== "loading";
  const isCartReady = !isCartLoading;

  // Check if user is logged in
  const isAuthenticated =
    isAuthReady && status === "authenticated" && session?.user;

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
              sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 144px"
              priority
              fetchPriority="high"
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

          {/* Search - Desktop Only (lg and above) */}
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
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {/* Mobile Search Icon - Show on tablet and mobile (below lg) */}
            {showSearch && (
              <AnimatedButton
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-raff-neutral-100"
                onClick={() => {
                  setMobileSearchOpen(!mobileSearchOpen);
                  setMobileMenuOpen(false); // Close menu when opening search
                }}
              >
                <Search className="h-5 w-5" />
              </AnimatedButton>
            )}

            {/* Cart */}
            {showCart && (
              <Link href="/cart" className="relative">
                <AnimatedButton
                  variant="ghost"
                  size="icon"
                  className="hover:bg-raff-neutral-100"
                >
                  <ShoppingCart className="h-5 w-5" />
                </AnimatedButton>
                {isCartReady && itemCount > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-5 items-center justify-center rounded-full bg-raff-accent px-1 text-[10px] font-semibold text-white">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Language Switcher */}
            {showLanguageSwitcher && (
              <AnimatedButton
                variant="ghost"
                size="icon"
                onClick={() =>
                  switchLocale(currentLocale === "ar" ? "en" : "ar")
                }
                className="hover:bg-raff-neutral-100"
              >
                <Globe className="h-5 w-5" />
              </AnimatedButton>
            )}

            {/* Auth Section - Show either UserMenu or Login button */}
            {showAuth && isAuthReady && (
              <>
                {isAuthenticated ? (
                  // Show User Menu when logged in - Always visible
                  <UserMenu />
                ) : (
                  // Show Login button when not logged in
                  <Link href="/auth/login" className="hidden sm:inline-flex">
                    <AnimatedButton
                      variant="outline"
                      size="sm"
                      className="border-raff-primary text-raff-primary hover:bg-raff-primary hover:text-white"
                    >
                      {t("common.actions.login")}
                    </AnimatedButton>
                  </Link>
                )}
              </>
            )}

            {/* Mobile Menu Toggle - Only show if not minimal AND has items */}
            {!isMinimal && navItems.length > 0 && (
              <AnimatedButton
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setMobileSearchOpen(false); // Close search when opening menu
                }}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </AnimatedButton>
            )}
          </div>
        </div>

        {/* Mobile Search Dropdown - Only show when search icon is clicked */}
        {showSearch && mobileSearchOpen && (
          <div className="border-t border-raff-neutral-200 pb-4 pt-3 lg:hidden">
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
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    className="w-full border-raff-primary text-raff-primary"
                  >
                    {t("nav.cart")}
                  </AnimatedButton>
                </Link>
              )}

              {/* Show Login button in mobile menu when not logged in */}
              {showAuth && isAuthReady && !isAuthenticated && (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    className="w-full border-raff-primary text-raff-primary"
                  >
                    {t("common.actions.login")}
                  </AnimatedButton>
                </Link>
              )}
            </div>
          </Container>
        </div>
      )}
    </nav>
  );
}
