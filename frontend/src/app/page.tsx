import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CtaSection } from "@/components/landing/cta-section";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesGrid />
        <HowItWorks />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
