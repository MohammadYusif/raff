// src/features/navbar/components/Navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useLocale as useLocaleHook } from "@/core/i18n";
import { Button, Container } from "@/shared/components/ui";
import { SearchInput } from "@/shared/components/SearchInput";
import { Menu, X, Globe } from "lucide-react";

export function Navbar() {
  const t = useTranslations("nav");
  const commonT = useTranslations("common");
  const currentLocale = useLocale();
  const { switchLocale } = useLocaleHook();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: t("home"), href: "/" },
    { label: t("products"), href: "/products" },
    { label: t("trending"), href: "/trending" },
    { label: t("categories"), href: "/categories" },
    { label: t("merchants"), href: "/merchants" },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-raff-neutral-200 bg-white/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center py-2">
            <Image
              src="/logo.png"
              alt="Raff Logo"
              width={144}
              height={36}
              className="h-auto w-28 object-contain sm:w-32 md:w-36"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-sm font-medium text-raff-neutral-700 transition-colors hover:text-raff-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Search - Desktop Only */}
          <div className="hidden flex-1 max-w-md lg:block">
            <SearchInput
              placeholder={commonT("searchPlaceholder")}
              size="sm"
              showSuggestions={true}
            />
          </div>

          {/* Right Section */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => switchLocale(currentLocale === "ar" ? "en" : "ar")}
              className="hover:bg-raff-neutral-100"
            >
              <Globe className="h-5 w-5" />
            </Button>

            {/* Login Button */}
            <Button
              variant="outline"
              size="sm"
              className="hidden border-raff-primary text-raff-primary hover:bg-raff-primary hover:text-white sm:inline-flex"
            >
              {commonT("actions.login")}
            </Button>

            {/* Mobile Menu Toggle */}
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
          </div>
        </div>

        {/* Mobile Search Bar - Improved spacing */}
        <div className="pb-3 pt-2 lg:hidden">
          <SearchInput
            placeholder={commonT("searchPlaceholder")}
            size="md"
            showSuggestions={true}
          />
        </div>
      </Container>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
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
                  {item.label}
                </Link>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-raff-primary text-raff-primary"
              >
                {commonT("actions.login")}
              </Button>
            </div>
          </Container>
        </div>
      )}
    </nav>
  );
}
