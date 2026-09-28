import { Link } from "react-router-dom";
import { PageHero } from "../PageHero";
import { TrustAbout } from "../TrustAbout";
import { ExploreHub } from "../ExploreHub";
import { CtaBand } from "../CtaBand";
import { usePageTitle } from "../usePageTitle";

/** About (`/about`) — what the product is, and what it deliberately isn't. */
export function AboutPage() {
  usePageTitle("About — Campus Coin");

  return (
    <>
      <PageHero
        eyebrow="About"
        title={
          <>
            Honest tooling for <span className="text-mint">student money.</span>
          </>
        }
        subtitle="Campus Coin pairs a fintech-grade design system with student-scale money: private, auditable and free of jargon."
        actions={
          <Link
            to="/contact"
            className="btn-press rounded-full bg-mint px-8 py-3.5 text-sm font-bold text-ink hover:-translate-y-0.5 hover:bg-white"
          >
            Talk to us
          </Link>
        }
      />
      <TrustAbout />
      <ExploreHub eyebrow="Where next" title="Get to know the product." exclude="/about" />
      <CtaBand />
    </>
  );
}

export default AboutPage;
