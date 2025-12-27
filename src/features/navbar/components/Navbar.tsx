// src/features/navbar/components/Navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "@/core/i18n";
import { Button, Container } from "@/shared/components/ui";
import { Menu, X, Search, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const t = useTranslations("nav");
  const commonT = useTranslations("common");
  const { locale, switchLocale } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: t("home"), href: "/" },
    { label: t("products"), href: "/products" },
    { label: t("trending"), href: "/trending" },
    { label: t("categories"), href: "/categories" },
    { label: t("merchants"), href: "/merchants" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-raff-neutral-200 bg-white/95 backdrop-blur ">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-raff-primary">رَفّ</div>
            <div className="hidden text-sm text-raff-neutral-600 sm:block">
              Raff
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-raff-neutral-700 transition-colors hover:text-raff-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={commonT("actions.search")}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => switchLocale(locale === "ar" ? "en" : "ar")}
              aria-label="Switch language"
            >
              <Globe className="h-5 w-5" />
            </Button>

            {/* Login Button */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
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
                  className="text-sm font-medium text-raff-neutral-700 transition-colors hover:text-raff-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                {commonT("actions.login")}
              </Button>
            </div>
          </Container>
        </div>
      )}
    </nav>
  );
}
