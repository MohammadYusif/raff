// src/features/navbar/config/navbar.config.ts
import { Home } from "lucide-react";

/**
 * Navbar Configuration
 * Central configuration for all navbar variants
 *
 * Add new navigation items here to make them available across all variants
 */

export type NavItemConfig = {
  label: string; // Translation key from messages/[locale].json
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  showInVariants?: NavbarVariant[]; // Which variants to show this item in
};

export type NavbarVariant =
  | "main" // Full navbar with all navigation items
  | "minimal" // Logo, home, and language only
  | "merchant" // For merchant-specific pages
  | "auth"; // For auth pages (login/register)

export type NavbarConfig = {
  logo: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  navItems: NavItemConfig[];
  features: {
    search: {
      enabled: boolean;
      variants: NavbarVariant[];
    };
    cart: {
      enabled: boolean;
      variants: NavbarVariant[];
    };
    auth: {
      enabled: boolean;
      variants: NavbarVariant[];
    };
    languageSwitcher: {
      enabled: boolean;
      variants: NavbarVariant[];
    };
  };
};

/**
 * Main Navbar Configuration
 * Modify this to add/remove navigation items or features
 */
export const navbarConfig: NavbarConfig = {
  logo: {
    src: "/logo.svg",
    alt: "Raff Logo",
    width: 144,
    height: 36,
  },

  // Navigation items - translation keys from messages/[locale].json
  navItems: [
    {
      label: "nav.home",
      href: "/",
      icon: Home,
      showInVariants: ["main", "minimal", "merchant"],
    },
    {
      label: "nav.products",
      href: "/products",
      showInVariants: ["main"],
    },
    {
      label: "nav.trending",
      href: "/trending",
      showInVariants: ["main"],
    },
    {
      label: "nav.categories",
      href: "/categories",
      showInVariants: ["main"],
    },
    {
      label: "nav.merchants",
      href: "/merchants",
      showInVariants: ["main"],
    },
    {
      label: "nav.joinAsMerchant",
      href: "/merchant/join",
      showInVariants: ["main"],
    },
  ],

  // Feature toggles per variant
  features: {
    search: {
      enabled: true,
      variants: ["main"], // Only show search in main navbar
    },
    cart: {
      enabled: true,
      variants: ["main"], // Only show cart in main navbar
    },
    auth: {
      enabled: true,
      variants: ["main"], // Only show auth buttons in main navbar
    },
    languageSwitcher: {
      enabled: true,
      variants: ["main", "minimal", "merchant", "auth"], // Show in all variants
    },
  },
};

/**
 * Get navigation items for a specific variant
 */
export function getNavItemsForVariant(variant: NavbarVariant): NavItemConfig[] {
  return navbarConfig.navItems.filter(
    (item) => !item.showInVariants || item.showInVariants.includes(variant)
  );
}

/**
 * Check if a feature is enabled for a variant
 */
export function isFeatureEnabled(
  feature: keyof NavbarConfig["features"],
  variant: NavbarVariant
): boolean {
  const featureConfig = navbarConfig.features[feature];
  return featureConfig.enabled && featureConfig.variants.includes(variant);
}
