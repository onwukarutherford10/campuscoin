import { HeroSection } from "../HeroSection";
import { PhoneStory } from "../PhoneStory";
import { DashboardPreview } from "../DashboardPreview";
import { ExploreHub } from "../ExploreHub";
import { CtaBand } from "../CtaBand";
import { usePageTitle } from "../usePageTitle";

/**
 * Home (`/`) — the introduction only: hero, the scroll-driven product story,
 * a dashboard preview and links out to the dedicated pages that go deeper.
 */
export function HomePage() {
  usePageTitle("Campus Coin — Take control of your campus finances");

  return (
    <>
      <HeroSection />
      <PhoneStory />
      <DashboardPreview />
      <ExploreHub />
      <CtaBand />
    </>
  );
}

export default HomePage;
