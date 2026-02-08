import LandingHeader from "./LandingHeader";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import PillarsSection from "./PillarsSection";
import HowItWorksSection from "./HowItWorksSection";
import TestimonialSection from "./TestimonialSection";
import BottomCtaSection from "./BottomCtaSection";
import LandingFooter from "./LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--card-bg)] font-sans antialiased">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <PillarsSection />
      <HowItWorksSection />
      <TestimonialSection />
      <BottomCtaSection />
      <LandingFooter />
    </div>
  );
}
