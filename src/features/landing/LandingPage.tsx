import { CtaFooter } from "./CtaFooter";
import { Benefits } from "./Benefits";
import { DashboardPreview } from "./DashboardPreview";
import { Faq } from "./Faq";
import { HeroSection } from "./HeroSection";
import { HowItWorks } from "./HowItWorks";
import { LandingNav } from "./LandingNav";
import { PhoneStory } from "./PhoneStory";
import { Spotlights } from "./Spotlights";
import { TrustAbout } from "./TrustAbout";

/**
 * Public home page (`/`).
 * Sharp standalone hero first, then the scroll-driven phone story,
 * followed by the complete product narrative: benefits → spotlights →
 * how it works → dashboard preview → about/trust → FAQ → CTA → footer.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main className="page-enter">
        <HeroSection />
        <PhoneStory />
        <Benefits />
        <Spotlights />
        <HowItWorks />
        <DashboardPreview />
        <TrustAbout />
        <Faq />
        <CtaFooter />
      </main>
    </div>
  );
}

export default LandingPage;
