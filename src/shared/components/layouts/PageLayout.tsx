// src/shared/components/layouts/PageLayout.tsx
import { ReactNode } from "react";
import { Navbar } from "@/features/navbar/components/Navbar";
import { Footer } from "@/features/footer/components/Footer";

interface PageLayoutProps {
  children: ReactNode;
  includeNavbar?: boolean;
  includeFooter?: boolean;
}

/**
 * PageLayout Component
 * Wraps pages with consistent Navbar and Footer
 *
 * @param includeNavbar - Show navbar (default: true)
 * @param includeFooter - Show footer (default: true)
 */
export function PageLayout({
  children,
  includeNavbar = true,
  includeFooter = true,
}: PageLayoutProps) {
  return (
    <>
      {includeNavbar && <Navbar />}
      {/* Add padding-top to account for fixed navbar */}
      <div className={includeNavbar ? "pt-16" : ""}>{children}</div>
      {includeFooter && <Footer />}
    </>
  );
}
