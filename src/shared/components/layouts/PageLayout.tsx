// src/shared/components/layouts/PageLayout.tsx
import { ReactNode } from "react";
import { Navbar } from "@/features/navbar/components/Navbar";
import { Footer } from "@/features/footer/components/Footer";
import type { NavbarVariant } from "@/features/navbar/config/navbar.config";

interface PageLayoutProps {
  children: ReactNode;
  includeNavbar?: boolean;
  includeFooter?: boolean;
  navbarVariant?: NavbarVariant;
}

/**
 * PageLayout Component
 * Wraps pages with consistent Navbar and Footer
 *
 * @param children - Page content
 * @param includeNavbar - Show navbar (default: true)
 * @param includeFooter - Show footer (default: true)
 * @param navbarVariant - Navbar variant to use (default: "main")
 *
 * @example
 * // Default layout with main navbar
 * <PageLayout>
 *   <YourContent />
 * </PageLayout>
 *
 * @example
 * // Minimal navbar for merchant pages
 * <PageLayout navbarVariant="minimal">
 *   <MerchantJoinForm />
 * </PageLayout>
 *
 * @example
 * // No navbar or footer
 * <PageLayout includeNavbar={false} includeFooter={false}>
 *   <AuthPage />
 * </PageLayout>
 */
export function PageLayout({
  children,
  includeNavbar = true,
  includeFooter = true,
  navbarVariant = "main",
}: PageLayoutProps) {
  return (
    <>
      {includeNavbar && <Navbar variant={navbarVariant} />}
      {/* Add padding-top to account for fixed navbar */}
      <div className={includeNavbar ? "pt-16" : ""}>{children}</div>
      {includeFooter && <Footer />}
    </>
  );
}
