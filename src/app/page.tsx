// src/app/page.tsx
import { LocaleProvider } from "@/core/i18n/components/LocaleProvider";
import { Navbar } from "@/features/navbar/components/Navbar";
import { HeroSection } from "@/features/homepage/components/HeroSection";
import { TrendingSection } from "@/features/homepage/components/TrendingSection";
import { HowItWorksSection } from "@/features/homepage/components/HowItWorksSection";
import { Footer } from "@/features/footer/components/Footer";

export default function HomePage() {
  return (
    <LocaleProvider>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <HeroSection />
          <TrendingSection />
          <HowItWorksSection />
        </main>
        <Footer />
      </div>
    </LocaleProvider>
  );
}
